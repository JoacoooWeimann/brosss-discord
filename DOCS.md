# Documentación: cómo funciona cada parte

Esta guía explica **qué hace cada archivo y por qué**, para que puedas entender el código, modificarlo y explicarlo en una entrevista.

---

## 1. `index.html`: la estructura

La página está dividida en secciones con etiquetas semánticas (`<header>`, `<main>`, `<section>`, `<footer>`). Cada sección tiene un `id` (`#stats`, `#reglas`…) para que los links del menú puedan saltar a ella.

**Contenedores vacíos.** Las listas de reglas, staff, rangos y FAQ están vacías en el HTML:

```html
<ol class="reglas" id="reglas-lista"></ol>
```

JavaScript las llena con los datos de `config.js`. Así, para agregar una regla no hace falta tocar el HTML.

**Atributos `data-*`.** Son atributos propios que sirven para marcar elementos:

- `data-nombre` → JS reemplaza el texto por el nombre del servidor.
- `data-invitacion` → JS le pone el link de invitación al `href`.

Con `document.querySelectorAll("[data-invitacion]")` se agarran **todos** los botones de "Unirse" de una sola vez.

**Orden de los scripts.** `config.js` se carga antes que `main.js` porque `main.js` usa la variable `CONFIG`, que se define en `config.js`.

---

## 2. `css/styles.css`: el diseño

### Variables CSS (`:root`)

```css
:root {
  --verde: #22e36b;
  --brillo: 0 0 12px rgba(34, 227, 107, 0.55), ...;
}
```

Los colores se definen una sola vez y se usan con `var(--verde)`. Para cambiar el color de toda la página, alcanza con cambiar esa línea.

### El efecto neón

El "brillo" se logra con `box-shadow` (en cajas) y `text-shadow` (en textos) usando sombras **sin desplazamiento** y con mucho desenfoque, del mismo color que el elemento:

```css
text-shadow: 0 0 12px rgba(34, 227, 107, 0.55);
```

### Fondo del hero

Se superponen varios fondos separados por comas:

1. `radial-gradient`: el resplandor verde del centro.
2. Dos `linear-gradient` de 1px repetidos cada 40px, que forman la grilla.
3. El color sólido de fondo.

### Grid responsive sin media queries

```css
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
```

"Poné tantas columnas como entren, cada una de mínimo 200px". En pantallas chicas quedan menos columnas automáticamente.

### `clamp()` para tamaños de texto

```css
font-size: clamp(3rem, 10vw, 6rem);
```

Crece con el ancho de la pantalla (`10vw`), pero nunca baja de `3rem` ni pasa de `6rem`.

### Contador CSS en las reglas

Los números "01, 02, 03…" no están en el HTML. Los genera CSS:

```css
.reglas { counter-reset: regla; }
.reglas li { counter-increment: regla; }
.reglas li::before { content: counter(regla, decimal-leading-zero); }
```

### Color por rol (`--color-rol`)

Cada tarjeta de staff recibe su color desde JS con `style.setProperty("--color-rol", "#ff5c5c")`. El CSS usa esa variable para el borde, el brillo y la etiqueta, así que una sola regla CSS sirve para todos los colores.

`color-mix()` genera el fondo translúcido de la etiqueta mezclando el color del rol con transparente.

### FAQ sin JavaScript

`<details>` y `<summary>` son etiquetas nativas de HTML que ya funcionan como acordeón. El CSS solo oculta la flecha por defecto y agrega un "+" que rota a "×" cuando está abierto (`details[open]`).

### Menú de celular

En pantallas de menos de 760px los links se ocultan (`display: none`). Cuando JS le agrega la clase `.abierto` al `<header>`, se muestran. Las 3 rayitas de la hamburguesa rotan para formar una X.

### `prefers-reduced-motion`

Algunas personas desactivan las animaciones en su sistema operativo (por mareos, por ejemplo). Esta media query respeta esa preferencia y apaga todas las animaciones.

---

## 3. `js/config.js`: los datos

Es un objeto con toda la información editable: nombre, descripción, invitación, reglas, staff, etc. Separar **datos** de **lógica** es una buena práctica: quien administre el servidor puede editar este archivo sin entender `main.js`.

---

## 4. `js/main.js`: la lógica

### Helpers

> Desde que se agregaron los tests, estos helpers viven en `js/utilidades.js` (ver sección 6).

