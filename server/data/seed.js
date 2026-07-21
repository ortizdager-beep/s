/*
 * Genera server/data/users.json (hashea las contraseñas de demo).
 * Ejecutar con: npm run seed (desde server/)
 *
 * server/data/data.xlsx NO se regenera acá: es el archivo real de HC List
 * (Cost to Serve) provisto por el negocio, con una hoja por ops leader y
 * los valores del último envío ya cargados como previous_value.
 */
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

// username -> nombre para mostrar + nombre exacto de la hoja en data.xlsx
const USERS = [
  { username: "chris", password: "ops2026", name: "Chris", sheetName: "Chris TS-TO-AMS" },
  { username: "cristian", password: "ops2026", name: "Cristian", sheetName: "Cristian TS EMEA" },
  { username: "adriano", password: "ops2026", name: "Adriano", sheetName: "Adriano Crea-EMEA" },
  { username: "nicolas", password: "ops2026", name: "Nicolas", sheetName: "Nicolas TO EMA" },
  { username: "derick", password: "ops2026", name: "Derick", sheetName: "Derick AX EMEA" },
];

function buildUsers() {
  const users = USERS.map((u) => ({
    username: u.username,
    name: u.name,
    sheetName: u.sheetName,
    passwordHash: bcrypt.hashSync(u.password, 10),
  }));
  fs.writeFileSync(
    path.join(__dirname, "users.json"),
    JSON.stringify(users, null, 2)
  );
  console.log("users.json generado con", users.length, "ops leaders.");
  console.log("Credenciales de prueba (usuario / contraseña):");
  USERS.forEach((u) => console.log(`  - ${u.username} / ${u.password}  (hoja: ${u.sheetName})`));
}

buildUsers();

const submissionsDir = path.join(__dirname, "submissions");
if (!fs.existsSync(submissionsDir)) {
  fs.mkdirSync(submissionsDir, { recursive: true });
}

const dataXlsxPath = path.join(__dirname, "data.xlsx");
if (!fs.existsSync(dataXlsxPath)) {
  console.warn(
    "ADVERTENCIA: no se encontró data.xlsx. Coloca el archivo real de HC List / Cost to Serve en server/data/data.xlsx."
  );
}
