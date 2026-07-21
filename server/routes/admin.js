const express = require("express");
const multer = require("multer");
const requireAdmin = require("../middleware/requireAdmin");
const { replaceDataWorkbook } = require("../utils/excel");
const { syncOpsLeadersFromSheetNames } = require("../utils/users");

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

router.post("/upload", requireAdmin, (req, res) => {
  upload.single("file")(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No se recibió ningún archivo." });
    }

    let sheetNames;
    try {
      sheetNames = replaceDataWorkbook(req.file.buffer);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    let syncResult;
    try {
      syncResult = syncOpsLeadersFromSheetNames(sheetNames);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "El archivo se guardó, pero no se pudieron sincronizar las cuentas de ops leader." });
    }

    res.json({ ok: true, sheetNames, ...syncResult });
  });
});

module.exports = router;
