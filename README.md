# BROSSS — Página del servidor de Discord

Landing page para un servidor de Discord con **estadísticas en vivo** (miembros, conectados, boosts, nivel), actividad por juego, **ranking de rangos de CS2**, reglas, staff y preguntas frecuentes.

Hecha con **HTML, CSS y JavaScript puro**, sin frameworks ni dependencias.

## Características

- Estadísticas en vivo usando la API pública de Discord (sin bot ni token)
- Contadores animados y barra de actividad (% de miembros conectados)
- Actividad de cada juego (CS2, Minecraft, LoL) según Discord
- Lista de usuarios conectados (si el widget del servidor está activo)
- **Stream en vivo (Kick)**: detecta qué mods están transmitiendo y muestra el directo incrustado, con aviso "EN VIVO" en el menú
- **Clips de TikTok**: se cargan al hacer clic para que la página no pese
- **Rangos CS2 automáticos**: con solo el link de Steam de cada jugador, trae su nombre, avatar, CS Rating de Premier (vía Leetify) y nivel de FACEIT, y se actualiza solo. Tabla con buscador y filtro por rango
- Reglas, staff, rangos y FAQ generados desde un único archivo de configuración
- Diseño oscuro con acentos verde neón, responsive con menú hamburguesa
- Animaciones al hacer scroll con `IntersectionObserver`
- Fondo de partículas interactivo (canvas) y texto que se escribe solo
- Fecha de creación del servidor calculada desde su ID (snowflake)
- Tarjeta de invitación estilo Discord con botón "Copiar link"
- Caché en `localStorage`: los números aparecen al instante y sirven de respaldo si Discord no responde
- Barra de progreso de scroll, menú que marca la sección actual y botón "volver arriba"
- Vista previa (Open Graph) al compartir el link en Discord o WhatsApp
- Accesible: navegación por teclado, "saltar al contenido" y `prefers-reduced-motion`
- Un secreto escondido 🎮

## Cómo usarla

