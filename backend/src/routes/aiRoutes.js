const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  chatHandler,
  careerPathsHandler,
  resumeFeedbackHandler,
  fitScoreHandler,
  pathTreeHandler,
} = require("../controllers/aiController");

const router = express.Router();

/* PDF body is parsed globally by express.raw({ type: "application/pdf" }) */

router.post("/chat", requireAuth, chatHandler);
router.get("/career-paths", requireAuth, careerPathsHandler);
router.post("/resume-feedback", requireAuth, resumeFeedbackHandler);
router.post("/fit-score", requireAuth, fitScoreHandler);
router.post("/career-path-tree", requireAuth, pathTreeHandler);

module.exports = router;
