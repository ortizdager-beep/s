import { useMemo, useState } from "react";
import Spinner from "./Spinner.jsx";
import { api } from "../api.js";

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function emptyValuesFor(editableColumns) {
  return Object.fromEntries(editableColumns.map((c) => [c.field_name, ""]));
}

/**
 * Estado en vivo de "check distribution sum" para una fila, calculado con
 * los mismos grupos (sumGroups) que valida el backend.
 */
function getRowCheckStatus(employee, values, sumGroups) {
  const fte = toNumber(employee.readonly.fte_pct);
  if (fte === 0) return { status: "ok", label: "OK" };

  const allFields = sumGroups.flatMap((g) => g.fields);
  const anyFilled = allFields.some((f) => String(values[f] ?? "").trim() !== "");
  if (!anyFilled) return { status: "pending", label: "Pendiente" };

  const allOk = sumGroups.every((group) => {
    const sum = group.fields.reduce((acc, f) => acc + toNumber(values[f]), 0);
    return Math.abs(sum - 1) < 0.001;
  });
  return allOk ? { status: "ok", label: "OK" } : { status: "error", label: "No suma 100%" };
}

function Cell({ column, value, onChange, hasError }) {
  const previousPlaceholder = column.previous_value
    ? `Último valor: ${column.previous_value}`
    : "Ingresa el valor...";

  const commonClass = `cell-input${hasError ? " input-error" : ""}`;

  if (column.data_type === "select") {
    return (
      <select
        className={commonClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled hidden>
          {column.previous_value ? `Último: ${column.previous_value}` : "Elegir..."}
        </option>
        {column.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (column.data_type === "textarea") {
    return (
      <textarea
        className={`${commonClass} cell-textarea`}
        rows={1}
        value={value}
        placeholder={previousPlaceholder}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <input
      className={commonClass}
      type={column.data_type === "number" ? "text" : "text"}
      inputMode={column.data_type === "number" ? "decimal" : undefined}
      value={value}
      placeholder={previousPlaceholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export default function EmployeeTable({ data, opsLeaderName }) {
  const { readonlyColumns, editableColumns, sumGroups, employees } = data;

  const [values, setValues] = useState(() =>
    Object.fromEntries(employees.map((e) => [e.id_employee, emptyValuesFor(editableColumns)]))
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const employeesById = useMemo(
    () => Object.fromEntries(employees.map((e) => [e.id_employee, e])),
    [employees]
  );

  function handleChange(employeeId, fieldName, value) {
    setValues((prev) => ({
      ...prev,
      [employeeId]: { ...prev[employeeId], [fieldName]: value },
    }));
    setErrors((prev) => {
      if (!prev[employeeId]?.[fieldName]) return prev;
      const nextRow = { ...prev[employeeId] };
      delete nextRow[fieldName];
      const next = { ...prev, [employeeId]: nextRow };
      return next;
    });
  }

  function validateAll() {
    const nextErrors = {};
    let firstErrorMessage = "";

    employees.forEach((employee) => {
      const rowValues = values[employee.id_employee];
      const rowErrors = {};

      editableColumns.forEach((col) => {
        if (col.is_required && !String(rowValues[col.field_name] ?? "").trim()) {
          rowErrors[col.field_name] = "Obligatorio.";
        }
      });

      const checkStatus = getRowCheckStatus(employee, rowValues, sumGroups);
      if (checkStatus.status === "error") {
        sumGroups.forEach((g) => {
          g.fields.forEach((f) => {
            if (!rowErrors[f]) rowErrors[f] = `El grupo ${g.label} debe sumar 1.`;
          });
        });
      }

      if (Object.keys(rowErrors).length > 0) {
        nextErrors[employee.id_employee] = rowErrors;
        if (!firstErrorMessage) {
          firstErrorMessage = `Empleado ${employee.readonly.worker}: revisa los campos marcados.`;
        }
      }
    });

    setErrors(nextErrors);
    return { valid: Object.keys(nextErrors).length === 0, firstErrorMessage };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setResult(null);

    const { valid, firstErrorMessage } = validateAll();
    if (!valid) {
      setSubmitError(
        `Hay filas con errores de validación (campos obligatorios y/o distribuciones que no suman 100%). ${firstErrorMessage}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const rows = employees.map((e) => ({ id_employee: e.id_employee, values: values[e.id_employee] }));
      const response = await api.submit(rows);
      setResult(response);
      setValues(Object.fromEntries(employees.map((e) => [e.id_employee, emptyValuesFor(editableColumns)])));
    } catch (err) {
      if (err.status === 400 && err.body?.rowErrors) {
        const nextErrors = {};
        err.body.rowErrors.forEach(({ id_employee, errors: msgs }) => {
          nextErrors[id_employee] = Object.fromEntries(
            editableColumns.map((c) => [c.field_name, msgs.join(" ")])
          );
        });
        setErrors(nextErrors);
      }
      setSubmitError(err.message || "No se pudo enviar la plantilla.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="table-page">
      <div className="table-header">
        <h1>Plantilla operativa — HC List / Cost to Serve</h1>
        <p>
          Hola {opsLeaderName}, completa la distribución de cada empleado a tu cargo. Los campos marcados
          con <span className="required-asterisk">*</span> son obligatorios y los grupos de porcentaje
          deben sumar 100%.
        </p>
      </div>

      {submitError && <div className="alert-banner alert-error">{submitError}</div>}
      {result?.ok && (
        <div className="alert-banner alert-success">
          Plantilla enviada correctamente ({result.fileName}) — {result.employeeCount} empleados actualizados.{" "}
          {result.email?.sent ? (
            <>
              Se envió el correo de notificación
              {result.email?.previewUrl ? (
                <>
                  {" "}
                  — <a href={result.email.previewUrl} target="_blank" rel="noreferrer">ver vista previa</a>.
                </>
              ) : (
                "."
              )}
            </>
          ) : (
            "El archivo se guardó correctamente, pero el correo de notificación no pudo enviarse (revisa la configuración SMTP)."
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="table-scroll">
          <table className="employee-table">
            <thead>
              <tr>
                {readonlyColumns.map((col, i) => (
                  <th key={col.field_name} className={i < 2 ? "sticky-col" : ""} style={i === 0 ? { left: 0 } : i === 1 ? { left: 90 } : undefined}>
                    {col.field_label}
                  </th>
                ))}
                {editableColumns.map((col) => (
                  <th key={col.field_name}>
                    {col.field_label}
                    {col.is_required && <span className="required-asterisk">*</span>}
                  </th>
                ))}
                <th>Check distribución</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const rowValues = values[employee.id_employee];
                const rowErrors = errors[employee.id_employee] || {};
                const checkStatus = getRowCheckStatus(employee, rowValues, sumGroups);

                return (
                  <tr key={employee.id_employee}>
                    {readonlyColumns.map((col, i) => (
                      <td
                        key={col.field_name}
                        className={`readonly-cell${i < 2 ? " sticky-col" : ""}`}
                        style={i === 0 ? { left: 0 } : i === 1 ? { left: 90 } : undefined}
                      >
                        {employee.readonly[col.field_name]}
                      </td>
                    ))}
                    {editableColumns.map((col) => (
                      <td key={col.field_name} className="editable-cell">
                        <Cell
                          column={{ ...col, previous_value: employee.editable[col.field_name] }}
                          value={rowValues[col.field_name]}
                          onChange={(v) => handleChange(employee.id_employee, col.field_name, v)}
                          hasError={Boolean(rowErrors[col.field_name])}
                        />
                      </td>
                    ))}
                    <td>
                      <span className={`check-badge check-${checkStatus.status}`}>{checkStatus.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={submitting} style={{ width: "auto", minWidth: 200 }}>
            {submitting && <Spinner />}
            {submitting ? "Enviando..." : "Enviar Plantilla"}
          </button>
        </div>
      </form>
    </div>
  );
}
