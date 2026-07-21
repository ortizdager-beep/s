const express = require("express");
const requireOpsLeader = require("../middleware/requireOpsLeader");
const { getEmployeesForUser } = require("../utils/excel");

const router = express.Router();

router.get("/", requireOpsLeader, (req, res) => {
  try {
    const data = getEmployeesForUser(req.session.user.sheetName);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
