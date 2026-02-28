const express = require("express");

const {
  requestSession,
  listSessions,
  acceptSession,
  rejectSession,
  rescheduleSession,
  confirmSession,
  cancelSession,
} = require("../controllers/sessionController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/request", requireAuth, requestSession);
router.get("/", requireAuth, listSessions);
router.patch("/:id/accept", requireAuth, acceptSession);
router.patch("/:id/reject", requireAuth, rejectSession);
router.patch("/:id/reschedule", requireAuth, rescheduleSession);
router.patch("/:id/confirm", requireAuth, confirmSession);
router.patch("/:id/cancel", requireAuth, cancelSession);

module.exports = router;
