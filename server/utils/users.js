const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const USERS_PATH = path.join(__dirname, "..", "data", "users.json");

// Contraseña compartida asignada a los ops leaders dados de alta
// automáticamente cuando aparece una hoja nueva en una carga del admin.
const DEFAULT_OPS_LEADER_PASSWORD = "ops2026";

function loadUsers() {
  if (!fs.existsSync(USERS_PATH)) {
    throw new Error("No se encontró users.json. Ejecuta 'npm run seed' en server/.");
  }
  return JSON.parse(fs.readFileSync(USERS_PATH, "utf-8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * A partir de un nombre de hoja ("Chris TS-TO-AMS") genera un username
 * corto y único ("chris"), evitando colisiones con usernames existentes.
 */
function usernameFromSheetName(sheetName, existingUsernames) {
  const firstWord = sheetName.trim().split(/\s+/)[0] || sheetName;
  let base = slugify(firstWord) || slugify(sheetName) || "ops";
  let candidate = base;
  let suffix = 2;
  while (existingUsernames.has(candidate)) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/**
 * Sincroniza los ops leaders en users.json a partir de las hojas
 * encontradas en la última carga del admin:
 * - Hoja ya conocida (por sheetName) -> se reactiva (active=true), sin tocar su contraseña.
 * - Hoja nueva -> se crea un usuario con contraseña por defecto.
 * - Ops leader existente cuya hoja ya no aparece -> se desactiva (active=false).
 * El usuario admin nunca se toca.
 */
function syncOpsLeadersFromSheetNames(sheetNames) {
  const users = loadUsers();
  const sheetNameSet = new Set(sheetNames);
  const existingUsernames = new Set(users.map((u) => u.username));

  const newAccounts = [];
  const reactivated = [];
  const deactivated = [];

  users.forEach((user) => {
    if (user.role !== "ops_leader") return;
    if (sheetNameSet.has(user.sheetName)) {
      if (user.active === false) {
        user.active = true;
        reactivated.push({ username: user.username, name: user.name, sheetName: user.sheetName });
      }
    } else if (user.active !== false) {
      user.active = false;
      deactivated.push({ username: user.username, name: user.name, sheetName: user.sheetName });
    }
  });

  const knownSheetNames = new Set(
    users.filter((u) => u.role === "ops_leader").map((u) => u.sheetName)
  );

  sheetNames.forEach((sheetName) => {
    if (knownSheetNames.has(sheetName)) return;

    const username = usernameFromSheetName(sheetName, existingUsernames);
    existingUsernames.add(username);

    const displayName = sheetName.trim().split(/\s+/)[0] || sheetName;
    const newUser = {
      username,
      name: displayName,
      sheetName,
      role: "ops_leader",
      active: true,
      passwordHash: bcrypt.hashSync(DEFAULT_OPS_LEADER_PASSWORD, 10),
    };
    users.push(newUser);
    newAccounts.push({ username, name: displayName, sheetName, password: DEFAULT_OPS_LEADER_PASSWORD });
  });

  saveUsers(users);
  return { newAccounts, reactivated, deactivated };
}

module.exports = {
  loadUsers,
  saveUsers,
  syncOpsLeadersFromSheetNames,
  DEFAULT_OPS_LEADER_PASSWORD,
};
