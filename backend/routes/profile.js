const express = require("express");
const { requireUser } = require("../middleware/userContext");
const { sanitizeText } = require("../middleware/validate");
const { getUserProfile, updateUserProfile } = require("../database/db");

const router = express.Router();

router.use(requireUser);

router.get("/", (req, res) => {
  try {
    res.json(getUserProfile(req.userId));
  } catch (err) {
    console.error("GET /profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/", (req, res) => {
  try {
    const displayName = sanitizeText(req.body?.displayName, 120);
    const profile = updateUserProfile(req.userId, displayName);
    res.json(profile);
  } catch (err) {
    console.error("PUT /profile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
