# BROSSS — Página del servidor de Discord

Landing page para un servidor de Discord con **estadísticas en vivo** (miembros, conectados, boosts, nivel), actividad por juego, stream en Kick, clips de TikTok, reglas, staff y preguntas frecuentes.

Hecha con **HTML, CSS y JavaScript puro**, sin frameworks ni dependencias.

## Características

- Estadísticas en vivo usando la API pública de Discord (sin bot ni token)
- Contadores animados y barra de actividad (% de miembros conectados)
- Actividad de cada juego (CS2, Minecraft, LoL) según Discord
- Lista de usuarios conectados (si el widget del servidor está activo)
- **Stream en vivo (Kick)**: detecta qué mods están transmitiendo y muestra el directo incrustado, con aviso "EN VIVO" en el menú
- **Clips de TikTok**: se cargan al hacer clic para que la página no pese
- Reglas, staff (en pirámide, con foto y usuario de Discord) y FAQ generados desde un único archivo de configuración
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
6. Abrí `index.html` en el navegador, o usá la extensión **Live Server** de VS Code.

Si no cargás ningún código, la página muestra **datos de ejemplo**.

## Estructura

```
Brosss/
├── index.html          → estructura de la página
├── css/styles.css      → todos los estilos
├── js/config.js        → datos del servidor (lo único que tenés que editar)
├── js/utilidades.js    → funciones puras (fechas, Kick, TikTok): se testean con Node
├── js/main.js          → lógica: API de Discord, caché, animaciones, menú
├── js/stream.js        → sección Stream: quién está en vivo en Kick y el reproductor
├── js/clips.js         → sección Clips: videos de TikTok
├── js/efectos.js       → efectos visuales: partículas, toast, scroll, secreto
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

No hace falta `npm install`: los tests usan `node:test`, que viene con Node (versión 22 o más nueva). Son 49 tests que verifican:

- **Funciones** (`utilidades.test.js`): fechas, datos de Kick, links de TikTok, orden de los streamers.
- **Configuración** (`config.test.js`): que los datos de `config.js` estén bien cargados (ratings válidos, links https, sin nombres repetidos…).
- **HTML** (`html.test.js`): que cada id que usa el JS exista, que no falten imágenes, que la CSP permita todo lo que la página usa.
- **Stream y clips** (`stream-clips.test.js`): mod en vivo, todos offline, Kick caído, que el reproductor no se recargue cada minuto, clips que cargan al hacer clic.
- **Integración** (`integracion.test.js`): ejecuta los scripts en un navegador simulado con una respuesta guardada de Discord y prueba los casos con y sin internet, caché roto y el staff en pirámide.

Netlify corre los tests en cada deploy: **si alguno falla, no se publica**.

## Deploy en Netlify

Conectá el repositorio de GitHub en Netlify ("Add new site → Import an existing project"). Netlify lee `netlify.toml`, corre los tests y publica. No hay que configurar nada más.

> La sección **Rangos CS2** (Steam + Leetify + FACEIT) está guardada en la rama `rangos-cs2`, fuera de la página por ahora.
