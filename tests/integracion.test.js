// Tests de integración: ejecutamos config.js, utilidades.js, main.js y
// rangos.js juntos, en un navegador falso, con una respuesta guardada
// de la API de Discord (tests/fixtures). No se usa internet.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { crearNavegador, esperar, fetchCon } = require("./helpers/navegador-falso.js");

const SCRIPTS = ["js/config.js", "js/utilidades.js", "js/main.js", "js/rangos.js"];

test("con Discord respondiendo, muestra los datos en vivo y los guarda", async () => {
  const nav = crearNavegador({ fetch: fetchCon("invitacion.json") });
  nav.cargar(...SCRIPTS);
  await esperar();

  assert.equal(nav.elemento("stat-miembros").textContent, "146");
  assert.equal(nav.elemento("stat-conectados").textContent, "20");
  assert.equal(nav.elemento("stat-boosts").textContent, "2");
  assert.equal(nav.elemento("stat-nivel").textContent, "1");
  assert.equal(nav.elemento("inv-miembros").textContent, "146");
  assert.equal(nav.elemento("actividad-porcentaje").textContent, "14% conectado");
  assert.match(nav.elemento("stats-fuente").textContent, /^En vivo desde Discord/);
  assert.equal(nav.elemento("hero-antiguedad-texto").textContent, "Desde agosto de 2020");
  assert.equal(nav.elemento("hero-antiguedad").hidden, false);

  // Juegos con su actividad
  const juegos = nav.elemento("juegos-lista").children;
  assert.equal(juegos.length, 3);
  assert.match(juegos[0].textContent, /Counter-Strike 2.*Muy activo/);

  // Quedó guardado en localStorage
  const cache = JSON.parse(nav.almacenamiento["brosss-stats"]);
  assert.equal(cache.stats.miembros, 146);
  assert.equal(cache.idServidor, "748980597535539325");
});

test("sin internet y sin caché, usa los datos de ejemplo", async () => {
  const nav = crearNavegador();
  nav.cargar(...SCRIPTS);
  await esperar();

  assert.equal(nav.elemento("stat-miembros").textContent, "146");
  assert.match(nav.elemento("stats-fuente").textContent, /Datos de ejemplo/);
});

test("sin internet pero con caché, muestra los últimos datos guardados", async () => {
  const guardado = {
    stats: { miembros: 999, conectados: 50, boosts: 3, nivel: 1 },
    juegos: {},
    idServidor: "748980597535539325",
    fecha: Date.now() - 5 * 60_000,
  };
  const nav = crearNavegador({ almacenamiento: { "brosss-stats": JSON.stringify(guardado) } });
  nav.cargar(...SCRIPTS);
  await esperar();

  assert.equal(nav.elemento("stat-miembros").textContent, "999");
  assert.match(nav.elemento("stats-fuente").textContent, /Últimos datos guardados \(hace 5 minutos\)/);
});

test("un caché roto no rompe la página", async () => {
  const nav = crearNavegador({ almacenamiento: { "brosss-stats": "{esto no es JSON" } });
  assert.doesNotThrow(() => nav.cargar(...SCRIPTS));
  await esperar();
  assert.match(nav.elemento("stats-fuente").textContent, /Datos de ejemplo/);
});

test("si falla una actualización, se mantienen los datos en vivo anteriores", async () => {
  let responder = true;
  const fetchOk = fetchCon("invitacion.json");
  const nav = crearNavegador({ fetch: (url) => (responder ? fetchOk(url) : Promise.reject(new Error("caído"))) });
  nav.cargar(...SCRIPTS);
  await esperar();

  responder = false;
  const refresco = nav.temporizadores.find((t) => t.ms === 60_000);
  assert.ok(refresco, "tiene que haber un refresco cada 60 s");
  refresco.fn();
  await esperar();

  assert.equal(nav.elemento("stat-miembros").textContent, "146");
  assert.match(nav.elemento("stats-fuente").textContent, /^En vivo/);
});

test("un nombre con HTML se muestra como texto (no se ejecuta)", async () => {
  const nav = crearNavegador();
  nav.cargar("js/config.js");
  nav.evaluar("CONFIG").cs2.jugadores = [{ nombre: "<img src=x onerror=alert(1)>", premier: 1000, faceit: null, steam: "javascript:alert(1)", avatar: "" }];
  nav.cargar("js/utilidades.js", "js/main.js", "js/rangos.js");

  const fila = nav.elemento("rangos-tabla").children[0];
  assert.match(fila.textContent, /<img src=x/, "el nombre tiene que aparecer literal");
  // El link "javascript:" no se convierte en <a>
  const celdaSteam = fila.children[4];
  assert.equal(celdaSteam.children[0].tagName, "SPAN");
});

test("la sección de rangos arma resumen, podio, gráfico y tabla", () => {
  const nav = crearNavegador();
  nav.cargar(...SCRIPTS);
  const { jugadores } = nav.evaluar("CONFIG").cs2;

  assert.equal(nav.elemento("rangos-total").textContent, String(jugadores.length));
  assert.equal(nav.elemento("rangos-mejor").textContent, "30,250");
  assert.equal(nav.elemento("rangos-mejor-nombre").textContent, "Santi");
  assert.equal(nav.elemento("rangos-podio").children.length, 3);
  assert.equal(nav.elemento("rangos-distribucion").children.length, 7);
  assert.equal(nav.elemento("rangos-tabla").children.length, jugadores.length);
  assert.equal(nav.elemento("rangos-aviso").hidden, false, "con datos de ejemplo se ve el aviso");
  assert.equal(nav.elemento("rangos-actualizado").textContent, "26 de septiembre de 2026");

  // El gráfico va de mayor a menor rango y suma el total de jugadores
  const barras = nav.elemento("rangos-distribucion").children;
  assert.match(barras[0].getAttribute("aria-label"), /^Dorado/);
  const total = barras.reduce((s, b) => s + Number(b.children[1].children[1].textContent), 0);
  assert.equal(total, jugadores.length);
});

test("el buscador y el filtro de rango actualizan la tabla", () => {
  const nav = crearNavegador();
  nav.cargar(...SCRIPTS);
  const tabla = nav.elemento("rangos-tabla");

  nav.elemento("rangos-buscar").value = "santi";
  nav.elemento("rangos-buscar").disparar("input");
  assert.equal(tabla.children.length, 1);
  // Mantiene su posición en el ranking general
  assert.equal(tabla.children[0].children[0].textContent, "1");

  nav.elemento("rangos-buscar").value = "";
  nav.elemento("rangos-filtro").value = "Violeta";
  nav.elemento("rangos-filtro").disparar("change");
  assert.ok(tabla.children.length > 0);
  assert.equal(nav.elemento("rangos-vacio").hidden, true);

  nav.elemento("rangos-buscar").value = "zzz";
  nav.elemento("rangos-buscar").disparar("input");
  assert.equal(tabla.children.length, 0);
  assert.equal(nav.elemento("rangos-vacio").hidden, false, "muestra el mensaje de sin resultados");
});

test("sin jugadores cargados, la sección muestra un mensaje en vez de romperse", () => {
  const nav = crearNavegador();
  nav.cargar("js/config.js");
  nav.evaluar("CONFIG").cs2.jugadores = [];
  assert.doesNotThrow(() => nav.cargar("js/utilidades.js", "js/main.js", "js/rangos.js"));
  assert.equal(nav.elemento("rangos-contenido").hidden, true);
  assert.equal(nav.elemento("rangos-vacio-total").hidden, false);
});
