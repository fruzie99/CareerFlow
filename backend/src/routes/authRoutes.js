const express = require("express");

const { signup, login, updateProfile, getProfile } = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/profile", requireAuth, getProfile);
router.patch("/profile", requireAuth, updateProfile);

module.exports = router;
