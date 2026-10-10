// =============================================================
//  CONFIGURACIÓN DEL SERVIDOR
//  Este es el único archivo que necesitás editar para adaptar
//  la página a tu servidor de Discord.
// =============================================================

const CONFIG = {
  // Nombre que se muestra si la API de Discord no responde.
  nombre: "BROSSS",

  // Descripción corta para el hero.
  descripcion:
    "Comunidad gamer para jugar CS2, Minecraft y League of Legends con amigos. Canales de voz siempre activos y buena onda.",

  // Código de invitación: lo que va después de "discord.gg/".
  // Ej: si tu link es https://discord.gg/abc123 → "abc123".
  // Tiene que ser una invitación que NO expire.
  codigoInvitacion: "th8xGPTBDX",

  // ID del servidor (opcional). Sirve para mostrar la lista de
  // conectados. Requiere activar el widget:
  // Ajustes del servidor → Widget → "Habilitar widget del servidor".
  // Para copiar el ID: activá el Modo desarrollador en Discord,
  // clic derecho sobre el servidor → "Copiar ID del servidor".
  // El de BROSSS es 748980597535539325: pegalo acá cuando actives el widget.
  idServidor: "",

  // Cada cuántos segundos se vuelven a pedir las estadísticas.
  refrescoSegundos: 60,

  // Datos de ejemplo que se usan si todavía no cargaste el
  // código de invitación o si la API falla.
  // (son los valores reales al 26/09/2026)
  statsDeEjemplo: {
    miembros: 146,
    conectados: 20,
    boosts: 2,
    nivel: 1,
  },

  // Juegos del servidor. "idApp" es el ID de la aplicación en Discord:
  // con él la API de invitación informa qué tan activo está cada juego.
  juegos: [
    { nombre: "Counter-Strike 2", idApp: "1158877933042143272", imagen: "img/cs2.png" },
    { nombre: "Minecraft", idApp: "1402418491272986635", imagen: "img/minecraft.png" },
    { nombre: "League of Legends", idApp: "1402418696126992445", imagen: "img/lol.png" },
  ],

  // Solo lo más importante: las reglas completas están en el servidor.
  reglas: [
    { titulo: "Respeto con todos", texto: "No seas irrespetuoso con NADIE y sé amistoso con todos. Cualquier comportamiento fuera de lugar no se permite." },
    { titulo: "Sin spam", texto: "No spammees en los chats." },
    { titulo: "Nada de contenido +18", texto: "Prohibido publicar contenido pornográfico." },
    { titulo: "Links seguros", texto: "No mandes links ni archivos que puedan dañar los dispositivos de los pibes." },
    { titulo: "Cada cosa en su canal", texto: "Música solo en comandos, memes en memes, pelis en películas y el resto en general." },
    { titulo: "¿Problemas? Al staff", texto: "Si alguien rompe una regla grave, avisale al staff por privado. A los admins escribiles solo por temas del servidor." },
  ],

  faq: [
    { pregunta: "¿Cómo consigo roles?", respuesta: "Los roles se asignan por actividad en el Discord: participá en los chats y en los canales de voz." },
    { pregunta: "¿Cómo reporto a alguien?", respuesta: "Mandale un mensaje privado a cualquier miembro del staff con capturas de lo que pasó." },
    { pregunta: "¿Puedo postularme para staff?", respuesta: "Sí. Cuando abrimos postulaciones lo anunciamos en #anuncios con un formulario." },
    { pregunta: "¿Hay eventos?", respuesta: "Todos los sábados hacemos torneos o noches de juegos. Mirá #eventos para el cronograma." },
  ],

  //  - nombre:  cómo aparece en el servidor.
  //  - usuario: nombre de usuario de Discord, sin @ (se muestra como @usuario).
  //  - color:   cualquier color CSS; se usa para el borde del avatar y la etiqueta del rol.
  //  - avatar:  foto cuadrada en img/staff/ (256×256, .webp), o "" para la inicial.
  // Se arma una fila por rol, en este orden: owners arriba y mods abajo.
  staff: [
    { nombre: "Joacooo", usuario: "joacooow", rol: "Owner", color: "#22e36b", avatar: "img/staff/joacooow.webp" },
    { nombre: "1lil_dober", usuario: "matteeooo__", rol: "Owner", color: "#22e36b", avatar: "img/staff/matteeooo__.webp" },
    { nombre: "Lazza", usuario: "lazzaaa4", rol: "Mod", color: "#5c9dff", avatar: "img/staff/lazzaaa4.webp" },
    { nombre: "Lucho", usuario: "falsedarjiji_17799", rol: "Mod", color: "#5c9dff", avatar: "img/staff/falsedarjiji_17799.webp" },
    { nombre: "oyK*", usuario: "1kyoo", rol: "Mod", color: "#5c9dff", avatar: "img/staff/1kyoo.webp" },
  ],

  // ---------- Stream (Kick) ----------
  // Canales de Kick de los mods. "kick" es lo que va después de
  // kick.com/ en el link del canal. Ej: kick.com/joacooo → "joacooo".
  // Cada minuto se consulta quién está en vivo. Si hay alguien, se ve
  // el directo en la página (el que tenga más espectadores primero).
  // Mientras la lista esté vacía, la sección Stream no se muestra.
  streamers: [
    { nombre: "Joacooo", rol: "Owner", kick: "joacooow" },
    { nombre: "iBranDou", rol: "Streamer", kick: "ibrandou" },
    { nombre: "Kyo", rol: "Moderador", kick: "ikyooo" },
    { nombre: "ELAYAS", rol: "Streamer", kick: "elayas-00" },
  ],

  // ---------- Clips de TikTok ----------
  // Pegá el link COMPLETO de cada video (abrilo en la compu y copiá la
  // URL). Los links cortos tipo vm.tiktok.com no sirven.
  // "titulo" es opcional: es el texto que se ve antes de reproducir.
  // "portada" es opcional: imagen de vista previa guardada en img/clips/
  // (vertical 9:16, .webp). Sin portada se ve un fondo de colores.
  // Pueden ser clips de cualquier cuenta: en cada tarjeta se ve de quién es.
  // Se muestran en un carrusel y el PRIMERO arranca en el medio (el destacado).
  // "usuario" es la cuenta oficial: la del botón "Ver más en TikTok".
  tiktok: {
    usuario: "brosss.clips",
    clips: [
      { url: "https://www.tiktok.com/@brosss.clips/video/7461024379594345733", titulo: "Se desubicó", portada: "img/clips/7461024379594345733.webp" },
      // De @awaken_brosss, de más a menos visto
      { url: "https://www.tiktok.com/@awaken_brosss/video/7622815767372860693", titulo: "El grito" },
      { url: "https://www.tiktok.com/@awaken_brosss/video/7646523199303224577", titulo: "El sabio espera" },
      { url: "https://www.tiktok.com/@awaken_brosss/video/7627003985282501908", titulo: "Humos chidos", portada: "img/clips/7627003985282501908.webp" },
      { url: "https://www.tiktok.com/@awaken_brosss/video/7646469761756318992", titulo: "Lo di todo" },
      { url: "https://www.tiktok.com/@awaken_brosss/video/7649191563439967504", titulo: "¿Elias?", portada: "img/clips/7649191563439967504.webp" },
      { url: "https://www.tiktok.com/@awaken_brosss/video/7645116848089910545", titulo: "Se re janea el gordo" },
    ],
  },
};

// Solo para los tests con Node (en el navegador se ignora)
if (typeof module !== "undefined") module.exports = CONFIG;
