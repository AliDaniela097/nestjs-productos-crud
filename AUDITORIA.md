# Auditoría de accesibilidad, UX y responsive — `public/index.html`

**Norma de referencia:** WCAG 2.2 nivel AA · **Fecha:** 2026-09-30 · **Tipo:** no destructiva (ningún archivo del proyecto fue modificado)

## Alcance y método

- **Archivos solicitados:** `index.html`, `styles.css`, `script.js`.
  En el proyecto **solo existe `public/index.html`**. No hay `styles.css` ni `script.js`: el CSS está embebido en `<style>` (líneas 7–131) y el JavaScript en `<script>` (líneas 201–473). Se auditó ese contenido como equivalente. También se revisó `src/config.controller.ts`, que sirve `/api/config.js` (línea 200 del HTML).
- **Método:** análisis estático del código. Los contrastes se calcularon con la fórmula de luminancia relativa de WCAG sobre los tokens de color de `:root` (tema claro) y del tema oscuro.
- **Limitación:** la página no se ejecutó en un navegador. Los anchos de la tabla a 320/390 px son **estimaciones** hechas a partir del CSS (paddings, tamaños de fuente, `white-space`, `flex-wrap`), y hay que confirmarlas en DevTools. Cada hallazgo estimado está marcado como tal.

---

## 1. Resumen ejecutivo

La página tiene una base sólida: idioma declarado, `<title>`, viewport sin bloqueo de zoom, jerarquía `h1 → h2` correcta, etiquetas `<label for>` en todos los campos, botones y enlaces bien usados, un grupo de conmutación con `aria-pressed` correcto, foco visible (no se elimina el `outline`) y escape de HTML contra XSS. La mayoría de los textos cumplen 4.5:1 en ambos temas.

Los problemas principales son:

1. **Reflow en 320 px (crítico, estimado):** la tabla de productos no cabe y el contenedor `.card` tiene `overflow:hidden`, así que las columnas de acciones quedan **recortadas y no se pueden alcanzar**.
2. **Contraste en tema oscuro:** texto blanco sobre `--accent #7ba4ff` = **2.44:1** en el botón activo del conmutador y en el botón «Crear».
3. **Pérdida de foco:** después de PUT/PATCH/DELETE la tabla se repinta con `innerHTML` y el foco del teclado vuelve a `<body>`.
4. **Resultados sin anunciar:** ni la consola ni los errores 400 están en una región `aria-live`. Un lector de pantalla no se entera del resultado de ninguna petición.
5. **Inconsistencia funcional:** el texto de ayuda pide «deja el nombre vacío para ver el 400», pero el atributo `required` hace que el navegador bloquee ese envío.

| Severidad | Cantidad |
|---|---|
| Crítica | 1 |
| Alta | 3 |
| Media | 8 |
| Baja | 7 |

---

## 2–4. Hallazgos, evidencia y recomendaciones

### 🔴 Críticos

#### C1. La tabla se recorta a 320 px y las acciones quedan inaccesibles *(estimado)*
- **Criterio:** WCAG 1.4.10 Reflow (AA), 2.1.1 Teclado (efecto indirecto).
- **Evidencia:**
  - `index.html` L63: `.card{…overflow:hidden}`.
  - L154 / L423–427: la `<table>` se inserta directamente en `#tabla-cont`, sin contenedor con scroll.
  - L69–71: `th`/`td` con `padding:…18px` a cada lado (36 px por columna × 4 = 144 px solo en padding).
  - L73: `td.num{white-space:nowrap}`. L75: `.acciones` con `flex-wrap`; su ancho mínimo es el del botón más ancho («DELETE», unos 67 px).
  - Estimación del ancho mínimo: Id (unos 52 px) + Nombre (palabra más larga + 36, unos 96 px) + Precio (unos 86 px) + Acciones (unos 103 px) ≈ **337 px**. A 320 px el espacio útil es 320 − 32 (padding de `.wrap`) − 2 (borde) = **286 px**. Sobran unos 50 px que `overflow:hidden` **recorta sin permitir scroll**, así que la columna «Verbos HTTP» queda parcial o totalmente oculta.
