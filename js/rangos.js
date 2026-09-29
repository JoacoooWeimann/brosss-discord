// =============================================================
//  RANGOS.JS
//  Sección "Rangos CS2": tabla del ranking con buscador y filtro.
//  Los datos los arma la función /api/rangos (Steam + Leetify +
//  FACEIT) a partir de los links de CONFIG.cs2.jugadores, y se
//  vuelven a pedir solos cada 15 minutos.
// =============================================================

// La función guarda su respuesta 30 minutos en la CDN de Netlify.
// Pidiendo cada 15, la tabla nunca queda más de ~45 minutos atrasada.
const REFRESCO_RANGOS_MS = 15 * 60_000;

// Ranking actual (ordenado y con posición). Cada actualización lo reemplaza.
let ranking = [];
// Fecha de los datos que se están mostrando
let rangosActualizados = null;

async function pedirRangos() {
  try {
    const res = await fetch(URL_API_RANGOS);
    if (!res.ok) throw new Error("respondió " + res.status);
    const datos = await res.json();
    if (!Array.isArray(datos?.jugadores)) throw new Error("respuesta inválida");
    return datos;
  } catch (error) {
    console.warn("Rangos:", error.message);
    return null;
  }
}

async function actualizarRangos() {
  const datos = await pedirRangos();

  if (datos) {
    rangosActualizados = new Date(datos.actualizado);
    mostrarRanking(datos.jugadores);
  }
  // Si falla, dejamos lo último que se mostró (si había) y avisamos
  $("rangos-aviso").hidden = Boolean(datos);
  mostrarFecha();
  if (!datos && ranking.length === 0) $("rangos-contenido").hidden = true;
}

function mostrarFecha() {
  const valida = rangosActualizados && !isNaN(rangosActualizados);
  $("rangos-actualizado").textContent = valida ? `actualizado ${hace(rangosActualizados)}` : "sin datos por ahora";
}

function mostrarRanking(jugadores) {
  // La posición es la del ranking completo, así no cambia cuando filtrás
  ranking = ordenarPorRating(jugadores).map((j, i) => ({ ...j, posicion: i + 1 }));

  $("rangos-contenido").hidden = ranking.length === 0;
  $("rangos-vacio-total").hidden = ranking.length > 0;
  $("rangos-leetify").hidden = ranking.every(tienePremier);
  aplicarFiltros();
}

// ---------- Piezas reutilizables ----------

// Color del rango, o gris apagado si no tiene rating
const colorDe = (jugador) => (tienePremier(jugador) ? rangoPremier(jugador.premier).color : "var(--texto-suave)");

// Avatar: imagen si hay, si no la inicial. El borde toma el color del rango.
function crearAvatar(jugador, clase) {
  const avatar = crear("span", clase);
  avatar.style.setProperty("--color-rango", colorDe(jugador));
  avatar.textContent = jugador.nombre.charAt(0).toUpperCase();

  // Solo https: la URL viene de una API externa
  if (jugador.avatar && jugador.avatar.startsWith("https://")) {
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
  if (!Number.isFinite(rating)) {
    const vacio = crear("span", "sin-dato", "—");
    vacio.title = "Sin CS Rating en Leetify";
    return vacio;
  }
  const rango = rangoPremier(rating);
  const insignia = crear("span", "premier", formatearRating(rating));
  insignia.style.setProperty("--color-rango", rango.color);
  insignia.title = `Rango ${rango.nombre}`;
  return insignia;
}

function crearInsigniaFaceit({ faceit: nivel, faceitElo, faceitUrl }) {
  if (!nivel) return crear("span", "sin-dato", "—");
  // Con link al perfil, si lo sabemos (solo de faceit.com)
  const conLink = typeof faceitUrl === "string" && faceitUrl.startsWith("https://www.faceit.com/");
  const insignia = crear(conLink ? "a" : "span", "faceit", nivel);
  if (conLink) {
    insignia.href = faceitUrl;
    insignia.target = "_blank";
    insignia.rel = "noopener noreferrer";
  }
  insignia.style.setProperty("--color-faceit", colorFaceit(nivel));
  insignia.title = faceitElo ? `FACEIT nivel ${nivel} · ${formatear(faceitElo)} ELO` : `FACEIT nivel ${nivel}`;
  return insignia;
}

// ---------- Tabla y filtros ----------

// Se llama una sola vez: las opciones y los eventos no se duplican
// aunque la tabla se actualice
function iniciarFiltros() {
  const selector = $("rangos-filtro");
  RANGOS_PREMIER.forEach((r) => {
    const opcion = crear("option", "", r.nombre);
    opcion.value = r.nombre;
    selector.append(opcion);
  });
  $("rangos-buscar").addEventListener("input", aplicarFiltros);
  selector.addEventListener("change", aplicarFiltros);
}

// Redibuja la tabla respetando lo que haya escrito o elegido la persona
function aplicarFiltros() {
  mostrarTabla(filtrarJugadores(ranking, { texto: $("rangos-buscar").value, rango: $("rangos-filtro").value }));
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
    celdaFaceit.append(crearInsigniaFaceit(j));

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

iniciarFiltros();
actualizarRangos();
setInterval(actualizarRangos, REFRESCO_RANGOS_MS);
// El "actualizado hace X minutos" se mantiene al día entre actualizaciones
setInterval(mostrarFecha, 60_000);
