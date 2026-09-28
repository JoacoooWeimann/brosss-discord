// Valida js/config.js: si alguien carga mal un dato (un rating con
// texto, un color inválido, un link http...), el test lo avisa antes
// de que llegue a producción.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const CONFIG = require("../js/config.js");

const RAIZ = path.join(__dirname, "..");
const esColor = (c) => /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(c);

test("el código de invitación es solo el código, no el link", () => {
  assert.doesNotMatch(CONFIG.codigoInvitacion, /discord|\/|\s/, "poné solo lo que va después de discord.gg/");
});

test("el ID del servidor, si está, es numérico", () => {
  assert.match(CONFIG.idServidor, /^(\d{17,20})?$/);
});

test("el refresco no es tan seguido como para chocar con el límite de Discord", () => {
  assert.ok(CONFIG.refrescoSegundos >= 30);
});

test("cada juego tiene nombre, ID de aplicación e imagen existente", () => {
  for (const juego of CONFIG.juegos) {
    assert.ok(juego.nombre);
    assert.match(juego.idApp, /^\d{17,20}$/);
    assert.ok(fs.existsSync(path.join(RAIZ, juego.imagen)), `falta la imagen ${juego.imagen}`);
  }
});

test("reglas y FAQ tienen título y texto", () => {
  CONFIG.reglas.forEach((r) => assert.ok(r.titulo && r.texto));
  CONFIG.faq.forEach((f) => assert.ok(f.pregunta && f.respuesta));
});

test("cada miembro del staff tiene un color válido", () => {
  CONFIG.staff.forEach((s) => {
    assert.ok(s.nombre && s.rol);
    assert.ok(esColor(s.color), `color inválido para ${s.nombre}: ${s.color}`);
  });
});

test("la fecha de actualización de los rangos es válida", () => {
  assert.match(CONFIG.cs2.actualizado, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(!isNaN(new Date(CONFIG.cs2.actualizado)));
});

test("cada jugador de CS2 tiene datos válidos", () => {
  const nombres = new Set();
  for (const j of CONFIG.cs2.jugadores) {
    assert.ok(typeof j.nombre === "string" && j.nombre.trim(), "falta el nombre");
    assert.ok(!nombres.has(j.nombre), `nombre repetido: ${j.nombre}`);
    nombres.add(j.nombre);

    assert.ok(Number.isInteger(j.premier) && j.premier >= 0 && j.premier <= 50000, `rating inválido para ${j.nombre}: ${j.premier}`);
    assert.ok(j.faceit === null || (Number.isInteger(j.faceit) && j.faceit >= 1 && j.faceit <= 10), `nivel FACEIT inválido para ${j.nombre}`);
    if (j.steam) assert.match(j.steam, /^https:\/\/steamcommunity\.com\//, `link de Steam inválido para ${j.nombre}`);
    if (j.avatar) assert.match(j.avatar, /^https:\/\//, `el avatar de ${j.nombre} tiene que ser https`);
  }
});
