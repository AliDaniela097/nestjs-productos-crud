# API de Productos — Semana 2, Integración de Sistemas

CRUD completo de productos en NestJS + TypeScript, con validación por DTOs, códigos de estado HTTP correctos, header `Location` y enlaces HATEOAS. Documentado con Swagger/OpenAPI.

## Cómo ejecutar

```bash
npm install
npm run start:dev      # modo watch, http://localhost:3000
```

Swagger UI: <http://localhost:3000/swagger>
Especificación OpenAPI en JSON: <http://localhost:3000/swagger-json>

## Contrato

| Operación | Verbo | URI | Éxito |
| --- | --- | --- | --- |
| Listar | GET | `/api/v1/productos` | 200 |
| Obtener uno | GET | `/api/v1/productos/{id}` | 200 / 404 |
| Crear | POST | `/api/v1/productos` | 201 + `Location` |
| Reemplazar | PUT | `/api/v1/productos/{id}` | 204 / 400 / 404 |
| Actualizar parcial | PATCH | `/api/v1/productos/{id}` | 200 / 400 / 404 |
| Eliminar | DELETE | `/api/v1/productos/{id}` | 204 / 404 |

Detalle y justificación de cada fila en [`contrato.md`](./contrato.md).

## Pruebas

```bash
npm run start:dev        # en una terminal
bash pruebas-matriz.sh   # en otra
```

Ejecuta las 8 filas de la matriz del Paso 7 más 3 casos extra y reporta cuántas pasan.

## Estructura

```
src/
├── main.ts                        # bootstrap, ValidationPipe global y Swagger
├── app.module.ts                  # módulo raíz
└── productos/
    ├── dto/
    │   ├── crear-producto.dto.ts      # POST y PUT: nombre + precio
    │   └── actualizar-precio.dto.ts   # PATCH: solo precio
    ├── producto.entity.ts
    ├── productos.controller.ts    # los 6 endpoints
    ├── productos.service.ts       # lógica de negocio (datos en memoria)
    └── productos.module.ts

contrato.md          # contrato API-first
bitacora.md          # bitácora + declaración de uso de IA
pruebas-matriz.sh    # matriz de pruebas automatizada
```

## Notas

- Los datos están **en memoria**: se reinician al reiniciar el servidor.
- El puerto se lee de `process.env.PORT` y cae a 3000 si no está definida.
