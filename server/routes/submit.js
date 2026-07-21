const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const { getFieldsForUser, writeSubmissionWorkbook, updatePreviousValues } = require("../utils/excel");
const { sendSubmissionEmail } = require("../utils/email");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const { username, name } = req.session.user;
  const values = (req.body && req.body.values) || {};

  let fields;
  try {
    fields = getFieldsForUser(username);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }

  const missing = fields.filter((f) => f.is_required && !String(values[f.field_name] ?? "").trim());
  if (missing.length > 0) {
    return res.status(400).json({
      error: "Faltan campos obligatorios.",
      missingFields: missing.map((f) => f.field_name),
    });
  }

  const submittedAt = new Date().toISOString();
  const records = fields.map((f) => ({
    id_field: f.id_field,
    field_name: f.field_name,
    field_label: f.field_label,
    submitted_value: String(values[f.field_name] ?? "").trim(),
    previous_value: f.previous_value,
  }));

  let fileName;
  try {
    const written = writeSubmissionWorkbook({ username, name, submittedAt, records });
    fileName = written.fileName;

    const valuesByFieldName = {};
    records.forEach((r) => {
      if (r.submitted_value) valuesByFieldName[r.field_name] = r.submitted_value;
    });
    updatePreviousValues(username, valuesByFieldName);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "No se pudo guardar el archivo Excel de la plantilla." });
  }

  let emailInfo = { sent: false };
  try {
    const result = await sendSubmissionEmail({
      opsLeaderName: name,
      timestamp: submittedAt,
      records,
      attachmentPath: require("path").join(__dirname, "..", "data", "submissions", fileName),
      attachmentName: fileName,
    });
    emailInfo = { sent: true, previewUrl: result.previewUrl || null };
  } catch (err) {
    console.error("[email] Error al enviar el correo:", err.message);
    emailInfo = { sent: false, error: err.message };
  }

  res.json({
    ok: true,
    fileName,
    submittedAt,
    email: emailInfo,
  });
});

module.exports = router;
