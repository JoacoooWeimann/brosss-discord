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
    { pregunta: "¿Cómo consigo roles?", respuesta: "En el canal #roles reaccionás con el emoji del juego o tema que te interese y el bot te asigna el rol." },
    { pregunta: "¿Cómo reporto a alguien?", respuesta: "Mandale un mensaje privado a cualquier miembro del staff con capturas de lo que pasó." },
    { pregunta: "¿Puedo postularme para staff?", respuesta: "Sí. Cuando abrimos postulaciones lo anunciamos en #anuncios con un formulario." },
    { pregunta: "¿Hay eventos?", respuesta: "Todos los viernes hacemos torneos o noches de juegos. Mirá #eventos para el cronograma." },
  ],

  //  - usuario: nombre de usuario de Discord, sin @ (se muestra como @usuario).
  //  - color:   cualquier color CSS; se usa para el borde del avatar y la etiqueta del rol.
  //  - avatar:  foto guardada en img/staff/ (ej: "img/staff/joacooo.png"), o "" para la inicial.
  staff: [
    { nombre: "Joacooo", usuario: "", rol: "Owner", color: "#22e36b", avatar: "" },
    { nombre: "lil dober", usuario: "", rol: "Owner", color: "#22e36b", avatar: "" },
    { nombre: "Lazza", usuario: "", rol: "Mod", color: "#5c9dff", avatar: "" },
    { nombre: "Lucho", usuario: "", rol: "Mod", color: "#5c9dff", avatar: "" },
    { nombre: "Kyo", usuario: "", rol: "Mod", color: "#5c9dff", avatar: "" },
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
    { nombre: "Kyo", rol: "Moderador", kick: "ikyooo" },
  ],

  // ---------- Clips de TikTok ----------
  // Pegá el link COMPLETO de cada video (abrilo en la compu y copiá la
  // URL). Los links cortos tipo vm.tiktok.com no sirven.
  // "titulo" es opcional: es el texto que se ve antes de reproducir.
  // Pueden ser clips de cualquier cuenta: en cada tarjeta se ve de quién es.
  // "usuario" es la cuenta oficial: la del botón "Ver más en TikTok".
  tiktok: {
    usuario: "brosss.clips",
    clips: [
      { url: "https://www.tiktok.com/@brosss.clips/video/7461024379594345733", titulo: "Se desubicó" },
      // El más visto de @awaken_brosss
      { url: "https://www.tiktok.com/@awaken_brosss/video/7622815767372860693", titulo: "El grito" },
    ],
  },

  // ---------- Rangos de CS2 ----------
  // Solo cargás el nombre y el link de Steam de cada jugador. El resto
  // lo trae solo la función netlify/functions/rangos.mjs:
  //  - Steam:   avatar (el perfil tiene que ser público).
  //  - Leetify: CS Rating de Premier. El jugador tiene que haber entrado
  //             una vez a leetify.com con su Steam; si no, sale "—".
  //  - FACEIT:  nivel y ELO (con FACEIT_API_KEY en Netlify; sin la clave
  //             se usa el nivel que informa Leetify).
  //
  //  - nombre:  cómo se lo conoce en el Discord (se muestra este, no el de Steam).
  //  - steam:   link al perfil: .../profiles/7656... o .../id/nombre
  //  - premier / faceit (opcionales): valores a mano que se usan solo
  //    si las APIs no los tienen. Ej: premier: 15300, faceit: 6
  cs2: {
    jugadores: [
      { nombre: "Joaco", steam: "https://steamcommunity.com/profiles/76561198860991191" },
      { nombre: "Kyo", steam: "https://steamcommunity.com/profiles/76561199100973080" },
      { nombre: "Lucho", steam: "https://steamcommunity.com/id/DJLucheo" },
      { nombre: "iBranDou", steam: "https://steamcommunity.com/profiles/76561198856536439" },
      { nombre: "Valen", steam: "https://steamcommunity.com/id/Valeeng" },
    ],
  },
};

// Solo para los tests con Node (en el navegador se ignora)
if (typeof module !== "undefined") module.exports = CONFIG;
