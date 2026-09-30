# API de Productos — Semana 2, Integración de Sistemas

CRUD completo de productos sobre **PostgreSQL**, expuesto por **dos mecanismos de integración** que comparten la misma tabla:

- **API REST en NestJS**, escrita a mano: DTOs con validación, códigos de estado explícitos, cabecera `Location` y enlaces HATEOAS.
- **PostgREST**, que genera la API automáticamente desde el esquema SQL.

Incluye un frontend para probar los verbos HTTP desde el navegador y ver el código de estado de cada respuesta.

---

## Puesta en marcha

Necesitas **Docker Desktop** y **Node.js 18 o superior**.

```bash
# 1. Levantar PostgreSQL y PostgREST
docker compose up -d

# 2. Configurar las variables de entorno
copy .env.example .env        # Windows
# cp .env.example .env        # Linux / macOS

# 3. Instalar dependencias y arrancar la API
npm install
npm run start:dev
```

| Qué | Dónde |
| --- | --- |
| Frontend | <http://localhost:3000> |
| API NestJS | <http://localhost:3000/api/v1/productos> |
| Swagger UI | <http://localhost:3000/swagger> |
| PostgREST | <http://localhost:3001/productos> |
| PostgreSQL | `localhost:5433` |

---

## Contrato de la API NestJS

| Operación | Verbo | URI | Éxito |
| --- | --- | --- | --- |
| Listar | GET | `/api/v1/productos` | 200 |
| Obtener uno | GET | `/api/v1/productos/{id}` | 200 / 404 |
| Crear | POST | `/api/v1/productos` | 201 + `Location` |
| Reemplazar | PUT | `/api/v1/productos/{id}` | 204 / 400 / 404 |
| Actualizar parcial | PATCH | `/api/v1/productos/{id}` | 200 / 400 / 404 |
| Eliminar | DELETE | `/api/v1/productos/{id}` | 204 / 404 |

Detalle y justificación de cada fila en [`contrato.md`](./contrato.md).

## Equivalencias en PostgREST

PostgREST filtra por parámetros de consulta en vez de usar la ruta:

| Operación | NestJS | PostgREST |
| --- | --- | --- |
| Listar | `GET /api/v1/productos` | `GET /productos` |
| Obtener uno | `GET /api/v1/productos/1` | `GET /productos?id=eq.1` |
| Crear | `POST /api/v1/productos` | `POST /productos` |
| Actualizar precio | `PATCH /api/v1/productos/1` | `PATCH /productos?id=eq.1` |
| Eliminar | `DELETE /api/v1/productos/1` | `DELETE /productos?id=eq.1` |

Las dos APIs no devuelven los mismos códigos en todos los casos. La comparación completa y el porqué están en la sección 3 de [`bitacora.md`](./bitacora.md).

---

## Pruebas

Con los servicios levantados:

```bash
bash pruebas-matriz.sh
```

Ejecuta 19 casos: las 8 filas de la matriz del Paso 7, 4 casos adicionales de NestJS y 7 casos equivalentes contra PostgREST.

---

## Estructura

```
src/
├── main.ts                        # bootstrap, ValidationPipe global, CORS y Swagger
├── app.module.ts                  # conexión a PostgreSQL y servido del frontend
└── productos/
    ├── dto/
    │   ├── crear-producto.dto.ts      # POST y PUT: nombre + precio
    │   └── actualizar-precio.dto.ts   # PATCH: solo precio
    ├── producto.entity.ts         # entidad TypeORM -> tabla api.productos
    ├── productos.controller.ts    # los 6 endpoints
    ├── productos.service.ts       # lógica de negocio contra la base
    └── productos.module.ts

public/index.html      # frontend de una sola página, sin dependencias
db/init.sql            # esquema, datos iniciales y roles de PostgREST
docker-compose.yml     # PostgreSQL + PostgREST
contrato.md            # contrato API-first
bitacora.md            # bitácora, comparación y declaración de uso de IA
pruebas-matriz.sh      # matriz de pruebas automatizada
.env.example           # plantilla de variables de entorno
```

---

## Notas

- El `.env` **no se sube al repositorio**. Se versiona `.env.example` como plantilla.
- Los datos viven en el volumen de Docker `datos_productos` y sobreviven a los reinicios. Para empezar de cero: `docker compose down -v`.
- La base se publica en el puerto **5433** del host para no chocar con un PostgreSQL ya instalado.
- El rol anónimo de PostgREST tiene el CRUD completo **solo con fines de demostración**. En producción tendría únicamente `SELECT`.
