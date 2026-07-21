const path = require("path");
const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const { EDITABLE_COLUMNS } = require("../utils/columns");
const {
  getEmployeesForUser,
  writeSubmissionWorkbook,
  updatePreviousValues,
  computeCheckDistribution,
} = require("../utils/excel");
const { sendSubmissionEmail } = require("../utils/email");

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  const { username, name, sheetName } = req.session.user;
  const submittedRows = (req.body && req.body.rows) || [];

  if (!Array.isArray(submittedRows) || submittedRows.length === 0) {
    return res.status(400).json({ error: "No se recibieron filas para enviar." });
  }

  let employeeData;
  try {
    employeeData = getEmployeesForUser(sheetName);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }

  const employeesById = Object.fromEntries(employeeData.employees.map((e) => [e.id_employee, e]));

  const rowErrors = [];
  const mergedRows = [];

  submittedRows.forEach(({ id_employee, values }) => {
    const employee = employeesById[id_employee];
    if (!employee) {
      rowErrors.push({ id_employee, errors: ["Empleado no encontrado."] });
      return;
    }

    const submittedValues = values || {};
    const mergedEditable = {};
    const errors = [];

    EDITABLE_COLUMNS.forEach((col) => {
      const value = String(submittedValues[col.field_name] ?? "").trim();
      mergedEditable[col.field_name] = value;
      if (col.is_required && !value) {
        errors.push(`${col.field_label}: obligatorio.`);
      }
    });

    const checkValue = computeCheckDistribution({
      fte_pct: employee.readonly.fte_pct,
      ...mergedEditable,
    });
    if (checkValue !== "OK") {
      errors.push(`La distribución no suma 100% (${checkValue}).`);
    }

    if (errors.length > 0) {
      rowErrors.push({ id_employee, worker: employee.readonly.worker, errors });
    }

    mergedRows.push({ employee, mergedEditable, checkValue });
  });

  if (rowErrors.length > 0) {
    return res.status(400).json({ error: "Hay filas con errores de validación.", rowErrors });
  }

  const submittedAt = new Date().toISOString();
  const submissionRows = [];
  const rowsById = {};

  mergedRows.forEach(({ employee, mergedEditable, checkValue }) => {
    rowsById[employee.id_employee] = mergedEditable;
    EDITABLE_COLUMNS.forEach((col) => {
      submissionRows.push({
        id_employee: employee.id_employee,
        employee_name: employee.readonly.worker,
        field_name: col.field_name,
        field_label: col.field_label,
        submitted_value: mergedEditable[col.field_name],
        previous_value: employee.editable[col.field_name],
        check_distribution_sum: checkValue,
        ops_leader: name,
        timestamp: submittedAt,
      });
    });
  });

  let fileName;
  try {
    const written = writeSubmissionWorkbook({ username, name, submittedAt, submissionRows });
    fileName = written.fileName;
    updatePreviousValues(sheetName, rowsById);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "No se pudo guardar el archivo Excel de la plantilla." });
  }

  let emailInfo = { sent: false };
  try {
    const result = await sendSubmissionEmail({
      opsLeaderName: name,
      timestamp: submittedAt,
      employeeCount: mergedRows.length,
      attachmentPath: path.join(__dirname, "..", "data", "submissions", fileName),
      attachmentName: fileName,
    });
    emailInfo = { sent: true, previewUrl: result.previewUrl || null };
  } catch (err) {
    console.error("[email] Error al enviar el correo:", err.message);
    emailInfo = { sent: false, error: err.message };
  }

  res.json({ ok: true, fileName, submittedAt, employeeCount: mergedRows.length, email: emailInfo });
});

module.exports = router;
