// =============================================================
//  NAVEGADOR FALSO
//  Node no tiene "document" ni "window". Para testear main.js y
//  rangos.js armamos una imitación mínima del DOM: solo lo que esos
//  archivos usan. Después ejecutamos los scripts dentro de un
//  "contexto" aislado (módulo vm) como si fueran el navegador.
// =============================================================

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const RAIZ = path.join(__dirname, "..", "..");

// Elemento falso: guarda hijos, texto, clases, atributos y eventos
class ElementoFalso {
  constructor(etiqueta, id) {
    this.tagName = etiqueta.toUpperCase();
    this.id = id || "";
    this.children = [];
    this.className = "";
    this.hidden = false;
    this.value = "";
    this.dataset = {};
    this.atributos = {};
    this.eventos = {};
    this.offsetTop = 0;
    this.offsetHeight = 20;
    this._texto = "";
    const props = {};
    this.style = {
      setProperty: (k, v) => (props[k] = v),
      getPropertyValue: (k) => props[k],
    };
    this.classList = {
      add: (c) => (this.className += " " + c),
      remove: (c) => (this.className = this.className.replace(c, "")),
      toggle: (c, forzar) => {
        const tiene = this.className.includes(c);
        const poner = forzar ?? !tiene;
        if (poner && !tiene) this.className += " " + c;
        if (!poner) this.className = this.className.replace(c, "");
        return poner;
      },
      contains: (c) => this.className.split(" ").includes(c),
    };
  }
  set textContent(v) {
    this._texto = String(v);
    this.children = [];
  }
  // Como en el navegador: el texto de un elemento incluye el de sus hijos
  get textContent() {
    return this._texto + this.children.map((c) => c.textContent).join("");
  }
  set innerHTML(v) {
    this._texto = "";
    this.children = [];
  }
  append(...hijos) {
    this.children.push(...hijos);
  }
  remove() {}
  setAttribute(k, v) {
    this.atributos[k] = String(v);
  }
  getAttribute(k) {
    return this.atributos[k] ?? null;
  }
  addEventListener(tipo, fn) {
    (this.eventos[tipo] ??= []).push(fn);
  }
  // Dispara un evento a mano desde el test
  disparar(tipo, evento = {}) {
    (this.eventos[tipo] || []).forEach((fn) => fn({ target: this, ...evento }));
  }
  querySelectorAll(selector) {
    // Búsqueda simple por clase (".nombre"), suficiente para los scripts
    const clase = selector.replace(".", "");
    const resultado = [];
    const recorrer = (el) =>
      el.children.forEach((h) => {
        if (h.className && h.className.split(" ").includes(clase)) resultado.push(h);
        if (h.children) recorrer(h);
      });
    recorrer(this);
    return resultado;
  }
}

// Crea un contexto con document, fetch, localStorage, etc. falsos
function crearNavegador({ fetch, almacenamiento = {} } = {}) {
  const porId = {};
  const temporizadores = [];

  const document = {
    getElementById(id) {
      return (porId[id] ??= new ElementoFalso("div", id));
    },
    createElement: (etiqueta) => new ElementoFalso(etiqueta),
    querySelectorAll: () => [],
    querySelector: () => new ElementoFalso("div"),
  };

  const contexto = {
    document,
    console: { log() {}, warn() {}, error: console.error },
    fetch: fetch || (() => Promise.reject(new Error("sin red"))),
    localStorage: {
      getItem: (k) => almacenamiento[k] ?? null,
      setItem: (k, v) => (almacenamiento[k] = String(v)),
    },
    performance: { now: () => 0 },
    // Las animaciones terminan al instante
    requestAnimationFrame: (fn) => fn(1e9),
    setInterval: (fn, ms) => temporizadores.push({ fn, ms }),
    setTimeout: (fn) => fn(),
    clearTimeout() {},
    IntersectionObserver: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
    Intl,
    Date,
    Math,
    JSON,
    BigInt,
    Number,
    String,
    Promise,
    Error,
  };
  contexto.window = contexto;
  vm.createContext(contexto);

  return {
    contexto,
    temporizadores,
    almacenamiento,
    elemento: (id) => document.getElementById(id),
    // Evalúa una expresión dentro del navegador falso. Hace falta para
    // leer CONFIG: las variables "const" de un script no quedan como
    // propiedad de window, pero sí son visibles desde otro script.
    evaluar: (codigo) => vm.runInContext(codigo, contexto),
    // Ejecuta los scripts en el mismo orden que index.html
    cargar(...archivos) {
      archivos.forEach((archivo) => {
        const codigo = fs.readFileSync(path.join(RAIZ, archivo), "utf8");
        vm.runInContext(codigo, contexto, { filename: archivo });
      });
    },
  };
}

// Espera a que terminen las promesas pendientes (los fetch falsos)
const esperar = () => new Promise((r) => setImmediate(r));

// fetch falso que responde con un archivo de tests/fixtures
function fetchCon(fixture) {
  const datos = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "fixtures", fixture), "utf8"));
  return async (url) => {
    if (url.includes("/invites/")) return { ok: true, status: 200, json: async () => datos };
    return { ok: false, status: 403, json: async () => ({}) };
  };
}

module.exports = { crearNavegador, esperar, fetchCon, RAIZ };
