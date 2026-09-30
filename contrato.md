# Contrato CRUD de /productos — Semana 2

Contrato API-first definido **antes** de implementar. Prefijo de versión: `/api/v1`.

| Operación          | Verbo  | URI                          | Éxito             | Errores previstos |
| ------------------ | ------ | ---------------------------- | ----------------- | ----------------- |
| Listar             | GET    | `/api/v1/productos`          | 200               | —                 |
| Obtener uno        | GET    | `/api/v1/productos/{id}`     | 200               | 404 / 400         |
| Crear              | POST   | `/api/v1/productos`          | 201 + `Location`  | 400               |
| Reemplazar         | PUT    | `/api/v1/productos/{id}`     | 204 (sin cuerpo)  | 400 / 404         |
| Actualizar parcial | PATCH  | `/api/v1/productos/{id}`     | 200 + recurso     | 400 / 404         |
| Eliminar           | DELETE | `/api/v1/productos/{id}`     | 204 (sin cuerpo)  | 404               |

## Representación del recurso

```json
{ "id": 1, "nombre": "Teclado mecánico", "precio": 45.9 }
```

## Cuerpos de entrada

- **POST y PUT** (`CrearProductoDto`): `nombre` (string, no vacío) y `precio` (number, positivo). Ambos obligatorios.
- **PATCH** (`ActualizarPrecioDto`): solo `precio` (number, positivo).

## Decisiones de diseño y su justificación

- **Sustantivo en plural y sin verbos en la URI.** La acción la expresa el verbo HTTP, no la ruta. Por eso `POST /productos` y no `/crearProducto`.
- **Versión explícita en la ruta** (`/api/v1`). Permite publicar una `v2` con otro formato sin romper a los clientes de `v1`.
- **POST devuelve 201 + `Location`.** El cliente obtiene la URI del recurso creado sin tener que construirla.
- **PUT devuelve 204 y exige el objeto completo.** Reemplaza todo el recurso; por eso es idempotente.
- **PATCH devuelve 200 con el recurso.** Como el cambio es parcial, se devuelve el estado resultante para que el cliente lo vea.
- **DELETE devuelve 204 y, repetido, 404.** El estado final del servidor es el mismo en ambas llamadas, así que sigue siendo idempotente. Nunca 500.