1. Abrí `js/config.js`.
2. Poné el código de tu invitación en `codigoInvitacion` (lo que va después de `discord.gg/`). Usá una invitación **que no expire**.
3. *(Opcional)* Poné el ID del servidor en `idServidor` y activá el widget en Discord: **Ajustes del servidor → Widget → Habilitar widget del servidor**. Así aparece la lista de conectados.
4. Cargá los canales de Kick de los mods en `streamers` (solo el nombre que va después de `kick.com/`) y los links de TikTok en `tiktok.clips` (el link completo, no el corto `vm.tiktok.com`). Mientras `streamers` esté vacío, la sección Stream no se muestra.
5. Editá las reglas, el staff y la FAQ en ese mismo archivo.
6. En `cs2.jugadores` cargá el **nombre y el link de Steam** de cada jugador. Los rangos se buscan solos (ver [Rangos de CS2](#rangos-de-cs2)).
7. Abrí `index.html` en el navegador, o usá la extensión **Live Server** de VS Code. Sin Netlify, la función de rangos no corre y la sección muestra un aviso.

Si no cargás ningún código, la página muestra **datos de ejemplo**.

## Estructura

```
Brosss/
├── index.html          → estructura de la página
├── css/styles.css      → todos los estilos
├── js/config.js        → datos del servidor (lo único que tenés que editar)
├── js/utilidades.js    → funciones puras (fechas, rangos, filtros): se testean con Node
├── js/main.js          → lógica: API de Discord, caché, animaciones, menú
├── js/rangos.js        → sección Rangos CS2: tabla, filtros y actualización automática
├── js/stream.js        → sección Stream: quién está en vivo en Kick y el reproductor
├── js/clips.js         → sección Clips: videos de TikTok
├── js/efectos.js       → efectos visuales: partículas, toast, scroll, secreto
├── netlify/functions/rangos.mjs → /api/rangos: junta Steam, Leetify y FACEIT (corre en Netlify)
├── tests/              → tests automáticos (npm test)
├── 404.html            → página de error
├── netlify.toml        → cabeceras de seguridad, caché y configuración de deploy
├── robots.txt          → permisos para buscadores
├── img/icono.png       → ícono del servidor (bajado de Discord)
├── img/cs2.png, minecraft.png, lol.png → íconos de los juegos
└── DOCS.md             → explicación detallada del código
```

## Tests

```bash
npm test
```

No hace falta `npm install`: los tests usan `node:test`, que viene con Node (versión 22 o más nueva). Son 73 tests que verifican:

- **Funciones** (`utilidades.test.js`): rangos, fechas, filtros, orden.
- **Configuración** (`config.test.js`): que los datos de `config.js` estén bien cargados (ratings válidos, links https, sin nombres repetidos…).
- **HTML** (`html.test.js`): que cada id que usa el JS exista, que no falten imágenes, que la CSP permita todo lo que la página usa.
- **Stream y clips** (`stream-clips.test.js`): mod en vivo, todos offline, Kick caído, que el reproductor no se recargue cada minuto, clips que cargan al hacer clic.
- **Función de rangos** (`funcion-rangos.test.js`): con respuestas falsas de Steam, Leetify y FACEIT prueba cómo se combinan los datos, qué pasa si una API se cae y que la clave de FACEIT nunca vaya en la URL.
- **Integración** (`integracion.test.js`): ejecuta los scripts en un navegador simulado con respuestas guardadas de Discord y de `/api/rangos`, y prueba los casos con y sin internet, caché roto, nombres con HTML, jugadores sin rating, buscador y filtros.

Netlify corre los tests en cada deploy: **si alguno falla, no se publica**.

## Deploy en Netlify

Conectá el repositorio de GitHub en Netlify ("Add new site → Import an existing project"). Netlify lee `netlify.toml`, corre los tests y publica la página y la función `/api/rangos`.

## Rangos de CS2

En `CONFIG.cs2.jugadores` solo va el link de Steam de cada jugador (y, si querés, el `nombre` con el que lo conocen en el Discord). La función `netlify/functions/rangos.mjs` corre en Netlify y arma el ranking. La respuesta queda 30 minutos en la caché de Netlify y la página la vuelve a pedir cada 15 minutos, así que **la tabla se actualiza sola**.

| Dato | De dónde sale | Qué hace falta |
|---|---|---|
| Nombre y avatar | Perfil de Steam | Que el perfil sea público |
| CS Rating (Premier) | [Leetify](https://leetify.com) | Que el jugador haya entrado **una vez** a leetify.com con su Steam y tenga partidas de Premier |
| Nivel y ELO de FACEIT | API de FACEIT (o Leetify si no hay clave) | Que tenga FACEIT vinculado a ese Steam |

Valve no publica el CS Rating en ninguna API (ni siquiera el coordinador del juego lo da para otros jugadores). Los sitios que lo muestran lo sacan de partidas que analizaron ellos. Leetify es el único con una API pública, por eso cada jugador tiene que:

1. Entrar a [leetify.com](https://leetify.com) con su cuenta de Steam.
2. Darle a Leetify su **código de autenticación de partidas** (Leetify lo pide al registrarse y explica de dónde sacarlo, en el soporte de Steam). Con eso, Leetify importa solo cada partida nueva.
3. Tener un CS Rating en la temporada actual (se muestra después de ganar 10 partidas de Premier).

Desde ahí, el rating aparece y se actualiza solo en la página, sin que nadie tenga que tocar nada.

**Clave de FACEIT (recomendada):**

1. Entrá a [developers.faceit.com](https://developers.faceit.com) con tu cuenta de FACEIT.
2. Creá una app y, dentro de ella, una **API key** de tipo **Server side**.
3. En Netlify: **Site configuration → Environment variables → Add a variable**, con nombre `FACEIT_API_KEY` y la clave como valor.
4. Volvé a hacer el deploy.

La clave queda solo en Netlify: nunca va en el código ni llega al navegador. `LEETIFY_API_KEY` (opcional) funciona igual y sube el límite de pedidos a Leetify.

> Si arrastrás la carpeta a app.netlify.com/drop, los tests no corren; corrélos antes con `npm test`.

Después del deploy, cambiá en `index.html` el `og:image` por la URL completa (ej: `https://tu-sitio.netlify.app/img/icono.png`): Discord necesita una URL absoluta para mostrar la imagen en la vista previa.
