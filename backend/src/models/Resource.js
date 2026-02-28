const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      enum: ["article", "video", "template"],
      required: true,
    },
    category: {
      type: String,
      enum: ["resume", "interview", "job_search"],
      required: true,
    },
    url: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    tags: {
      type: [String],
      default: [],
    },
    likesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

resourceSchema.index({ type: 1, category: 1, createdAt: -1 });
resourceSchema.index({ title: "text", description: "text", tags: "text" });

module.exports = mongoose.model("Resource", resourceSchema);