- **Recomendación:** envolver la tabla en `<div class="tabla-scroll" role="region" aria-label="Productos" tabindex="0">` con `overflow-x:auto`, o bien pasar a un diseño de tarjetas o filas apiladas por debajo de unos 480 px. Reducir el padding horizontal de celdas en móvil (por ejemplo `padding:10px 8px`). No depender de `overflow:hidden` en `.card` para contenido de ancho variable.

### 🟠 Altos

#### A1. Contraste insuficiente en el tema oscuro: blanco sobre `--accent`
- **Criterio:** 1.4.3 Contraste mínimo (AA).
- **Evidencia:** L51 `.switch button[aria-pressed="true"]{background:var(--accent);color:#fff}` y L96 `button.primary{background:var(--accent);color:#fff}`. En tema oscuro, `--accent:#7ba4ff` (L19, L28) → **#fff / #7ba4ff = 2.44:1** (se requiere 4.5:1 para texto de 0.85–0.88rem). En tema claro (`#2c5fd8`) es 5.62:1 y **cumple**.
- **Recomendación:** definir un token `--on-accent` y usarlo en lugar de `#fff`. En tema oscuro, `--on-accent:#0e131c` sobre `#7ba4ff` da unos 8:1. Otra opción es usar un acento más oscuro como fondo de botón en tema oscuro.

#### A2. El foco del teclado se pierde después de PUT, PATCH y DELETE
- **Criterio:** 2.4.3 Orden del foco (A), 2.4.7 Foco visible (AA) en la práctica.
- **Evidencia:** `reemplazar`, `parchear` y `eliminar` (L387, L393, L398) encadenan `.then(listar)`, y `pintarTabla()` (L423) reemplaza todo el `innerHTML` de `#tabla-cont`. El botón que tenía el foco se destruye y el foco pasa a `<body>`. El usuario de teclado tiene que volver a tabular desde el inicio de la página.
- **Recomendación:** antes de repintar, guardar `data-a` y el `id` del producto del botón activo. Después de pintar, restaurar el foco en el botón equivalente. Si el producto se eliminó, enfocar la fila siguiente, la anterior, o el encabezado «Productos» (con `tabindex="-1"`). Otra opción es actualizar solo la fila afectada.

#### A3. Resultados, errores y estados no se anuncian a tecnologías de asistencia
- **Criterio:** 4.1.3 Mensajes de estado (AA), 3.3.1 Identificación de errores (A).
- **Evidencia:**
  - `#consola` (L181) se reescribe en `mostrar()` (L337) sin `aria-live` ni `role="status"`.
  - Un 400 de validación se muestra solo como JSON dentro de `<pre>` en otra columna (en móvil, más abajo en la página). El error no se asocia al campo (`aria-invalid`, `aria-describedby`) ni se muestra junto al formulario.
  - «Cargando…» (L154), el cambio de mecanismo (`#banner`, L462) y la tabla vacía tampoco se anuncian.
- **Recomendación:** añadir una región `<p id="estado" class="sr-only" role="status" aria-live="polite">` y escribir en ella un resumen breve, por ejemplo «POST 201 Created» o «Error 400: el nombre es obligatorio». Para el formulario, mostrar el mensaje del servidor junto al campo, marcarlo con `aria-invalid="true"`, enlazarlo con `aria-describedby` y mover el foco al primer campo con error.

### 🟡 Medios

