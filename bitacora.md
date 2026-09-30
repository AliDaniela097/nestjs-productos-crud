# Bitácora — Semana 2: CRUD completo, URIs y códigos de estado

**Estudiante:** Alisson Basantes
**Curso:** Integración de Sistemas
**Stack:** NestJS + TypeScript · PostgreSQL 16 · PostgREST · Swagger/OpenAPI

---

## 1. Qué se construyó

Una API REST de Productos con el CRUD completo, persistida en PostgreSQL. Sobre **la misma tabla** se exponen **dos mecanismos de integración distintos**, lo que permite compararlos de forma directa:

| | API NestJS | PostgREST |
| --- | --- | --- |
| Origen | Escrita a mano | Generada desde el esquema SQL |
| Validación | DTOs con `class-validator` | Restricciones `CHECK` de PostgreSQL |
| Permisos | En el código | Roles y `GRANT` de la base de datos |
| Documentación | Swagger en `/swagger` | OpenAPI autogenerado |
| Puerto | 3000 | 3001 |

Ambas leen y escriben la tabla `api.productos`. Un producto creado por una aparece de inmediato en la otra.

### Contrato implementado en NestJS

| Operación | Verbo | URI | Éxito |
| --- | --- | --- | --- |
| Listar | GET | `/api/v1/productos` | 200 |
| Obtener uno | GET | `/api/v1/productos/{id}` | 200 + `_links` |
| Crear | POST | `/api/v1/productos` | 201 + `Location` |
| Reemplazar | PUT | `/api/v1/productos/{id}` | 204 |
| Actualizar parcial | PATCH | `/api/v1/productos/{id}` | 200 |
| Eliminar | DELETE | `/api/v1/productos/{id}` | 204 |

---

## 2. Análisis de un código de estado (Paso 9)

**Fila elegida: DELETE repetido → 404 Not Found.**

La primera llamada a `DELETE /api/v1/productos/3` elimina la fila y responde **204 No Content**, porque la operación se completó y no queda nada que devolver en el cuerpo (RFC 9110, sección 15.3.5). Devolver 200 con un cuerpo vacío sería impreciso y obligaría al cliente a intentar parsear una respuesta sin contenido.

La segunda llamada sobre el mismo id responde **404 Not Found**, porque el recurso identificado por esa URI ya no existe (RFC 9110, sección 15.5.5). Es la respuesta correcta y no un 500: no hubo falla del servidor, sino una situación prevista. En el código, `ProductosService.eliminar` revisa `resultado.affected` y lanza `NotFoundException` cuando la sentencia `DELETE` no afectó ninguna fila; el filtro de excepciones de NestJS la traduce a 404 con un cuerpo JSON uniforme.

**Relación con la idempotencia.** Aunque los dos códigos difieren, DELETE sigue siendo idempotente. La idempotencia se define sobre el **efecto en el servidor**, no sobre la respuesta (RFC 9110, sección 9.2.2): tras una o tras diez llamadas, el producto 3 no existe. Esa propiedad permite que un cliente reintente un DELETE después de una caída de red sin causar daño, algo que no se puede hacer con POST.

---

## 3. Hallazgo: las dos APIs responden distinto al mismo caso

Al probar los dos mecanismos sobre la misma base apareció una diferencia que vale la pena analizar, porque explica una decisión de diseño de fondo.

| Caso | API NestJS | PostgREST |
| --- | --- | --- |
| GET lista | 200 | 200 |
| GET id existente | 200 + `_links` | 200 (array de un elemento) |
| **GET id inexistente** | **404** | **200 con `[]`** |
| POST válido | 201 + `Location` | 201, **sin `Location`** |
| POST inválido | 400, mensaje del DTO | 400, mensaje crudo de PostgreSQL |
| PUT válido | 204 | 204 |
| PATCH válido | 200 + recurso | 204 |
| **PATCH id inexistente** | **404** | **204** |
| DELETE existente | 204 | 204 |
| **DELETE repetido** | **404** | **204** |
| HATEOAS | Sí | No |

**Por qué ocurre.** PostgREST no modela *recursos individuales*, modela **conjuntos de filas**. La URI `?id=eq.999` no significa "el producto 999", significa "las filas cuyo id es igual a 999". Un filtro que no encuentra nada devuelve un conjunto vacío, y un conjunto vacío es un resultado perfectamente válido: de ahí el 200 con `[]` y el 204 en las escrituras. La noción de "recurso que no existe", y por tanto el 404, pertenece al diseño orientado a recursos que se implementa a mano.

**Cuál es correcto.** Los dos, en su propio modelo. Es más: la teoría de la clase (sección 2.3) define la idempotencia diciendo que "borrar un registro ya borrado sigue devolviendo `204 No Content`" — que es literalmente lo que hace PostgREST. La guía de la práctica, en cambio, exige 404 en el DELETE repetido, que es la convención habitual en APIs orientadas a recursos y la que comunica mejor al cliente que la URI ya no apunta a nada. Ambas posturas son defendibles; lo que no es defendible es no elegir una y documentarla en el contrato.

