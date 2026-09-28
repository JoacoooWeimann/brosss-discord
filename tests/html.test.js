// Chequea que el HTML y el JS "encajen": que cada id que usa el JS
// exista en index.html, que no falten archivos, etc. Es el tipo de
// error que no tira ningún aviso hasta que alguien abre la página.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const RAIZ = path.join(__dirname, "..");
const leer = (archivo) => fs.readFileSync(path.join(RAIZ, archivo), "utf8");
const html = leer("index.html");
const SCRIPTS = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);

test("todos los archivos JS compilan sin errores de sintaxis", () => {
  for (const archivo of fs.readdirSync(path.join(RAIZ, "js"))) {
    assert.doesNotThrow(() => new vm.Script(leer("js/" + archivo), { filename: archivo }), archivo);
  }
});

test("index.html carga los scripts en el orden correcto", () => {
  assert.deepEqual(SCRIPTS, [
    "js/config.js",
    "js/utilidades.js",
    "js/main.js",
    "js/rangos.js",
    "js/stream.js",
    "js/clips.js",
    "js/efectos.js",
  ]);
});

test("cada id que usa el JavaScript existe en index.html", () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const archivo of SCRIPTS) {
    const usados = [...leer(archivo).matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]);
    for (const id of usados) assert.ok(ids.has(id), `${archivo} usa #${id}, que no existe en index.html`);
  }
});

test("no hay ids repetidos", () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(repetidos, []);
});

test("cada link del menú apunta a una sección que existe", () => {
  const nav = html.slice(html.indexOf('<nav class="nav__links">'), html.indexOf("</nav>"));
  for (const [, ancla] of nav.matchAll(/href="#([^"]+)"/g)) {
    assert.match(html, new RegExp(`<section id="${ancla}"`), `el menú apunta a #${ancla}, que no existe`);
  }
});

test("todos los archivos locales referenciados existen", () => {
  for (const pagina of ["index.html", "404.html"]) {
    const refs = [...leer(pagina).matchAll(/(?:src|href)="(\/?(?:css|js|img)\/[^"]+)"/g)].map((m) => m[1]);
    assert.ok(refs.length > 0);
    for (const ref of refs) assert.ok(fs.existsSync(path.join(RAIZ, ref.replace(/^\//, ""))), `${pagina}: falta ${ref}`);
  }
});

test("todas las imágenes tienen texto alternativo", () => {
  for (const pagina of ["index.html", "404.html"]) {
    const sinAlt = [...leer(pagina).matchAll(/<img\b[^>]*>/g)].filter((m) => !/\salt="/.test(m[0]));
    assert.deepEqual(sinAlt, [], `${pagina} tiene imágenes sin alt`);
  }
});

test("los links que abren otra pestaña usan rel=noopener", () => {
  const conBlank = [...html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)];
  conBlank.forEach((m) => assert.match(m[0], /rel="[^"]*noopener/));
});

test("la página tiene los metadatos básicos para producción", () => {
  assert.match(html, /<html lang="es">/);
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /<meta name="description" content=".{50,}"/);
  assert.match(html, /<title>[^<]+<\/title>/);
  assert.match(html, /property="og:image"/);
});

test("no hay estilos ni scripts en línea (los bloquearía la CSP)", () => {
  for (const pagina of ["index.html", "404.html"]) {
    const codigo = leer(pagina);
    assert.doesNotMatch(codigo, /<script(?![^>]*\ssrc=)[^>]*>/, `${pagina} tiene un <script> en línea`);
    assert.doesNotMatch(codigo, /\sstyle="/, `${pagina} tiene un atributo style`);
    assert.doesNotMatch(codigo, /\son[a-z]+="/, `${pagina} tiene un onclick/onload en línea`);
  }
});

test("netlify.toml define la CSP y permite todo lo que usa la página", () => {
  const { ORIGENES } = require("../js/utilidades.js");
  const csp = leer("netlify.toml").match(/Content-Security-Policy = "([^"]+)"/)[1];
  // Arma un objeto { "connect-src": "https://... https://...", ... }
  const directivas = Object.fromEntries(
    csp.split(";").map((d) => d.trim().split(/\s+/)).map(([nombre, ...valores]) => [nombre, valores])
  );

  assert.ok(directivas["font-src"].includes("https://fonts.gstatic.com"));
  assert.ok(directivas["style-src"].includes("https://fonts.googleapis.com"));
  for (const origen of Object.values(ORIGENES.api)) {
    assert.ok(directivas["connect-src"].includes(origen), `connect-src no permite ${origen}`);
  }
  for (const origen of Object.values(ORIGENES.iframes)) {
    assert.ok(directivas["frame-src"].includes(origen), `frame-src no permite ${origen}`);
  }
});

test("los scripts no usan dominios externos escritos a mano (van en ORIGENES)", () => {
  // Para que la CSP y el código no se desincronicen, las URLs de APIs
  // e iframes se arman siempre desde ORIGENES en utilidades.js
  for (const archivo of SCRIPTS.filter((a) => a !== "js/utilidades.js" && a !== "js/config.js")) {
    const codigo = leer(archivo);
    assert.doesNotMatch(codigo, /https:\/\/(discord\.com|kick\.com|player\.kick\.com|www\.tiktok\.com)\/(api|player)/, archivo);
  }
});

test("el CSS respeta el atributo hidden aunque el elemento tenga display", () => {
  // Sin esta regla, JS pone hidden = true pero el elemento se sigue viendo
  assert.match(leer("css/styles.css"), /\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/);
});
