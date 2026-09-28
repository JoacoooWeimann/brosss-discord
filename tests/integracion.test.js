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

// ---------- Rangos ----------

// La celda "Jugador" tiene el avatar (con la inicial) y el nombre
const nombreDe = (fila) => fila.children[1].children[0].children[1].textContent;
const filaDe = (filas, nombre) => filas.find((f) => nombreDe(f) === nombre);

// Abre la página con la API de rangos respondiendo (o no) y, si se pasa,
// reemplaza la lista de jugadores de config.js
async function abrirRangos({ rutas = { "/api/rangos": "rangos-api.json" }, jugadores } = {}) {
  const nav = crearNavegador({ fetch: fetchCon(rutas) });
  nav.cargar("js/config.js");
  if (jugadores) {
    nav.contexto.__jugadores = jugadores;
    nav.evaluar("CONFIG.cs2.jugadores = __jugadores");
  }
  nav.cargar("js/utilidades.js", "js/main.js", "js/rangos.js");
  await esperar();
  return nav;
}

test("con la API de rangos, arma resumen, podio, gráfico y tabla", async () => {
  const nav = await abrirRangos();

  assert.equal(nav.elemento("rangos-total").textContent, "6");
  // El promedio y el mejor solo cuentan a los que tienen rating
  assert.equal(nav.elemento("rangos-promedio").textContent, "18,223");
  assert.equal(nav.elemento("rangos-mejor").textContent, "30,250");
  assert.equal(nav.elemento("rangos-mejor-nombre").textContent, "Santi");
  assert.equal(nav.elemento("rangos-podio").children.length, 3);
  assert.equal(nav.elemento("rangos-podio-vacio").hidden, true);
  assert.equal(nav.elemento("rangos-aviso").hidden, true, "con datos en vivo no hay aviso");
  assert.match(nav.elemento("rangos-actualizado").textContent, /^actualizado hace/);
  assert.equal(nav.elemento("rangos-leetify").hidden, false, "hay jugadores sin rating: se ve la nota de Leetify");

  // El gráfico va de mayor a menor rango y suma solo a los que tienen rating
  const barras = nav.elemento("rangos-distribucion").children;
  assert.equal(barras.length, 7);
  assert.match(barras[0].getAttribute("aria-label"), /^Dorado/);
  const total = barras.reduce((s, b) => s + Number(b.children[1].children[1].textContent), 0);
  assert.equal(total, 4);

  // Tabla: los sin rating al final (Kyo antes que Lucho por tener FACEIT)
  const filas = nav.elemento("rangos-tabla").children;
  assert.deepEqual(filas.map(nombreDe), ["Santi", "Gonza", "Joaco", "Pipe", "Kyo", "Lucho"]);
  assert.equal(filas[4].children[2].textContent, "—");
  assert.equal(filas[4].children[3].children[0].title, "FACEIT nivel 7 · 1.629 ELO");
});

test("el nivel de FACEIT es un link solo si la URL es de faceit.com", async () => {
  const filas = (await abrirRangos()).elemento("rangos-tabla").children;
  const faceitDe = (nombre) => filaDe(filas, nombre).children[3].children[0];
  assert.equal(faceitDe("Joaco").tagName, "A");
  assert.equal(faceitDe("Joaco").href, "https://www.faceit.com/es/players/joaco");
  assert.equal(faceitDe("Gonza").tagName, "SPAN");
});

test("un avatar que no es https no se carga", async () => {
  const filas = (await abrirRangos()).elemento("rangos-tabla").children;
  const avatarDe = (nombre) => filaDe(filas, nombre).children[1].children[0].children[0];
  assert.equal(avatarDe("Joaco").children[0].tagName, "IMG");
  assert.equal(avatarDe("Pipe").children.length, 0, "javascript: no se usa como src");
});

test("si la API de rangos no responde, usa los valores de config.js y lo avisa", async () => {
  const nav = await abrirRangos({
    rutas: {},
    jugadores: [
      { nombre: "A", steam: "https://steamcommunity.com/id/a", premier: 12000, faceit: 5 },
      { nombre: "B", steam: "https://steamcommunity.com/id/b" },
    ],
  });
  assert.equal(nav.elemento("rangos-aviso").hidden, false);
  assert.equal(nav.elemento("rangos-actualizado").textContent, "datos cargados a mano");
  assert.equal(nav.elemento("rangos-mejor").textContent, "12,000");
  assert.equal(nav.elemento("rangos-tabla").children.length, 2);
});

test("si nadie tiene rating, el podio muestra un mensaje y el resumen queda en —", async () => {
  const nav = await abrirRangos({
    rutas: {},
    jugadores: [{ nombre: "A", steam: "https://steamcommunity.com/id/a" }],
  });
  assert.equal(nav.elemento("rangos-podio").hidden, true);
  assert.equal(nav.elemento("rangos-podio-vacio").hidden, false);
  assert.equal(nav.elemento("rangos-mejor").textContent, "—");
  assert.equal(nav.elemento("rangos-tabla").children.length, 1);
});

test("un nombre con HTML se muestra como texto (no se ejecuta)", async () => {
  const nav = await abrirRangos({
    rutas: {},
    jugadores: [{ nombre: "<img src=x onerror=alert(1)>", premier: 1000, steam: "javascript:alert(1)" }],
  });
  const fila = nav.elemento("rangos-tabla").children[0];
  assert.match(fila.textContent, /<img src=x/, "el nombre tiene que aparecer literal");
  // El link "javascript:" no se convierte en <a>
  const celdaSteam = fila.children[4];
  assert.equal(celdaSteam.children[0].tagName, "SPAN");
});

test("el buscador y el filtro de rango actualizan la tabla", async () => {
  const nav = await abrirRangos();
  const tabla = nav.elemento("rangos-tabla");

  nav.elemento("rangos-buscar").value = "santi";
  nav.elemento("rangos-buscar").disparar("input");
  assert.equal(tabla.children.length, 1);
  // Mantiene su posición en el ranking general
  assert.equal(tabla.children[0].children[0].textContent, "1");

  nav.elemento("rangos-buscar").value = "";
  nav.elemento("rangos-filtro").value = "Violeta";
  nav.elemento("rangos-filtro").disparar("change");
  assert.equal(tabla.children.length, 2);
  assert.equal(nav.elemento("rangos-vacio").hidden, true);

  nav.elemento("rangos-buscar").value = "zzz";
  nav.elemento("rangos-buscar").disparar("input");
  assert.equal(tabla.children.length, 0);
  assert.equal(nav.elemento("rangos-vacio").hidden, false, "muestra el mensaje de sin resultados");
});

test("sin jugadores cargados, la sección muestra un mensaje en vez de romperse", async () => {
  const nav = await abrirRangos({ rutas: {}, jugadores: [] });
  assert.equal(nav.elemento("rangos-contenido").hidden, true);
  assert.equal(nav.elemento("rangos-vacio-total").hidden, false);
});
