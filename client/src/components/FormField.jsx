const INPUT_TYPE_BY_DATA_TYPE = {
  number: "number",
  email: "email",
  date: "text", // se usa texto libre para que el placeholder "Último valor" sea visible
};

export default function FormField({ field, value, onChange, error }) {
  const inputType = INPUT_TYPE_BY_DATA_TYPE[field.data_type] || "text";
  const placeholder = field.previous_value
    ? `Último valor: ${field.previous_value}`
    : "Ingresa el valor...";

  const isTextarea = field.data_type === "textarea";
  const spanFull = isTextarea;

  const commonProps = {
    id: field.field_name,
    placeholder,
    value,
    onChange: (e) => onChange(field.field_name, e.target.value),
    className: `${isTextarea ? "textarea-input" : "text-input"}${error ? " input-error" : ""}`,
  };

  return (
    <div className={`field-group${spanFull ? " field-span-2" : ""}`}>
      <label className="field-label" htmlFor={field.field_name}>
        {field.field_label}
        {field.is_required && <span className="required-asterisk">*</span>}
      </label>

      {isTextarea ? (
        <textarea {...commonProps} rows={3} />
      ) : (
        <input {...commonProps} type={inputType} />
      )}

      {error && <div className="field-error-text">{error}</div>}
    </div>
  );
}
