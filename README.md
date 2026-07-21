# Portal de Ops Leaders — HC List / Cost to Serve

Prototipo fullstack funcional con dos roles:

- **Admin**: sube el Excel de HC List / Cost to Serve (una hoja por ops
  leader). La app valida su estructura, reemplaza la data y sincroniza
  automáticamente las cuentas de los ops leaders (altas con contraseña por
  defecto, bajas si su hoja ya no aparece).
- **Ops leader**: inicia sesión y ve una **tabla editable con la lista de
  empleados a su cargo** (su hoja del Excel). Las columnas de datos maestros
  (A–I) vienen ya cargadas y son de solo lectura; desde la columna J en
  adelante completa la distribución de cada empleado, con el último valor
  enviado como placeholder. Puede completarla a mano en la tabla, o
  **descargar una plantilla Excel, completarla offline y volver a subirla**
  — ambos caminos pasan por la misma validación. Al enviar, se genera un
  Excel de auditoría y se dispara un email de notificación.

## Stack

- **Frontend**: React 18 + Vite (`client/`)
- **Backend**: Node.js + Express, con sesiones (`express-session`) (`server/`)
- **"Base de datos"**: Excel (`xlsx`) — `server/data/data.xlsx` (una hoja por
  ops leader, con los datos maestros del empleado + el último valor enviado
  de cada columna editable) y `server/data/submissions/*.xlsx` (auditoría de
  cada envío)
- **Email**: Nodemailer (usa SMTP real si hay credenciales, o una cuenta de
  prueba Ethereal automática si no hay)

## Modelo de columnas

`server/utils/columns.js` define la metadata (compartida por el backend y
expuesta al frontend vía `GET /api/employees`):

**Solo lectura (datos maestros, ya cargados):** ID Employee, Worker, Job
Title, Team, Individual Contributor or Manager, FTE %, Manager Name, Org,
Employee Type.

**Editable por el ops leader:** Product SoV, PM, RM, PerfM SoV, XL, L+, L, M,
Tail, Direct SoV, New Business SoV, EMEA SoV, AMER SoV, APAC SoV, Global SoV,
BF, Region, Comments. Todas obligatorias excepto Comments.

**Calculada (no editable):** `check distribution sum` — se recalcula en
backend y en vivo en el frontend a partir de dos grupos que deben sumar 1
(100%):

- **Tier**: XL + L+ + L + M + Tail
- **Región**: EMEA SoV + AMER SoV + APAC SoV + Global SoV

Si el FTE % del empleado es 0, se omite esta validación (igual que en la
data real: empleados sin asignación activa quedan marcados "OK" aunque su
distribución esté en blanco). El envío se **bloquea** si algún grupo no
suma 100% (excepto ese caso).

## Carga del admin

El usuario admin ve, en vez de la tabla, una pantalla para subir el Excel
(`POST /api/admin/upload`, protegido por `requireAdmin`). Al subirlo:

1. Se valida que **cada hoja** tenga todas las columnas esperadas
   (`server/utils/columns.js` → `SOURCE_HEADER_ORDER`). Si falta alguna, se
   rechaza el archivo completo y no se guarda nada.
2. Si es válido, reemplaza `server/data/data.xlsx` tal cual (mismo archivo,
   sin reescribir formato).
3. Sincroniza `server/data/users.json` (`server/utils/users.js`) a partir de
   los nombres de hoja encontrados:
   - Hoja nueva → crea una cuenta de ops leader (`username` derivado del
     primer nombre de la hoja) con la contraseña compartida por defecto
     (`ops2026`).
   - Hoja que ya existía y estaba deshabilitada → la reactiva, sin tocar su
     contraseña.
   - Ops leader cuya hoja ya no aparece en el archivo → se deshabilita
     (`active: false`); no puede volver a iniciar sesión hasta que su hoja
     reaparezca en una carga futura.
   - El usuario admin nunca se ve afectado por esta sincronización.

La respuesta de la carga (y la pantalla de admin) muestra las cuentas
nuevas con su contraseña temporal, las reactivadas y las deshabilitadas.

## Descarga y subida de plantilla (ops leader)

Además de completar la tabla a mano, el ops leader tiene dos botones:

- **Descargar plantilla** (`GET /api/employees/template`): genera un `.xlsx`
  con su hoja — columnas de datos maestros completas (solo lectura) y las
  columnas editables **en blanco**, igual que arrancan en la tabla web. No
  incluye valores anteriores precargados: se completa desde cero, en Excel.
- **Subir plantilla completada** (`POST /api/submit/upload`, multipart): lee
  la primera hoja del archivo subido y la valida con **las mismas reglas y
  el mismo código** que el envío manual (`server/utils/submission.js` →
  `processSubmission`, compartido por ambos caminos):
  - Debe incluir **todos** los empleados de su roster (si falta alguno, se
    rechaza el archivo completo señalando quién falta).
  - No acepta IDs de empleados que no sean suyos.
  - Cada fila debe tener los campos obligatorios completos y ambos grupos
    de distribución sumando 100% (salvo FTE % = 0).
  - `check distribution sum` del archivo se ignora — el backend siempre la
    recalcula.

  Si hay errores, la respuesta lista cada empleado con el problema
  encontrado (obligatorio faltante, distribución que no suma 100%, empleado
  faltante o desconocido) y no se guarda ni envía nada. Si todo es válido,
  el resultado es idéntico al envío manual: se genera el Excel de auditoría,
  se actualiza `data.xlsx` y se envía el email de notificación.