**Otras dos diferencias que importan en integración:**

1. **PostgREST no devuelve `Location` en el POST.** Se verificó inspeccionando las cabeceras: responde 201 con `Content-Range` pero sin `Location`. Un cliente que dependa de esa cabecera para consultar el recurso recién creado no funcionaría contra PostgREST.
2. **El mensaje de error de PostgREST expone detalles internos.** Un precio negativo devuelve `violates check constraint "productos_precio_check"` junto con el contenido de la fila rechazada. Es útil depurando, pero filtra el nombre de la restricción y la estructura de la tabla a cualquier consumidor. Los DTOs de NestJS devuelven `precio must be a positive number`, que es información para el cliente y nada más.

---

## 4. PUT frente a PATCH (pregunta del Paso 5)

**PUT exige el objeto completo** porque su semántica es reemplazar todo el estado del recurso con la representación enviada (RFC 9110, sección 9.3.4). Si el cuerpo omitiera `nombre`, el reemplazo lo dejaría sin valor. Como enviar el mismo cuerpo N veces produce el mismo resultado, PUT es idempotente. Devuelve **204** porque el cliente ya conoce el estado que acaba de imponer.

**PATCH solo pide el precio** porque describe un cambio parcial (RFC 5789). Devuelve **200 con el recurso** para que el cliente vea el resultado de combinar lo que había con lo que cambió. El estándar **no garantiza** que PATCH sea idempotente: aquí lo es porque el parche fija un valor absoluto ("el precio es 60"); un parche del tipo "suma 5 al precio" no lo sería.

---

## 5. Decisiones técnicas

1. **Una sola base, dos APIs encima.** Demuestra que el mecanismo de integración es una capa sobre los datos, no los datos mismos, y permite la comparación de la sección 3.
2. **Validación en dos niveles.** Los DTOs validan en la frontera de la aplicación; las restricciones `CHECK` validan en la base. La segunda capa es la que protege el dato cuando otro sistema —PostgREST, por ejemplo— escribe sin pasar por NestJS. Ese es el argumento para no confiar la integridad solo al código de aplicación.
3. **Roles separados.** PostgREST se conecta como `authenticator`, un rol `NOINHERIT` sin permisos propios que solo puede cambiar a `web_anon`. NestJS se conecta como `nest_app`. Las dos APIs comparten datos pero no credenciales ni permisos.
4. **`synchronize: false` en TypeORM.** El esquema lo define `db/init.sql`, no la aplicación. Dejarlo en `true` permitiría que un cambio en la entidad alterara la tabla en producción sin revisión.
5. **Transformer en la columna `precio`.** PostgreSQL devuelve `NUMERIC` como cadena para no perder precisión. Sin el transformer, el JSON saldría con `"45.90"` en vez de `45.9` y rompería a los clientes que esperan un número.
6. **Credenciales por variables de entorno.** Ningún dato de conexión está escrito en el código (factor III de The Twelve-Factor App). El `.env` está excluido del repositorio; se versiona `.env.example`.
7. **Corrección al código de la guía.** El método `crear` original usaba `Math.max(...productos.map(p => p.id)) + 1`, que devuelve `-Infinity` con la lista vacía. Al pasar a PostgreSQL el problema desaparece: el id lo genera la secuencia `SERIAL` de la base.

### Bug encontrado y corregido durante la migración

Al pasar de un array en memoria a la base de datos, los métodos del servicio se volvieron asíncronos, pero el controlador seguía llamándolos sin `await`:

```ts
eliminar(@Param('id', ParseIntPipe) id: number) {
  this.productosService.eliminar(id);   // promesa sin esperar
}
```

Con datos en memoria esto funcionaba. Con la base de datos, el 404 del DELETE repetido quedaba como **promesa rechazada sin capturar** y **tumbaba el proceso de Node**: la respuesta 204 ya se había enviado y el servidor moría después. Se detectó porque las pruebas posteriores de la matriz empezaron a fallar con código `000` (sin conexión). La corrección fue marcar los métodos como `async` y esperar la promesa, en `reemplazar` y en `eliminar`.

Es un error silencioso y fácil de pasar por alto: no aparece al probar el camino feliz, solo cuando el servicio lanza una excepción.

---

## 6. Evidencia de pruebas

Ejecutadas con `bash pruebas-matriz.sh` contra los dos servicios. Resultado: **19 de 19 correctas, 0 fallidas**.

### Bloque 1 — Matriz oficial del Paso 7 (API NestJS)