- `$(id)`: atajo de `document.getElementById`.
- `crear(etiqueta, clase, texto)`: crea un elemento HTML. Usa **`textContent`** y no `innerHTML`. Así, si alguien en Discord se pone de nombre `<script>...`, se muestra como texto y no se ejecuta (esto previene **XSS**).
- `formatear(n)`: `1284` → `"1.284"` con `toLocaleString("es-AR")`.

### Las dos APIs de Discord

| API | URL | Qué da | Requisito |
|---|---|---|---|
| Invitación | `discord.com/api/v10/invites/CODIGO?with_counts=true` | total de miembros, conectados, boosts, nivel, nombre y actividad por juego | una invitación que no expire |
| Widget | `discord.com/api/guilds/ID/widget.json` | lista de conectados, link de invitación | activar el widget en el servidor |

Las dos son **públicas**: no necesitan token ni bot, por eso se pueden llamar desde el navegador.

### `async` / `await` y `fetch`

```js
async function pedirInvitacion() {
  const res = await fetch(url);
  if (!res.ok) throw new Error("...");
  return res.json();
}
```

`fetch` hace el pedido HTTP. `await` espera la respuesta sin congelar la página. Si Discord responde con error (404 si la invitación no existe, 403 si el widget está apagado), se lanza un error.

### `Promise.allSettled`

```js
const [invitacion, widgetRes] = await Promise.allSettled([pedirInvitacion(), pedirWidget()]);
```

Hace los dos pedidos **al mismo tiempo** y espera a que terminen los dos. A diferencia de `Promise.all`, **no se corta si uno falla**: cada resultado trae `status: "fulfilled"` (salió bien) o `"rejected"` (falló). Así, si el widget está apagado, igual se muestran los datos de la invitación.

### Plan B: datos de ejemplo

Si ninguna API responde, se usan los de `CONFIG.statsDeEjemplo` y el subtítulo lo aclara. La página nunca queda rota ni vacía.

### Operador `??=`

```js
stats.conectados ??= widget.presence_count;
```

"Si `stats.conectados` es `null` o `undefined`, asignale este valor". Se usa para que el widget complete lo que la invitación no pudo dar.

### Contador animado (`animarNumero`)

Usa `requestAnimationFrame`, que ejecuta una función en cada cuadro de pantalla (~60 veces por segundo). En cada cuadro:

1. Calcula qué porcentaje del tiempo pasó (`progreso`, de 0 a 1).
2. Le aplica una curva *ease-out* (`1 - (1 - p)³`) para que frene al final.
3. Muestra el número intermedio.

Guarda el último valor en `el.dataset.valor` para que, al actualizar cada 60 segundos, anime desde el número anterior y no desde 0.

### Aparición al hacer scroll (`IntersectionObserver`)

En vez de escuchar el evento `scroll` (que se dispara cientos de veces), el navegador **avisa** cuando un elemento entra en pantalla. Ahí se le agrega la clase `.visible` y el CSS hace la transición. `unobserve` hace que pase una sola vez.

### Actualización automática

```js
setInterval(cargarStats, CONFIG.refrescoSegundos * 1000);
```

Vuelve a pedir los datos cada 60 segundos (o lo que configures). No conviene bajarlo mucho: Discord limita la cantidad de pedidos (*rate limit*).

---

### Actividad por juego (`mostrarJuegos`)

La respuesta de la invitación trae `profile.game_activity`, un objeto cuya clave es el ID de la aplicación del juego:

```json
"1158877933042143272": { "activity_level": 2, "activity_score": 87 }
```

`activity_level` (0–3) se traduce a texto con el array `NIVELES_ACTIVIDAD`, y `activity_score` (0–100) es el ancho de la barra. Los nombres y las imágenes de los juegos están en `config.js`: Discord solo manda los IDs.

La línea `const { activity_level = 0, activity_score = 0 } = ... ?? {}` es **desestructuración con valores por defecto**: si Discord no informa un juego, queda en 0 y el código no falla.

### Caché con `localStorage`

Cada vez que llegan datos de Discord se guardan con `localStorage.setItem("brosss-stats", JSON.stringify(datos))`. Al abrir la página:

1. Si hay caché, se muestra **al instante**, sin esperar la respuesta de Discord.
2. Se pide a Discord. Si responde, se reemplazan los datos y los contadores animan desde el valor viejo hasta el nuevo.
3. Si Discord no responde, quedan los datos guardados con el aviso "Últimos datos guardados (hace 5 minutos)".
4. Si no hay caché ni respuesta, se usan los datos de ejemplo.

`localStorage` solo guarda texto, por eso se usa `JSON.stringify` para guardar y `JSON.parse` para leer. Va con `try/catch` porque en algunos modos privados tira error.

