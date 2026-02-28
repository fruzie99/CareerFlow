const mongoose = require("mongoose");
const { z } = require("zod");

const CommunityReply = require("../models/CommunityReply");
const CommunityPost = require("../models/CommunityPost");

const createReplySchema = z.object({
  body: z.string().trim().min(1, "Reply cannot be empty.").max(3000),
});

const sanitizeReply = (reply) => ({
  id: reply._id.toString(),
  postId: reply.postId?.toString?.() || reply.postId,
  author: reply.author?._id
    ? {
        id: reply.author._id.toString(),
        fullName: reply.author.fullName,
        role: reply.author.role,
        profileImageUrl: reply.author.profile?.profileImageUrl || "",
      }
    : reply.author?.toString?.() || reply.author,
  body: reply.body,
  likesCount: reply.likesCount,
  likedBy: (reply.likedBy || []).map((id) => id.toString()),
  createdAt: reply.createdAt,
  updatedAt: reply.updatedAt,
});

const createReply = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    const post = await CommunityPost.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const payload = createReplySchema.parse(req.body);

    const reply = await CommunityReply.create({
      postId,
      author: req.user._id,
      body: payload.body,
    });

    post.repliesCount += 1;
    await post.save();

    return res.status(201).json({ message: "Reply added", reply: sanitizeReply(reply) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.issues[0]?.message || "Invalid request payload", errors: error.issues });
    }
    return next(error);
  }
};

const listReplies = async (req, res, next) => {
  try {
    const { postId } = req.params;
    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: "Invalid post ID." });
    }

    const replies = await CommunityReply.find({ postId })
      .sort({ createdAt: 1 })
      .populate("author", "fullName role profile.profileImageUrl")
      .lean();

    return res.status(200).json({ replies: replies.map(sanitizeReply) });
  } catch (error) {
    return next(error);
  }
};

const likeReply = async (req, res, next) => {
  try {
    const { replyId } = req.params;
    if (!mongoose.isValidObjectId(replyId)) {
      return res.status(400).json({ message: "Invalid reply ID." });
    }

    const reply = await CommunityReply.findById(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found." });
    }

    const userId = req.user._id;
    const alreadyLiked = reply.likedBy.some((lid) => lid.toString() === userId.toString());

    if (alreadyLiked) {
      reply.likedBy = reply.likedBy.filter((lid) => lid.toString() !== userId.toString());
      reply.likesCount = Math.max(0, reply.likesCount - 1);
    } else {
      reply.likedBy.push(userId);
      reply.likesCount += 1;
    }

    await reply.save();

    return res.status(200).json({ liked: !alreadyLiked, likesCount: reply.likesCount });
  } catch (error) {
    return next(error);
  }
};

const deleteReply = async (req, res, next) => {
  try {
    const { replyId } = req.params;
    if (!mongoose.isValidObjectId(replyId)) {
      return res.status(400).json({ message: "Invalid reply ID." });
    }

    const reply = await CommunityReply.findById(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found." });
    }

    if (reply.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own replies." });
    }

    await reply.deleteOne();

    await CommunityPost.updateOne({ _id: reply.postId }, { $inc: { repliesCount: -1 } });

    return res.status(200).json({ message: "Reply deleted." });
  } catch (error) {
    return next(error);
  }
};

module.exports = { createReply, listReplies, likeReply, deleteReply };
