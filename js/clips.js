// =============================================================
//  CLIPS.JS
//  Sección "Clips": videos de TikTok cargados en config.js.
//
//  Cada reproductor de TikTok pesa bastante. En vez de cargar todos
//  al abrir la página, mostramos una tarjeta liviana y el video
//  recién se carga cuando alguien hace clic. Esta técnica se llama
//  "facade" (fachada).
// =============================================================

function iniciarClips() {
  const { usuario, clips } = CONFIG.tiktok;
  const perfil = $("clips-perfil");
  perfil.href = urlPerfilTiktok(usuario);
  $("clips-usuario").textContent = "@" + usuario;

  // Descartamos los links mal cargados (el test de config.js los avisa)
  const validos = clips.map((c) => ({ ...c, id: idDeTiktok(c.url) })).filter((c) => c.id);

  $("clips-vacio").hidden = validos.length > 0;
  if (validos.length === 0) return;

  const lista = $("clips-lista");
  validos.forEach((clip, i) => {
    const titulo = clip.titulo || `Clip ${i + 1}`;
    const item = crear("li", "clip revelar");

    const fachada = crear("button", "clip__fachada");
    fachada.type = "button";
    fachada.setAttribute("aria-label", `Reproducir clip: ${titulo}`);
    const play = crear("span", "clip__play");
    play.setAttribute("aria-hidden", "true");
    fachada.append(crear("span", "clip__marca", "TikTok"), play, crear("span", "clip__titulo", titulo));

    fachada.addEventListener("click", () => {
      const iframe = crear("iframe");
      iframe.src = urlPlayerTiktok(clip.id);
      iframe.title = titulo;
      iframe.allow = "autoplay; fullscreen; encrypted-media";
      fachada.replaceWith(iframe);
    });

    item.append(fachada);
    lista.append(item);
    observador.observe(item);
  });
}

iniciarClips();