La variable `modoDatos` ("cargando", "vivo", "cache", "ejemplo") recuerda de dónde vienen los datos que se ven. Es una pequeña **máquina de estados**.

### "Actualizado hace X segundos"

`Intl.RelativeTimeFormat` es una API del navegador que arma frases de tiempo en cualquier idioma: `format(-12, "second")` → `"hace 12 segundos"`. Un `setInterval` de 1 segundo refresca el texto.

### Fecha de creación desde el ID (snowflake)

Los IDs de Discord no son números al azar: los primeros bits guardan **cuándo** se creó la cosa, en milisegundos desde el 1/1/2015.

```js
new Date(Number(BigInt(id) >> 22n) + 1420070400000);
```

- `BigInt`: el ID (`748980597535539325`) es más grande que el máximo entero seguro de `Number` (≈ 9 × 10¹⁵), así que se perderían dígitos.
- `>> 22n`: corre los bits 22 lugares a la derecha y descarta la parte que no es fecha.
- `+ 1420070400000`: suma el 1/1/2015 (la "época" de Discord) en milisegundos.

Resultado: BROSSS existe desde **agosto de 2020**.

---

## 5. `js/efectos.js`: efectos visuales

Está separado de `main.js` a propósito: si algún efecto falla, los datos igual se ven. Usa `$` y `crear()` de `utilidades.js`, por eso se carga después.

### Partículas (canvas)

`<canvas>` es un área donde se dibuja con JavaScript píxel por píxel. En cada cuadro (`requestAnimationFrame`):

1. Se borra todo (`clearRect`).
2. Cada punto se mueve con su velocidad (`vx`, `vy`) y rebota si toca un borde.
3. Para cada par de puntos cercanos se dibuja una línea. La transparencia depende de la distancia, calculada con `Math.hypot` (Pitágoras).
4. Lo mismo con la posición del mouse.

Detalles de rendimiento:

- Un `IntersectionObserver` **frena la animación** cuando el hero no está en pantalla.
- La cantidad de puntos depende del tamaño de la pantalla (menos en celular).
- `devicePixelRatio` hace que se vea nítido en pantallas retina.

### Texto que se escribe solo

Una función `paso()` que se llama a sí misma con `setTimeout`, agregando o sacando una letra con `slice(0, letras)`. El operador `%` (resto) hace que después del último juego vuelva al primero.

### Luz que sigue al mouse

Un único `pointermove` en todo el `document` (esto se llama **delegación de eventos**). `e.target.closest(".stat, .juego, ...")` busca si el mouse está sobre una tarjeta. Si está, se le pasan las coordenadas como variables CSS (`--x`, `--y`), y el CSS dibuja un `radial-gradient` centrado ahí.

### Menú activo y barra de progreso

- **Menú activo:** un `IntersectionObserver` con `rootMargin: "-45% 0px -50% 0px"` solo "ve" una franja fina en el medio de la pantalla. La sección que pasa por esa franja es la activa.
- **Barra de progreso:** `scrollY / (alto total - alto de ventana)`. El evento `scroll` se limita con `requestAnimationFrame` para no recalcular cientos de veces por segundo (técnica llamada *throttle*).

### Copiar link y toast

`navigator.clipboard.writeText()` copia al portapapeles. Solo funciona en `https` o `localhost`, y por eso tiene un `catch` que muestra el link si falla. El "toast" es un aviso que aparece abajo y se va solo. `clearTimeout` evita que se cierre antes de tiempo si se muestran dos seguidos.

### El secreto 🎮

En la página, tocá: **↑ ↑ ↓ ↓ ← → ← → B A** (el famoso "código Konami"). La variable `progreso` cuenta cuántas teclas de la secuencia acertaste seguidas. Al completarla se lanza confeti con física simple: cada pieza suma gravedad a su velocidad vertical en cada cuadro.

### Open Graph y accesibilidad

- Las etiquetas `<meta property="og:...">` definen título, descripción e imagen de la vista previa al pegar el link en Discord, WhatsApp o X. `theme-color` es el color de la barrita del embed en Discord.
- `:focus-visible` muestra un contorno verde **solo** al navegar con teclado (Tab), no al hacer clic.
- El link "Saltar al contenido" aparece al apretar Tab por primera vez y lleva directo a las estadísticas.

---

## 6. `js/utilidades.js`: funciones puras

Una función **pura** recibe datos y devuelve un resultado sin tocar nada más (ni la página, ni variables de afuera). Por ejemplo, `rangoPremier(18450)` siempre devuelve el rango Violeta. Son fáciles de testear, y por eso están todas juntas en este archivo.

