const express = require("express");
const bcrypt = require("bcryptjs");
const { loadUsers } = require("../utils/users");

const router = express.Router();

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
  if (user.active === false) {
    return res.status(401).json({ error: "Esta cuenta está deshabilitada. Contacta al administrador." });
  }

  req.session.user = {
    username: user.username,
    name: user.name,
    role: user.role,
    sheetName: user.sheetName,
  };
  res.json({ username: user.username, name: user.name, role: user.role });
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
  const { username, name, role } = req.session.user;
  res.json({ username, name, role });
});

module.exports = router;
