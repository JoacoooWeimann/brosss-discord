// Tests de las funciones puras de js/utilidades.js
// Correr con: npm test

const { test } = require("node:test");
const assert = require("node:assert/strict");
const u = require("../js/utilidades.js");

test("formatear usa punto como separador de miles", () => {
  assert.equal(u.formatear(1284), "1.284");
  assert.equal(u.formatear(146), "146");
});

test("formatearRating usa coma como en CS2", () => {
  assert.equal(u.formatearRating(18450), "18,450");
});

test("fechaDeCreacion saca la fecha del ID de Discord", () => {
  const fecha = u.fechaDeCreacion("748980597535539325");
  assert.equal(fecha.getUTCFullYear(), 2020);
  assert.equal(fecha.getUTCMonth(), 7); // los meses arrancan en 0: 7 = agosto
});

test("fechaDeCreacion no pierde precisión con IDs grandes", () => {
  // El ID mínimo posible corresponde exactamente a la época de Discord
  assert.equal(u.fechaDeCreacion("0").toISOString(), "2015-01-01T00:00:00.000Z");
});

test("hace() arma textos de tiempo relativo en español", () => {
  const ahora = 1_000_000_000_000;
  assert.equal(u.hace(ahora, ahora), "ahora");
  assert.equal(u.hace(ahora - 12_000, ahora), "hace 12 segundos");
  assert.equal(u.hace(ahora - 5 * 60_000, ahora), "hace 5 minutos");
  assert.equal(u.hace(ahora - 3 * 3_600_000, ahora), "hace 3 horas");
  assert.equal(u.hace(ahora - 2 * 86_400_000, ahora), "anteayer");
});

test("rangoPremier respeta los límites de cada rango", () => {
  assert.equal(u.rangoPremier(0).nombre, "Gris");
  assert.equal(u.rangoPremier(4999).nombre, "Gris");
  assert.equal(u.rangoPremier(5000).nombre, "Celeste");
  assert.equal(u.rangoPremier(14999).nombre, "Azul");
  assert.equal(u.rangoPremier(15000).nombre, "Violeta");
  assert.equal(u.rangoPremier(29999).nombre, "Rojo");
  assert.equal(u.rangoPremier(30000).nombre, "Dorado");
  assert.equal(u.rangoPremier(45000).nombre, "Dorado");
});

test("los rangos no se superponen ni dejan huecos", () => {
  const r = u.RANGOS_PREMIER;
  for (let i = 1; i < r.length; i++) {
    assert.equal(r[i].desde, r[i - 1].hasta + 1, `hueco entre ${r[i - 1].nombre} y ${r[i].nombre}`);
  }
});

test("colorFaceit devuelve el color de cada franja", () => {
  assert.equal(u.colorFaceit(1), "#eeeeee");
  assert.equal(u.colorFaceit(3), "#1ce400");
  assert.equal(u.colorFaceit(7), "#ffc800");
  assert.equal(u.colorFaceit(9), "#ff6309");
  assert.equal(u.colorFaceit(10), "#fe1f00");
});

const JUGADORES = [
  { nombre: "Joacó", premier: 18450 },
  { nombre: "Santi", premier: 30250 },
  { nombre: "Pipe", premier: 4200 },
  { nombre: "Gonza", premier: 19990 },
];

test("ordenarPorRating ordena de mayor a menor sin modificar el original", () => {
  const ordenados = u.ordenarPorRating(JUGADORES);
  assert.deepEqual(
    ordenados.map((j) => j.nombre),
    ["Santi", "Gonza", "Joacó", "Pipe"]
  );
  assert.equal(JUGADORES[0].nombre, "Joacó", "el array original no tiene que cambiar");
});

test("filtrarJugadores ignora mayúsculas, tildes y espacios", () => {
  assert.deepEqual(u.filtrarJugadores(JUGADORES, { texto: "  JOACO " }).map((j) => j.nombre), ["Joacó"]);
  assert.equal(u.filtrarJugadores(JUGADORES, { texto: "" }).length, 4);
  assert.equal(u.filtrarJugadores(JUGADORES, { texto: "nadie" }).length, 0);
});

test("filtrarJugadores filtra por rango y combina con el texto", () => {
  assert.deepEqual(u.filtrarJugadores(JUGADORES, { rango: "Violeta" }).map((j) => j.nombre), ["Joacó", "Gonza"]);
  assert.deepEqual(u.filtrarJugadores(JUGADORES, { texto: "g", rango: "Violeta" }).map((j) => j.nombre), ["Gonza"]);
});

test("distribucionPorRango cuenta a todos los jugadores una sola vez", () => {
  const dist = u.distribucionPorRango(JUGADORES);
  assert.equal(dist.length, u.RANGOS_PREMIER.length);
  assert.equal(dist.reduce((s, d) => s + d.cantidad, 0), JUGADORES.length);
  assert.equal(dist.find((d) => d.nombre === "Violeta").cantidad, 2);
});

// Sin CS Rating (no está en Leetify): premier null
const CON_SIN_RATING = [
  ...JUGADORES,
  { nombre: "Kyo", premier: null, faceit: 7, faceitElo: 1629 },
  { nombre: "Lucho", premier: null, faceit: null },
];

