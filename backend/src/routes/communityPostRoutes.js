const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const { createPost, listPosts, getPost, likePost, deletePost } = require("../controllers/communityPostController");

const router = express.Router();

router.get("/", requireAuth, listPosts);
router.post("/", requireAuth, createPost);
router.get("/:id", requireAuth, getPost);
router.patch("/:id/like", requireAuth, likePost);
router.delete("/:id", requireAuth, deletePost);

module.exports = router;
