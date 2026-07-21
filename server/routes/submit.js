const express = require("express");
const multer = require("multer");
const requireOpsLeader = require("../middleware/requireOpsLeader");
const { parseSubmissionWorkbook } = require("../utils/excel");
const { processSubmission, SubmissionValidationError } = require("../utils/submission");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const isXlsx =
      file.originalname.toLowerCase().endsWith(".xlsx") ||
      file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    cb(isXlsx ? null : new Error("El archivo debe ser un .xlsx"), isXlsx);
  },
});

router.post("/", requireOpsLeader, async (req, res) => {
  const { username, name, sheetName } = req.session.user;
  const submittedRows = (req.body && req.body.rows) || [];

  if (!Array.isArray(submittedRows) || submittedRows.length === 0) {
    return res.status(400).json({ error: "No se recibieron filas para enviar." });
  }

  try {
    const result = await processSubmission({ username, name, sheetName, submittedRows });
    res.json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof SubmissionValidationError) {
      return res.status(400).json(err.body);
    }
    console.error(err);
    res.status(500).json({ error: err.message || "No se pudo procesar el envío." });
  }
});

router.post("/upload", requireOpsLeader, (req, res) => {
  upload.single("file")(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ningún archivo." });
    }

    const { username, name, sheetName } = req.session.user;

    let submittedRows;
    try {
      submittedRows = parseSubmissionWorkbook(req.file.buffer);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    if (submittedRows.length === 0) {
      return res.status(400).json({ error: "El archivo no tiene filas con ID Employee." });
    }

    try {
      const result = await processSubmission({ username, name, sheetName, submittedRows });
      res.json({ ok: true, ...result });
    } catch (err) {
      if (err instanceof SubmissionValidationError) {
        return res.status(400).json(err.body);
      }
      console.error(err);
      res.status(500).json({ error: err.message || "No se pudo procesar el envío." });
    }
  });
});

module.exports = router;
