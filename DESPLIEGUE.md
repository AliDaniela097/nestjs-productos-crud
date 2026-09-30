# Despliegue en la nube

Guía para dejar el proyecto accesible desde cualquier navegador, sin costo y sin tarjeta de crédito.

## Arquitectura del despliegue

| Componente | Dónde | Por qué |
| --- | --- | --- |
| PostgreSQL | **Neon** | Gratis, sin tarjeta, no expira |
| API NestJS + frontend | **Render** (servicio web) | Gratis, despliega desde GitHub |
| PostgREST | **Render** (imagen Docker) | Gratis, usa la imagen oficial |

**Por qué la base no va en Render:** el PostgreSQL gratuito de Render **expira a los 30 días**. Si el proyecto se entrega y se revisa semanas después, la base ya no existiría.

---

## Paso 1 — Crear la base en Neon

1. Entra a <https://neon.com> y regístrate con tu cuenta de GitHub. No pide tarjeta.
2. Crea un proyecto. Anota el nombre de la base; por defecto es `neondb`.
3. Abre **SQL Editor** en el panel lateral.
4. Copia el contenido completo de [`db/init-neon.sql`](./db/init-neon.sql), pégalo y pulsa **Run**.

   Al final debe mostrarte los 3 productos iniciales. Si los ves, el esquema y los roles quedaron creados.

   > Este archivo es distinto de `db/init.sql`. Neon no permite crear roles con contraseña propia desde SQL, así que PostgREST se conecta con el rol dueño de la base y `web_anon` es un rol `NOLOGIN` al que ese dueño puede cambiar.

5. Ve a **Connection Details** y copia la cadena de conexión. **Importante:** desactiva la casilla de *connection pooling* — PostgREST necesita la conexión directa, no la del pooler.

   Se ve así:

   ```
   postgresql://neondb_owner:UNA_CLAVE@ep-algo-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

   De esa cadena vas a necesitar las piezas por separado:

   | Dato | De dónde sale |
   | --- | --- |
   | `DB_USER` | `neondb_owner` |
   | `DB_PASSWORD` | lo que va entre `:` y `@` |
   | `DB_HOST` | `ep-algo-123456.us-east-2.aws.neon.tech` |
   | `DB_PORT` | `5432` |
   | `DB_NAME` | `neondb` |

---

## Paso 2 — Desplegar en Render

El archivo [`render.yaml`](./render.yaml) ya declara los dos servicios, así que no tienes que configurarlos a mano.

1. Entra a <https://render.com> con tu cuenta de GitHub (la misma del repositorio).
2. **New → Blueprint**.
3. Elige el repositorio `nestjs-productos-crud`.
4. Render lee `render.yaml` y te pide las variables marcadas como secretas. Complétalas:

   **Servicio `productos-api`:**

   | Variable | Valor |
   | --- | --- |
   | `DB_HOST` | el host de Neon |
   | `DB_PORT` | `5432` |
   | `DB_USER` | `neondb_owner` |
   | `DB_PASSWORD` | la clave de Neon |
   | `POSTGREST_URL` | déjala vacía por ahora |

   **Servicio `productos-postgrest`:**

   | Variable | Valor |
   | --- | --- |
   | `PGRST_DB_URI` | la cadena completa de Neon, terminada en `?sslmode=require` |

5. **Apply**. El primer despliegue tarda varios minutos.

---

## Paso 3 — Conectar el frontend con PostgREST

Hasta que Render no despliega, no existe la URL de PostgREST. Por eso se completa al final.

1. Entra al servicio `productos-postgrest` y copia su URL, algo como
   `https://productos-postgrest.onrender.com`.
2. Ve al servicio `productos-api` → **Environment** → edita `POSTGREST_URL` y pega esa URL.
   **Sin barra al final.**
3. Guarda. Render redespliega solo.

El frontend lee esa variable en tiempo de ejecución desde `/api/config.js`, así que no hay que tocar código ni volver a subir nada.

---

## Paso 4 — Comprobar

Abre la URL del servicio `productos-api`. Debes ver:

- El frontend con los 3 productos.
- El botón **PostgREST** trae los mismos datos.
- Los botones GET, PUT, PATCH y DELETE responden con su código de estado.
- `/swagger` muestra los 6 endpoints.

Prueba también desde la terminal:

```bash
curl -i https://TU-SERVICIO.onrender.com/api/v1/productos/1
```

---

## Lo que el docente debe saber al abrir el link

**La primera carga tarda cerca de un minuto.** El plan gratuito de Render duerme los servicios tras un rato sin uso, y al recibir la primera petición tiene que despertarlos. Son **dos** servicios, así que el frontend puede cargar antes de que PostgREST esté listo: si el botón PostgREST falla al inicio, espera unos segundos y vuelve a intentarlo.

Conviene avisarlo en la entrega, o dejarlo escrito en el README del repositorio.

**Para evitar el arranque en frío**, puedes crear un ping periódico gratuito en <https://cron-job.org> que llame cada 10 minutos a:

- `https://TU-API.onrender.com/api/v1/productos`
- `https://TU-POSTGREST.onrender.com/productos`

---

## Problemas frecuentes

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `no pg_hba.conf entry ... no encryption` | Falta SSL | `DB_SSL=true` en `productos-api`; `?sslmode=require` en `PGRST_DB_URI` |
| El frontend carga pero PostgREST da error de red | `POSTGREST_URL` vacía o con barra final | Corrígela en Environment y redespliega |
| PostgREST responde `permission denied for schema api` | No se ejecutó `init-neon.sql`, o se ejecutó en otra base | Vuelve a correrlo en el SQL Editor de Neon |
| PostgREST no arranca | Se usó la cadena del *pooler* | Usa la conexión directa, sin pooling |
| La API responde 500 en todo | Credenciales mal copiadas | Revisa `DB_HOST`, `DB_USER` y `DB_PASSWORD` |
| Build falla en Render | Node desactualizado | Verifica que `NODE_VERSION` sea `22` |

---

## Nota sobre Azure

Azure también sirve para esto: **Azure Database for PostgreSQL flexible server** para la base y **Azure Container Apps** o **App Service** para los servicios.

El obstáculo es el registro: crear una cuenta de Azure exige verificación con **tarjeta de crédito**, aunque uses el plan gratuito. La vía sin tarjeta es **Azure for Students**, que se valida con el correo institucional de la PUCE y otorga crédito académico. Si tu correo está habilitado, el despliegue es viable; si no, Render y Neon cubren lo mismo sin ese requisito.
