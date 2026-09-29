// =============================================================
//  FUNCIÓN /api/rangos (Netlify Functions)
//  Corre en el servidor de Netlify, no en el navegador. Por eso
//  puede usar claves de API sin que nadie las vea.
//
//  Para cada jugador de CONFIG.cs2.jugadores consulta:
//   - Steam   → ID de 64 bits, nombre y avatar (perfil público, sin clave)
//   - Leetify → CS Rating de Premier (y nivel de FACEIT)
//   - FACEIT  → nivel y ELO oficiales (solo si hay FACEIT_API_KEY)
//
//  Variables de entorno (Netlify → Site configuration → Environment variables):
//   - FACEIT_API_KEY  (opcional) clave "Server side" de developers.faceit.com
//   - LEETIFY_API_KEY (opcional) sube el límite de pedidos a Leetify
//
//  La respuesta queda en la caché de Netlify 30 minutos, así las APIs
//  se consultan como mucho 2 veces por hora, entre todas las visitas.
// =============================================================

import CONFIG from "../../js/config.js";
import utilidades from "../../js/utilidades.js";

const { parsearLinkSteam } = utilidades;

export const config = { path: "/api/rangos" };

const STEAM = "https://steamcommunity.com";
const LEETIFY = "https://api-public.cs-prod.leetify.com";
const FACEIT = "https://open.faceit.com";

// Si una API tarda más que esto, seguimos sin ese dato
const ESPERA_MAXIMA_MS = 8000;

// ---------- Steam ----------

// El perfil en XML (?xml=1) no pide clave. Leemos solo lo que usamos.
// Cortamos antes de <groups>: ahí vienen los avatares de los grupos.
export function leerPerfilSteam(xml) {
  const perfil = String(xml).split("<groups>")[0];
  const campo = (nombre) =>
    new RegExp(`<${nombre}>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${nombre}>`, "s").exec(perfil)?.[1].trim() ?? "";
  const id = campo("steamID64");
  if (!/^7656\d{13}$/.test(id)) return null; // perfil inexistente
  const avatar = campo("avatarFull");
  return { id, nombre: campo("steamID").slice(0, 64), avatar: avatar.startsWith("https://") ? avatar : "" };
}

async function consultarSteam(link, pedir) {
  const perfil = parsearLinkSteam(link);
  if (!perfil) return null;
  const res = await pedir(`${STEAM}/${perfil.tipo}/${encodeURIComponent(perfil.valor)}/?xml=1`);
  if (!res.ok) throw new Error(`Steam respondió ${res.status}`);
  return leerPerfilSteam(await res.text());
}

// ---------- Leetify ----------

// 404 = el jugador nunca entró a leetify.com (no es un error)
async function consultarLeetify(id, pedir, clave) {
  const res = await pedir(`${LEETIFY}/v3/profile?steam64_id=${id}`, clave ? { _leetify_key: clave } : {});
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Leetify respondió ${res.status}`);
  const { ranks } = await res.json();
  return {
    premier: entero(ranks?.premier),
    faceit: nivelFaceit(ranks?.faceit),
    faceitElo: entero(ranks?.faceit_elo),
  };
}

// ---------- FACEIT ----------

// 404 = no tiene cuenta de FACEIT vinculada a ese Steam
async function consultarFaceit(id, pedir, clave) {
  if (!clave) return null;
  const res = await pedir(`${FACEIT}/data/v4/players?game=cs2&game_player_id=${id}`, {
    Authorization: `Bearer ${clave}`,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`FACEIT respondió ${res.status}`);
  const datos = await res.json();
  const cs2 = datos?.games?.cs2;
  if (!cs2) return null;
  // faceit_url viene como "https://www.faceit.com/{lang}/players/nick"
  const url = String(datos.faceit_url || "").replace("{lang}", "es");
  return {
    faceit: nivelFaceit(cs2.skill_level),
    faceitElo: entero(cs2.faceit_elo),
    faceitUrl: url.startsWith("https://www.faceit.com/") ? url : "",
  };
}

// ---------- Armado ----------

const nivelOk = (n, min, max) => (Number.isInteger(n) && n >= min && n <= max ? n : null);
const entero = (n) => nivelOk(n, 1, Infinity);
const nivelFaceit = (n) => nivelOk(n, 1, 10);

// Ejecuta una consulta y, si falla, devuelve null y lo anota en errores.
// Así un jugador o una API caída no rompe el resto.
async function intentar(nombre, fuente, consulta, errores) {
  try {
    return await consulta();
  } catch (error) {
    errores.push(`${nombre} (${fuente}): ${error.message}`);
    return null;
  }
}

async function consultarJugador(jugador, { pedir, claves, errores }) {
  // Si Steam falla pero el link es /profiles/7656..., el ID ya lo sabemos
  const perfil = parsearLinkSteam(jugador.steam);
  const steam =
    (await intentar(jugador.nombre, "Steam", () => consultarSteam(jugador.steam, pedir), errores)) ??
    (perfil?.tipo === "profiles" ? { id: perfil.valor, nombre: "", avatar: "" } : null);
  const [leetify, faceit] = steam
    ? await Promise.all([
        intentar(jugador.nombre, "Leetify", () => consultarLeetify(steam.id, pedir, claves.leetify), errores),
        intentar(jugador.nombre, "FACEIT", () => consultarFaceit(steam.id, pedir, claves.faceit), errores),
      ])
    : [null, null];

  // Sin nombre en config.js se usa el de Steam (y se actualiza solo)
  // FACEIT: primero la API oficial y, si no hay clave, lo que diga Leetify
  return {
    nombre: jugador.nombre || steam?.nombre || "Jugador",
    steam: steam ? `${STEAM}/profiles/${steam.id}` : "",
    avatar: steam?.avatar ?? "",
    premier: leetify?.premier ?? null,
    enLeetify: Boolean(leetify),
    faceit: faceit?.faceit ?? leetify?.faceit ?? null,
    faceitElo: faceit?.faceitElo ?? leetify?.faceitElo ?? null,
    faceitUrl: faceit?.faceitUrl ?? "",
  };
}

// Separada del handler para poder testearla con un fetch falso
export async function armarRanking(jugadores, { fetch: fetchFn = fetch, claves = {}, ahora = Date.now() } = {}) {
  const errores = [];
  const pedir = (url, cabeceras = {}) =>
    fetchFn(url, { headers: cabeceras, signal: AbortSignal.timeout(ESPERA_MAXIMA_MS) });

  const lista = await Promise.all(jugadores.map((j) => consultarJugador(j, { pedir, claves, errores })));
  return { actualizado: new Date(ahora).toISOString(), jugadores: lista, errores };
}

export default async function handler() {
  const { actualizado, jugadores, errores } = await armarRanking(CONFIG.cs2.jugadores, {
    claves: { faceit: process.env.FACEIT_API_KEY, leetify: process.env.LEETIFY_API_KEY },
  });
  // Los errores van al log de Netlify (Functions → rangos), no al público
  errores.forEach((e) => console.warn(e));

  return Response.json(
    { actualizado, jugadores },
    {
      headers: {
        // El navegador lo guarda 5 minutos...
        "Cache-Control": "public, max-age=300",
        // ...y la CDN de Netlify 30. Si pasó ese tiempo, entrega la copia
        // vieja al instante y actualiza por detrás (stale-while-revalidate).
        "Netlify-CDN-Cache-Control": "public, durable, s-maxage=1800, stale-while-revalidate=86400",
      },
    }
  );
}
