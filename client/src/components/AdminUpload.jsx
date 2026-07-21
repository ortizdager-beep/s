import { useRef, useState } from "react";
import Spinner from "./Spinner.jsx";
import { api } from "../api.js";

export default function AdminUpload({ adminName }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function handleFileChange(e) {
    setSelectedFile(e.target.files[0] || null);
    setError("");
    setResult(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedFile) {
      setError("Selecciona un archivo .xlsx primero.");
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);
    try {
      const response = await api.uploadDataFile(selectedFile);
      setResult(response);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err.message || "No se pudo procesar el archivo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="form-card" style={{ maxWidth: 720 }}>
      <div className="table-header">
        <h1>Carga de listado HC / Cost to Serve</h1>
        <p>
          Hola {adminName}, subí el Excel con una hoja por ops leader. Cada hoja debe tener las columnas de
          datos maestros y de distribución esperadas.
        </p>
      </div>

      {error && <div className="alert-banner alert-error">{error}</div>}

      {result?.ok && (
        <div className="alert-banner alert-success">
          Archivo cargado. Hojas detectadas: {result.sheetNames.join(", ")}.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field-group">
          <label className="field-label" htmlFor="data-file">
            Archivo Excel (.xlsx)
          </label>
          <input
            id="data-file"
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>

        <button className="btn-primary" type="submit" disabled={uploading} style={{ width: "auto", minWidth: 200 }}>
          {uploading && <Spinner />}
          {uploading ? "Procesando..." : "Cargar listado"}
        </button>
      </form>

      {result?.ok && (
        <div className="admin-sync-results">
          {result.newAccounts.length > 0 && (
            <div className="sync-block">
              <h2>Cuentas nuevas creadas</h2>
              <table className="sync-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Nombre</th>
                    <th>Contraseña temporal</th>
                    <th>Hoja</th>
                  </tr>
                </thead>
                <tbody>
                  {result.newAccounts.map((u) => (
                    <tr key={u.username}>
                      <td>{u.username}</td>
                      <td>{u.name}</td>
                      <td>{u.password}</td>
                      <td>{u.sheetName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="sync-hint">Comparte estas credenciales con cada ops leader para su primer ingreso.</p>
            </div>
          )}

          {result.reactivated.length > 0 && (
            <div className="sync-block">
              <h2>Cuentas reactivadas</h2>
              <ul>
                {result.reactivated.map((u) => (
                  <li key={u.username}>{u.name} ({u.username}) — su hoja volvió a aparecer.</li>
                ))}
              </ul>
            </div>
          )}

          {result.deactivated.length > 0 && (
            <div className="sync-block">
              <h2>Cuentas deshabilitadas</h2>
              <ul>
                {result.deactivated.map((u) => (
                  <li key={u.username}>{u.name} ({u.username}) — su hoja ya no está en este archivo.</li>
                ))}
              </ul>
            </div>
          )}

          {result.newAccounts.length === 0 && result.reactivated.length === 0 && result.deactivated.length === 0 && (
            <p className="sync-hint">Sin cambios en las cuentas de ops leader.</p>
          )}
        </div>
      )}
    </div>
  );
}
