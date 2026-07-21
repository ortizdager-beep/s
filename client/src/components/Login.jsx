import { useState } from "react";
import Spinner from "./Spinner.jsx";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Ingresa usuario y contraseña.");
      return;
    }

    setLoading(true);
    try {
      await onLogin(username.trim(), password);
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">OL</div>
        <h1 className="login-title">Portal de Ops Leaders</h1>
        <p className="login-subtitle">Ingresa tus credenciales para continuar</p>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <label className="field-label" htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              className="text-input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              className="text-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading && <Spinner />}
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="login-hint">
          Prototipo de demostración. Usuarios de prueba: jperez / mgarcia / lrodriguez, contraseña: ops2024
        </p>
      </div>
    </div>
  );
}
