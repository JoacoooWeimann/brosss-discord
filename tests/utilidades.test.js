// Tests de las funciones puras de js/utilidades.js
// Correr con: npm test

const { test } = require("node:test");
const assert = require("node:assert/strict");
const u = require("../js/utilidades.js");

test("formatear usa punto como separador de miles", () => {
  assert.equal(u.formatear(1284), "1.284");
  assert.equal(u.formatear(146), "146");
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

test("usuarioDeTiktok saca la cuenta del link, solo si el link es válido", () => {
  assert.equal(u.usuarioDeTiktok("https://www.tiktok.com/@awaken_brosss/video/7622815767372860693"), "awaken_brosss");
  assert.equal(u.usuarioDeTiktok("https://www.tiktok.com/@brosss.clips/video/7461024379594345733?lang=es"), "brosss.clips");
  assert.equal(u.usuarioDeTiktok("https://vm.tiktok.com/ZMabc123/"), null);
});

test("idDeTiktok saca el ID de links completos y rechaza los demás", () => {
  assert.equal(u.idDeTiktok("https://www.tiktok.com/@brosss/video/7412345678901234567"), "7412345678901234567");
  assert.equal(u.idDeTiktok("https://www.tiktok.com/@bro.sss_2/video/7412345678901234567?is_from_webapp=1&lang=es"), "7412345678901234567");
  assert.equal(u.idDeTiktok("https://tiktok.com/@brosss/video/7412345678901234567"), "7412345678901234567");
  assert.equal(u.idDeTiktok("https://vm.tiktok.com/ZMabc123/"), null, "los links cortos no traen el ID");
  assert.equal(u.idDeTiktok("https://www.tiktok.com/@brosss"), null);
  assert.equal(u.idDeTiktok("javascript:alert(1)//tiktok.com/@a/video/7412345678901234567"), null);
});
