/*
 * Metadata de columnas del HC List / Cost to Serve.
 * field_label = encabezado exacto tal cual aparece en el Excel (data.xlsx).
 * field_name  = clave segura (sin espacios) usada en la API / formularios.
 *
 * editable=false  -> dato maestro, ya cargado automáticamente (solo lectura).
 * editable=true   -> lo completa el ops leader (se muestra el valor anterior
 *                    como placeholder).
 * computed=true   -> se calcula en frontend/backend, nunca se envía como input.
 * group           -> columnas que deben sumar 1 (100%) entre sí.
 */

const KEY_FIELD = "id_employee";

const READONLY_COLUMNS = [
  { field_name: "id_employee", field_label: "ID Employee", data_type: "number" },
  { field_name: "worker", field_label: "Worker", data_type: "text" },
  { field_name: "job_title", field_label: "Job Title", data_type: "text" },
  { field_name: "team", field_label: "Team", data_type: "text" },
  { field_name: "ic_or_manager", field_label: "Individual Contributor or Manager", data_type: "text" },
  { field_name: "fte_pct", field_label: "FTE %", data_type: "number" },
  { field_name: "manager_name", field_label: "Manager Name", data_type: "text" },
  { field_name: "org", field_label: "Org", data_type: "text" },
  { field_name: "employee_type", field_label: "Employee Type", data_type: "text" },
];

const EDITABLE_COLUMNS = [
  { field_name: "product_sov", field_label: "Product SoV", data_type: "number", is_required: true },
  { field_name: "pm", field_label: "PM", data_type: "number", is_required: true },
  { field_name: "rm", field_label: "RM", data_type: "number", is_required: true },
  { field_name: "perfm_sov", field_label: "PerfM SoV", data_type: "number", is_required: true },
  { field_name: "xl", field_label: "XL", data_type: "number", is_required: true, group: "tier" },
  { field_name: "l_plus", field_label: "L+", data_type: "number", is_required: true, group: "tier" },
  { field_name: "l", field_label: "L", data_type: "number", is_required: true, group: "tier" },
  { field_name: "m", field_label: "M", data_type: "number", is_required: true, group: "tier" },
  { field_name: "tail", field_label: "Tail", data_type: "number", is_required: true, group: "tier" },
  { field_name: "direct_sov", field_label: "Direct SoV", data_type: "number", is_required: true },
  { field_name: "new_business_sov", field_label: "New Business SoV", data_type: "number", is_required: true },
  { field_name: "emea_sov", field_label: "EMEA SoV", data_type: "number", is_required: true, group: "region" },
  { field_name: "amer_sov", field_label: "AMER SoV", data_type: "number", is_required: true, group: "region" },
  { field_name: "apac_sov", field_label: "APAC SoV", data_type: "number", is_required: true, group: "region" },
  { field_name: "global_sov", field_label: "Global SoV", data_type: "number", is_required: true, group: "region" },
  { field_name: "bf", field_label: "BF", data_type: "select", is_required: true, options: ["Y", "N"] },
  { field_name: "region", field_label: "Region", data_type: "select", is_required: true, options: ["EMEA", "AMER", "APAC", "LATAM", "US", "Global"] },
  { field_name: "comments", field_label: "Comments", data_type: "textarea", is_required: false },
];

const COMPUTED_COLUMN = {
  field_name: "check_distribution_sum",
  field_label: "check distribution sum",
};

// Grupos de columnas cuya suma debe dar 1 (100%). Se omite la validación
// cuando FTE % = 0 (empleado sin asignación activa), tal como refleja la
// data real (filas con FTE 0% y distribución en blanco marcadas como "OK").
const SUM_GROUPS = [
  { name: "tier", label: "XL + L+ + L + M + Tail", fields: ["xl", "l_plus", "l", "m", "tail"] },
  { name: "region", label: "EMEA + AMER + APAC + Global SoV", fields: ["emea_sov", "amer_sov", "apac_sov", "global_sov"] },
];

const SUM_GROUP_FIELD_SET = new Set(SUM_GROUPS.flatMap((g) => g.fields));

// Resto de columnas numéricas editables (Product SoV, PM, RM, PerfM SoV,
// Direct SoV, New Business SoV): no bloquean el envío si no valen 100%,
// pero se resaltan (amarillo/subrayado) para que el ops leader las revise.
const HIGHLIGHT_IF_NOT_FULL_FIELDS = EDITABLE_COLUMNS.filter(
  (c) => c.data_type === "number" && !SUM_GROUP_FIELD_SET.has(c.field_name)
).map((c) => c.field_name);

// Orden real de columnas en el Excel (A -> AB), usado al reescribir data.xlsx
// para no alterar el layout original del archivo de negocio.
const SOURCE_HEADER_ORDER = [
  "ID Employee",
  "Worker",
  "Job Title",
  "Team",
  "Individual Contributor or Manager",
  "FTE %",
  "Manager Name",
  "Org",
  "Employee Type",
  "Product SoV",
  "PM",
  "RM",
  "PerfM SoV",
  "XL",
  "L+",
  "L",
  "M",
  "Tail",
  "Direct SoV",
  "New Business SoV",
  "EMEA SoV",
  "AMER SoV",
  "APAC SoV",
  "Global SoV",
  "check distribution sum",
  "BF",
  "Region",
  "Comments",
];

module.exports = {
  KEY_FIELD,
  READONLY_COLUMNS,
  EDITABLE_COLUMNS,
  COMPUTED_COLUMN,
  SUM_GROUPS,
  HIGHLIGHT_IF_NOT_FULL_FIELDS,
  SOURCE_HEADER_ORDER,
};
