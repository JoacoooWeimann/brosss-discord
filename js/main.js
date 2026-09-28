// =============================================================
//  MAIN.JS
//  1. Carga los textos y listas desde CONFIG (config.js)
//  2. Pide las estadísticas a la API pública de Discord
//  3. Animaciones: contadores, scroll y menú de celular
//  (los efectos visuales "extra" están en efectos.js)
// =============================================================

// ---------- Helpers ----------
// ($, crear, formatear, hace, etc. están en utilidades.js)

// Anima un número desde su valor actual hasta "destino".
function animarNumero(el, destino, duracion = 1500) {
  if (destino === null) {
    el.textContent = "—";
    return;
  }
  const inicio = Number(el.dataset.valor) || 0;
  const t0 = performance.now();

  function paso(ahora) {
    const progreso = Math.min((ahora - t0) / duracion, 1);
    // "ease-out": arranca rápido y frena al final
    const suave = 1 - Math.pow(1 - progreso, 3);
    el.textContent = formatear(Math.round(inicio + (destino - inicio) * suave));
    if (progreso < 1) requestAnimationFrame(paso);
  }

  el.dataset.valor = destino;
  requestAnimationFrame(paso);
}

// ---------- 1. Contenido desde CONFIG ----------

function cargarContenido() {
  document.querySelectorAll("[data-nombre]").forEach((el) => (el.textContent = CONFIG.nombre));
  $("hero-desc").textContent = CONFIG.descripcion;
  $("anio").textContent = new Date().getFullYear();

  if (CONFIG.codigoInvitacion) {
    ponerLinkInvitacion("https://discord.gg/" + CONFIG.codigoInvitacion);
  }

  // Reglas
  CONFIG.reglas.forEach((regla) => {
    const li = crear("li", "revelar");
    li.append(crear("h3", "", regla.titulo), crear("p", "", regla.texto));
    $("reglas-lista").append(li);
  });

  // Staff
  CONFIG.staff.forEach((persona) => {
    const tarjeta = crear("article", "miembro revelar");
    // Variable CSS que usan el borde del avatar y la etiqueta
    tarjeta.style.setProperty("--color-rol", persona.color);

    const avatar = crear("div", "miembro__avatar");
    if (persona.avatar) {
      const img = crear("img");
      img.src = persona.avatar;
      img.alt = persona.nombre;
      avatar.append(img);
    } else {
      // Sin foto: mostramos la inicial
      avatar.textContent = persona.nombre.charAt(0).toUpperCase();
    }

    tarjeta.append(avatar, crear("h3", "", persona.nombre), crear("span", "etiqueta", persona.rol));
    $("staff-lista").append(tarjeta);
  });

  // FAQ: <details> + <summary> ya funcionan como acordeón sin JS
  CONFIG.faq.forEach((item) => {
    const details = crear("details", "revelar");
    details.append(crear("summary", "", item.pregunta), crear("p", "", item.respuesta));
    $("faq-lista").append(details);
  });
}

function ponerLinkInvitacion(url) {
  document.querySelectorAll("[data-invitacion]").forEach((a) => (a.href = url));
}

// ---------- 2. Estadísticas desde Discord ----------

// API de invitaciones: da total de miembros, conectados y boosts.
// Es pública, no necesita token.
async function pedirInvitacion() {
  const url = `${ORIGENES.api.discord}/api/v10/invites/${CONFIG.codigoInvitacion}?with_counts=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Invitación inválida o vencida (" + res.status + ")");
  return res.json();
}

// API del widget: da la lista de conectados.
// Solo funciona si el widget está habilitado en el servidor.
async function pedirWidget() {
  const url = `${ORIGENES.api.discord}/api/guilds/${CONFIG.idServidor}/widget.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Widget desactivado (" + res.status + ")");
  return res.json();
}

// ---------- Caché en localStorage ----------
// Guardamos los últimos datos para mostrarlos al instante la próxima
// vez que alguien entre (antes de que responda Discord).
// Va con try/catch porque en modo incógnito localStorage puede fallar.

const CLAVE_CACHE = "brosss-stats";

function leerCache() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CACHE));
  } catch {
    return null;
  }
}

function guardarCache(datos) {
  try {
    localStorage.setItem(CLAVE_CACHE, JSON.stringify(datos));
  } catch {
    // Si no se puede guardar, no pasa nada: la página funciona igual
  }
}

// ---------- Estado de los datos ----------
// "vivo" = recién llegados de Discord, "cache" = guardados de otra visita,
// "ejemplo" = los de config.js
let modoDatos = "cargando";
let ultimaActualizacion = null;

