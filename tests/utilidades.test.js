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