| # | Prueba | Esperado | Obtenido | Cuerpo relevante |
| --- | --- | --- | --- | --- |
| 1 | POST con nombre vacío | 400 | 400 | `nombre should not be empty` |
| 2 | POST válido | 201 | 201 | `Location: /api/v1/productos/4` |
| 3 | GET con id inexistente | 404 | 404 | `Producto 999 no existe` |
| 4 | PUT con precio negativo | 400 | 400 | `precio must be a positive number` |
| 5 | PUT válido | 204 | 204 | (sin cuerpo) |
| 6 | PATCH de precio válido | 200 | 200 | `{"id":1,...,"precio":60}` |
| 7 | DELETE existente | 204 | 204 | (sin cuerpo) |
| 8 | DELETE repetido | 404 | 404 | `Producto 3 no existe` |

### Bloque 2 — Casos adicionales (API NestJS)

| Prueba | Esperado | Obtenido | Cuerpo |
| --- | --- | --- | --- |
| GET lista | 200 | 200 | 3 productos |
| PATCH con id inexistente | 404 | 404 | `Producto 999 no existe` |
| GET `/abc` (ParseIntPipe) | 400 | 400 | `numeric string is expected` |
| POST con campo extra `id` | 400 | 400 | `property id should not exist` |

### Bloque 3 — PostgREST sobre la misma base

| Prueba | Obtenido | Observación |
| --- | --- | --- |
| GET lista | 200 | Incluye `Content-Range` |
| GET id inexistente | 200 | Devuelve `[]`, no 404 |
| POST válido | 201 | Sin cabecera `Location` |
| POST que viola el CHECK | 400 | Mensaje crudo de PostgreSQL |
| PATCH de precio | 204 | Sin cuerpo (NestJS devuelve 200) |
| DELETE existente | 204 | |
| DELETE repetido | 204 | No 404: opera sobre conjuntos |

### Respuesta con HATEOAS verificada en `GET /api/v1/productos/1`

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

> Pendiente: adjuntar las **4 capturas de pantalla** del Paso 7, tomadas desde Swagger UI o desde el frontend en `http://localhost:3000`.

---

## 7. Limitaciones conocidas

- **Sin autenticación.** `web_anon` tiene el CRUD completo para poder demostrar los cuatro verbos. En un sistema real el rol anónimo solo tendría `SELECT` y las escrituras exigirían un JWT.
- **Las credenciales del `docker-compose.yml` son de desarrollo** y están a la vista. En un despliegue real irían en variables de entorno o en un gestor de secretos.
- **PATCH solo permite cambiar `precio`,** no `nombre`, tal como lo define la guía.
- **Sin paginación.** `GET /productos` devuelve la tabla completa; con un catálogo grande haría falta paginar, como señala la teoría de la clase.

---

## Declaración de uso de IA

- **Herramienta(s):** Claude (Anthropic), modelo Opus 5.
- **Nivel de uso:** Nivel 2–3 (borrador y revisor), según la guía de la práctica.
- **Qué se le pidió:** explicar los conceptos de la teoría de la Semana 2 (REST, URIs, verbos, idempotencia, códigos de estado, HATEOAS, versionamiento, Swagger/OpenAPI); revisar el código de ejemplo de la guía en busca de errores; generar el esqueleto de los endpoints CRUD sobre un contrato definido previamente; y apoyar la migración del almacenamiento en memoria a PostgreSQL con PostgREST.
- **Qué se modificó/verificó manualmente:** se verificó endpoint por endpoint ejecutando los servicios y comprobando el código de estado de cada fila de la matriz. Se corrigió el bug de `Math.max` con la colección vacía, se completaron los imports que la guía omitía, se agregaron los decoradores `@ApiProperty` y `@ApiResponse` que faltaban, y se decidieron manualmente las reglas de validación de cada DTO. Durante la migración a base de datos se detectó y corrigió el bug de las promesas sin `await` descrito en la sección 5, que aparecía solo al provocar un 404. La comparación de la sección 3 se construyó ejecutando las dos APIs y contrastando las respuestas reales, no la documentación.

---

## Referencias

- Fielding, R. T. (2000). *Architectural Styles and the Design of Network-based Software Architectures* (tesis doctoral). University of California, Irvine, cap. 5.
- Fielding, R., Nottingham, M. y Reschke, J. (2022). *RFC 9110: HTTP Semantics*. IETF.
- Dusseault, L. y Snell, J. (2010). *RFC 5789: PATCH Method for HTTP*. IETF.
- Berners-Lee, T., Fielding, R. y Masinter, L. (2005). *RFC 3986: URI Generic Syntax*. IETF.
- Fowler, M. (2002). *Patterns of Enterprise Application Architecture* (patrón DTO). Addison-Wesley.
- Fowler, M. (2010). *Richardson Maturity Model*. martinfowler.com.
- Wiggins, A. *The Twelve-Factor App*, factores III y VII. 12factor.net.
- PostgREST. *Documentation v12* — Roles, Schema Isolation, Tables and Views. postgrest.org.
- NestJS. *Controllers, Providers, Pipes, Exception filters, Validation, OpenAPI, Database (TypeORM)*. docs.nestjs.com.
- PostgreSQL Global Development Group. *PostgreSQL 16 Documentation* — CREATE ROLE, GRANT, CHECK constraints.
