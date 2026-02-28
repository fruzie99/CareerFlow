const mongoose = require("mongoose");
const { z } = require("zod");

const Application = require("../models/Application");
const Job = require("../models/Job");

const applySchema = z.object({
  coverLetter: z.string().trim().max(2000).optional().default(""),
  resumeUrl: z.string().trim().max(500).optional().default(""),
});

const sanitizeApplication = (app) => ({
  id: app._id.toString(),
  jobId: app.jobId?._id
    ? {
        id: app.jobId._id.toString(),
        title: app.jobId.title,
        company: app.jobId.company,
        location: app.jobId.location,
        applicationDeadline: app.jobId.applicationDeadline,
      }
    : app.jobId?.toString?.() || app.jobId,
  applicantId: app.applicantId?._id
    ? {
        id: app.applicantId._id.toString(),
        fullName: app.applicantId.fullName,
        email: app.applicantId.email,
        profile: app.applicantId.profile,
      }
    : app.applicantId?.toString?.() || app.applicantId,
  coverLetter: app.coverLetter,
  resumeUrl: app.resumeUrl,
  status: app.status,
  createdAt: app.createdAt,
  updatedAt: app.updatedAt,
});

const applyToJob = async (req, res, next) => {
  try {
    if (req.user.role !== "job_seeker") {
      return res.status(403).json({ message: "Only job seekers can apply for jobs." });
    }

    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (new Date() > new Date(job.applicationDeadline)) {
      return res.status(400).json({ message: "Application deadline has passed." });
    }

    const existing = await Application.findOne({ jobId, applicantId: req.user._id });
    if (existing) {
      return res.status(409).json({ message: "You have already applied for this job." });
    }

    const payload = applySchema.parse(req.body);

    const application = await Application.create({
      jobId,
      applicantId: req.user._id,
      coverLetter: payload.coverLetter,
      resumeUrl: payload.resumeUrl,
    });

    return res.status(201).json({ message: "Application submitted successfully.", application: sanitizeApplication(application) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues[0];
      return res.status(400).json({ message: first?.message || "Invalid request payload", errors: error.issues });
    }
    return next(error);
  }
};

const listMyApplications = async (req, res, next) => {
  try {
    const applications = await Application.find({ applicantId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("jobId", "title company location applicationDeadline")
      .lean();

    return res.status(200).json({ applications: applications.map(sanitizeApplication) });
  } catch (error) {
    return next(error);
  }
};

const listApplicantsForJob = async (req, res, next) => {
  try {
    if (req.user.role !== "career_counselor") {
      return res.status(403).json({ message: "Only counselors can view applicants." });
    }

    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only view applicants for your own jobs." });
    }

    const applications = await Application.find({ jobId })
      .sort({ createdAt: -1 })
      .populate("applicantId", "fullName email profile")
      .lean();

    return res.status(200).json({ applications: applications.map(sanitizeApplication) });
  } catch (error) {
    return next(error);
  }
};

const downloadApplicantsExcel = async (req, res, next) => {
  try {
    if (req.user.role !== "career_counselor") {
      return res.status(403).json({ message: "Only counselors can download applicant data." });
    }

    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only download applicants for your own jobs." });
    }

    const applications = await Application.find({ jobId })
      .sort({ createdAt: -1 })
      .populate("applicantId", "fullName email profile")
      .lean();

    let XLSX;
    try {
      XLSX = require("xlsx");
    } catch {
      return res.status(500).json({ message: "Excel export is not available. Please install the xlsx package." });
    }

    const rows = applications.map((app) => {
      const user = app.applicantId || {};
      const profile = user.profile || {};
      return {
        "Full Name": user.fullName || "",
        "Email Address": user.email || "",
        Skills: (profile.skills || []).join(", "),
        Education: (profile.education || [])
          .map((e) => [e.degree, e.institution, e.fieldOfStudy].filter(Boolean).join(" - "))
          .join("; "),
        "Work Experience": (profile.experience || [])
          .map((e) => [e.title, e.company].filter(Boolean).join(" at "))
          .join("; "),
        "Cover Letter": app.coverLetter || "",
        "Resume URL": app.resumeUrl || "",
        "Applied At": app.createdAt ? new Date(app.createdAt).toISOString() : "",
        Status: app.status || "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Applicants");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const safeName = job.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_applicants.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    return res.send(buffer);
  } catch (error) {
    return next(error);
  }
};

const checkApplicationStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const existing = await Application.findOne({ jobId, applicantId: req.user._id }).lean();
    return res.status(200).json({ applied: !!existing });
  } catch (error) {
    return next(error);
  }
};

module.exports = { applyToJob, listMyApplications, listApplicantsForJob, downloadApplicantsExcel, checkApplicationStatus };