// Se llama cada segundo para que el "hace X" avance solo
function actualizarTextoFuente() {
  const textos = {
    cargando: "Cargando datos…",
    vivo: `En vivo desde Discord · actualizado ${hace(ultimaActualizacion)}`,
    cache: `Últimos datos guardados (${hace(ultimaActualizacion)}) · buscando datos nuevos…`,
    ejemplo: "Datos de ejemplo · cargá tu código de invitación en js/config.js",
  };
  $("stats-fuente").textContent = textos[modoDatos];
  $("stats-fuente").classList.toggle("en-vivo", modoDatos === "vivo");
}

// ---------- Antigüedad del servidor ----------
// fechaDeCreacion() (en utilidades.js) saca la fecha del ID del servidor

function mostrarAntiguedad(idServidor) {
  if (!idServidor) return;
  const fecha = fechaDeCreacion(idServidor);
  const texto = fecha.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const chip = $("hero-antiguedad");
  $("hero-antiguedad-texto").textContent = `Desde ${texto}`;
  chip.title = "Creado el " + fecha.toLocaleDateString("es-AR");
  chip.hidden = false;
}

// ---------- Pedido de datos ----------

// Muestra un "paquete" de datos, venga de Discord, del caché o de ejemplo
function mostrarTodo({ stats, juegos, idServidor }) {
  mostrarStats(stats);
  mostrarJuegos(juegos ?? {});
  mostrarAntiguedad(idServidor);
}

async function cargarStats() {
  const stats = { miembros: null, conectados: null, boosts: null, nivel: null };
  let juegos = {};
  let idServidor = CONFIG.idServidor || null;
  let widget = null;

  // Pedimos las dos APIs a la vez. allSettled no corta si una falla.
  const [invitacion, widgetRes] = await Promise.allSettled([
    CONFIG.codigoInvitacion ? pedirInvitacion() : Promise.reject(new Error("sin código")),
    CONFIG.idServidor ? pedirWidget() : Promise.reject(new Error("sin ID")),
  ]);

  if (invitacion.status === "fulfilled") {
    const datos = invitacion.value;
    stats.miembros = datos.approximate_member_count;
    stats.conectados = datos.approximate_presence_count;
    stats.boosts = datos.guild.premium_subscription_count ?? null;
    stats.nivel = datos.guild.premium_tier ?? null;
    // "profile.game_activity" dice qué tan activo está cada juego
    juegos = datos.profile?.game_activity ?? {};
    idServidor = datos.guild.id;
    if (datos.guild.name) {
      document.querySelectorAll("[data-nombre]").forEach((el) => (el.textContent = datos.guild.name));
    }
  } else if (CONFIG.codigoInvitacion) {
    console.warn("API de invitación:", invitacion.reason.message);
  }

  if (widgetRes.status === "fulfilled") {
    widget = widgetRes.value;
    stats.conectados ??= widget.presence_count;
    // Si no cargaste código de invitación, usamos el del widget
    if (!CONFIG.codigoInvitacion && widget.instant_invite) ponerLinkInvitacion(widget.instant_invite);
  } else if (CONFIG.idServidor) {
    console.warn("API del widget:", widgetRes.reason.message);
  }

  const enVivo = invitacion.status === "fulfilled" || widgetRes.status === "fulfilled";

  if (enVivo) {
    const paquete = { stats, juegos, idServidor, fecha: Date.now() };
    mostrarTodo(paquete);
    guardarCache(paquete);
    modoDatos = "vivo";
    ultimaActualizacion = paquete.fecha;
  } else if (modoDatos !== "vivo" && modoDatos !== "cache") {
    // Discord no respondió: plan B (caché) o plan C (datos de ejemplo)
    const cache = leerCache();
    if (cache) {
      mostrarTodo(cache);
      modoDatos = "cache";
      ultimaActualizacion = cache.fecha;
    } else {
      mostrarTodo({ stats: CONFIG.statsDeEjemplo, juegos: {}, idServidor });
      modoDatos = "ejemplo";
    }
  }
  // Si ya había datos y falla una actualización, dejamos los que están

  mostrarConectados(widget);
  actualizarTextoFuente();
}

