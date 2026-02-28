const express = require("express");

const { listCounsellors } = require("../controllers/counsellorController");

const router = express.Router();

router.get("/", listCounsellors);

module.exports = router;
