// Tests de la función netlify/functions/rangos.mjs con un fetch falso
// que imita a Steam, Leetify y FACEIT. No se usa internet.

const { test } = require("node:test");
const assert = require("node:assert/strict");

// La función es un módulo ESM: desde CommonJS se carga con import()
const cargar = () => import("../netlify/functions/rangos.mjs");

const ID_JOACO = "76561198860991191";
const ID_LUCHO = "76561199094152672";

const xmlSteam = (id, avatar) => `<?xml version="1.0" encoding="UTF-8"?>
<profile>
  <steamID64>${id}</steamID64>
  <steamID><![CDATA[Nombre de Steam]]></steamID>
  <avatarFull><![CDATA[${avatar}]]></avatarFull>
  <groups><group><avatarFull><![CDATA[https://avatars.fastly.steamstatic.com/grupo_full.jpg]]></avatarFull></group></groups>
</profile>`;

const LEETIFY_JOACO = { name: "joaco", ranks: { premier: 18450, faceit: 6, faceit_elo: 1400 } };
const FACEIT_JOACO = {
  nickname: "joaco",
  faceit_url: "https://www.faceit.com/{lang}/players/joaco",
  games: { cs2: { skill_level: 7, faceit_elo: 1580 } },
};

// Respuesta falsa: texto, JSON o solo un código de estado
const respuesta = (status, cuerpo) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => String(cuerpo ?? ""),
  json: async () => cuerpo,
});

// fetch falso: recibe una lista de [parte de la url, respuesta] y anota los pedidos
function fetchFalso(rutas) {
  const pedidos = [];
  const fn = async (url, opciones) => {
    pedidos.push({ url, headers: opciones?.headers ?? {} });
    const ruta = rutas.find(([parte]) => url.includes(parte));
    if (!ruta) return respuesta(404);
    if (ruta[1] instanceof Error) throw ruta[1];
    return ruta[1];
  };
  return { fn, pedidos };
}

const RUTAS = [
  [`/profiles/${ID_JOACO}/?xml=1`, respuesta(200, xmlSteam(ID_JOACO, "https://avatars.fastly.steamstatic.com/joaco_full.jpg"))],
  ["/id/DJLucheo/?xml=1", respuesta(200, xmlSteam(ID_LUCHO, "https://avatars.fastly.steamstatic.com/lucho_full.jpg"))],
  [`steam64_id=${ID_JOACO}`, respuesta(200, LEETIFY_JOACO)],
  [`game_player_id=${ID_JOACO}`, respuesta(200, FACEIT_JOACO)],
];

const JUGADORES = [
  { nombre: "Joaco", steam: `https://steamcommunity.com/profiles/${ID_JOACO}` },
  { steam: "https://steamcommunity.com/id/DJLucheo" },
];

test("leerPerfilSteam saca el ID, el nombre y el avatar del perfil, no el de un grupo", async () => {
  const { leerPerfilSteam } = await cargar();
  assert.deepEqual(leerPerfilSteam(xmlSteam(ID_JOACO, "https://a.com/yo.jpg")), {
    id: ID_JOACO,
    nombre: "Nombre de Steam",
    avatar: "https://a.com/yo.jpg",
  });
  assert.equal(leerPerfilSteam(xmlSteam(ID_JOACO, "")).avatar, "", "sin avatar no se inventa uno del grupo");
  assert.equal(leerPerfilSteam("<response><error>The specified profile could not be found.</error></response>"), null);
});

test("junta Steam, Leetify y FACEIT, con FACEIT por encima de Leetify", async () => {
  const { armarRanking } = await cargar();
  const { fn, pedidos } = fetchFalso(RUTAS);
  const r = await armarRanking(JUGADORES, { fetch: fn, claves: { faceit: "clave-faceit" }, ahora: Date.UTC(2026, 8, 28) });

  assert.equal(r.actualizado, "2026-09-28T00:00:00.000Z");
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.jugadores[0], {
    nombre: "Joaco",
    steam: `https://steamcommunity.com/profiles/${ID_JOACO}`,
    avatar: "https://avatars.fastly.steamstatic.com/joaco_full.jpg",
    premier: 18450,
    enLeetify: true,
    faceit: 7,
    faceitElo: 1580,
    faceitUrl: "https://www.faceit.com/es/players/joaco",
  });

  // La clave de FACEIT va en la cabecera, nunca en la URL
  const aFaceit = pedidos.find((p) => p.url.includes("open.faceit.com"));
  assert.equal(aFaceit.headers.Authorization, "Bearer clave-faceit");
  assert.ok(pedidos.every((p) => !p.url.includes("clave-faceit")));
});

