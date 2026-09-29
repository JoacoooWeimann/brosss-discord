// =============================================================
//  EFECTOS.JS
//  Efectos visuales e interacción extra. Ninguno es necesario para
//  que la página funcione: si este archivo falla, los datos igual se ven.
//
//  1. Partículas del hero       5. Barra de progreso y menú activo
//  2. Texto que se escribe solo 6. Botón "volver arriba"
//  3. Luz que sigue al mouse    7. Copiar link + toast
//  4. Logo con inclinación 3D   8. Secreto 🎮
// =============================================================

// ¿La persona pidió menos animaciones en su sistema operativo?
const menosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- 1. Partículas del hero ----------
// Puntos que flotan y se unen con líneas cuando están cerca, como una
// red. Las que están cerca del mouse también se conectan con él.

function iniciarParticulas() {
  const canvas = $("particulas");
  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  const DISTANCIA = 120; // distancia máxima para dibujar una línea
  const mouse = { x: null, y: null };
  let puntos = [];
  let ancho, alto;
  let animando = false;

  function redimensionar() {
    // devicePixelRatio: en pantallas retina el canvas necesita más
    // píxeles reales para no verse borroso
    const dpr = window.devicePixelRatio || 1;
    ancho = hero.offsetWidth;
    alto = hero.offsetHeight;
    canvas.width = ancho * dpr;
    canvas.height = alto * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Cantidad de puntos según el tamaño de la pantalla (máx. 90)
    const cantidad = Math.min(Math.floor((ancho * alto) / 14000), 90);
    puntos = Array.from({ length: cantidad }, () => ({
      x: Math.random() * ancho,
      y: Math.random() * alto,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.8 + 0.6,
    }));
  }

  function linea(x1, y1, x2, y2, distancia) {
    // Cuanto más cerca, más visible la línea
    ctx.strokeStyle = `rgba(34, 227, 107, ${(1 - distancia / DISTANCIA) * 0.35})`;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function dibujar() {
    ctx.clearRect(0, 0, ancho, alto);

    puntos.forEach((p, i) => {
      // Mover y rebotar en los bordes
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > ancho) p.vx *= -1;
      if (p.y < 0 || p.y > alto) p.vy *= -1;

      ctx.fillStyle = "rgba(34, 227, 107, 0.8)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      // Comparamos solo con los puntos siguientes para no dibujar
      // cada línea dos veces
      for (let j = i + 1; j < puntos.length; j++) {
        const d = Math.hypot(p.x - puntos[j].x, p.y - puntos[j].y);
        if (d < DISTANCIA) linea(p.x, p.y, puntos[j].x, puntos[j].y, d);
      }

      if (mouse.x !== null) {
        const d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (d < DISTANCIA * 1.5) linea(p.x, p.y, mouse.x, mouse.y, d / 1.5);
      }
    });

    if (animando) requestAnimationFrame(dibujar);
  }

  function arrancar() {
    if (animando || menosMovimiento) return;
    animando = true;
    requestAnimationFrame(dibujar);
  }
  const frenar = () => (animando = false);

  hero.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  hero.addEventListener("pointerleave", () => (mouse.x = mouse.y = null));
  window.addEventListener("resize", () => {
    redimensionar();
    if (!animando) dibujar();
  });

  // Solo animamos cuando el hero está en pantalla: ahorra batería
  new IntersectionObserver(([entrada]) => (entrada.isIntersecting ? arrancar() : frenar())).observe(hero);

  redimensionar();
  dibujar(); // con menos movimiento queda un dibujo fijo
}

// ---------- 2. Texto que se escribe solo ----------

function iniciarTextoRotativo() {
  const el = $("texto-rotativo");
  const palabras = CONFIG.juegos.map((j) => j.nombre);

  if (menosMovimiento || palabras.length === 0) {
    el.textContent = palabras.join(", ");
    return;
  }

  let indice = 0;
  let letras = 0;
  let borrando = false;

  function paso() {
    const palabra = palabras[indice];
    letras += borrando ? -1 : 1;
    el.textContent = palabra.slice(0, letras);

    let espera = borrando ? 40 : 90;
    if (!borrando && letras === palabra.length) {
      borrando = true;
      espera = 1800; // pausa con la palabra completa
    } else if (borrando && letras === 0) {
      borrando = false;
      indice = (indice + 1) % palabras.length; // % vuelve a 0 al final
      espera = 300;
    }
    setTimeout(paso, espera);
  }
  paso();
}

// ---------- 3. Luz que sigue al mouse en las tarjetas ----------
// Un solo listener para toda la página ("delegación de eventos"):
// buscamos con closest() si el mouse está sobre una tarjeta.

