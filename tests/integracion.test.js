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

test("el staff se arma en pirámide: una fila por rol, en el orden de config.js", () => {
  const nav = crearNavegador();
  nav.cargar("js/config.js");
  nav.contexto.__staff = [
    { nombre: "A", usuario: "a_1", rol: "Owner", color: "#22e36b", avatar: "img/staff/a.webp" },
    { nombre: "B", usuario: "", rol: "Owner", color: "#22e36b", avatar: "" },
    { nombre: "C", usuario: "c", rol: "Mod", color: "#5c9dff", avatar: "" },
    { nombre: "D", usuario: "d", rol: "Mod", color: "#5c9dff", avatar: "" },
    { nombre: "E", usuario: "e", rol: "Mod", color: "#5c9dff", avatar: "" },
  ];
  nav.evaluar("CONFIG.staff = __staff");
  nav.cargar("js/utilidades.js", "js/main.js");

  const filas = nav.elemento("staff-lista").children;
  assert.deepEqual(filas.map((f) => f.children.length), [2, 3]);
  assert.match(filas[0].className, /staff__fila--principal/);
  assert.doesNotMatch(filas[1].className, /staff__fila--principal/);

  const [a, b] = filas[0].children;
  assert.equal(a.children[0].children[0].src, "img/staff/a.webp");
  assert.equal(a.textContent, "A@a_1Owner");
  assert.equal(b.textContent, "BBOwner", "sin foto va la inicial y sin usuario no hay @");
});

// ---------- Rangos ----------

// La celda "Jugador" tiene el avatar (con la inicial) y el nombre
const nombreDe = (fila) => fila.children[1].children[0].children[1].textContent;
const filaDe = (filas, nombre) => filas.find((f) => nombreDe(f) === nombre);

// Abre la página con /api/rangos respondiendo según "responder":
// el nombre de un fixture, un objeto con la respuesta, o null (caída).
// Se puede cambiar después con nav.responderRangos = ...
async function abrirRangos({ responder = "rangos-api.json" } = {}) {
  const deFixture = fetchCon({ "/api/rangos": "rangos-api.json" });
  let nav;
  const fetch = async (url) => {
    const r = nav.responderRangos;
    if (!url.includes("/api/rangos") || r === null) return { ok: false, status: 503, json: async () => ({}) };
    if (typeof r === "string") return deFixture(url);
    return { ok: true, status: 200, json: async () => r };
  };
  nav = crearNavegador({ fetch });
  nav.responderRangos = responder;
  nav.cargar("js/config.js", "js/utilidades.js", "js/main.js", "js/rangos.js");
  await esperar();
  return nav;
}

// Dispara la actualización automática de los rangos (cada 15 minutos)
async function refrescarRangos(nav) {
  const refresco = nav.temporizadores.find((t) => t.ms === 15 * 60_000);
  assert.ok(refresco, "los rangos se tienen que actualizar solos cada 15 minutos");
  refresco.fn();
  await esperar();
}

test("con la API de rangos, arma la tabla ordenada por CS Rating", async () => {
  const nav = await abrirRangos();

  assert.equal(nav.elemento("rangos-aviso").hidden, true, "con datos en vivo no hay aviso");
  assert.match(nav.elemento("rangos-actualizado").textContent, /^actualizado hace/);
  assert.equal(nav.elemento("rangos-leetify").hidden, false, "hay jugadores sin rating: se ve la nota de Leetify");

  // Los sin rating al final (Kyo antes que Lucho por tener FACEIT)
  const filas = nav.elemento("rangos-tabla").children;
  assert.deepEqual(filas.map(nombreDe), ["Santi", "Gonza", "Joaco", "Pipe", "Kyo", "Lucho"]);
  assert.equal(filas[0].children[2].textContent, "30,250");
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

test("si la API de rangos no responde, avisa y no muestra datos inventados", async () => {
  const nav = await abrirRangos({ responder: null });
  assert.equal(nav.elemento("rangos-aviso").hidden, false);
  assert.equal(nav.elemento("rangos-contenido").hidden, true);
  assert.equal(nav.elemento("rangos-actualizado").textContent, "sin datos por ahora");
  assert.equal(nav.elemento("rangos-tabla").children.length, 0);
});

test("la tabla se actualiza sola y conserva la búsqueda", async () => {
  const nav = await abrirRangos();
  nav.elemento("rangos-buscar").value = "joaco";
  nav.elemento("rangos-buscar").disparar("input");

  nav.responderRangos = {
    actualizado: new Date().toISOString(),
    jugadores: [
      { nombre: "Joaco", steam: "", premier: 21000, faceit: 8 },
      { nombre: "Santi", steam: "", premier: 20000, faceit: 10 },
    ],
  };
  await refrescarRangos(nav);

  const filas = nav.elemento("rangos-tabla").children;
  assert.equal(filas.length, 1, "sigue filtrado por la búsqueda");
  assert.equal(filas[0].children[2].textContent, "21,000");
  assert.equal(filas[0].children[0].textContent, "1", "subió al primer puesto");
  assert.equal(nav.elemento("rangos-leetify").hidden, true, "ahora todos tienen rating");
  // Los filtros se arman una sola vez: no se duplican las opciones
  assert.equal(nav.elemento("rangos-filtro").children.length, 7);
});

test("si falla una actualización, se mantiene la última tabla con un aviso", async () => {
  const nav = await abrirRangos();
  nav.responderRangos = null;
  await refrescarRangos(nav);

  assert.equal(nav.elemento("rangos-aviso").hidden, false);
  assert.equal(nav.elemento("rangos-contenido").hidden, false);
  assert.equal(nav.elemento("rangos-tabla").children.length, 6);
  assert.match(nav.elemento("rangos-actualizado").textContent, /^actualizado hace/);
});

test("un nombre con HTML se muestra como texto (no se ejecuta)", async () => {
  const nav = await abrirRangos({
    responder: {
      actualizado: new Date().toISOString(),
      jugadores: [{ nombre: "<img src=x onerror=alert(1)>", premier: 1000, steam: "javascript:alert(1)" }],
    },
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
  const nav = await abrirRangos({ responder: { actualizado: new Date().toISOString(), jugadores: [] } });
  assert.equal(nav.elemento("rangos-contenido").hidden, true);
  assert.equal(nav.elemento("rangos-vacio-total").hidden, false);
});
