// =============================================================
//  RANGOS.JS
//  Sección "Rangos CS2": resumen, podio, gráfico de distribución
//  y tabla con buscador. Los datos salen de CONFIG.cs2 (config.js)
//  y las cuentas de utilidades.js.
// =============================================================

function iniciarRangos() {
  const { jugadores, actualizado, datosDeEjemplo } = CONFIG.cs2;
  // Ordenamos una vez. La posición de cada jugador es la del ranking
  // completo, así no cambia cuando filtrás.
  const ranking = ordenarPorRating(jugadores).map((j, i) => ({ ...j, posicion: i + 1 }));

  // "T00:00" para que tome la fecha en hora local y no en UTC (si no,
  // en Argentina "2026-09-26" se mostraría como el 25)
  const fecha = new Date(actualizado + "T00:00");
  $("rangos-actualizado").textContent = fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  $("rangos-aviso").hidden = !datosDeEjemplo;

  if (ranking.length === 0) {
    $("rangos-contenido").hidden = true;
    $("rangos-vacio-total").hidden = false;
    return;
  }

  mostrarResumen(ranking);
  mostrarPodio(ranking.slice(0, 3));
  mostrarDistribucion(ranking);
  iniciarFiltros(ranking);
  mostrarTabla(ranking);
}

// ---------- Resumen ----------

function mostrarResumen(ranking) {
  const promedio = Math.round(ranking.reduce((suma, j) => suma + j.premier, 0) / ranking.length);
  $("rangos-total").textContent = ranking.length;
  $("rangos-promedio").textContent = formatearRating(promedio);
  $("rangos-promedio-rango").style.setProperty("--color-rango", rangoPremier(promedio).color);
  $("rangos-promedio-nombre").textContent = `Rango ${rangoPremier(promedio).nombre}`;
  $("rangos-mejor").textContent = formatearRating(ranking[0].premier);
  $("rangos-mejor-nombre").textContent = ranking[0].nombre;
}

// ---------- Piezas reutilizables ----------

// Avatar: imagen si hay, si no la inicial. El borde toma el color del rango.
function crearAvatar(jugador, clase) {
  const avatar = crear("span", clase);
  avatar.style.setProperty("--color-rango", rangoPremier(jugador.premier).color);
  avatar.textContent = jugador.nombre.charAt(0).toUpperCase();

  if (jugador.avatar) {
    const img = crear("img");
    img.src = jugador.avatar;
    img.alt = "";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    // Si la imagen no carga, queda la inicial de fondo
    img.addEventListener("error", () => img.remove());
    avatar.append(img);
  }
  return avatar;
}

// Insignia de CS Rating con el color del rango, como en el juego
function crearInsigniaPremier(rating) {
  const rango = rangoPremier(rating);
  const insignia = crear("span", "premier", formatearRating(rating));
  insignia.style.setProperty("--color-rango", rango.color);
  insignia.title = `Rango ${rango.nombre}`;
  return insignia;
}

function crearInsigniaFaceit(nivel) {
  if (!nivel) return crear("span", "sin-dato", "—");
  const insignia = crear("span", "faceit", nivel);
  insignia.style.setProperty("--color-faceit", colorFaceit(nivel));
  insignia.title = `FACEIT nivel ${nivel}`;
  return insignia;
}

// ---------- Podio ----------

function mostrarPodio(top) {
  const contenedor = $("rangos-podio");
  const medallas = ["1°", "2°", "3°"];

  top.forEach((jugador, i) => {
    const puesto = crear("li", `podio__puesto podio__puesto--${i + 1} revelar`);
    puesto.append(
      crear("span", "podio__medalla", medallas[i]),
      crearAvatar(jugador, "avatar-rango avatar-rango--grande"),
      crear("strong", "podio__nombre", jugador.nombre),
      crearInsigniaPremier(jugador.premier)
    );
    contenedor.append(puesto);
    // Se crea después de iniciarRevelado(), así que lo registramos acá
    observador.observe(puesto);
  });
}

// ---------- Gráfico de distribución ----------
// Barras horizontales de un solo color (es una sola serie: cantidad de
// jugadores). El color del rango va en la muestrita al lado del nombre.

