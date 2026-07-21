const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const DATA_XLSX_PATH = path.join(__dirname, "..", "data", "data.xlsx");
const SUBMISSIONS_DIR = path.join(__dirname, "..", "data", "submissions");

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["true", "1", "si", "sí", "x", "yes"].includes(value.trim().toLowerCase());
  }
  return false;
}

/**
 * Obtiene la definición de campos + previous_value para un ops leader.
 * Cada ops leader tiene su propia hoja en data.xlsx (nombre = username).
 * Si el usuario no tiene hoja propia todavía, se usa la primera hoja
 * disponible como plantilla de campos, sin previous_value.
 */
function getFieldsForUser(username) {
  if (!fs.existsSync(DATA_XLSX_PATH)) {
    throw new Error("No se encontró data.xlsx. Ejecuta 'npm run seed' en server/.");
  }
  const wb = XLSX.readFile(DATA_XLSX_PATH);
  const sheetName = wb.SheetNames.includes(username) ? username : wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  return rows.map((row) => ({
    id_field: String(row.id_field ?? ""),
    field_name: String(row.field_name ?? ""),
    field_label: String(row.field_label ?? row.field_name ?? ""),
    is_required: parseBoolean(row.is_required),
    previous_value:
      sheetName === username ? String(row.previous_value ?? "").trim() : "",
    data_type: String(row.data_type ?? "text").trim() || "text",
  }));
}

/**
 * Escribe un nuevo archivo xlsx con la plantilla enviada por el ops leader.
 * Devuelve { filePath, fileName }.
 */
function writeSubmissionWorkbook({ username, name, submittedAt, records }) {
  if (!fs.existsSync(SUBMISSIONS_DIR)) {
    fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
  }

  const rows = records.map((r) => ({
    id_field: r.id_field,
    field_name: r.field_name,
    submitted_value: r.submitted_value,
    previous_value: r.previous_value,
    ops_leader: name,
    timestamp: submittedAt,
  }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ["id_field", "field_name", "submitted_value", "previous_value", "ops_leader", "timestamp"],
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plantilla");

  const safeName = username.replace(/[^a-z0-9_-]/gi, "_");
  const stamp = submittedAt.replace(/[:.]/g, "-");
  const fileName = `plantilla_enviada_${safeName}_${stamp}.xlsx`;
  const filePath = path.join(SUBMISSIONS_DIR, fileName);

  XLSX.writeFile(wb, filePath);
  return { filePath, fileName };
}

/**
 * Actualiza la hoja del ops leader en data.xlsx con los valores recién
 * enviados, para que la próxima carga muestre estos como previous_value.
 */
function updatePreviousValues(username, valuesByFieldName) {
  const wb = XLSX.readFile(DATA_XLSX_PATH);
  const templateSheetName = wb.SheetNames.includes(username) ? username : wb.SheetNames[0];
  const templateRows = XLSX.utils.sheet_to_json(wb.Sheets[templateSheetName], { defval: "" });

  const updatedRows = templateRows.map((row) => ({
    id_field: row.id_field,
    field_name: row.field_name,
    field_label: row.field_label,
    is_required: row.is_required,
    previous_value: Object.prototype.hasOwnProperty.call(valuesByFieldName, row.field_name)
      ? valuesByFieldName[row.field_name]
      : row.previous_value ?? "",
    data_type: row.data_type,
  }));

  const ws = XLSX.utils.json_to_sheet(updatedRows, {
    header: ["id_field", "field_name", "field_label", "is_required", "previous_value", "data_type"],
  });

  if (wb.SheetNames.includes(username)) {
    wb.Sheets[username] = ws;
  } else {
    XLSX.utils.book_append_sheet(wb, ws, username);
  }

  XLSX.writeFile(wb, DATA_XLSX_PATH);
}

module.exports = {
  getFieldsForUser,
  writeSubmissionWorkbook,
  updatePreviousValues,
};
