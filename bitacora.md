# Bitácora — Semana 2: CRUD completo, URIs y códigos de estado

**Estudiante:** Alisson Basantes
**Curso:** Integración de Sistemas
**Fecha:** 22 de septiembre de 2026
**Stack:** NestJS + TypeScript, Swagger/OpenAPI

---

## 1. Qué se construyó

API REST de Productos con los seis endpoints del contrato CRUD, validación declarativa por DTOs, códigos de estado según el RFC 9110, header `Location` en la creación y enlaces HATEOAS en la consulta individual.

| Operación | Verbo | URI | Código de éxito |
| --- | --- | --- | --- |
| Listar | GET | `/api/v1/productos` | 200 |
| Obtener uno | GET | `/api/v1/productos/{id}` | 200 |
| Crear | POST | `/api/v1/productos` | 201 + `Location` |
| Reemplazar | PUT | `/api/v1/productos/{id}` | 204 |
| Actualizar parcial | PATCH | `/api/v1/productos/{id}` | 200 |
| Eliminar | DELETE | `/api/v1/productos/{id}` | 204 |

---

## 2. Análisis de un código de estado (Paso 9)

**Fila elegida de la matriz: DELETE repetido → 404 Not Found.**

La primera llamada a `DELETE /api/v1/productos/2` elimina el producto y responde **204 No Content**, porque la operación se completó y no queda nada que devolver en el cuerpo (RFC 9110, sección 15.3.5). Devolver 200 con un cuerpo vacío sería impreciso y obligaría al cliente a intentar parsear una respuesta sin contenido.

La segunda llamada sobre el mismo id responde **404 Not Found**, porque el recurso identificado por esa URI ya no existe (RFC 9110, sección 15.5.5). Es la respuesta correcta y no un 500: no hubo ninguna falla del servidor, sino una situación prevista por la lógica de negocio. En el código, `ProductosService.eliminar` busca el índice y lanza `NotFoundException` cuando no lo encuentra; el filtro de excepciones de NestJS la traduce automáticamente al código HTTP 404 con un cuerpo JSON uniforme.

**Relación con la idempotencia.** Aunque los dos códigos son distintos, DELETE sigue siendo idempotente. La idempotencia se define sobre el **efecto en el servidor**, no sobre la respuesta (RFC 9110, sección 9.2.2): tras una o tras diez llamadas, el producto 2 no existe. Esa propiedad es la que permite que un cliente reintente un DELETE después de una caída de red sin miedo a causar daño, algo que no se puede hacer con POST.

---

## 3. PUT frente a PATCH (pregunta del Paso 5)

**PUT exige el objeto completo** porque su semántica es reemplazar todo el estado del recurso con la representación enviada (RFC 9110, sección 9.3.4). Si el cuerpo omitiera `nombre`, el reemplazo dejaría ese campo sin valor. Como el resultado de enviar el mismo cuerpo N veces es idéntico, PUT es idempotente. En esta API devuelve **204** porque el cliente ya conoce el estado que acaba de imponer.

**PATCH solo pide el precio** porque describe un cambio parcial sobre el recurso (RFC 5789). Devuelve **200 con el recurso** para que el cliente vea cómo quedó la combinación de lo que había y lo que cambió. Importante: el estándar **no garantiza** que PATCH sea idempotente. En esta implementación lo es, porque el parche fija un valor absoluto ("el precio es 60"); un parche del tipo "suma 5 al precio" no lo sería.

---

## 4. Decisiones técnicas tomadas

