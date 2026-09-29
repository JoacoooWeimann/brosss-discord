// Tests de las secciones Stream (Kick) y Clips (TikTok), con
// respuestas guardadas de Kick en tests/fixtures.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { crearNavegador, esperar, fetchCon } = require("./helpers/navegador-falso.js");

const STREAMERS = [
  { nombre: "Joacooo", rol: "Owner", kick: "joacooo" },
  { nombre: "Mod 2", rol: "Moderador", kick: "canal-del-mod" },
];

// Carga la página con los streamers y clips que le pasemos
async function abrir({ rutas = {}, streamers = STREAMERS, clips = [] } = {}) {
  const nav = crearNavegador({ fetch: fetchCon(rutas) });
  nav.cargar("js/config.js");
  nav.contexto.__datos = { streamers, clips };
  nav.evaluar("CONFIG.streamers = __datos.streamers; CONFIG.tiktok.clips = __datos.clips;");
  nav.cargar("js/utilidades.js", "js/main.js", "js/stream.js", "js/clips.js");
  await esperar();
  return nav;
}

const EN_VIVO = { "/channels/joacooo": "kick-en-vivo.json", "/channels/canal-del-mod": "kick-offline.json" };

test("con un mod en vivo, muestra su directo y los avisos", async () => {
  const nav = await abrir({ rutas: EN_VIVO });

  const iframe = nav.elemento("stream-player").querySelector("iframe");
  assert.ok(iframe, "tiene que haber un reproductor");
  assert.equal(iframe.src, "https://player.kick.com/joacooo?autoplay=true&muted=true");
  assert.equal(nav.elemento("stream-offline").hidden, true);

  assert.equal(nav.elemento("stream-info-nombre").textContent, "Joacooo");
  assert.match(nav.elemento("stream-info-detalle").textContent, /Counter-Strike 2 · 1\.234 espectadores · en vivo hace/);
  assert.equal(nav.elemento("stream-estado").textContent, "Hay 1 mod en vivo ahora en Kick");
  assert.equal(nav.elemento("nav-vivo").hidden, false);
  assert.equal(nav.elemento("hero-vivo").hidden, false);
  assert.equal(nav.elemento("hero-vivo-texto").textContent, "Joacooo está en vivo");

  // El que está en vivo aparece primero
  const lista = nav.elemento("stream-lista").children;
  assert.match(lista[0].className, /streamer--vivo/);
  assert.match(lista[1].className, /streamer--offline/);
});

test("el título del stream se muestra como texto (no se ejecuta HTML)", async () => {
  const nav = await abrir({ rutas: EN_VIVO });
  assert.match(nav.elemento("stream-info-titulo").textContent, /<script>alert\(1\)<\/script>/);
});

test("con todos offline, muestra el cartel y oculta los avisos", async () => {
  const nav = await abrir({ rutas: { "/channels/": "kick-offline.json" } });
  assert.equal(nav.elemento("stream-player").querySelector("iframe"), null);
  assert.equal(nav.elemento("stream-offline").hidden, false);
  assert.equal(nav.elemento("stream-info").hidden, true);
  assert.equal(nav.elemento("nav-vivo").hidden, true);
  assert.equal(nav.elemento("hero-vivo").hidden, true);
  assert.equal(nav.elemento("stream-estado").textContent, "Ningún mod está transmitiendo ahora");
});