test("ordenarPorRating deja al final a los que no tienen rating, ordenados por FACEIT", () => {
  assert.deepEqual(
    u.ordenarPorRating([CON_SIN_RATING[5], ...CON_SIN_RATING.slice(0, 5)]).map((j) => j.nombre),
    ["Santi", "Gonza", "Joacó", "Pipe", "Kyo", "Lucho"]
  );
});

test("los jugadores sin rating no entran en ningún rango", () => {
  assert.equal(u.filtrarJugadores(CON_SIN_RATING, { rango: "Gris" }).map((j) => j.nombre).join(), "Pipe");
  assert.equal(u.filtrarJugadores(CON_SIN_RATING, { texto: "kyo" }).length, 1, "pero el buscador los encuentra");
  assert.equal(u.distribucionPorRango(CON_SIN_RATING).reduce((s, d) => s + d.cantidad, 0), JUGADORES.length);
});

test("parsearLinkSteam entiende los links /profiles/ e /id/ y rechaza el resto", () => {
  assert.deepEqual(u.parsearLinkSteam("https://steamcommunity.com/profiles/76561198860991191/"), {
    tipo: "profiles",
    valor: "76561198860991191",
  });
  assert.deepEqual(u.parsearLinkSteam("https://steamcommunity.com/id/DJLucheo"), { tipo: "id", valor: "DJLucheo" });
  assert.deepEqual(u.parsearLinkSteam(" https://steamcommunity.com/id/Valeeng "), { tipo: "id", valor: "Valeeng" });
  assert.equal(u.parsearLinkSteam("http://steamcommunity.com/id/DJLucheo"), null, "solo https");
  assert.equal(u.parsearLinkSteam("https://steamcommunity.com/profiles/123"), null);
  assert.equal(u.parsearLinkSteam("https://steamcommunity.com/id/a/../../x"), null);
  assert.equal(u.parsearLinkSteam("https://evil.com/steamcommunity.com/id/x"), null);
  assert.equal(u.parsearLinkSteam(""), null);
});

test("esSlugKick acepta nombres de canal válidos y rechaza el resto", () => {
  assert.ok(u.esSlugKick("joacooo"));
  assert.ok(u.esSlugKick("canal-del_mod2"));
  assert.ok(!u.esSlugKick("https://kick.com/joacooo"));
  assert.ok(!u.esSlugKick("con espacio"));
  assert.ok(!u.esSlugKick(""));
});

test("urlPlayerKick arranca sin sonido (si no, el navegador bloquea el autoplay)", () => {
  assert.equal(u.urlPlayerKick("joacooo"), "https://player.kick.com/joacooo?autoplay=true&muted=true");
});

test("resumirCanalKick entiende un canal en vivo", () => {
  const canal = u.resumirCanalKick({
    user: { profile_pic: "https://x/a.webp" },
    livestream: { is_live: true, session_title: "Hola", viewer_count: 50, start_time: "2026-09-27 19:47:21", categories: [{ name: "CS2" }] },
  });
  assert.equal(canal.enVivo, true);
  assert.equal(canal.categoria, "CS2");
  assert.equal(canal.espectadores, 50);
  assert.equal(new Date(canal.inicio).toISOString(), "2026-09-27T19:47:21.000Z");
});

test("resumirCanalKick no se rompe con datos incompletos", () => {
  for (const datos of [{ livestream: null }, {}, null, undefined]) {
    const canal = u.resumirCanalKick(datos);
    assert.equal(canal.enVivo, false);
    assert.equal(canal.inicio, null);
    assert.equal(canal.avatar, "");
  }
});

test("ordenarStreamers pone primero a los que están en vivo con más espectadores", () => {
  const lista = [
    { kick: "a", estado: "offline", espectadores: 0 },
    { kick: "b", estado: "vivo", espectadores: 10 },
    { kick: "c", estado: "desconocido", espectadores: 0 },
    { kick: "d", estado: "vivo", espectadores: 500 },
  ];
  assert.deepEqual(u.ordenarStreamers(lista).map((s) => s.kick), ["d", "b", "a", "c"]);
});

test("duracionDesde arma textos cortos", () => {
  const ahora = 1_000_000_000_000;
  assert.equal(u.duracionDesde(ahora - 45 * 60000, ahora), "45 min");
  assert.equal(u.duracionDesde(ahora - 125 * 60000, ahora), "2 h 5 min");
  assert.equal(u.duracionDesde(ahora + 60000, ahora), "0 min", "un reloj adelantado no da negativo");
});

test("idDeTiktok saca el ID de links completos y rechaza los demás", () => {
  assert.equal(u.idDeTiktok("https://www.tiktok.com/@brosss/video/7412345678901234567"), "7412345678901234567");
  assert.equal(u.idDeTiktok("https://www.tiktok.com/@bro.sss_2/video/7412345678901234567?is_from_webapp=1&lang=es"), "7412345678901234567");
  assert.equal(u.idDeTiktok("https://tiktok.com/@brosss/video/7412345678901234567"), "7412345678901234567");
  assert.equal(u.idDeTiktok("https://vm.tiktok.com/ZMabc123/"), null, "los links cortos no traen el ID");
  assert.equal(u.idDeTiktok("https://www.tiktok.com/@brosss"), null);
  assert.equal(u.idDeTiktok("javascript:alert(1)//tiktok.com/@a/video/7412345678901234567"), null);
});
