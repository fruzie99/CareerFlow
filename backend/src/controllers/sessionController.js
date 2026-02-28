const mongoose = require("mongoose");
const { z } = require("zod");

const Session = require("../models/Session");
const User = require("../models/User");

/* ──────── helpers ──────── */

const sanitizeSession = (s) => ({
  id: s._id.toString(),
  jobSeeker: s.jobSeekerId
    ? { id: s.jobSeekerId._id?.toString() || s.jobSeekerId.toString(), fullName: s.jobSeekerId.fullName || "Unknown" }
    : null,
  counselor: s.counselorId
    ? { id: s.counselorId._id?.toString() || s.counselorId.toString(), fullName: s.counselorId.fullName || "Unknown" }
    : null,
  scheduledAt: s.scheduledAt,
  rescheduledAt: s.rescheduledAt,
  status: s.status,
  notes: s.notes,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

const populateFields = [
  { path: "jobSeekerId", select: "fullName" },
  { path: "counselorId", select: "fullName" },
];

/* ──────── schemas ──────── */

const requestSessionSchema = z.object({
  counselorId: z.string().min(1, { message: "Counselor is required" }),
  scheduledAt: z.string().min(1, { message: "Date & time is required" }),
  notes: z.string().trim().max(500).optional().default(""),
});

const rescheduleSchema = z.object({
  rescheduledAt: z.string().min(1, { message: "New date & time is required" }),
});

/* ──────── request a session (Job Seeker) ──────── */

const requestSession = async (req, res, next) => {
  try {
    if (req.user.role !== "job_seeker") {
      return res.status(403).json({ message: "Only job seekers can request sessions" });
    }

    const payload = requestSessionSchema.parse(req.body);

    if (!mongoose.isValidObjectId(payload.counselorId)) {
      return res.status(400).json({ message: "Invalid counselor id" });
    }

    const counselor = await User.findOne({ _id: payload.counselorId, role: "career_counselor", isActive: true });
    if (!counselor) {
      return res.status(404).json({ message: "Counselor not found" });
    }

    const scheduledAt = new Date(payload.scheduledAt);
    if (isNaN(scheduledAt.getTime()) || scheduledAt < new Date()) {
      return res.status(400).json({ message: "Please select a future date and time" });
    }

    const session = await Session.create({
      jobSeekerId: req.user._id,
      counselorId: counselor._id,
      scheduledAt,
      notes: payload.notes,
    });

    const populated = await session.populate(populateFields);

    return res.status(201).json({ message: "Session request sent", session: sanitizeSession(populated) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || "Invalid payload" });
    }
    return next(error);
  }
};

/* ──────── list sessions (role-based) ──────── */

const listSessions = async (req, res, next) => {
  try {
    const query =
      req.user.role === "career_counselor"
        ? { counselorId: req.user._id }
        : { jobSeekerId: req.user._id };

    const sessions = await Session.find(query)
      .sort({ createdAt: -1 })
      .populate(populateFields)
      .lean();

    return res.status(200).json({ sessions: sessions.map(sanitizeSession) });
  } catch (error) {
    return next(error);
  }
};

/* ──────── status‐change helpers ──────── */

const findSessionOrFail = async (id, res) => {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ message: "Invalid session id" });
    return null;
  }

  const session = await Session.findById(id).populate(populateFields);
  if (!session) {
    res.status(404).json({ message: "Session not found" });
    return null;
  }

  return session;
};

/* ──────── accept (Counselor) ──────── */

const acceptSession = async (req, res, next) => {
  try {
    const session = await findSessionOrFail(req.params.id, res);
    if (!session) return;

    if (session.counselorId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not your session" });
    }
    if (session.status !== "pending") {
      return res.status(400).json({ message: `Cannot accept a session that is ${session.status}` });
    }

    session.status = "accepted";
    await session.save();

    return res.status(200).json({ message: "Session accepted", session: sanitizeSession(session) });
  } catch (error) {
    return next(error);
  }
};

/* ──────── reject (Counselor) ──────── */

const rejectSession = async (req, res, next) => {
  try {
    const session = await findSessionOrFail(req.params.id, res);
    if (!session) return;

    if (session.counselorId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not your session" });
    }
    if (session.status !== "pending") {
      return res.status(400).json({ message: `Cannot reject a session that is ${session.status}` });
    }

    session.status = "rejected";
    await session.save();

    return res.status(200).json({ message: "Session rejected", session: sanitizeSession(session) });
  } catch (error) {
    return next(error);
  }
};

/* ──────── reschedule (Counselor) ──────── */

const rescheduleSession = async (req, res, next) => {
  try {
    const session = await findSessionOrFail(req.params.id, res);
    if (!session) return;

    if (session.counselorId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not your session" });
    }
    if (!["pending", "accepted"].includes(session.status)) {
      return res.status(400).json({ message: `Cannot reschedule a session that is ${session.status}` });
    }

    const payload = rescheduleSchema.parse(req.body);
    const newDate = new Date(payload.rescheduledAt);

    if (isNaN(newDate.getTime()) || newDate < new Date()) {
      return res.status(400).json({ message: "Please select a future date and time" });
    }

    session.rescheduledAt = newDate;
    session.status = "rescheduled";
    await session.save();

    return res.status(200).json({ message: "Session rescheduled", session: sanitizeSession(session) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || "Invalid payload" });
    }
    return next(error);
  }
};

/* ──────── confirm (Job Seeker – after reschedule) ──────── */

const confirmSession = async (req, res, next) => {
  try {
    const session = await findSessionOrFail(req.params.id, res);
    if (!session) return;

    if (session.jobSeekerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not your session" });
    }
    if (session.status !== "rescheduled") {
      return res.status(400).json({ message: `Cannot confirm a session that is ${session.status}` });
    }

    session.scheduledAt = session.rescheduledAt;
    session.rescheduledAt = null;
    session.status = "confirmed";
    await session.save();

    return res.status(200).json({ message: "Session confirmed", session: sanitizeSession(session) });
  } catch (error) {
    return next(error);
  }
};

/* ──────── cancel (Job Seeker) ──────── */

const cancelSession = async (req, res, next) => {
  try {
    const session = await findSessionOrFail(req.params.id, res);
    if (!session) return;

    if (session.jobSeekerId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not your session" });
    }
    if (["cancelled", "rejected"].includes(session.status)) {
      return res.status(400).json({ message: `Session is already ${session.status}` });
    }

    session.status = "cancelled";
    await session.save();

    return res.status(200).json({ message: "Session cancelled", session: sanitizeSession(session) });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  requestSession,
  listSessions,
  acceptSession,
  rejectSession,
  rescheduleSession,
  confirmSession,
  cancelSession,
};
