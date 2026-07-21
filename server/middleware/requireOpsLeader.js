function requireOpsLeader(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "No autenticado. Inicia sesión nuevamente." });
  }
  if (req.session.user.role !== "ops_leader") {
    return res.status(403).json({ error: "Esta acción es solo para ops leaders." });
  }
  next();
}

module.exports = requireOpsLeader;
