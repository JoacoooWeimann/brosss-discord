// =============================================================
//  UTILIDADES.JS
//  Funciones chicas que usan los demás archivos. Casi todas son
//  "puras": reciben datos y devuelven un resultado, sin tocar la
//  página. Por eso se pueden testear con Node (ver tests/).
// =============================================================

// ---------- Helpers del DOM ----------

// Atajo para buscar un elemento por id.
const $ = (id) => document.getElementById(id);

// Crea un elemento con clase y texto. Usamos textContent (y no
// innerHTML) para que un nombre de usuario raro no pueda inyectar HTML.
function crear(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// ---------- Números y fechas ----------

// Formatea números con separador de miles: 1284 → "1.284".
const formatear = (n) => n.toLocaleString("es-AR");

// Intl.RelativeTimeFormat arma textos como "hace 12 segundos" en español
const tiempoRelativo = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

function hace(fecha, ahora = Date.now()) {
  const segundos = Math.round((fecha - ahora) / 1000);
  if (segundos > -60) return tiempoRelativo.format(segundos, "second");
  if (segundos > -3600) return tiempoRelativo.format(Math.round(segundos / 60), "minute");
  if (segundos > -86400) return tiempoRelativo.format(Math.round(segundos / 3600), "hour");
  return tiempoRelativo.format(Math.round(segundos / 86400), "day");
}

// Los IDs de Discord ("snowflakes") guardan adentro la fecha de creación:
// los bits del 22 en adelante son los milisegundos desde el 1/1/2015.
// Usamos BigInt porque el ID es más grande de lo que Number maneja bien.
const EPOCA_DISCORD = 1420070400000;

function fechaDeCreacion(id) {
  return new Date(Number(BigInt(id) >> 22n) + EPOCA_DISCORD);
}

// ---------- Sitios externos ----------
// Todos los dominios de afuera que usa la página, en un solo lugar.
// Un test verifica que la CSP de netlify.toml los permita: si agregás
// uno acá y te olvidás de la CSP, el test falla antes del deploy.
const ORIGENES = {
  // Se consultan con fetch() → van en connect-src
  api: {
    discord: "https://discord.com",
    kick: "https://kick.com",
  },
  // Se muestran en un <iframe> → van en frame-src
  iframes: {
    kick: "https://player.kick.com",
    tiktok: "https://www.tiktok.com",
  },
};

// ---------- Kick ----------

// Un "slug" de Kick: letras, números, guiones y guiones bajos
const esSlugKick = (slug) => /^[a-zA-Z0-9_-]{2,25}$/.test(slug);

const urlCanalKick = (slug) => `https://kick.com/${slug}`;
const urlApiKick = (slug) => `${ORIGENES.api.kick}/api/v2/channels/${slug}`;
// muted=true: los navegadores solo permiten autoplay sin sonido
const urlPlayerKick = (slug) => `${ORIGENES.iframes.kick}/${slug}?autoplay=true&muted=true`;

// La API de Kick devuelve muchísimos datos. Nos quedamos con lo que
// usamos y ponemos valores por defecto si falta algo.
function resumirCanalKick(datos) {
  const vivo = datos?.livestream;
  return {
    avatar: datos?.user?.profile_pic || "",
    enVivo: Boolean(vivo?.is_live),
    titulo: vivo?.session_title || "",
    categoria: vivo?.categories?.[0]?.name || "",
    espectadores: vivo?.viewer_count ?? 0,
    // Kick manda "2026-09-27 19:47:21" en hora UTC: lo pasamos a formato ISO
    inicio: vivo?.start_time ? Date.parse(vivo.start_time.replace(" ", "T") + "Z") : null,
  };
}

// Primero los que están en vivo (el de más espectadores arriba),
// después los offline y al final los que no se pudieron consultar.
function ordenarStreamers(lista) {
  const peso = (s) => (s.estado === "vivo" ? 0 : s.estado === "offline" ? 1 : 2);
  return [...lista].sort((a, b) => peso(a) - peso(b) || b.espectadores - a.espectadores);
}

// Hace cuánto empezó el stream: "45 min", "2 h 5 min"
function duracionDesde(inicio, ahora = Date.now()) {
  const minutos = Math.max(0, Math.floor((ahora - inicio) / 60000));
  const horas = Math.floor(minutos / 60);
  if (horas === 0) return `${minutos} min`;
  return `${horas} h ${minutos % 60} min`;
}

// ---------- TikTok ----------

// Saca el ID de un link de TikTok:
// https://www.tiktok.com/@brosss/video/7412345678901234567?lang=es → "7412345678901234567"
function idDeTiktok(url) {
  const coincidencia = /^https:\/\/(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d{15,20})/.exec(url);
  return coincidencia ? coincidencia[1] : null;
}

// La cuenta que subió el video: .../@awaken_brosss/video/... → "awaken_brosss"
function usuarioDeTiktok(url) {
  return idDeTiktok(url) ? /tiktok\.com\/@([\w.-]+)\//.exec(url)[1] : null;
}

// Dónde va cada clip en el carrusel según cuál está en el medio:
// "centro", "izquierda", "derecha" o null (no se ve). Es circular:
// con 7 clips y el 0 en el medio, a la izquierda queda el 6.
function posicionEnCarrusel(indice, actual, total) {
  const distancia = (indice - actual + total) % total;
  if (distancia === 0) return "centro";
  if (distancia === 1) return "derecha";
  if (distancia === total - 1) return "izquierda";
  return null;
}

const urlPlayerTiktok = (id) => `${ORIGENES.iframes.tiktok}/player/v1/${id}?autoplay=1&rel=0&description=1&music_info=1`;
const urlPerfilTiktok = (usuario) => `https://www.tiktok.com/@${usuario}`;

// En el navegador no existe "module": estas líneas solo corren en
// Node, para que los tests puedan importar las funciones.
if (typeof module !== "undefined") {
  module.exports = {
    formatear,
    hace,
    fechaDeCreacion,
    ORIGENES,
    esSlugKick,
    urlApiKick,
    urlPlayerKick,
    resumirCanalKick,
    ordenarStreamers,
    duracionDesde,
    idDeTiktok,
    usuarioDeTiktok,
    posicionEnCarrusel,
    urlPlayerTiktok,
  };
}