#### M1. Badge de éxito (2xx) con contraste insuficiente en tema claro
- **Criterio:** 1.4.3 (AA).
- **Evidencia:** L108 `.b2{background:var(--ok-soft);color:var(--ok)}` → **#1a7f4b / #e2f5ea = 4.42:1**. El texto mide 0.78rem (unos 12.5 px) en negrita 800, no llega a «texto grande» (≥ 18.66 px en negrita), así que necesita 4.5:1. En `.hist .badge` (L125) mide 0.7rem. Las variantes `.b4` (4.55:1) y `.b5` (5.64:1) cumplen, igual que todas las del tema oscuro.
- **Recomendación:** oscurecer `--ok` a unos `#177044` (≥ 5:1) o aclarar `--ok-soft`.

#### M2. Los bordes de los campos y botones de verbo no alcanzan 3:1
- **Criterio:** 1.4.11 Contraste de componentes no textuales (AA).
- **Evidencia:** L91 `input{border:1px solid var(--border);background:var(--panel-2)}` y L78 `button.verb{border:1px solid var(--border)}`. En tema claro, `#dde3ed` sobre `#ffffff` = **1.29:1** y el fondo `#f8fafc` sobre `#fff` = 1.05:1. En tema oscuro, `#2a3547` sobre `#161d2a` = 1.37:1. El límite del campo de texto es prácticamente invisible. En los botones de verbo lo compensa el texto coloreado (≥ 4.8:1), pero el campo no tiene otra pista visual aparte de la etiqueta.
- **Recomendación:** usar un token `--border-strong` para controles de formulario con ≥ 3:1 frente al fondo, por ejemplo `#8391a7` en claro o `#5b6b85` en oscuro.

#### M3. Los botones de acción no dicen sobre qué producto actúan
- **Criterio:** 2.4.6 Encabezados y etiquetas (AA); buena práctica para 1.3.1.
- **Evidencia:** L415–418: cada fila tiene botones con el nombre accesible «GET», «PUT», «PATCH», «DELETE», repetidos en todas las filas. En la lista de controles de un lector de pantalla aparecen N botones «DELETE» idénticos. Además, los verbos HTTP no describen la acción para un usuario no técnico.
- **Recomendación:** mantener el texto visible y añadir `aria-label`, por ejemplo `aria-label="Eliminar «Audífonos bluetooth» (DELETE)"`, o un texto oculto con `.sr-only`. Opcionalmente, agregar `title` o un texto de ayuda con la acción en lenguaje natural.

#### M4. `required` contradice el texto de ayuda y la intención del código
- **Criterio:** UX y consistencia funcional; 3.3.2 Etiquetas o instrucciones (A), porque la instrucción no puede cumplirse.
- **Evidencia:** L163 y L167 tienen `required`. L172 dice «Deja el nombre vacío… para ver la respuesta 400». L447–448 comenta «No se valida en el navegador a propósito». En la práctica, el navegador **bloquea el envío** con el nombre o el precio vacíos, y el listener `submit` (L443) ni siquiera se ejecuta. Solo el caso del precio negativo llega al servidor.
- **Recomendación:** si la intención es demostrar el 400 del servidor, añadir `novalidate` al `<form>` (L160) y quitar `required`, o bien ajustar el texto de ayuda. En cualquier caso, mostrar el error junto al campo (ver A3).

#### M5. El formulario se vacía antes de conocer el resultado
- **Criterio:** UX; relacionado con 3.3.1 y 3.3.3 (Sugerencias ante errores).
- **Evidencia:** L450–451 limpian los campos inmediatamente después de llamar a `crear()`, sin esperar la respuesta. Si el servidor responde 400 o no hay red, el usuario pierde lo que escribió.
- **Recomendación:** hacer que `crear()` devuelva la promesa y limpiar los campos solo si `r.ok`. Desactivar el botón «Crear» mientras la petición está en curso.