function mostrarDistribucion(ranking) {
  const lista = $("rangos-distribucion");
  const tooltip = $("rangos-tooltip");
  // De mayor a menor rango: se lee como una escalera
  const datos = distribucionPorRango(ranking).reverse();
  const maximo = Math.max(...datos.map((d) => d.cantidad), 1);

  datos.forEach((d) => {
    const porcentaje = Math.round((d.cantidad / ranking.length) * 100);
    const rangoTexto = d.hasta === Infinity ? `${formatearRating(d.desde)}+` : `${formatearRating(d.desde)}–${formatearRating(d.hasta)}`;
    const detalle = `${d.nombre} (${rangoTexto}): ${d.cantidad} ${d.cantidad === 1 ? "jugador" : "jugadores"} · ${porcentaje}%`;

    const fila = crear("li", "barra");
    fila.tabIndex = 0; // se puede enfocar con Tab para ver el tooltip
    fila.setAttribute("aria-label", detalle);

    const etiqueta = crear("span", "barra__etiqueta");
    const muestra = crear("span", "barra__muestra");
    muestra.style.setProperty("--color-rango", d.color);
    etiqueta.append(muestra, crear("span", "", d.nombre));

    const pista = crear("span", "barra__pista");
    const relleno = crear("span", "barra__relleno");
    relleno.dataset.ancho = (d.cantidad / maximo) * 100 + "%";
    // El valor va pegado a la punta de la barra
    pista.append(relleno, crear("span", "barra__valor", d.cantidad));

    fila.append(etiqueta, pista);
    lista.append(fila);

    const mostrar = () => {
      tooltip.textContent = detalle;
      tooltip.hidden = false;
      // Posicionamos el tooltip arriba de la fila, dentro del gráfico
      tooltip.style.top = fila.offsetTop - tooltip.offsetHeight - 6 + "px";
    };
    const ocultar = () => (tooltip.hidden = true);
    fila.addEventListener("pointerenter", mostrar);
    fila.addEventListener("focus", mostrar);
    fila.addEventListener("pointerleave", ocultar);
    fila.addEventListener("blur", ocultar);
  });

  // Las barras crecen cuando el gráfico aparece en pantalla
  new IntersectionObserver(([entrada], obs) => {
    if (!entrada.isIntersecting) return;
    lista.querySelectorAll(".barra__relleno").forEach((r) => (r.style.width = r.dataset.ancho));
    obs.disconnect();
  }).observe(lista);
}

// ---------- Tabla y filtros ----------

function iniciarFiltros(ranking) {
  const selector = $("rangos-filtro");
  RANGOS_PREMIER.forEach((r) => {
    const opcion = crear("option", "", r.nombre);
    opcion.value = r.nombre;
    selector.append(opcion);
  });

  const aplicar = () =>
    mostrarTabla(filtrarJugadores(ranking, { texto: $("rangos-buscar").value, rango: selector.value }));

  $("rangos-buscar").addEventListener("input", aplicar);
  selector.addEventListener("change", aplicar);
}

function mostrarTabla(jugadores) {
  const cuerpo = $("rangos-tabla");
  cuerpo.innerHTML = "";

  jugadores.forEach((j) => {
    const fila = crear("tr");

    const celdaJugador = crear("td");
    const jugador = crear("span", "tabla-jugador");
    jugador.append(crearAvatar(j, "avatar-rango"), crear("span", "", j.nombre));
    celdaJugador.append(jugador);

    const celdaPremier = crear("td");
    celdaPremier.append(crearInsigniaPremier(j.premier));

    const celdaFaceit = crear("td", "col-faceit");
    celdaFaceit.append(crearInsigniaFaceit(j.faceit));

    const celdaSteam = crear("td", "col-steam");
    // Solo aceptamos links https para evitar "javascript:..." en el href
    if (j.steam && j.steam.startsWith("https://")) {
      const link = crear("a", "link-steam", "Ver perfil");
      link.href = j.steam;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Perfil de Steam de ${j.nombre}`);
      celdaSteam.append(link);
    } else {
      celdaSteam.append(crear("span", "sin-dato", "—"));
    }

    fila.append(crear("td", "col-posicion", j.posicion), celdaJugador, celdaPremier, celdaFaceit, celdaSteam);
    cuerpo.append(fila);
  });

  $("rangos-vacio").hidden = jugadores.length > 0;
}

iniciarRangos();
