const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const { getFieldsForUser } = require("../utils/excel");

const router = express.Router();

router.get("/", requireAuth, (req, res) => {
  try {
    const fields = getFieldsForUser(req.session.user.username);
    res.json({ fields });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
