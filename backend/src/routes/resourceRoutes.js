const express = require("express");

const { listResources, createResource, deleteResource } = require("../controllers/resourceController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", listResources);
router.post("/", requireAuth, createResource);
router.delete("/:id", requireAuth, deleteResource);

module.exports = router;
