import { useState } from "react";
import FormField from "./FormField.jsx";
import Spinner from "./Spinner.jsx";
import { api } from "../api.js";

export default function DynamicForm({ fields, opsLeaderName }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.field_name, ""]))
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState("");

  function handleChange(fieldName, value) {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    setErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }

  function validate() {
    const nextErrors = {};
    fields.forEach((f) => {
      if (f.is_required && !values[f.field_name].trim()) {
        nextErrors[f.field_name] = "Este campo es obligatorio.";
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setResult(null);

    if (!validate()) {
      setSubmitError("Hay campos obligatorios sin completar. Revisa el formulario.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.submit(values);
      setResult(response);
      setValues(Object.fromEntries(fields.map((f) => [f.field_name, ""])));
    } catch (err) {
      if (err.status === 400 && err.body?.missingFields) {
        const nextErrors = {};
        err.body.missingFields.forEach((name) => {
          nextErrors[name] = "Este campo es obligatorio.";
        });
        setErrors(nextErrors);
      }
      setSubmitError(err.message || "No se pudo enviar la plantilla.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-card">
      <div className="form-header">
        <h1>Plantilla operativa</h1>
        <p>
          Hola {opsLeaderName}, completa los campos del período actual. Los campos marcados con{" "}
          <span className="required-asterisk">*</span> son obligatorios.
        </p>
      </div>

      {submitError && <div className="alert-banner alert-error">{submitError}</div>}
      {result?.ok && (
        <div className="alert-banner alert-success">
          Plantilla enviada correctamente ({result.fileName}).{" "}
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

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          {fields.map((field) => (
            <FormField
              key={field.field_name}
              field={field}
              value={values[field.field_name]}
              onChange={handleChange}
              error={errors[field.field_name]}
            />
          ))}
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
