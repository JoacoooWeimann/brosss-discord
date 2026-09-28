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
  codigoInvitacion: "gSuRgnK5V",

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

  reglas: [
    { titulo: "Respeto ante todo", texto: "Nada de insultos, acoso, racismo ni discriminación de ningún tipo." },
    { titulo: "Sin spam", texto: "No floodees mensajes, emojis ni menciones. Tampoco publicidad de otros servidores sin permiso." },
    { titulo: "Cada cosa en su canal", texto: "Usá el canal que corresponde a cada tema. Los memes, en #memes." },
    { titulo: "Contenido apropiado", texto: "Prohibido el contenido NSFW, gore o ilegal fuera de canales habilitados." },
    { titulo: "Hacé caso al staff", texto: "Si un moderador te pide algo, respetalo. Si no estás de acuerdo, hablalo por privado." },
  ],

  faq: [
    { pregunta: "¿Cómo consigo roles?", respuesta: "En el canal #roles reaccionás con el emoji del juego o tema que te interese y el bot te asigna el rol." },
    { pregunta: "¿Cómo reporto a alguien?", respuesta: "Mandale un mensaje privado a cualquier miembro del staff con capturas de lo que pasó." },
    { pregunta: "¿Puedo postularme para staff?", respuesta: "Sí. Cuando abrimos postulaciones lo anunciamos en #anuncios con un formulario." },
    { pregunta: "¿Hay eventos?", respuesta: "Todos los viernes hacemos torneos o noches de juegos. Mirá #eventos para el cronograma." },
  ],

  // color: cualquier color CSS; se usa para el borde del avatar y la etiqueta del rol.
  staff: [
    { nombre: "Joaco", rol: "Fundador", color: "#22e36b", avatar: "" },
    { nombre: "Nico", rol: "Admin", color: "#ff5c5c", avatar: "" },
    { nombre: "Lu", rol: "Moderadora", color: "#5c9dff", avatar: "" },
    { nombre: "Tomi", rol: "Moderador", color: "#5c9dff", avatar: "" },
  ],

  // ---------- Stream (Kick) ----------
  // Canales de Kick de los mods. "kick" es lo que va después de
  // kick.com/ en el link del canal. Ej: kick.com/joacooo → "joacooo".
  // Cada minuto se consulta quién está en vivo. Si hay alguien, se ve
  // el directo en la página (el que tenga más espectadores primero).
  // Mientras la lista esté vacía, la sección Stream no se muestra.
  streamers: [
    { nombre: "Joacooo", rol: "Fundador", kick: "joacooow" },
    { nombre: "iBranDou", rol: "Moderador", kick: "ibrandou" },
  ],

  // ---------- Clips de TikTok ----------
  // Pegá el link COMPLETO de cada video (abrilo en la compu y copiá la
  // URL). Los links cortos tipo vm.tiktok.com no sirven.
  // "titulo" es opcional: es el texto que se ve antes de reproducir.
  tiktok: {
    usuario: "brosss",
    clips: [
      // { url: "https://www.tiktok.com/@brosss/video/7412345678901234567", titulo: "Ace con la Deagle" },
    ],
  },

  // ---------- Rangos de CS2 ----------
  // Se cargan a mano: Discord no sabe tu rango de CS2.
  //  - premier: CS Rating (0 a ~35000). Define el color del rango.
  //  - faceit:  nivel de FACEIT del 1 al 10, o null si no juega FACEIT.
  //  - steam:   link al perfil de Steam (opcional, "" si no tiene).
  //  - avatar:  URL de una imagen (opcional, "" muestra la inicial).
  cs2: {
    // Mientras esté en true, la sección muestra el aviso "Datos de ejemplo".
    // Cuando cargues los rangos reales, ponelo en false.
    datosDeEjemplo: true,
    // Fecha de la última vez que actualizaste los rangos (AAAA-MM-DD)
    actualizado: "2026-09-26",
    jugadores: [
      { nombre: "Joacooo", premier: 18450, faceit: 7, steam: "", avatar: "" },
      { nombre: "Nico", premier: 21300, faceit: 8, steam: "", avatar: "" },
      { nombre: "Lu", premier: 12780, faceit: 5, steam: "", avatar: "" },
      { nombre: "Tomi", premier: 25120, faceit: 9, steam: "", avatar: "" },
      { nombre: "Fede", premier: 9870, faceit: 4, steam: "", avatar: "" },
      { nombre: "Maxi", premier: 15600, faceit: 6, steam: "", avatar: "" },
      { nombre: "Santi", premier: 30250, faceit: 10, steam: "", avatar: "" },
      { nombre: "Agus", premier: 7430, faceit: 3, steam: "", avatar: "" },
      { nombre: "Rama", premier: 16900, faceit: null, steam: "", avatar: "" },
      { nombre: "Bauti", premier: 11200, faceit: 5, steam: "", avatar: "" },
      { nombre: "Gonza", premier: 19990, faceit: 7, steam: "", avatar: "" },
      { nombre: "Pipe", premier: 4200, faceit: 2, steam: "", avatar: "" },
    ],
  },
};

// Solo para los tests con Node (en el navegador se ignora)
if (typeof module !== "undefined") module.exports = CONFIG;