Al final hay un truco para que el mismo archivo sirva en el navegador y en Node:

```js
if (typeof module !== "undefined") {
  module.exports = { formatear, rangoPremier, ... };
}
```

En el navegador `module` no existe y ese bloque se saltea. En Node sí existe, y los tests pueden hacer `require("../js/utilidades.js")`.

---

## 7. `js/rangos.js`: sección Rangos CS2

Los datos se cargan a mano en `CONFIG.cs2.jugadores`, porque Discord no conoce tu rango de CS2.

- **Rango por color.** `RANGOS_PREMIER` es la tabla de rangos del juego (gris < 5.000, celeste, azul, violeta, rosa, rojo, dorado ≥ 30.000). `rangoPremier()` la recorre de mayor a menor y devuelve el primer rango cuyo mínimo alcanza.
- **Posición fija.** El ranking se ordena una sola vez y cada jugador guarda su `posicion`. Al filtrar, Santi sigue siendo el "#1" aunque sea el único resultado.
- **Gráfico de distribución.** Barras horizontales hechas con HTML y CSS (sin librerías). Tienen **un solo color**, porque es una sola serie de datos (cantidad de jugadores). El color de cada rango aparece como una muestrita al lado del nombre, así el color no compite con el largo de la barra. El número va en la punta de cada barra.
- **Tooltip accesible.** Cada barra tiene `tabIndex = 0` (se puede enfocar con Tab) y `aria-label` con el detalle, así un lector de pantalla lee lo mismo que aparece al pasar el mouse.
- **Filtros.** `filtrarJugadores()` normaliza el texto con `normalize("NFD")` y saca las tildes con una expresión regular, así "joaco" encuentra "Joacó".
- **Seguridad.** El link de Steam solo se crea si empieza con `https://`. Si no, alguien podría cargar `javascript:alert(1)` y se ejecutaría al hacer clic.
- **Tabla en el celular.** Se ocultan las columnas FACEIT y Steam, y el contenedor tiene `overflow-x: auto`. Si la tabla no entra, scrollea ella y no toda la página.

---

## 8. Producción

### `netlify.toml`

- **`command = "npm test"`**: Netlify corre los tests antes de publicar. Si fallan, el sitio queda en la versión anterior.
- **Content-Security-Policy (CSP)**: una lista blanca de orígenes. El navegador bloquea cualquier script, estilo o conexión que no esté en la lista. Por eso la página **no tiene** `<script>` en línea, `style="..."` ni `onclick="..."`: la CSP los bloquearía, y hay un test que lo verifica.
  - Los estilos que pone JavaScript con `el.style.setProperty()` sí están permitidos: la CSP solo bloquea los que están escritos en el HTML.
- **Otras cabeceras**:
  - `X-Frame-Options` / `frame-ancestors`: evitan que otro sitio meta tu página en un iframe (*clickjacking*).
  - `nosniff`: el navegador no "adivina" tipos de archivo.
  - `Referrer-Policy`: no filtra la URL completa a otros sitios.
- **Caché**: HTML, CSS y JS usan `no-cache`. El navegador los guarda, pero pregunta si cambiaron, así cada deploy se ve al instante. Las imágenes se guardan una semana.
- **Redirects**: `/tests/*` y `package.json` devuelven 404, porque no tienen que ser públicos.

### `404.html`

Netlify la muestra automáticamente cuando una URL no existe. Usa rutas absolutas (`/css/styles.css`) porque puede aparecer en cualquier dirección, como `/algo/que/no/existe`.

### Tests

Ver el README. El más interesante es `tests/helpers/navegador-falso.js`: imita lo mínimo de `document`, `fetch` y `localStorage` para correr los scripts del navegador dentro de Node con el módulo `vm`. Así se prueba la página completa sin abrir un navegador ni usar internet (la respuesta de Discord está guardada en `tests/fixtures/`).

---

## 9. Imágenes

`img/icono.png` es el ícono del servidor, bajado de `https://cdn.discordapp.com/icons/{id_servidor}/{hash}.png?size=256`. Los íconos de los juegos salen de `https://cdn.discordapp.com/app-icons/{id_app}/{hash}.png`. Están guardados en la carpeta para que la página no dependa de esos links. Si cambiás el ícono del servidor, volvé a bajarlo.

---

---

## Ideas para seguir practicando

- Agregar una sección de eventos con fechas, leída desde `config.js`.
- Guardar un historial de conectados en `localStorage` y dibujar un gráfico con canvas.