## Estructura

```
server/
  server.js               Punto de entrada Express (sesiones, CORS, rutas)
  routes/auth.js           POST /api/auth/login, /logout, GET /api/auth/me
  routes/employees.js      GET /api/employees, GET /api/employees/template (descarga plantilla en blanco)
  routes/submit.js         POST /api/submit (JSON) y POST /api/submit/upload (Excel) — misma validación
  routes/admin.js          POST /api/admin/upload (reemplaza data.xlsx + sincroniza ops leaders)
  middleware/requireOpsLeader.js  Solo rol ops_leader
  middleware/requireAdmin.js      Solo rol admin
  utils/columns.js         Metadata de columnas (readonly / editable / grupos que suman 1)
  utils/excel.js           Lectura/escritura de data.xlsx, plantillas, envíos y validación de uploads
  utils/submission.js      Lógica compartida de validación + guardado + email (processSubmission)
  utils/users.js           Lectura/escritura de users.json + alta/baja automática de ops leaders
  utils/email.js           Envío de email con Nodemailer
  data/users.json          Admin + ops leaders (passwords con hash bcrypt), hoja asociada y estado active
  data/data.xlsx            HC List / Cost to Serve real: una hoja por ops leader (reemplazable por el admin)
  data/seed.js             Script para (re)generar users.json desde cero
  data/submissions/        Excels de auditoría generados en cada envío

client/
  src/App.jsx                       Enrutamiento por rol: admin -> carga, ops_leader -> tabla
  src/components/Login.jsx           Pantalla de login
  src/components/AdminUpload.jsx      Carga de Excel + resumen de altas/bajas
  src/components/EmployeeTable.jsx    Tabla editable + descarga/subida de plantilla + envío
```

## Cómo ejecutar

Requiere Node.js 18+.

```bash
# 1. Instalar dependencias (backend y frontend)
npm run install:all

# 2. Generar users.json (hashea las contraseñas de demo)
npm run seed

# 3. Configurar variables de entorno del backend
cp server/.env.example server/.env
# Editar server/.env: EMAIL_DESTINO y (opcional) credenciales SMTP reales.

# 4. Levantar el backend (terminal 1)
npm run dev:server

# 5. Levantar el frontend (terminal 2)
npm run dev:client
```

Luego abre `http://localhost:5173`.

`server/data/data.xlsx` es el archivo real de HC List / Cost to Serve
(provisto por el negocio) y no se regenera con el seed — solo `users.json`
se recrea a partir de `server/data/seed.js`. Para reemplazarlo, usa la
pantalla de admin (o `POST /api/admin/upload`) en vez de copiarlo a mano.

### Usuarios

| Usuario    | Contraseña  | Rol        | Hoja en data.xlsx     |
|------------|-------------|------------|------------------------|
| `admin`    | `admin2026` | admin      | —                      |
| `chris`    | `ops2026`   | ops_leader | Chris TS-TO-AMS        |
| `cristian` | `ops2026`   | ops_leader | Cristian TS EMEA       |
| `adriano`  | `ops2026`   | ops_leader | Adriano Crea-EMEA      |
| `nicolas`  | `ops2026`   | ops_leader | Nicolas TO EMA         |
| `derick`   | `ops2026`   | ops_leader | Derick AX EMEA         |

Cambia estas contraseñas antes de cualquier uso real (son solo para el
prototipo).

## Notas sobre email

Si `server/.env` no tiene `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`, el backend crea
automáticamente una cuenta de prueba en [Ethereal](https://ethereal.email/) y
loguea en consola un link de vista previa del correo enviado (no llega a un
buzón real). El correo incluye ops leader, fecha/hora y cantidad de
empleados actualizados, con el Excel de auditoría adjunto (detalle completo
por empleado y campo). Si el envío de email falla, la plantilla igual queda
guardada correctamente — el envío del correo no bloquea el guardado de datos.

**Nota de entorno**: en entornos con egress de red restringido (por ejemplo,
sandboxes que solo permiten tráfico HTTP/HTTPS vía proxy), la conexión SMTP
saliente puede fallar aunque el resto de la app funcione con normalidad.

## Comportamiento de la tabla

- Cada celda editable arranca vacía, con placeholder `Último valor: <valor>`
  en gris (o `Ingresa el valor...` / `Elegir...` si no había valor anterior);
  desaparece al escribir y reaparece si se borra todo el contenido.
- Las columnas `BF` y `Region` se editan con un selector (`select`).
- La columna "Check distribución" se recalcula en vivo por fila: **Pendiente**
  (gris, nada cargado aún), **OK** (verde) o **No suma 100%** (rojo).
- Al enviar, se valida en cliente y en servidor: campos obligatorios
  completos + ambos grupos de distribución sumando 100% (salvo FTE % = 0).
  No se permite enviar si hay errores.
- Al confirmarse el envío se genera
  `plantilla_enviada_<usuario>_<timestamp>.xlsx` en formato largo/auditoría
  (`id_employee, employee_name, field_name, field_label, submitted_value,
  previous_value, check_distribution_sum, ops_leader, timestamp`), se
  actualiza `data.xlsx` con los nuevos valores como `previous_value` para la
  próxima carga, y se envía el email de notificación.

## Regenerar usuarios de ejemplo

```bash
npm run seed
```

Esto sobrescribe `server/data/users.json` con los valores definidos en
`server/data/seed.js`. `data.xlsx` no se toca.
