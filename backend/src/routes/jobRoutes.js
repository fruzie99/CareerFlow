const express = require("express");
const { requireAuth } = require("../middleware/authMiddleware");
const { createJob, listJobs, getJob, deleteJob } = require("../controllers/jobController");

const router = express.Router();

router.get("/", requireAuth, listJobs);
router.post("/", requireAuth, createJob);
router.get("/:id", requireAuth, getJob);
router.delete("/:id", requireAuth, deleteJob);

module.exports = router;
