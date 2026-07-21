import { useEffect, useState } from "react";
import Login from "./components/Login.jsx";
import DynamicForm from "./components/DynamicForm.jsx";
import Spinner from "./components/Spinner.jsx";
import { api } from "./api.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [fields, setFields] = useState(null);
  const [fieldsError, setFieldsError] = useState("");
  const [loadingFields, setLoadingFields] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((me) => setUser(me))
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoadingFields(true);
    setFieldsError("");
    api
      .getFields()
      .then((res) => setFields(res.fields))
      .catch((err) => setFieldsError(err.message || "No se pudieron cargar los campos."))
      .finally(() => setLoadingFields(false));
  }, [user]);

  async function handleLogin(username, password) {
    const me = await api.login(username, password);
    setUser(me);
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setFields(null);
  }

  if (checkingSession) {
    return (
      <div className="center-loading" style={{ minHeight: "100vh" }}>
        <Spinner dark />
        <span>Cargando sesión...</span>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="topbar-brand-badge">OL</span>
          Portal de Ops Leaders
        </div>
        <div className="topbar-user">
          <span>{user.name}</span>
          <button className="btn-logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="page-content">
        {loadingFields && (
          <div className="center-loading">
            <Spinner dark />
            <span>Cargando datos anteriores...</span>
          </div>
        )}

        {!loadingFields && fieldsError && (
          <div className="form-card">
            <div className="alert-banner alert-error">{fieldsError}</div>
          </div>
        )}

        {!loadingFields && fields && <DynamicForm fields={fields} opsLeaderName={user.name} />}
      </main>
    </div>
  );
}
