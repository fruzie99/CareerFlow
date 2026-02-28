const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    salary: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    applicationDeadline: {
      type: Date,
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    postedBy: {
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

jobSchema.index({ applicationDeadline: 1 });
jobSchema.index({ title: "text", company: "text", tags: "text", location: "text" });

module.exports = mongoose.model("Job", jobSchema);