#### M6. Uso de `prompt()` y `confirm()` para editar y eliminar
- **Criterio:** UX y robustez; 3.3.1 y 3.3.3.
- **Evidencia:** L381, L383, L391 y L397. No hay validación: `parseFloat("abc")` da `NaN` y `JSON.stringify` lo envía como `null`. Los diálogos nativos no se pueden estilizar, interrumpen el flujo, están bloqueados en algunos contextos (iframes con sandbox, algunos visores) y en ellos `confirm()` devuelve `false`, así que DELETE nunca se ejecutaría.
- **Recomendación:** usar un `<dialog>` modal con `<form method="dialog">`, campos etiquetados, validación y foco inicial y de retorno gestionados. Para DELETE, usar un diálogo de confirmación con botón destructivo explícito.

#### M7. Filas muy altas en móvil a 390 px *(estimado)*
- **Criterio:** UX responsive.
- **Evidencia:** a 390 px el ancho útil es unos 356 px, suficiente para la tabla (C1), pero la columna de acciones solo recibe su ancho mínimo. Con `flex-wrap` (L75), los 4 botones se apilan verticalmente: unos 4 × 29 px + 3 × 6 px ≈ 134 px por fila. Cinco productos ocupan más de una pantalla.
- **Recomendación:** en menos de 480 px, mostrar las acciones en una fila bajo el nombre (patrón de tarjeta) o en una cuadrícula 2 × 2, o agruparlas en un menú «Acciones».

#### M8. Posible desbordamiento horizontal del banner con URLs largas *(condicional)*
- **Criterio:** 1.4.10 Reflow (AA).
- **Evidencia:** L465 inserta `cfg.base` en `<code>` dentro de `.banner` (L53–58), y ni `.banner` ni `.banner code` tienen `word-break` ni `overflow-wrap`. Con `http://localhost:3001/productos` (31 caracteres monoespaciados) el ancho queda al límite a 320 px. Con una `POSTGREST_URL` de nube más larga (`config.controller.ts` L21), el `<code>` excede el contenedor y genera **scroll horizontal en toda la página**, porque `.banner` no recorta.
- **Recomendación:** `.banner code{overflow-wrap:anywhere}` (o `word-break:break-all`, como ya se hace en `.url` L106).

### 🟢 Bajos

#### B1. No hay landmark `<main>` ni enlace «Saltar al contenido»
- **Criterio:** 1.3.1 (buena práctica). 2.4.1 Evitar bloques **se cumple** gracias a los encabezados (técnica H69) y a que la cabecera es corta.
- **Evidencia:** L149 `<div class="grid">` contiene todo el contenido principal. Sí existen `header` (L136) y `footer` (L194).
- **Recomendación:** cambiar `<div class="grid">` por `<main class="grid">`.

#### B2. Tabla sin `<caption>` y encabezados sin `scope`
- **Criterio:** 1.3.1 (buena práctica; en una tabla simple de una sola fila de encabezados el navegador infiere la asociación).
- **Evidencia:** L424–427.
- **Recomendación:** añadir `<caption class="sr-only">Productos (N)</caption>` y `scope="col"` en los `<th>`.

#### B3. Los bloques `<pre>` con scroll no reciben foco en todos los navegadores
- **Criterio:** 2.1.1 Teclado (A).
- **Evidencia:** L112–116 `pre{overflow:auto;max-height:260px}`. Chrome y Firefox recientes hacen enfocables las áreas con scroll, pero Safari no, así que una respuesta JSON larga no se puede desplazar con teclado.
- **Recomendación:** generar `<pre tabindex="0" role="region" aria-label="Respuesta">`.

#### B4. Objetivos táctiles pequeños para uso móvil
- **Criterio:** 2.5.8 Tamaño del objetivo (mínimo) (AA) **se cumple**. 2.5.5 (AAA, 44 × 44) no se cumple.
- **Evidencia:** `button.verb` (L77–81) mide unos 45–67 × 29 px con 6 px de separación, por encima del mínimo de 24 × 24. Los botones del conmutador (L47–50) miden unos 36 px de alto.
- **Recomendación:** en `@media (pointer:coarse)`, subir a `min-height:44px` y aumentar el `gap`.

