require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const employeesRoutes = require("./routes/employees");
const submitRoutes = require("./routes/submit");
const adminRoutes = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-cambiar",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8, // 8 horas
    },
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/submit", submitRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
