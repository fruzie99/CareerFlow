const mongoose = require("mongoose");
const { z } = require("zod");

const CommunityPost = require("../models/CommunityPost");

const createPostSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
  body: z.string().trim().min(10, "Body must be at least 10 characters.").max(5000),
  category: z.enum(["resume_interview", "industry_insights", "networking_tips", "general"]).default("general"),
});

const sanitizePost = (post) => ({
  id: post._id.toString(),
  title: post.title,
  body: post.body,
  category: post.category,
  author: post.author?._id
    ? {
        id: post.author._id.toString(),
        fullName: post.author.fullName,
        role: post.author.role,
        profileImageUrl: post.author.profile?.profileImageUrl || "",
      }
    : post.author?.toString?.() || post.author,
  likesCount: post.likesCount,
  likedBy: (post.likedBy || []).map((id) => id.toString()),
  repliesCount: post.repliesCount,
  viewsCount: post.viewsCount,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
});

const createPost = async (req, res, next) => {
  try {
    const payload = createPostSchema.parse(req.body);

    const post = await CommunityPost.create({
      title: payload.title,
      body: payload.body,
      category: payload.category,
      author: req.user._id,
    });

    return res.status(201).json({ message: "Post created", post: sanitizePost(post) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || "Invalid request payload", errors: error.issues });
    }
    return next(error);
  }
};

const listPosts = async (req, res, next) => {
  try {
    const { search, category } = req.query;
    const filter = {};

    if (category && category !== "all") {
      filter.category = category;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const posts = await CommunityPost.find(filter)
      .sort({ createdAt: -1 })
      .populate("author", "fullName role profile.profileImageUrl")
      .lean();

    return res.status(200).json({ posts: posts.map(sanitizePost) });
  } catch (error) {
    return next(error);
  }
};

const getPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    const post = await CommunityPost.findById(id)
      .populate("author", "fullName role profile.profileImageUrl")
      .lean();

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    // Increment view count (fire-and-forget)
    CommunityPost.updateOne({ _id: id }, { $inc: { viewsCount: 1 } }).catch(() => {});

    return res.status(200).json({ post: sanitizePost({ ...post, viewsCount: post.viewsCount + 1 }) });
  } catch (error) {
    return next(error);
  }
};

const likePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    const post = await CommunityPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const userId = req.user._id;
    const alreadyLiked = post.likedBy.some((lid) => lid.toString() === userId.toString());

    if (alreadyLiked) {
      post.likedBy = post.likedBy.filter((lid) => lid.toString() !== userId.toString());
      post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
      post.likedBy.push(userId);
      post.likesCount += 1;
    }

    await post.save();

    return res.status(200).json({
      liked: !alreadyLiked,
      likesCount: post.likesCount,
    });
  } catch (error) {
    return next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    const post = await CommunityPost.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    if (post.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own posts." });
    }

    await post.deleteOne();

    // Also delete associated replies
    const CommunityReply = require("../models/CommunityReply");
    await CommunityReply.deleteMany({ postId: id });

    return res.status(200).json({ message: "Post deleted." });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createPost, listPosts, getPost, likePost, deletePost };
