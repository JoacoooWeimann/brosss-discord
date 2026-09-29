// =============================================================
//  CLIPS.JS
//  Sección "Clips": carrusel de videos de TikTok cargados en
//  config.js. Se ven 3 a la vez: el del medio es el destacado y
//  los de los costados asoman. Las flechas, los puntitos, el
//  teclado o deslizar con el dedo lo hacen girar (es circular).
//
//  Cada reproductor de TikTok pesa bastante. En vez de cargar todos
//  al abrir la página, mostramos una tarjeta liviana y el video
//  recién se carga cuando alguien hace clic. Esta técnica se llama
//  "facade" (fachada).
// =============================================================

// Índice del clip que está en el medio
let clipActual = 0;
// Cada clip con su <li>, en el orden de config.js
let clipsCarrusel = [];

function iniciarClips() {
  const { usuario, clips } = CONFIG.tiktok;
  const perfil = $("clips-perfil");
  perfil.href = urlPerfilTiktok(usuario);
  $("clips-usuario").textContent = "@" + usuario;

  // Descartamos los links mal cargados (el test de config.js los avisa)
  const validos = clips
    .map((c, i) => ({ ...c, id: idDeTiktok(c.url), titulo: c.titulo || `Clip ${i + 1}` }))
    .filter((c) => c.id);

  $("clips-vacio").hidden = validos.length > 0;
  $("clips-carrusel").hidden = validos.length === 0;
  $("clips-puntos").hidden = validos.length < 2;
  if (validos.length === 0) return;

  const lista = $("clips-lista");
  clipsCarrusel = validos.map((clip, i) => {
    const item = crear("li", "clip");
    item.setAttribute("aria-roledescription", "clip");
    item.setAttribute("aria-label", `${i + 1} de ${validos.length}: ${clip.titulo}`);
    lista.append(item);
    return { clip, item };
  });
  clipsCarrusel.forEach((c, i) => c.item.append(crearFachada(c.clip, i)));

  // Puntitos: uno por clip, para saltar directo
  validos.forEach((clip, i) => {
    const punto = crear("button", "carrusel__punto");
    punto.type = "button";
    punto.setAttribute("aria-label", `Ir al clip ${i + 1}: ${clip.titulo}`);
    punto.addEventListener("click", () => irAlClip(i));
    $("clips-puntos").append(punto);
  });

  // Con un solo clip no hay nada que girar
  $("clips-anterior").hidden = validos.length < 2;
  $("clips-siguiente").hidden = validos.length < 2;
  $("clips-anterior").addEventListener("click", () => irAlClip(clipActual - 1));
  $("clips-siguiente").addEventListener("click", () => irAlClip(clipActual + 1));

  // Teclado: flechas izquierda/derecha cuando el foco está en el carrusel
  $("clips-carrusel").addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") irAlClip(clipActual - 1);
    if (e.key === "ArrowRight") irAlClip(clipActual + 1);
  });

  // Deslizar con el dedo (solo pantallas táctiles)
  let inicioX = null;
  lista.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") inicioX = e.clientX;
  });
  lista.addEventListener("pointerup", (e) => {
    if (inicioX === null) return;
    const distancia = e.clientX - inicioX;
    inicioX = null;
    if (Math.abs(distancia) > 50) irAlClip(clipActual + (distancia < 0 ? 1 : -1));
  });

  // Aparece con animación una sola vez (no cada vez que gira)
  $("clips-carrusel").classList.add("revelar");
  observador.observe($("clips-carrusel"));

  // Arranca con el primero de config.js en el medio: el de la cuenta oficial
  irAlClip(0);
}

// Tarjeta liviana: al hacer clic en la del medio carga el video; en
// una de los costados, gira el carrusel hasta ella
function crearFachada(clip, indice) {
  const { titulo, url } = clip;
  const fachada = crear("button", "clip__fachada");
  fachada.type = "button";
  fachada.setAttribute("aria-label", `Reproducir clip: ${titulo}`);
  const play = crear("span", "clip__play");
  play.setAttribute("aria-hidden", "true");
  // Arriba se ve de qué cuenta es el clip (puede no ser la oficial)
  fachada.append(crear("span", "clip__marca", "@" + usuarioDeTiktok(url)), play, crear("span", "clip__titulo", titulo));

  fachada.addEventListener("click", () => {
    if (indice !== clipActual) return irAlClip(indice);
    const iframe = crear("iframe");
    iframe.src = urlPlayerTiktok(clip.id);
    iframe.title = titulo;
    iframe.allow = "autoplay; fullscreen; encrypted-media";
    fachada.replaceWith(iframe);
  });
  return fachada;
}

function irAlClip(indice) {
  const total = clipsCarrusel.length;
  // Circular: después del último viene el primero (y al revés)
  clipActual = ((indice % total) + total) % total;

  clipsCarrusel.forEach(({ clip, item }, i) => {
    const posicion = posicionEnCarrusel(i, clipActual, total);
    item.dataset.posicion = posicion ?? "";
    item.hidden = posicion === null;

    // Si un video se estaba reproduciendo y deja el medio, lo cortamos
    // (volviendo a la fachada), así no sigue sonando de fondo
    const iframe = item.querySelector("iframe");
    if (iframe && posicion !== "centro") iframe.replaceWith(crearFachada(clip, i));
  });

  // children no es un array en el navegador: lo convertimos
  Array.from($("clips-puntos").children).forEach((punto, i) => {
    if (i === clipActual) punto.setAttribute("aria-current", "true");
    else punto.removeAttribute("aria-current");
  });
}

iniciarClips();