#### B5. El historial no tiene suficiente contexto
- **Criterio:** UX; 1.3.1.
- **Evidencia:** L349–356: cada `<li>` muestra solo el método, el código y los ms, sin la URL ni el recurso, y la lista `<ul>` (L188) no tiene nombre accesible propio más allá del `h2` anterior.
- **Recomendación:** incluir la URL o el id del recurso (truncado visualmente, completo en `title`) y `aria-labelledby` que apunte al `h2` «Historial».

#### B6. Condición de carrera al cambiar rápido de mecanismo
- **Criterio:** robustez del JavaScript.
- **Evidencia:** `cambiar()` (L457–467) llama a `listar()` sin cancelar la petición anterior. Si la respuesta de NestJS llega después de la de PostgREST, la tabla muestra datos del modo que ya no está seleccionado.
- **Recomendación:** usar `AbortController` o descartar las respuestas cuyo `modo` no coincida con el actual.

#### B7. Enlace que abre una pestaña nueva sin avisar
- **Criterio:** 3.2.5 (AAA, solo recomendación).
- **Evidencia:** L195 `target="_blank"`.
- **Recomendación:** añadir un texto como «(se abre en una pestaña nueva)», visible o `.sr-only`.

---

### ✅ Criterios que cumplen

| Área | Resultado | Evidencia |
|---|---|---|
| Idioma de la página (3.1.1) | Cumple | L2 `lang="es"` |
| Título (2.4.2) | Cumple | L6 |
| Zoom / viewport (1.4.4) | Cumple | L5 sin `maximum-scale` ni `user-scalable=no`; tamaños en `rem` |
| Jerarquía de encabezados (1.3.1, 2.4.6) | Cumple | Un `h1` (L138) y cuatro `h2` (L153, 158, 180, 187), sin saltos |
| Etiquetas de formulario (1.3.1, 3.3.2, 4.1.2) | Cumple | `label for` ↔ `id` en L162–163 y L166–167 |
| Botones vs. enlaces | Cumple | Las acciones usan `<button>` y la navegación usa `<a href>` (L195). No hay `div` clicables |
| ARIA del conmutador (4.1.2) | Cumple | `role="group"` + `aria-label` (L141) y `aria-pressed` sincronizado (L459–460) |
| Textos alternativos (1.1.1) | No aplica | La página no contiene `<img>`, `<svg>` ni imágenes CSS |
| Uso del color (1.4.1) | Cumple | Métodos y códigos de estado siempre tienen texto; el color es redundante |
| Contraste del texto principal (1.4.3) | Cumple | Muted/panel 4.90:1; muted/bg 4.53:1; verbos 4.80–6.26:1; `pre` 13.67:1; oscuro ≥ 5.86:1 (excepto A1) |
| Foco visible (2.4.7) | Cumple | No se elimina `outline` en botones ni enlaces; `input:focus` tiene outline propio con 5.37:1 (claro) y 6.39:1 (oscuro) |
| Orden del foco inicial (2.4.3) | Cumple | Orden del DOM igual al orden visual; sin `tabindex` positivo |
| Tamaño de objetivo (2.5.8) | Cumple | Todos los controles superan 24 × 24 px (ver B4) |
| Animaciones (2.3.x) | Cumple | No hay animaciones ni transiciones |
| Espaciado de texto (1.4.12) | Cumple | Sin alturas fijas con recorte, salvo `pre`, que tiene scroll |
| Tema oscuro | Cumple (con A1) | `prefers-color-scheme` y `data-theme` bien encadenados (L16–33) |
| Seguridad del DOM / XSS | Cumple | `esc()` (L245) se aplica a los datos del servidor antes de `innerHTML`; `precio` pasa por `Number().toFixed` |
| Carga de `/api/config.js` | Cumple | `config.controller.ts` responde con `Content-Type: application/javascript`, y hay respaldo `window.POSTGREST_URL \|\| …` (L221) |
| Errores de red en JS | Cumple | `.catch` en `pedir()` (L285) muestra un mensaje y no rompe la app |
| Layout 768 px | Cumple | Una sola columna por debajo de 940 px (L61); formulario en 3 columnas (560–940 px); la tabla cabe |
| Layout escritorio | Cumple | Máximo 1180 px, dos columnas `1fr 420px` |
| Cabecera a 320 px | Cumple | `flex-wrap` (L42); el conmutador mide unos 232 px y cabe en 286 px |
| Formulario a 320/390 px | Cumple | Se apila en una columna por debajo de 560 px (L88) |