function iniciarLuzTarjetas() {
  document.addEventListener("pointermove", (e) => {
    const tarjeta = e.target.closest(".stat, .juego, .miembro, .reglas li");
    if (!tarjeta) return;
    const rect = tarjeta.getBoundingClientRect();
    // El CSS usa --x y --y como centro del degradé
    tarjeta.style.setProperty("--x", e.clientX - rect.left + "px");
    tarjeta.style.setProperty("--y", e.clientY - rect.top + "px");
  });
}

// ---------- 4. Logo con inclinación 3D ----------

function iniciarLogo3D() {
  if (menosMovimiento) return;
  const logo = $("hero-logo");
  const hero = $("inicio");

  hero.addEventListener("pointermove", (e) => {
    // Posición del mouse de -0.5 a 0.5 respecto al centro de la pantalla
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    logo.style.transform = `perspective(600px) rotateY(${x * 25}deg) rotateX(${-y * 25}deg)`;
  });
  hero.addEventListener("pointerleave", () => (logo.style.transform = ""));
}

// ---------- 5 y 6. Barra de progreso, menú activo y "volver arriba" ----------

function iniciarScroll() {
  const barra = $("progreso");
  const arriba = $("arriba");
  let pendiente = false;

  // El evento scroll se dispara muchísimas veces por segundo. Con
  // requestAnimationFrame actualizamos como máximo una vez por cuadro.
  window.addEventListener("scroll", () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      barra.style.width = (window.scrollY / total) * 100 + "%";
      arriba.classList.toggle("visible", window.scrollY > 600);
      pendiente = false;
    });
  });

  arriba.addEventListener("click", () => window.scrollTo({ top: 0 }));

  // Resalta en el menú la sección que está en el medio de la pantalla
  const links = document.querySelectorAll(".nav__links a[href^='#']");
  const observadorMenu = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("activo", a.getAttribute("href") === "#" + entrada.target.id));
      });
    },
    // Solo cuenta la franja central de la pantalla
    { rootMargin: "-45% 0px -50% 0px" }
  );
  document.querySelectorAll("main section[id]").forEach((s) => observadorMenu.observe(s));
}

// ---------- 7. Copiar link y toast ----------

let temporizadorToast;

// Muestra un mensajito abajo de la pantalla que desaparece solo
function mostrarToast(mensaje) {
  const toast = $("toast");
  toast.textContent = mensaje;
  toast.classList.add("visible");
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => toast.classList.remove("visible"), 2500);
}

function iniciarCopiar() {
  $("copiar-link").addEventListener("click", async () => {
    const link = document.querySelector("[data-invitacion]").href;
    try {
      // La API del portapapeles solo funciona en https o localhost
      await navigator.clipboard.writeText(link);
      mostrarToast("✅ ¡Link copiado! Pasáselo a tus amigos");
    } catch {
      mostrarToast("No se pudo copiar. El link es: " + link);
    }
  });
}

// ---------- 8. Secreto: código Konami ----------
// ↑ ↑ ↓ ↓ ← → ← → B A  →  lluvia de confeti verde

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

function iniciarSecreto() {
  let progreso = 0;
  document.addEventListener("keydown", (e) => {
    const tecla = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    // Si la tecla es la que sigue en la secuencia avanzamos; si no, volvemos a empezar
    progreso = tecla === KONAMI[progreso] ? progreso + 1 : tecla === KONAMI[0] ? 1 : 0;
    if (progreso === KONAMI.length) {
      progreso = 0;
      mostrarToast("🎮 GG WP! Encontraste el secreto de BROSSS");
      if (!menosMovimiento) confeti();
    }
  });
}

function confeti() {
  // Canvas temporal encima de toda la página
  const canvas = crear("canvas", "confeti");
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colores = ["#22e36b", "#13a84b", "#b6ffcf", "#ffffff"];
  const piezas = Array.from({ length: 160 }, () => ({
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: (Math.random() - 0.5) * 16,
    vy: Math.random() * -16 - 4,
    giro: Math.random() * Math.PI,
    tam: Math.random() * 8 + 4,
    color: colores[Math.floor(Math.random() * colores.length)],
  }));

  const inicio = performance.now();
  function cuadro(ahora) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    piezas.forEach((p) => {
      p.vy += 0.35; // gravedad
      p.vx *= 0.99; // rozamiento del aire
      p.x += p.vx;
      p.y += p.vy;
      p.giro += 0.1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.giro);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.tam / 2, -p.tam / 4, p.tam, p.tam / 2);
      ctx.restore();
    });
    // A los 4 segundos borramos el canvas
    if (ahora - inicio < 4000) requestAnimationFrame(cuadro);
    else canvas.remove();
  }
  requestAnimationFrame(cuadro);
}

// ---------- Arranque ----------

iniciarParticulas();
iniciarTextoRotativo();
iniciarLuzTarjetas();
iniciarLogo3D();
iniciarScroll();
iniciarCopiar();
iniciarSecreto();
