const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema(
  {
    degree: { type: String, trim: true },
    institution: { type: String, trim: true },
    fieldOfStudy: { type: String, trim: true },
    gpa: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { _id: false }
);

const experienceSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    company: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["job_seeker", "career_counselor", "admin"],
      default: "job_seeker",
    },
    profile: {
      bio: { type: String, default: "", trim: true },
      profileImageUrl: { type: String, default: "", trim: true },
      location: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
      skills: { type: [String], default: [] },
      careerInterests: { type: [String], default: [] },
      socialLinks: {
        linkedin: { type: String, default: "", trim: true },
        github: { type: String, default: "", trim: true },
        portfolio: { type: String, default: "", trim: true },
        website: { type: String, default: "", trim: true },
      },
      education: { type: [educationSchema], default: [] },
      experience: { type: [experienceSchema], default: [] },
      profileCompletionScore: { type: Number, default: 0, min: 0, max: 100 },
    },
    preferences: {
      darkModeEnabled: { type: Boolean, default: false },
      emailNotificationsEnabled: { type: Boolean, default: true },
      jobAlertsEnabled: { type: Boolean, default: true },
    },
    authProviders: {
      googleId: { type: String, default: null },
      linkedInId: { type: String, default: null },
    },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ role: 1 });
userSchema.index({ "profile.careerInterests": 1 });

module.exports = mongoose.model("User", userSchema);
