const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const { createReply, listReplies, likeReply, deleteReply } = require("../controllers/communityReplyController");

const router = express.Router();

router.get("/:postId", requireAuth, listReplies);
router.post("/:postId", requireAuth, createReply);
router.patch("/:replyId/like", requireAuth, likeReply);
router.delete("/:replyId", requireAuth, deleteReply);

module.exports = router;
