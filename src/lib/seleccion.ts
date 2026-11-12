/* La selección de /comerciales: los espacios que el asesor va marcando para
   mandárselos juntos a un cliente. Sólo corre en el navegador.

   Se guarda en el navegador del asesor (localStorage), así sigue ahí al
   pasar de la lista a una ficha y al volver otro día. Si el navegador no
   deja guardar (ventana privada, sitio bloqueado) funciona igual mientras
   la página esté abierta.

   Cada espacio va por su clave (las 8 letras del final de su URL, que no
   cambian si le cambian el nombre en la hoja; ver claveDe en
   src/lib/espacios.ts). El enlace que se comparte es /comerciales?ver=…
   con las claves en el orden en que se marcaron.

   Quien muestra la selección (los botones, la barra de abajo) escucha
   `alCambiar`: se avisa en la misma pestaña y en las otras abiertas. */

const LLAVE = 'comerciales:seleccion';
const EVENTO = 'comerciales:seleccion';
const MAXIMO = 30;

let enMemoria: string[] = [];

export function leerSeleccion(): string[] {
  try {
    const guardado = JSON.parse(localStorage.getItem(LLAVE) ?? '[]');
    if (Array.isArray(guardado)) return guardado.filter((c): c is string => typeof c === 'string');
  } catch {
    /* Sin almacenamiento: lo de esta página. */
  }
  return [...enMemoria];
}

function guardar(claves: string[]): void {
  enMemoria = claves.slice(0, MAXIMO);
  try {
    localStorage.setItem(LLAVE, JSON.stringify(enMemoria));
  } catch {
    /* Queda en memoria. */
  }
  window.dispatchEvent(new CustomEvent(EVENTO));
}

export const estaSeleccionado = (clave: string) => leerSeleccion().includes(clave);

/** Agrega o quita; devuelve si quedó adentro. */
export function alternar(clave: string): boolean {
  const actual = leerSeleccion();
  const adentro = actual.includes(clave);
  guardar(adentro ? actual.filter((c) => c !== clave) : [...actual, clave]);
  return !adentro;
}

export const vaciarSeleccion = () => guardar([]);

/** Deja sólo las claves que existen (quita las de espacios que ya no están). */
export function depurar(existentes: string[]): void {
  const actual = leerSeleccion();
  const vigentes = actual.filter((c) => existentes.includes(c));
  if (vigentes.length !== actual.length) guardar(vigentes);
}

export function alCambiar(fn: (claves: string[]) => void): void {
  window.addEventListener(EVENTO, () => fn(leerSeleccion()));
  window.addEventListener('storage', (evento) => {
    if (evento.key === LLAVE) fn(leerSeleccion());
  });
  /* Al volver con «atrás», la página puede venir de la memoria del
     navegador con la selección de antes: se repinta. */
  window.addEventListener('pageshow', (evento) => {
    if (evento.persisted) fn(leerSeleccion());
  });
}

/** La ruta de la selección: /comerciales?ver=clave1,clave2 */
export const rutaSeleccion = (base: string, claves: string[]) =>
  `${base}?ver=${claves.map(encodeURIComponent).join(',')}`;

/* ---------- Los botones «Seleccionar» (BotonSeleccion.astro) ----------
   Cualquier botón con data-seleccionar="{clave}": los de las tarjetas, el
   de la ficha y el de la tarjeta flotante del mapa, que se crea después.
   aria-pressed dice si está adentro; el texto visible sale de data-texto-si
   y data-texto-no. */

export function pintarBotones(raiz: ParentNode = document): void {
  const claves = leerSeleccion();
  for (const boton of raiz.querySelectorAll<HTMLElement>('[data-seleccionar]')) {
    const adentro = claves.includes(boton.dataset.seleccionar ?? '');
    boton.setAttribute('aria-pressed', String(adentro));
    const texto = boton.querySelector('[data-seleccion-texto]');
    if (texto) texto.textContent = (adentro ? boton.dataset.textoSi : boton.dataset.textoNo) ?? '';
  }
}

let activos = false;

/** Un solo escucha para todos los botones, también los que aparecen después. */
export function activarBotones(): void {
  if (activos) return;
  activos = true;
  document.addEventListener('click', (clic) => {
    const boton = (clic.target as Element).closest?.<HTMLElement>('[data-seleccionar]');
    if (!boton?.dataset.seleccionar) return;
    clic.preventDefault();
    alternar(boton.dataset.seleccionar);
  });
  alCambiar(() => pintarBotones());
  pintarBotones();
}
