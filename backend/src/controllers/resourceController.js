const mongoose = require("mongoose");
const { z } = require("zod");

const Resource = require("../models/Resource");

const createResourceSchema = z.object({
  title: z.string().trim().min(3, { message: "Title must be at least 3 characters" }).max(160),
  description: z.string().trim().min(10, { message: "Description must be at least 10 characters" }).max(500),
  type: z.enum(["article", "video", "template"]),
  category: z.enum(["resume", "interview", "job_search"]),
  url: z.string().trim().max(500).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
});

const normalizeExternalUrl = (value) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^www\./i.test(trimmed) || (!trimmed.includes(" ") && trimmed.includes("."))) {
    return `https://${trimmed}`;
  }

  return "";
};

const listResources = async (req, res, next) => {
  try {
    const { search = "", type = "", category = "", sortBy = "newest" } = req.query;

    const query = {};

    if (type) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $elemMatch: { $regex: search, $options: "i" } } },
      ];
    }

    const sort = sortBy === "popular" ? { likesCount: -1, createdAt: -1 } : { createdAt: -1 };

    const resources = await Resource.find(query)
      .sort(sort)
      .populate("createdBy", "fullName")
      .lean();

    const normalizedResources = resources.map((item) => ({
      id: item._id.toString(),
      title: item.title,
      description: item.description,
      type: item.type,
      category: item.category,
      url: item.url,
      tags: item.tags,
      likesCount: item.likesCount,
      createdAt: item.createdAt,
      createdBy: {
        id: item.createdBy?._id?.toString(),
        fullName: item.createdBy?.fullName || "Unknown",
      },
    }));

    return res.status(200).json({ resources: normalizedResources });
  } catch (error) {
    return next(error);
  }
};

const createResource = async (req, res, next) => {
  try {
    const payload = createResourceSchema.parse(req.body);

    const normalizedTags = Array.from(new Set(payload.tags.map((tag) => tag.trim()).filter(Boolean)));

    const normalizedUrl = normalizeExternalUrl(payload.url || "");
    if (payload.url && !normalizedUrl) {
      return res.status(400).json({ message: "Please provide a valid URL" });
    }

    const created = await Resource.create({
      title: payload.title,
      description: payload.description,
      type: payload.type,
      category: payload.category,
      url: normalizedUrl,
      tags: normalizedTags,
      createdBy: req.user._id,
    });

    const populated = await created.populate("createdBy", "fullName");

    return res.status(201).json({
      message: "Resource created successfully",
      resource: {
        id: populated._id.toString(),
        title: populated.title,
        description: populated.description,
        type: populated.type,
        category: populated.category,
        url: populated.url,
        tags: populated.tags,
        likesCount: populated.likesCount,
        createdAt: populated.createdAt,
        createdBy: {
          id: populated.createdBy?._id?.toString(),
          fullName: populated.createdBy?.fullName || "Unknown",
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: error.issues[0]?.message || "Invalid request payload",
        errors: error.issues,
      });
    }

    return next(error);
  }
};

const deleteResource = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string" || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid resource id" });
    }

    const resource = await Resource.findById(id);

    if (!resource) {
      return res.status(404).json({ message: "Resource not found" });
    }

    if (resource.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own resources" });
    }

    await resource.deleteOne();

    return res.status(200).json({ message: "Resource deleted" });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listResources,
  createResource,
  deleteResource,
};