function mostrarStats(stats) {
  animarNumero($("stat-miembros"), stats.miembros);
  animarNumero($("stat-conectados"), stats.conectados);
  animarNumero($("stat-boosts"), stats.boosts);
  animarNumero($("stat-nivel"), stats.nivel);

  const conectados = stats.conectados !== null ? formatear(stats.conectados) : "—";
  const miembros = stats.miembros !== null ? formatear(stats.miembros) : "—";
  $("hero-conectados").textContent = conectados;
  $("inv-conectados").textContent = conectados;
  $("inv-miembros").textContent = miembros;
  if (stats.miembros !== null) $("cta-miembros").textContent = miembros;

  // Barra de actividad: % de miembros conectados
  if (stats.miembros && stats.conectados !== null) {
    const porcentaje = Math.round((stats.conectados / stats.miembros) * 100);
    $("actividad-porcentaje").textContent = porcentaje + "% conectado";
    $("actividad-relleno").style.width = porcentaje + "%";
  }
}

// Nombres para los niveles de actividad que devuelve Discord
const NIVELES_ACTIVIDAD = ["Poca actividad", "Activo", "Muy activo", "En llamas 🔥"];

function mostrarJuegos(actividad) {
  const contenedor = $("juegos-lista");
  const primeraVez = contenedor.children.length === 0;
  contenedor.innerHTML = "";

  CONFIG.juegos.forEach((juego) => {
    // Si Discord no informa el juego, queda en 0
    const { activity_level = 0, activity_score = 0 } = actividad[juego.idApp] ?? {};

    const tarjeta = crear("article", "juego revelar" + (primeraVez ? "" : " visible"));
    const img = crear("img");
    img.src = juego.imagen;
    img.alt = "";

    const info = crear("div", "juego__info");
    const barra = crear("div", "actividad__barra");
    const relleno = crear("div", "actividad__relleno");
    barra.append(relleno);
    info.append(
      crear("h3", "", juego.nombre),
      crear("span", "juego__nivel", NIVELES_ACTIVIDAD[activity_level] ?? NIVELES_ACTIVIDAD[3]),
      barra
    );

    tarjeta.append(img, info);
    contenedor.append(tarjeta);

    // Esperamos un cuadro para que la transición de ancho se vea
    requestAnimationFrame(() => (relleno.style.width = Math.min(activity_score, 100) + "%"));
    if (primeraVez) observador.observe(tarjeta);
  });
}

function mostrarConectados(widget) {
  if (!widget || widget.members.length === 0) return;

  const lista = $("conectados-lista");
  lista.innerHTML = "";
  const MAXIMO = 24;

  widget.members.slice(0, MAXIMO).forEach((m) => {
    const li = crear("li");
    const img = crear("img");
    img.src = m.avatar_url;
    img.alt = "";
    img.loading = "lazy";
    li.append(img, crear("span", "", m.username));
    lista.append(li);
  });

  const resto = widget.members.length - MAXIMO;
  if (resto > 0) lista.append(crear("li", "mas", `+${resto} más`));

  $("conectados").hidden = false;
}

// ---------- 3. Interacción ----------

// Menú hamburguesa en celular
function iniciarMenu() {
  const nav = document.querySelector(".nav");
  const boton = document.querySelector(".nav__toggle");

  boton.addEventListener("click", () => {
    const abierto = nav.classList.toggle("abierto");
    boton.setAttribute("aria-expanded", abierto);
  });

  // Al tocar un link, se cierra el menú
  document.querySelectorAll(".nav__links a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("abierto");
      boton.setAttribute("aria-expanded", false);
    })
  );
}

// Aparición de elementos al hacer scroll. IntersectionObserver avisa
// cuando un elemento entra en pantalla (sin escuchar el evento scroll).
// Está afuera de la función porque mostrarJuegos() también lo usa.
const observador = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("visible");
        observador.unobserve(entrada.target); // solo una vez
      }
    });
  },
  { threshold: 0.15 }
);

function iniciarRevelado() {
  document.querySelectorAll(".stat, .seccion__titulo").forEach((el) => el.classList.add("revelar"));
  document.querySelectorAll(".revelar").forEach((el) => observador.observe(el));
}

// ---------- Arranque ----------

cargarContenido();
iniciarMenu();
iniciarRevelado();

// Si hay datos de una visita anterior, los mostramos ya mismo
const cacheInicial = leerCache();
if (cacheInicial) {
  mostrarTodo(cacheInicial);
  modoDatos = "cache";
  ultimaActualizacion = cacheInicial.fecha;
}
actualizarTextoFuente();

cargarStats();
setInterval(cargarStats, CONFIG.refrescoSegundos * 1000);
setInterval(() => ultimaActualizacion && actualizarTextoFuente(), 1000);
