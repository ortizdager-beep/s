import { useEffect, useState } from "react";
import Login from "./components/Login.jsx";
import EmployeeTable from "./components/EmployeeTable.jsx";
import AdminUpload from "./components/AdminUpload.jsx";
import Spinner from "./components/Spinner.jsx";
import { api } from "./api.js";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [employeeData, setEmployeeData] = useState(null);
  const [employeeDataError, setEmployeeDataError] = useState("");
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((me) => setUser(me))
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    if (!user || user.role !== "ops_leader") return;
    setLoadingEmployees(true);
    setEmployeeDataError("");
    api
      .getEmployees()
      .then((res) => setEmployeeData(res))
      .catch((err) => setEmployeeDataError(err.message || "No se pudo cargar el listado de empleados."))
      .finally(() => setLoadingEmployees(false));
  }, [user]);

  async function handleLogin(username, password) {
    const me = await api.login(username, password);
    setUser(me);
  }

  async function handleLogout() {
    await api.logout();
    setUser(null);
    setEmployeeData(null);
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
        {user.role === "admin" && <AdminUpload adminName={user.name} />}

        {user.role === "ops_leader" && (
          <>
            {loadingEmployees && (
              <div className="center-loading">
                <Spinner dark />
                <span>Cargando datos anteriores...</span>
              </div>
            )}

            {!loadingEmployees && employeeDataError && (
              <div className="form-card">
                <div className="alert-banner alert-error">{employeeDataError}</div>
              </div>
            )}

            {!loadingEmployees && employeeData && <EmployeeTable data={employeeData} opsLeaderName={user.name} />}
          </>
        )}
      </main>
    </div>
  );
}
