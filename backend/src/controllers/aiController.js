const { z } = require("zod");
const User = require("../models/User");
const gemini = require("../services/geminiService");

/* ─── Chat ─── */

const chatSchema = z.object({
  message: z.string().trim().min(1, "Message is required").max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        parts: z.array(z.object({ text: z.string() })),
      })
    )
    .max(50)
    .optional()
    .default([]),
  context: z.string().trim().max(5000).optional().default(""),
});

const chatHandler = async (req, res, next) => {
  try {
    const payload = chatSchema.parse(req.body);
    const user = await User.findById(req.user._id).lean();
    const profileCtx = gemini.buildProfileContext(user);
    const fullContext = [profileCtx, payload.context].filter(Boolean).join("\n\n");

    const reply = await gemini.chat(payload.message, fullContext, payload.history);
    return res.status(200).json({ reply });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || "Invalid request" });
    }
    console.error("AI chat error:", error.message, error.stack);
    return res.status(500).json({ message: "AI service is temporarily unavailable. Please try again.", debug: error.message });
  }
};

/* ─── Career Paths ─── */

const careerPathsHandler = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).lean();
    const data = await gemini.generateCareerPaths(user);
    return res.status(200).json(data);
  } catch (error) {
    console.error("AI career paths error:", error.message, error.stack);
    return res.status(500).json({ message: "Could not generate career paths. Please try again.", debug: error.message });
  }
};

/* ─── Resume Feedback ─── */

const resumeFeedbackHandler = async (req, res, next) => {
  try {
    if (!req.body || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({ message: "Please upload a PDF file." });
    }
    const user = await User.findById(req.user._id).lean();
    const profileCtx = gemini.buildProfileContext(user);
    const data = await gemini.analyzeResume(req.body, profileCtx);
    return res.status(200).json(data);
  } catch (error) {
    console.error("AI resume error:", error.message, error.stack);
    return res.status(500).json({ message: "Could not analyze resume. Please try again.", debug: error.message });
  }
};

/* ─── Fit Score ─── */

const fitScoreSchema = z.object({
  jobDescription: z.string().trim().min(10, "Job description is too short").max(5000),
});

const fitScoreHandler = async (req, res, next) => {
  try {
    const payload = fitScoreSchema.parse(req.body);
    const user = await User.findById(req.user._id).lean();
    const data = await gemini.fitScore(user, payload.jobDescription);
    return res.status(200).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || "Invalid request" });
    }
    console.error("AI fit score error:", error.message, error.stack);
    return res.status(500).json({ message: "Could not calculate fit score. Please try again.", debug: error.message });
  }
};

/* ─── Career Path Tree ─── */

const pathTreeSchema = z.object({
  goalRole: z.string().trim().min(2, "Goal role is required").max(200),
});

const pathTreeHandler = async (req, res, next) => {
  try {
    const payload = pathTreeSchema.parse(req.body);
    const user = await User.findById(req.user._id).lean();
    const data = await gemini.generateCareerPathTree(user, payload.goalRole);
    return res.status(200).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || "Invalid request" });
    }
    console.error("AI path tree error:", error.message, error.stack);
    return res.status(500).json({ message: "Could not generate career path. Please try again.", debug: error.message });
  }
};

module.exports = {
  chatHandler,
  careerPathsHandler,
  resumeFeedbackHandler,
  fitScoreHandler,
  pathTreeHandler,
};
