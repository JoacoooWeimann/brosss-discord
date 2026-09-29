// =============================================================
//  STREAM.JS
//  Sección "Stream": consulta en Kick qué mods están en vivo y
//  muestra el directo incrustado. Se actualiza cada minuto.
// =============================================================

// Canal que se está mostrando en el reproductor (null = ninguno)
let canalEnReproductor = null;
// true cuando la persona eligió un canal a mano: no lo cambiamos solos
let eleccionManual = false;

async function consultarStreamer(streamer) {
  try {
    const res = await fetch(urlApiKick(streamer.kick));
    if (!res.ok) throw new Error("Kick respondió " + res.status);
    const canal = resumirCanalKick(await res.json());
    return { ...streamer, ...canal, estado: canal.enVivo ? "vivo" : "offline" };
  } catch (error) {
    console.warn(`Kick (${streamer.kick}):`, error.message);
    // Sin datos: igual lo mostramos, con el link a su canal
    return { ...streamer, avatar: "", enVivo: false, espectadores: 0, estado: "desconocido" };
  }
}

async function cargarStreams() {
  const validos = CONFIG.streamers.filter((s) => esSlugKick(s.kick));
  // Sin canales cargados, ocultamos la sección y su link del menú
  $("stream").hidden = validos.length === 0;
  $("nav-stream").hidden = validos.length === 0;
  if (validos.length === 0) return;

  // Consultamos todos los canales a la vez
  const streamers = ordenarStreamers(await Promise.all(validos.map(consultarStreamer)));
  const enVivo = streamers.filter((s) => s.estado === "vivo");

  // Si el canal elegido dejó de transmitir, volvemos a elegir automático
  if (!enVivo.some((s) => s.kick === canalEnReproductor)) eleccionManual = false;
  if (!eleccionManual) canalEnReproductor = enVivo[0]?.kick ?? null;

  mostrarReproductor(enVivo.find((s) => s.kick === canalEnReproductor));
  mostrarListaStreamers(streamers);
  mostrarAvisosEnVivo(enVivo);

  const desconocidos = streamers.filter((s) => s.estado === "desconocido").length;
  $("stream-estado").textContent =
    desconocidos === streamers.length
      ? "No pudimos consultar Kick en este momento. Mirá los canales directamente."
      : enVivo.length > 0
        ? `${enVivo.length === 1 ? "Hay 1 mod" : `Hay ${enVivo.length} mods`} en vivo ahora en Kick`
        : "Ningún mod está transmitiendo ahora";
}

// ---------- Reproductor ----------

function mostrarReproductor(streamer) {
  const contenedor = $("stream-player");
  const offline = $("stream-offline");
  let iframe = contenedor.querySelector("iframe");

  if (!streamer) {
    iframe?.remove();
    offline.hidden = false;
    $("stream-info").hidden = true;
    return;
  }

  offline.hidden = true;
  // Solo cambiamos el src si cambió el canal: si no, el video se
  // recargaría cada minuto y se cortaría
  if (!iframe || iframe.dataset.canal !== streamer.kick) {
    iframe?.remove();
    iframe = crear("iframe");
    iframe.src = urlPlayerKick(streamer.kick);
    iframe.dataset.canal = streamer.kick;
    iframe.title = `Directo de ${streamer.nombre} en Kick`;
    iframe.allow = "autoplay; fullscreen; picture-in-picture";
    iframe.loading = "lazy";
    contenedor.append(iframe);
  }

  // Datos debajo del reproductor
  $("stream-info").hidden = false;
  $("stream-info-nombre").textContent = streamer.nombre;
  $("stream-info-titulo").textContent = streamer.titulo || "Sin título";
  $("stream-info-detalle").textContent = [
    streamer.categoria,
    `${formatear(streamer.espectadores)} espectadores`,
    streamer.inicio ? `en vivo hace ${duracionDesde(streamer.inicio)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  $("stream-info-link").href = urlCanalKick(streamer.kick);
}

// ---------- Lista de streamers ----------

function mostrarListaStreamers(streamers) {
  const lista = $("stream-lista");
  lista.innerHTML = "";

  streamers.forEach((s) => {
    const item = crear("li", `streamer streamer--${s.estado}`);
    if (s.kick === canalEnReproductor) item.classList.add("streamer--elegido");

    // Avatar: foto de Kick o la inicial
    const avatar = crear("span", "streamer__avatar", s.nombre.charAt(0).toUpperCase());
    // Solo https: la URL viene de la API de Kick
    if (s.avatar && s.avatar.startsWith("https://")) {
      const img = crear("img");
      img.src = s.avatar;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", () => img.remove());
      avatar.append(img);
    }

    const info = crear("div", "streamer__info");
    const textoEstado = { vivo: "EN VIVO", offline: "Offline", desconocido: "Sin datos" }[s.estado];
    const cabecera = crear("div", "streamer__cabecera");
    cabecera.append(crear("strong", "", s.nombre), crear("span", "streamer__estado", textoEstado));
    info.append(cabecera, crear("span", "streamer__detalle", s.estado === "vivo" ? s.titulo || s.categoria : s.rol));

    item.append(avatar, info);

    if (s.estado === "vivo") {
      // Botón para ver este directo en el reproductor
      const boton = crear("button", "streamer__ver", s.kick === canalEnReproductor ? "Viendo" : "Ver");
      boton.type = "button";
      boton.setAttribute("aria-label", `Ver el directo de ${s.nombre}`);
      boton.addEventListener("click", () => {
        canalEnReproductor = s.kick;
        eleccionManual = true;
        mostrarReproductor(s);
        mostrarListaStreamers(streamers);
        $("stream-player").scrollIntoView({ block: "center" });
      });
      item.append(boton);
    } else {
      const link = crear("a", "streamer__canal", "Canal");
      link.href = urlCanalKick(s.kick);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Canal de ${s.nombre} en Kick`);
      item.append(link);
    }
    lista.append(item);
  });
}

// ---------- Avisos en el menú y en el hero ----------

function mostrarAvisosEnVivo(enVivo) {
  $("nav-vivo").hidden = enVivo.length === 0;
  const chip = $("hero-vivo");
  chip.hidden = enVivo.length === 0;
  if (enVivo.length > 0) {
    $("hero-vivo-texto").textContent =
      enVivo.length === 1 ? `${enVivo[0].nombre} está en vivo` : `${enVivo.length} mods en vivo`;
  }
}

cargarStreams();
setInterval(cargarStreams, 60_000);
