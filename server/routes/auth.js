const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const router = express.Router();
const USERS_PATH = path.join(__dirname, "..", "data", "users.json");

function loadUsers() {
  if (!fs.existsSync(USERS_PATH)) {
    throw new Error("No se encontró users.json. Ejecuta 'npm run seed' en server/.");
  }
  return JSON.parse(fs.readFileSync(USERS_PATH, "utf-8"));
}

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: "Usuario y contraseña son obligatorios." });
  }

  let users;
  try {
    users = loadUsers();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const user = users.find((u) => u.username.toLowerCase() === String(username).toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  }

  req.session.user = { username: user.username, name: user.name };
  res.json({ username: user.username, name: user.name });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "No autenticado." });
  }
  res.json(req.session.user);
});

module.exports = router;
