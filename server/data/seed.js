/*
 * Genera server/data/users.json y server/data/data.xlsx con datos de ejemplo.
 * Ejecutar con: npm run seed (desde server/)
 *
 * data.xlsx contiene una hoja por cada ops leader (nombre = username).
 * Todas las hojas comparten la misma definición de campos, pero cada una
 * trae su propio previous_value (el último valor que ese ops leader envió).
 */
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const XLSX = require("xlsx");

const USERS = [
  { username: "jperez", password: "ops2024", name: "Juan Pérez" },
  { username: "mgarcia", password: "ops2024", name: "María García" },
  { username: "lrodriguez", password: "ops2024", name: "Luis Rodríguez" },
];

// Definición de campos (igual para todos los ops leaders).
const FIELD_DEFS = [
  { id_field: "F001", field_name: "unidad_negocio", field_label: "Unidad de negocio", is_required: true, data_type: "text" },
  { id_field: "F002", field_name: "volumen_procesado", field_label: "Volumen procesado (unidades)", is_required: true, data_type: "number" },
  { id_field: "F003", field_name: "fte_asignados", field_label: "FTEs asignados", is_required: true, data_type: "number" },
  { id_field: "F004", field_name: "fecha_corte", field_label: "Fecha de corte", is_required: true, data_type: "date" },
  { id_field: "F005", field_name: "incidencias_criticas", field_label: "Incidencias críticas del período", is_required: false, data_type: "number" },
  { id_field: "F006", field_name: "sla_cumplido", field_label: "% SLA cumplido", is_required: true, data_type: "number" },
  { id_field: "F007", field_name: "responsable_email", field_label: "Email del responsable", is_required: true, data_type: "email" },
  { id_field: "F008", field_name: "comentarios", field_label: "Comentarios adicionales", is_required: false, data_type: "textarea" },
];

// Últimos valores enviados por cada ops leader (para simular historial previo).
const PREVIOUS_VALUES = {
  jperez: {
    unidad_negocio: "Contact Center LATAM",
    volumen_procesado: "18450",
    fte_asignados: "42",
    fecha_corte: "2026-06-30",
    incidencias_criticas: "2",
    sla_cumplido: "97.5",
    responsable_email: "jperez@empresa.com",
    comentarios: "Cierre de mes sin novedades relevantes.",
  },
  mgarcia: {
    unidad_negocio: "Back Office Financiero",
    volumen_procesado: "9820",
    fte_asignados: "16",
    fecha_corte: "2026-06-30",
    incidencias_criticas: "",
    sla_cumplido: "99.1",
    responsable_email: "mgarcia@empresa.com",
    comentarios: "",
  },
  // lrodriguez no tiene envíos previos todavía.
  lrodriguez: {},
};

function buildUsers() {
  const users = USERS.map((u) => ({
    username: u.username,
    name: u.name,
    passwordHash: bcrypt.hashSync(u.password, 10),
  }));
  fs.writeFileSync(
    path.join(__dirname, "users.json"),
    JSON.stringify(users, null, 2)
  );
  console.log("users.json generado con", users.length, "usuarios.");
  console.log("Credenciales de prueba (usuario / contraseña):");
  USERS.forEach((u) => console.log(`  - ${u.username} / ${u.password}`));
}

function buildWorkbook() {
  const wb = XLSX.utils.book_new();

  USERS.forEach(({ username }) => {
    const prev = PREVIOUS_VALUES[username] || {};
    const rows = FIELD_DEFS.map((f) => ({
      id_field: f.id_field,
      field_name: f.field_name,
      field_label: f.field_label,
      is_required: f.is_required,
      previous_value: prev[f.field_name] ?? "",
      data_type: f.data_type,
    }));
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ["id_field", "field_name", "field_label", "is_required", "previous_value", "data_type"],
    });
    XLSX.utils.book_append_sheet(wb, ws, username);
  });

  const outPath = path.join(__dirname, "data.xlsx");
  XLSX.writeFile(wb, outPath);
  console.log("data.xlsx generado en", outPath);
}

buildUsers();
buildWorkbook();

const submissionsDir = path.join(__dirname, "submissions");
if (!fs.existsSync(submissionsDir)) {
  fs.mkdirSync(submissionsDir, { recursive: true });
}
