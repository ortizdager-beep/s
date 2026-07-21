const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { KEY_FIELD, READONLY_COLUMNS, EDITABLE_COLUMNS, COMPUTED_COLUMN, SUM_GROUPS, SOURCE_HEADER_ORDER } = require("./columns");

const DATA_XLSX_PATH = path.join(__dirname, "..", "data", "data.xlsx");
const SUBMISSIONS_DIR = path.join(__dirname, "..", "data", "submissions");

const ALL_COLUMNS = [...READONLY_COLUMNS, ...EDITABLE_COLUMNS];
const LABEL_TO_NAME = Object.fromEntries(ALL_COLUMNS.map((c) => [c.field_label, c.field_name]));
const NAME_TO_LABEL = Object.fromEntries(ALL_COLUMNS.map((c) => [c.field_name, c.field_label]));

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Calcula "check distribution sum" para una fila (valores ya en formato
 * field_name -> value). Se omite la exigencia de que sumen 1 cuando el
 * FTE % es 0 (empleado sin asignación activa), igual que en la data real.
 */
function computeCheckDistribution(rowValues) {
  const fte = toNumber(rowValues.fte_pct);
  if (fte === 0) return "OK";

  const allGroupsOk = SUM_GROUPS.every((group) => {
    const sum = group.fields.reduce((acc, f) => acc + toNumber(rowValues[f]), 0);
    return Math.abs(sum - 1) < 0.001;
  });
  return allGroupsOk ? "OK" : "Not 100%";
}

function readSheetRows(sheetName) {
  if (!fs.existsSync(DATA_XLSX_PATH)) {
    throw new Error("No se encontró data.xlsx en server/data/.");
  }
  const wb = XLSX.readFile(DATA_XLSX_PATH);
  if (!wb.SheetNames.includes(sheetName)) {
    throw new Error(`No existe la hoja "${sheetName}" en data.xlsx.`);
  }
  return { wb, rows: XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" }) };
}

/**
 * Devuelve la definición de columnas (para que el frontend sepa qué
 * mostrar/editar) y la lista de empleados de la hoja del ops leader,
 * con los valores actuales de data.xlsx como previous_value.
 */
function getEmployeesForUser(sheetName) {
  const { rows } = readSheetRows(sheetName);

  const employees = rows.map((row) => {
    const readonly = {};
    READONLY_COLUMNS.forEach((c) => {
      readonly[c.field_name] = row[c.field_label] ?? "";
    });

    const editable = {};
    EDITABLE_COLUMNS.forEach((c) => {
      editable[c.field_name] = String(row[c.field_label] ?? "").trim();
    });

    return {
      id_employee: readonly.id_employee,
      readonly,
      editable,
      check_distribution_sum: String(row[COMPUTED_COLUMN.field_label] ?? "").trim(),
    };
  });

  return {
    readonlyColumns: READONLY_COLUMNS,
    editableColumns: EDITABLE_COLUMNS,
    computedColumn: COMPUTED_COLUMN,
    sumGroups: SUM_GROUPS,
    employees,
  };
}

/**
 * Escribe el Excel de auditoría de un envío, en formato "largo": una fila
 * por (empleado, campo) para que quede trazado el valor anterior y el nuevo.
 */
function writeSubmissionWorkbook({ username, name, submittedAt, submissionRows }) {
  if (!fs.existsSync(SUBMISSIONS_DIR)) {
    fs.mkdirSync(SUBMISSIONS_DIR, { recursive: true });
  }

  const ws = XLSX.utils.json_to_sheet(submissionRows, {
    header: [
      "id_employee",
      "employee_name",
      "field_name",
      "field_label",
      "submitted_value",
      "previous_value",
      "check_distribution_sum",
      "ops_leader",
      "timestamp",
    ],
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
 * Actualiza en data.xlsx los valores editables recién enviados para cada
 * empleado (para que la próxima carga los muestre como previous_value), y
 * recalcula "check distribution sum".
 */
function updatePreviousValues(sheetName, rowsById) {
  const { wb, rows } = readSheetRows(sheetName);

  const updatedRows = rows.map((row) => {
    const idEmployee = row[NAME_TO_LABEL[KEY_FIELD]];
    const update = rowsById[idEmployee];
    if (!update) return row;

    const nextRow = { ...row };
    EDITABLE_COLUMNS.forEach((c) => {
      if (Object.prototype.hasOwnProperty.call(update, c.field_name)) {
        nextRow[c.field_label] = update[c.field_name];
      }
    });

    const valuesByFieldName = {};
    [...READONLY_COLUMNS, ...EDITABLE_COLUMNS].forEach((c) => {
      valuesByFieldName[c.field_name] = nextRow[c.field_label];
    });
    nextRow[COMPUTED_COLUMN.field_label] = computeCheckDistribution(valuesByFieldName);

    return nextRow;
  });

  const ws = XLSX.utils.json_to_sheet(updatedRows, { header: SOURCE_HEADER_ORDER });
  wb.Sheets[sheetName] = ws;
  XLSX.writeFile(wb, DATA_XLSX_PATH);
}

module.exports = {
  LABEL_TO_NAME,
  NAME_TO_LABEL,
  computeCheckDistribution,
  getEmployeesForUser,
  writeSubmissionWorkbook,
  updatePreviousValues,
};