### Resumen por ancho de pantalla

| Ancho | Estado | Hallazgos |
|---|---|---|
| 320 px | ❌ No cumple | C1 (tabla recortada), M8 (banner, condicional) |
| 390 px | ⚠️ Cumple con problemas de UX | M7 (filas altas) |
| 768 px | ✅ Cumple | — |
| Escritorio (≥ 941 px) | ✅ Cumple | — |

---

## 5. Pruebas que deben repetirse después de corregir

1. **Reflow:** en DevTools, con el modo dispositivo a 320, 390 y 768 px y a 1280 px con zoom al 400 %, cargar 5 o más productos con nombres largos (por ejemplo «Audífonos inalámbricos bluetooth con cancelación de ruido»). Comprobar que `document.documentElement.scrollWidth <= innerWidth` y que los 4 botones de cada fila son visibles o alcanzables con scroll dentro de la tabla.
2. **Banner con URL larga:** arrancar con `POSTGREST_URL=https://mi-servicio-postgrest-ejemplo.onrender.com`, cambiar a PostgREST a 320 px y verificar que no aparece scroll horizontal.
3. **Contraste:** revisar con axe DevTools o Lighthouse, y manualmente con el selector de contraste de DevTools, **en ambos temas** (cambiar `prefers-color-scheme` en Rendering). Casos concretos: botón «Crear», conmutador activo, badge 2xx y bordes de `input`.
4. **Solo teclado:** con Tab, Shift+Tab, Enter y Espacio, recorrer el conmutador, crear un producto, ejecutar PUT, PATCH y DELETE sobre una fila y comprobar que **el foco vuelve a un lugar lógico** después de cada acción. Comprobar que el foco es visible en todo momento y que los `<pre>` largos se pueden desplazar con teclado (probar también en Safari).
5. **Lector de pantalla:** con NVDA + Firefox o Chrome, y VoiceOver + Safari (macOS/iOS):
   - Al crear un producto, se anuncia el resultado (201 o 400).
   - Con un 400, el foco o el anuncio lleva al campo con error y se lee el mensaje.
   - La lista de botones (NVDA+F7) muestra nombres distintos por producto.
   - El conmutador se anuncia como «botón de alternancia, presionado/no presionado».
6. **Flujo de validación:** enviar el nombre vacío y el precio negativo, y confirmar que la petición llega al servidor (400 visible) si se adopta `novalidate`, o que el texto de ayuda coincide con el comportamiento. Verificar que los campos **no** se vacían cuando hay error.
7. **Edición y eliminación:** repetir PUT, PATCH y DELETE con el nuevo `<dialog>`: validación de precio no numérico, Esc cierra y devuelve el foco al botón de origen, y DELETE funciona dentro de un iframe con sandbox.
8. **Consola JS:** abrir la consola del navegador durante todo el recorrido (cargar, cambiar de mecanismo 5 veces seguidas rápido, CRUD completo, servicio PostgREST apagado) y confirmar que no hay errores no capturados y que la tabla siempre corresponde al mecanismo seleccionado (B6).
9. **Táctil:** en un dispositivo real o en emulación táctil, pulsar cada botón de verbo sin activar el vecino por error.
10. **Regresión automática:** ejecutar `npx @axe-core/cli http://localhost:3000` (o Lighthouse → Accessibility) antes y después, y adjuntar ambos resultados a la bitácora.