test("si Kick no responde, la sección no se rompe y ofrece los links", async () => {
  const nav = await abrir({ rutas: {} });
  assert.match(nav.elemento("stream-estado").textContent, /No pudimos consultar Kick/);
  const lista = nav.elemento("stream-lista").children;
  assert.equal(lista.length, 2);
  lista.forEach((item) => {
    assert.match(item.className, /streamer--desconocido/);
    const link = item.children.at(-1);
    assert.equal(link.tagName, "A");
    assert.match(link.href, /^https:\/\/kick\.com\//);
  });
});

test("si el stream sigue en vivo, el reproductor no se recarga en cada actualización", async () => {
  const nav = await abrir({ rutas: EN_VIVO });
  const antes = nav.elemento("stream-player").querySelector("iframe");
  nav.temporizadores.find((t) => t.ms === 60_000).fn();
  await esperar();
  assert.equal(nav.elemento("stream-player").querySelector("iframe"), antes, "tiene que ser el mismo iframe");
});

test("sin streamers válidos, la sección se oculta", async () => {
  const nav = await abrir({ streamers: [{ nombre: "X", rol: "Mod", kick: "https://kick.com/x" }] });
  assert.equal(nav.elemento("stream").hidden, true);
  assert.equal(nav.elemento("nav-stream").hidden, true, "el link del menú también se oculta");
});

test("con streamers cargados, la sección y el link se ven", async () => {
  const nav = await abrir({ rutas: EN_VIVO });
  assert.equal(nav.elemento("stream").hidden, false);
  assert.equal(nav.elemento("nav-stream").hidden, false);
});

// 4 clips de prueba: el primero es de la cuenta oficial
const CLIPS = [
  { url: "https://www.tiktok.com/@brosss.clips/video/7400000000000000001", titulo: "Oficial" },
  { url: "https://www.tiktok.com/@awaken_brosss/video/7400000000000000002", titulo: "Dos" },
  { url: "https://www.tiktok.com/@awaken_brosss/video/7400000000000000003", titulo: "Tres" },
  { url: "https://www.tiktok.com/@awaken_brosss/video/7400000000000000004", titulo: "Cuatro" },
];

// Qué clip hay en cada lugar del carrusel: { izquierda, centro, derecha }
function lugares(nav) {
  const lugar = {};
  nav.elemento("clips-lista").children.forEach((li) => {
    if (!li.hidden) lugar[li.dataset.posicion] = li.children[0].children[2]?.textContent ?? "(video)";
  });
  return lugar;
}

test("el carrusel arranca con el clip oficial en el medio y muestra 3", async () => {
  const nav = await abrir({ clips: CLIPS });
  assert.deepEqual(lugares(nav), { izquierda: "Cuatro", centro: "Oficial", derecha: "Dos" });
  assert.equal(nav.elemento("clips-lista").children.filter((li) => li.hidden).length, 1, "el 4° queda oculto");
  assert.equal(nav.elemento("clips-puntos").children[0].getAttribute("aria-current"), "true");
});

test("las flechas giran el carrusel de forma circular", async () => {
  const nav = await abrir({ clips: CLIPS });
  nav.elemento("clips-siguiente").disparar("click");
  assert.deepEqual(lugares(nav), { izquierda: "Oficial", centro: "Dos", derecha: "Tres" });

  nav.elemento("clips-anterior").disparar("click");
  nav.elemento("clips-anterior").disparar("click");
  assert.deepEqual(lugares(nav), { izquierda: "Tres", centro: "Cuatro", derecha: "Oficial" });

  // El puntito resaltado acompaña
  const puntos = nav.elemento("clips-puntos").children;
  assert.equal(puntos[3].getAttribute("aria-current"), "true");
  assert.equal(puntos[0].getAttribute("aria-current"), null);
});

test("los puntitos, el teclado y deslizar con el dedo también giran", async () => {
  const nav = await abrir({ clips: CLIPS });
  nav.elemento("clips-puntos").children[2].disparar("click");
  assert.equal(lugares(nav).centro, "Tres");

  nav.elemento("clips-carrusel").disparar("keydown", { key: "ArrowRight" });
  assert.equal(lugares(nav).centro, "Cuatro");

  const lista = nav.elemento("clips-lista");
  lista.disparar("pointerdown", { pointerType: "touch", clientX: 300 });
  lista.disparar("pointerup", { pointerType: "touch", clientX: 150 }); // hacia la izquierda: siguiente
  assert.equal(lugares(nav).centro, "Oficial");

  lista.disparar("pointerdown", { pointerType: "touch", clientX: 150 });
  lista.disparar("pointerup", { pointerType: "touch", clientX: 170 }); // muy corto: no gira
  assert.equal(lugares(nav).centro, "Oficial");
});

test("tocar un clip de costado lo trae al medio en vez de reproducirlo", async () => {
  const nav = await abrir({ clips: CLIPS });
  const dos = nav.elemento("clips-lista").children[1];
  dos.children[0].disparar("click");
  assert.equal(lugares(nav).centro, "Dos");
  assert.equal(dos.children[0].tagName, "BUTTON", "todavía no carga el video");
});

test("si un video se está reproduciendo y se gira, se corta", async () => {
  const nav = await abrir({ clips: CLIPS });
  const oficial = nav.elemento("clips-lista").children[0];
  oficial.children[0].disparar("click");
  assert.equal(oficial.children[0].tagName, "IFRAME");

  nav.elemento("clips-siguiente").disparar("click");
  assert.equal(oficial.children[0].tagName, "BUTTON", "vuelve a la fachada y deja de sonar");
});

test("con un solo clip no hay flechas ni puntitos", async () => {
  const nav = await abrir({ clips: CLIPS.slice(0, 1) });
  assert.equal(nav.elemento("clips-anterior").hidden, true);
  assert.equal(nav.elemento("clips-siguiente").hidden, true);
  assert.equal(nav.elemento("clips-puntos").hidden, true);
  assert.deepEqual(lugares(nav), { centro: "Oficial" });
});

test("los clips se muestran como fachada y cargan el video al hacer clic", async () => {
  const nav = await abrir({
    clips: [
      { url: "https://www.tiktok.com/@brosss/video/7412345678901234567", titulo: "Ace" },
      { url: "https://vm.tiktok.com/ZMabc/" }, // inválido: se descarta
    ],
  });
  const lista = nav.elemento("clips-lista").children;
  assert.equal(lista.length, 1);
  assert.equal(nav.elemento("clips-vacio").hidden, true);

  const fachada = lista[0].children[0];
  assert.equal(fachada.tagName, "BUTTON");
  assert.equal(fachada.getAttribute("aria-label"), "Reproducir clip: Ace");

  fachada.disparar("click");
  const iframe = lista[0].children[0];
  assert.equal(iframe.tagName, "IFRAME");
  assert.match(iframe.src, /^https:\/\/www\.tiktok\.com\/player\/v1\/7412345678901234567\?autoplay=1/);
});

test("cada clip muestra su cuenta, pero Ver más lleva siempre a la oficial", async () => {
  const nav = await abrir({
    clips: [
      { url: "https://www.tiktok.com/@brosss.clips/video/7412345678901234567" },
      { url: "https://www.tiktok.com/@awaken_brosss/video/7622815767372860693" },
    ],
  });
  const marcas = nav.elemento("clips-lista").children.map((li) => li.children[0].children[0].textContent);
  assert.deepEqual(marcas, ["@brosss.clips", "@awaken_brosss"]);
  assert.equal(nav.elemento("clips-perfil").href, "https://www.tiktok.com/@brosss.clips");
});

test("sin clips, muestra el mensaje y el link al perfil", async () => {
  const nav = await abrir({ clips: [] });
  assert.equal(nav.elemento("clips-vacio").hidden, false);
  assert.equal(nav.elemento("clips-carrusel").hidden, true);
  const usuario = nav.evaluar("CONFIG.tiktok.usuario");
  assert.equal(nav.elemento("clips-perfil").href, `https://www.tiktok.com/@${usuario}`);
  assert.equal(nav.elemento("clips-usuario").textContent, "@" + usuario);
});
