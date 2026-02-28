const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const User = require("../models/User");

const signupSchema = z
  .object({
    fullName: z.string().min(2).max(100),
    email: z.email().toLowerCase(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
    role: z.enum(["job_seeker", "career_counselor"]).default("job_seeker"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(128),
});

const profileUpdateSchema = z.object({
  bio: z.string().trim().max(200).optional(),
  profileImageUrl: z.string().trim().max(500).optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(80).default([]),
  careerInterests: z.array(z.string().trim().min(2).max(80)).max(50).default([]),
  education: z
    .array(
      z.object({
        degree: z.string().trim().max(120).optional(),
        institution: z.string().trim().max(120).optional(),
        fieldOfStudy: z.string().trim().max(120).optional(),
        gpa: z.string().trim().max(30).optional(),
        startDate: z.string().trim().optional(),
        endDate: z.string().trim().optional(),
      })
    )
    .max(20)
    .default([]),
  experience: z
    .array(
      z.object({
        title: z.string().trim().max(120).optional(),
        company: z.string().trim().max(120).optional(),
        startDate: z.string().trim().optional(),
        endDate: z.string().trim().optional(),
        description: z.string().trim().max(500).optional(),
      })
    )
    .max(20)
    .default([]),
  socialLinks: z
    .object({
      linkedin: z.string().trim().max(300).optional(),
      github: z.string().trim().max(300).optional(),
      portfolio: z.string().trim().max(300).optional(),
      website: z.string().trim().max(300).optional(),
    })
    .default({}),
});

const friendlyFieldLabels = {
  fullName: "Full name",
  email: "Email",
  password: "Password",
  confirmPassword: "Confirm password",
  role: "Role",
  bio: "Bio",
  skills: "Skills",
  careerInterests: "Career interests",
};

const buildFriendlyZodMessage = (zodError) => {
  const first = zodError.issues[0];
  if (!first) return "Invalid request payload";

  const field = first.path?.[0];
  const label = friendlyFieldLabels[field] || field || "Field";

  if (first.code === "too_small" && first.minimum != null) {
    return `${label} must be at least ${first.minimum} characters.`;
  }

  if (first.code === "too_big" && first.maximum != null) {
    return `${label} must be at most ${first.maximum} characters.`;
  }

  if (first.code === "invalid_format" && first.format === "email") {
    return "Please enter a valid email address (e.g. name@example.com).";
  }

  if (first.code === "invalid_type") {
    return `${label} is required.`;
  }

  if (first.message && first.message !== "Invalid input") {
    return first.message;
  }

  return `${label}: invalid value.`;
};

const createToken = (userId, role) => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }

  return jwt.sign({ sub: userId, role }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const sanitizeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  profile: user.profile,
  preferences: user.preferences,
  createdAt: user.createdAt,
});

const calculateProfileCompletionScore = (user) => {
  let score = 10;

  if (user.profile?.profileImageUrl?.trim()) {
    score += 10;
  }

  if (user.profile?.bio?.trim()) {
    score += 15;
  }

  if (user.profile?.skills?.length) {
    score += 20;
  }

  if (user.profile?.careerInterests?.length) {
    score += 20;
  }

  if (user.profile?.education?.length) {
    score += 15;
  }

  if (user.profile?.experience?.length) {
    score += 15;
  }

  const socialLinks = user.profile?.socialLinks || {};
  const hasAnySocialLink = Object.values(socialLinks).some((value) => typeof value === "string" && value.trim());

  if (hasAnySocialLink) {
    score += 15;
  }

  return Math.min(score, 100);
};

const signup = async (req, res, next) => {
  try {
    const payload = signupSchema.parse(req.body);

    const existingUser = await User.findOne({ email: payload.email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await User.create({
      fullName: payload.fullName,
      email: payload.email,
      passwordHash,
      role: payload.role,
    });

    const token = createToken(user._id.toString(), user.role);

    return res.status(201).json({
      message: "Signup successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: buildFriendlyZodMessage(error),
        errors: error.issues,
      });
    }

    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);

    const user = await User.findOne({ email: payload.email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = createToken(user._id.toString(), user.role);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: buildFriendlyZodMessage(error),
        errors: error.issues,
      });
    }

    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const payload = profileUpdateSchema.parse(req.body);

    const normalizedSkills = Array.from(new Set(payload.skills.map((skill) => skill.trim()).filter(Boolean)));

    const normalizedInterests = Array.from(
      new Set(payload.careerInterests.map((interest) => interest.trim()).filter(Boolean))
    );

    const normalizeDate = (value) => {
      if (!value) {
        return undefined;
      }

      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    };

    const normalizedEducation = payload.education
      .map((item) => ({
        degree: item.degree || "",
        institution: item.institution || "",
        fieldOfStudy: item.fieldOfStudy || "",
        gpa: item.gpa || "",
        startDate: normalizeDate(item.startDate),
        endDate: normalizeDate(item.endDate),
      }))
      .filter((item) => item.degree || item.institution || item.fieldOfStudy || item.gpa || item.startDate || item.endDate);

    const normalizedExperience = payload.experience
      .map((item) => ({
        title: item.title || "",
        company: item.company || "",
        startDate: normalizeDate(item.startDate),
        endDate: normalizeDate(item.endDate),
        description: item.description || "",
      }))
      .filter((item) => item.title || item.company || item.description || item.startDate || item.endDate);

    req.user.profile.bio = payload.bio || "";
    req.user.profile.profileImageUrl = payload.profileImageUrl || "";
    req.user.profile.skills = normalizedSkills;
    req.user.profile.careerInterests = normalizedInterests;
    req.user.profile.education = normalizedEducation;
    req.user.profile.experience = normalizedExperience;
    req.user.profile.socialLinks = {
      linkedin: payload.socialLinks.linkedin || "",
      github: payload.socialLinks.github || "",
      portfolio: payload.socialLinks.portfolio || "",
      website: payload.socialLinks.website || "",
    };
    req.user.profile.profileCompletionScore = calculateProfileCompletionScore(req.user);

    await req.user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: buildFriendlyZodMessage(error),
        errors: error.issues,
      });
    }

    return next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    return res.status(200).json({
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  signup,
  login,
  updateProfile,
  getProfile,
};
