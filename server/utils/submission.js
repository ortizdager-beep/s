const path = require("path");
const { EDITABLE_COLUMNS } = require("./columns");
const {
  getEmployeesForUser,
  writeSubmissionWorkbook,
  updatePreviousValues,
  computeCheckDistribution,
} = require("./excel");
const { sendSubmissionEmail } = require("./email");

class SubmissionValidationError extends Error {
  constructor(body) {
    super(body.error);
    this.body = body;
  }
}

/**
 * Valida, guarda y notifica por email una plantilla completada (ya sea
 * cargada a mano en la tabla o subida como Excel). submittedRows debe
 * cubrir exactamente el roster completo del ops leader: cada empleado de
 * su hoja tiene que estar presente, y no se aceptan IDs ajenos.
 */
async function processSubmission({ username, name, sheetName, submittedRows }) {
  const employeeData = getEmployeesForUser(sheetName);
  const employeesById = Object.fromEntries(employeeData.employees.map((e) => [String(e.id_employee), e]));

  const submittedById = new Map();
  const rowErrors = [];

  submittedRows.forEach(({ id_employee, values }) => {
    const key = String(id_employee);
    const employee = employeesById[key];
    if (!employee) {
      rowErrors.push({ id_employee, errors: ["Empleado no encontrado en tu listado."] });
      return;
    }
    submittedById.set(key, values || {});
  });

  const missingEmployees = employeeData.employees.filter((e) => !submittedById.has(String(e.id_employee)));
  if (missingEmployees.length > 0) {
    rowErrors.push(
      ...missingEmployees.map((e) => ({
        id_employee: e.id_employee,
        worker: e.readonly.worker,
        errors: ["Falta este empleado en el envío. Deben incluirse todos."],
      }))
    );
  }

  const mergedRows = [];

  employeeData.employees.forEach((employee) => {
    const key = String(employee.id_employee);
    if (!submittedById.has(key)) return;

    const submittedValues = submittedById.get(key);
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
      rowErrors.push({ id_employee: employee.id_employee, worker: employee.readonly.worker, errors });
    }

    mergedRows.push({ employee, mergedEditable, checkValue });
  });

  if (rowErrors.length > 0) {
    throw new SubmissionValidationError({ error: "Hay filas con errores de validación.", rowErrors });
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

  const { fileName } = writeSubmissionWorkbook({ username, name, submittedAt, submissionRows });
  updatePreviousValues(sheetName, rowsById);

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

  return { fileName, submittedAt, employeeCount: mergedRows.length, email: emailInfo };
}

module.exports = { processSubmission, SubmissionValidationError };