test("un link /id/ se convierte al ID numérico, y sin nombre en config.js se usa el de Steam", async () => {
  const { armarRanking } = await cargar();
  const { fn } = fetchFalso(RUTAS);
  const [, lucho] = (await armarRanking(JUGADORES, { fetch: fn })).jugadores;

  assert.equal(lucho.steam, `https://steamcommunity.com/profiles/${ID_LUCHO}`);
  assert.equal(lucho.nombre, "Nombre de Steam");
  // No está en Leetify: sin rating (ya no hay valores a mano)
  assert.equal(lucho.premier, null);
  assert.equal(lucho.enLeetify, false);
  assert.equal(lucho.faceit, null);
});

test("si Steam no responde y no hay nombre en config.js, se muestra \"Jugador\"", async () => {
  const { armarRanking } = await cargar();
  const { fn } = fetchFalso([]);
  const [j] = (await armarRanking([{ steam: `https://steamcommunity.com/profiles/${ID_JOACO}` }], { fetch: fn })).jugadores;
  assert.equal(j.nombre, "Jugador");
  assert.equal(j.steam, `https://steamcommunity.com/profiles/${ID_JOACO}`);
});

test("sin clave de FACEIT no se consulta FACEIT y se usa el nivel de Leetify", async () => {
  const { armarRanking } = await cargar();
  const { fn, pedidos } = fetchFalso(RUTAS);
  const [joaco] = (await armarRanking(JUGADORES, { fetch: fn })).jugadores;

  assert.ok(!pedidos.some((p) => p.url.includes("open.faceit.com")));
  assert.equal(joaco.faceit, 6);
  assert.equal(joaco.faceitElo, 1400);
  assert.equal(joaco.faceitUrl, "");
});

test("si una API se cae, el resto de los datos sigue llegando", async () => {
  const { armarRanking } = await cargar();
  const { fn } = fetchFalso([
    [`/profiles/${ID_JOACO}/?xml=1`, new Error("timeout")],
    [`steam64_id=${ID_JOACO}`, respuesta(500)],
    ...RUTAS.slice(1),
  ]);
  const r = await armarRanking(JUGADORES, { fetch: fn });

  // Steam falló, pero un link /profiles/ ya trae el ID: se sigue con Leetify
  assert.equal(r.jugadores[0].steam, `https://steamcommunity.com/profiles/${ID_JOACO}`);
  assert.equal(r.jugadores[0].avatar, "");
  assert.equal(r.jugadores[0].premier, null);
  assert.equal(r.jugadores[1].avatar, "https://avatars.fastly.steamstatic.com/lucho_full.jpg");
  assert.deepEqual(r.errores, ["Joaco (Steam): timeout", "Joaco (Leetify): Leetify respondió 500"]);
});

test("datos raros de las APIs no llegan a la página", async () => {
  const { armarRanking } = await cargar();
  const { fn } = fetchFalso([
    [`/profiles/${ID_JOACO}/?xml=1`, respuesta(200, xmlSteam(ID_JOACO, "javascript:alert(1)"))],
    [`steam64_id=${ID_JOACO}`, respuesta(200, { ranks: { premier: "mucho", faceit: 99 } })],
    [`game_player_id=${ID_JOACO}`, respuesta(200, { faceit_url: "https://evil.com", games: { cs2: { skill_level: 0 } } })],
  ]);
  const [joaco] = (await armarRanking(JUGADORES.slice(0, 1), { fetch: fn, claves: { faceit: "x" } })).jugadores;

  assert.equal(joaco.avatar, "");
  assert.equal(joaco.premier, null);
  assert.equal(joaco.faceit, null);
  assert.equal(joaco.faceitUrl, "");
});

test("el handler responde JSON con caché en la CDN y sin los errores internos", async () => {
  const { default: handler, config } = await cargar();
  assert.equal(config.path, "/api/rangos");

  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = fetchFalso(RUTAS).fn;
  try {
    const res = await handler();
    assert.equal(res.headers.get("content-type"), "application/json");
    assert.match(res.headers.get("netlify-cdn-cache-control"), /s-maxage=1800/);
    const cuerpo = await res.json();
    assert.ok(Array.isArray(cuerpo.jugadores));
    assert.equal(cuerpo.errores, undefined);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});
