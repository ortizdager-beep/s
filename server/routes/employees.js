const express = require("express");
const requireOpsLeader = require("../middleware/requireOpsLeader");
const { getEmployeesForUser, buildTemplateWorkbook } = require("../utils/excel");

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

router.get("/template", requireOpsLeader, (req, res) => {
  try {
    const { username, sheetName } = req.session.user;
    const buffer = buildTemplateWorkbook(sheetName);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="plantilla_${username}.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
