const mongoose = require("mongoose");
const { z } = require("zod");

const Job = require("../models/Job");

const createJobSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(160),
  company: z.string().trim().min(2, "Company name must be at least 2 characters.").max(160),
  location: z.string().trim().min(2, "Location must be at least 2 characters.").max(200),
  description: z.string().trim().min(10, "Description must be at least 10 characters.").max(2000),
  salary: z.string().trim().max(100).optional().default(""),
  applicationDeadline: z.string().min(1, "Application deadline is required."),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
});

const sanitizeJob = (job) => ({
  id: job._id.toString(),
  title: job.title,
  company: job.company,
  location: job.location,
  description: job.description,
  salary: job.salary,
  applicationDeadline: job.applicationDeadline,
  tags: job.tags,
  postedBy: job.postedBy?._id
    ? { id: job.postedBy._id.toString(), fullName: job.postedBy.fullName, email: job.postedBy.email }
    : job.postedBy?.toString?.() || job.postedBy,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
});

const createJob = async (req, res, next) => {
  try {
    if (req.user.role !== "career_counselor") {
      return res.status(403).json({ message: "Only career counselors can post jobs." });
    }

    const payload = createJobSchema.parse(req.body);

    const deadline = new Date(payload.applicationDeadline);
    if (Number.isNaN(deadline.getTime())) {
      return res.status(400).json({ message: "Invalid application deadline date." });
    }
    if (deadline <= new Date()) {
      return res.status(400).json({ message: "Application deadline must be in the future." });
    }

    const job = await Job.create({
      title: payload.title,
      company: payload.company,
      location: payload.location,
      description: payload.description,
      salary: payload.salary,
      applicationDeadline: deadline,
      tags: payload.tags,
      postedBy: req.user._id,
    });

    return res.status(201).json({ message: "Job posted successfully", job: sanitizeJob(job) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const first = error.issues[0];
      return res.status(400).json({ message: first?.message || "Invalid request payload", errors: error.issues });
    }
    return next(error);
  }
};

const listJobs = async (req, res, next) => {
  try {
    const { search, tag, mine } = req.query;

    const filter = {};

    if (mine === "true" && req.user) {
      filter.postedBy = req.user._id;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    if (tag) {
      filter.tags = { $in: [tag.toLowerCase()] };
    }

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .populate("postedBy", "fullName email")
      .lean();

    return res.status(200).json({ jobs: jobs.map(sanitizeJob) });
  } catch (error) {
    return next(error);
  }
};

const getJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const job = await Job.findById(id).populate("postedBy", "fullName email").lean();
    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    return res.status(200).json({ job: sanitizeJob(job) });
  } catch (error) {
    return next(error);
  }
};

const deleteJob = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid job ID." });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: "Job not found." });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own job postings." });
    }

    await job.deleteOne();
    return res.status(200).json({ message: "Job deleted successfully." });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createJob, listJobs, getJob, deleteJob };