1. **Validación declarativa en la frontera.** El `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y `transform` aplica los decoradores de los DTOs antes de que la petición llegue al controlador. No hay un solo `if` de validación escrito a mano. Además, un cliente que envíe `id` en el cuerpo del POST recibe 400 y no puede imponer el identificador.
2. **`ParseIntPipe` en el parámetro de ruta.** Convierte y valida el `:id` antes de la lógica de negocio: `GET /productos/abc` responde 400 sin tocar el servicio.
3. **Corrección al código de la guía.** El método `crear` de la guía usa `Math.max(...this.productos.map(p => p.id)) + 1`. Si la lista queda vacía tras varios DELETE, `Math.max(...[])` devuelve `-Infinity` y el nuevo id sale mal. Se agregó un ternario que devuelve 1 cuando la colección está vacía.
4. **`@ApiProperty` en los DTOs y la entidad.** Sin esos decoradores (o sin el plugin de Swagger en `nest-cli.json`), Swagger UI muestra el cuerpo de POST/PUT/PATCH vacío y la documentación queda incompleta.
5. **Puerto por variable de entorno.** `process.env.PORT ?? 3000`, siguiendo el factor VII de The Twelve-Factor App, para que el mismo código corra en local y en un hosting que asigne el puerto.
6. **HATEOAS.** `GET /productos/{id}` devuelve `_links` con `self`, `actualizar`, `eliminar` y `coleccion`, alcanzando el nivel 3 del modelo de madurez de Richardson descrito en la teoría de la clase.

---

## 5. Evidencia de pruebas

Ejecutadas con `bash pruebas-matriz.sh` contra el servidor en `http://localhost:3000`. Resultado: **11 de 11 correctas, 0 fallidas**.

| # | Prueba | Esperado | Obtenido | Cuerpo relevante |
| --- | --- | --- | --- | --- |
| 1 | POST con nombre vacío | 400 | 400 | `nombre should not be empty` |
| 2 | POST válido | 201 | 201 | `Location: /api/v1/productos/4` |
| 3 | GET con id inexistente | 404 | 404 | `Producto 999 no existe` |
| 4 | PUT con precio negativo | 400 | 400 | `precio must be a positive number` |
| 5 | PUT válido | 204 | 204 | (sin cuerpo) |
| 6 | PATCH de precio válido | 200 | 200 | `{"id":1,...,"precio":60}` |
| 7 | DELETE existente | 204 | 204 | (sin cuerpo) |
| 8 | DELETE repetido | 404 | 404 | `Producto 2 no existe` |
| 9 | GET lista | 200 | 200 | 3 productos |
| 10 | PATCH con id inexistente | 404 | 404 | `Producto 999 no existe` |
| 11 | GET `/abc` (ParseIntPipe) | 400 | 400 | `numeric string is expected` |

**Respuesta con HATEOAS verificada en `GET /api/v1/productos/1`:**

```json
{
  "id": 1,
  "nombre": "Teclado mecánico",
  "precio": 45.9,
  "_links": {
    "self": { "href": "/api/v1/productos/1" },
    "actualizar": { "href": "/api/v1/productos/1", "method": "PUT" },
    "eliminar": { "href": "/api/v1/productos/1", "method": "DELETE" },
    "coleccion": { "href": "/api/v1/productos" }
  }
}
```

> Falta adjuntar las **4 capturas de pantalla** que pide el Paso 7. Tomarlas desde Swagger UI (`/swagger`) sobre cuatro filas distintas de la tabla anterior.

---

## 6. Limitaciones conocidas

- Los datos viven **en memoria**: se reinician con cada arranque del servidor y los ids cambian. No hay persistencia.
- No hay autenticación ni autorización; todos los endpoints son públicos.
- PATCH solo permite modificar `precio`, no `nombre`.

---

## Declaración de uso de IA

- **Herramienta(s):** Claude (Anthropic), modelo Opus 5.
- **Nivel de uso:** Nivel 2–3 (borrador y revisor), según la guía de la práctica.
- **Qué se le pidió:** explicar los conceptos de la teoría de la Semana 2 (REST, URIs, verbos, idempotencia, códigos de estado, HATEOAS, versionamiento, Swagger/OpenAPI); revisar el código de ejemplo de la guía en busca de errores; y generar el esqueleto de los endpoints CRUD sobre el contrato definido previamente.
- **Qué se modificó/verificó manualmente:** se verificó endpoint por endpoint ejecutando el servidor y comprobando el código de estado de cada una de las filas de la matriz de pruebas. Se corrigió el bug de `Math.max` con la colección vacía, se completaron los imports que la guía omitía, se agregaron los decoradores `@ApiProperty` y `@ApiResponse` que faltaban para documentar el contrato en Swagger, y se decidieron manualmente las reglas de validación de cada DTO.
