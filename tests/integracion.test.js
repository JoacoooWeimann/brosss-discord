// Tests de integración: ejecutamos config.js, utilidades.js y main.js
// juntos, en un navegador falso, con una respuesta guardada de la API
// de Discord (tests/fixtures). No se usa internet.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { crearNavegador, esperar, fetchCon } = require("./helpers/navegador-falso.js");

const SCRIPTS = ["js/config.js", "js/utilidades.js", "js/main.js"];

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
