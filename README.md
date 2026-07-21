# Portal de Ops Leaders — Formulario dinámico

Prototipo fullstack funcional: los ops leaders inician sesión, ven un formulario
generado dinámicamente a partir de un Excel (con el último valor que cada uno
envió como placeholder), lo completan y lo envían. El envío genera un nuevo
Excel con la plantilla completada y dispara un email de notificación.

## Stack

- **Frontend**: React 18 + Vite (`client/`)
- **Backend**: Node.js + Express, con sesiones (`express-session`) (`server/`)
- **"Base de datos"**: archivos Excel (`xlsx`) — `server/data/data.xlsx` (campos +
  último valor por ops leader) y `server/data/submissions/*.xlsx` (envíos)
- **Email**: Nodemailer (usa SMTP real si hay credenciales, o una cuenta de
  prueba Ethereal automática si no hay — así el prototipo corre sin configurar nada)

## Estructura

```
server/
  server.js            Punto de entrada Express (sesiones, CORS, rutas)
  routes/auth.js        POST /api/auth/login, /logout, GET /api/auth/me
  routes/fields.js       GET /api/fields (campos + previous_value del usuario logueado)
  routes/submit.js       POST /api/submit (valida, guarda Excel, envía email)
  utils/excel.js         Lectura/escritura de data.xlsx y de los envíos
  utils/email.js         Envío de email con Nodemailer
  data/users.json        Usuarios de prueba (passwords con hash bcrypt)
  data/data.xlsx          Una hoja por ops leader con sus campos + previous_value
  data/seed.js           Script para (re)generar users.json y data.xlsx
  data/submissions/      Excels generados en cada envío

client/
  src/App.jsx                 Enrutamiento simple: sesión -> login o formulario
  src/components/Login.jsx     Pantalla de login
  src/components/DynamicForm.jsx  Formulario dinámico + validación + envío
  src/components/FormField.jsx    Input individual con placeholder "Último valor"
```

## Cómo ejecutar

Requiere Node.js 18+.

```bash
# 1. Instalar dependencias (backend y frontend)
npm run install:all

# 2. Generar los datos de ejemplo (usuarios y data.xlsx)
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

### Usuarios de prueba

| Usuario      | Contraseña | Notas                                   |
|--------------|------------|------------------------------------------|
| `jperez`     | `ops2024`  | Tiene envíos previos (placeholders llenos) |
| `mgarcia`    | `ops2024`  | Tiene envíos previos                     |
| `lrodriguez` | `ops2024`  | Sin envíos previos (placeholder genérico) |

## Notas sobre email

Si `server/.env` no tiene `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`, el backend crea
automáticamente una cuenta de prueba en [Ethereal](https://ethereal.email/) y
loguea en consola un link de vista previa del correo enviado (no llega a un
buzón real). Para enviar a un servidor SMTP real, completa esas variables en
`.env`. Si el envío de email falla, la plantilla igual queda guardada
correctamente en Excel — el envío del correo no bloquea el guardado de datos.

**Nota de entorno**: en entornos con egress de red restringido (por ejemplo,
sandboxes que solo permiten tráfico HTTP/HTTPS vía proxy), la conexión SMTP
saliente puede fallar aunque el resto de la app funcione con normalidad.

## Comportamiento del formulario

- Cada input arranca vacío, con placeholder `Último valor: <valor>` en gris;
  si el ops leader no tiene historial, el placeholder es `Ingresa el valor...`.
- El placeholder es el comportamiento nativo del navegador: desaparece al
  escribir y reaparece si se borra todo el contenido.
- Los campos obligatorios (`is_required = TRUE` en el Excel) muestran un
  asterisco rojo y se validan tanto en el cliente como en el servidor antes
  de permitir el envío.
- Al enviar, se genera `plantilla_enviada_<usuario>_<timestamp>.xlsx` con las
  columnas `[id_field, field_name, submitted_value, previous_value, ops_leader, timestamp]`,
  se actualiza el `previous_value` de ese usuario en `data.xlsx` para la
  próxima carga, y se envía el email de notificación.

## Regenerar los datos de ejemplo

```bash
npm run seed
```

Esto sobrescribe `server/data/users.json` y `server/data/data.xlsx` con los
valores definidos en `server/data/seed.js`.
