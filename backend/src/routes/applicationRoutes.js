const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const {
  applyToJob,
  listMyApplications,
  listApplicantsForJob,
  downloadApplicantsExcel,
  checkApplicationStatus,
} = require("../controllers/applicationController");

const router = express.Router();

router.get("/mine", requireAuth, listMyApplications);
router.post("/:jobId/apply", requireAuth, applyToJob);
router.get("/:jobId/check", requireAuth, checkApplicationStatus);
router.get("/:jobId/applicants", requireAuth, listApplicantsForJob);
router.get("/:jobId/applicants/download", requireAuth, downloadApplicantsExcel);

module.exports = router;
