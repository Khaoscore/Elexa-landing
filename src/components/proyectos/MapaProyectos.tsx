/* «Proyectos anteriores»: el mapa, el panel del proyecto elegido y las
   tarjetas de debajo (/proyectos, frame "Desktop - 3").

   En Figma el mapa es una captura de Google Maps (Rectangle 16, 1352 × 978)
   con pines de Elexa encima y la instrucción «Desplazate en el mapa y haz
   click en el proyecto que quieres conocer». Para que eso funcione con los
   35 proyectos repartidos por la ciudad, acá es un mapa de verdad (Mapbox en
   3D con los colores de Elexa y de la bandera de Cali, o Leaflet de
   respaldo; ver src/lib/mapa.ts) y cada proyecto se ubica por latitud y
   longitud desde la hoja «Propiedades Elexa» (tabla `propiedades_elexa`).
   Los pines, el panel y las tarjetas son los del diseño:

   · pin elegido — «Group 12» (85 × 110, con sombra) con el símbolo encima, un
     punto morado donde está el proyecto y su nombre debajo;
   · los demás  — «Group 13» (64 × 83), más chico;
   · panel — «Frame 87» (461 × 827, blanco, radio 24) a 22 del borde del mapa:
     buscador, foto, nombre, dirección y categoría. La hoja no trae los tres
     datos del diseño (área, espacio, ventaja) ni el precio de las tarjetas;
   · tarjetas — «Background+Border» (264 × 381), montadas 50 px sobre el borde
     de abajo del mapa. «Ver proyecto» elige ese proyecto en el mapa. La fila
     no muestra barra de desplazamiento: se corre con dos flechas a los
     costados, arrastrando con el dedo o arrastrando con el mouse.

   Si un proyecto no tiene foto, o no carga, en su lugar va el símbolo de
   Elexa sobre un fondo de marca.

   En el teléfono («iPhone 13 & 14 - 3», 303:4780) no hay buscador: el panel es
   la ficha flotante «Frame 87» (342 × 336) encima de la parte de abajo del
   mapa, con una × que la cierra (se vuelve a abrir al elegir otro proyecto),
   y las tarjetas («Cards», 303:4904) son las mismas al 84 %, en una fila que
   se desliza debajo del panel gris.

   El mapa se arma recién en el navegador (dentro del efecto): las
   bibliotecas tocan `window`. Antes de eso es un fondo gris y el panel y las
   tarjetas ya están en el HTML. */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ProyectoAnterior } from '../../lib/anteriores';
import { distancia } from '../../lib/coordenadas';
import { crearMapa, type Mapa } from '../../lib/mapa';
import './mapa.css';

type Props = { proyectos: ProyectoAnterior[] };

/* El zoom al elegir un proyecto, en la escala de Mapbox (ver mapa.ts): se
   ven la manzana y los edificios en 3D alrededor. */
const ZOOM = 15.8;
/* Inclinado, para que se vean los edificios en 3D. */
const INCLINACION = 50;

/* El panel tapa la parte izquierda del mapa en escritorio: el punto elegido
   se centra en lo que queda a la derecha. En el teléfono la ficha tapa la
   parte de abajo: se centra en lo que queda arriba. */
const PANEL_ENCIMA = '(min-width: 1024px)';
const FICHA_ABAJO = '(max-width: 767px)';
/* La ficha del teléfono se sale 17 por debajo del mapa (ver mapa.css). */
const FICHA_AFUERA = 17;

/* La vista inicial encuadra los proyectos a menos de esto (en metros) del
   centro, la mediana de todos: Cali. Los de otras ciudades (Cota, Sabaneta…)
   alejarían el mapa hasta encimar todos los pines de la ciudad; se llega a
   ellos alejando, buscándolos o con «Ver proyecto». */
const RADIO_INICIAL = 15000;

const mediana = (valores: number[]) => [...valores].sort((a, b) => a - b)[Math.floor(valores.length / 2)];

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

function htmlPin(proyecto: ProyectoAnterior, elegido: boolean): string {
  if (elegido) {
    return `
      <span class="pin pin--elegido">
        <img class="pin__cuerpo" src="/img/mapa/pin-grande.svg" alt="" width="117" height="143">
        <img class="pin__logo" src="/img/mapa/pin-grande-simbolo.svg" alt="" width="44" height="33">
        <img class="pin__punto" src="/img/mapa/punto.svg" alt="" width="40" height="40">
        <span class="pin__etiqueta">${escapar(proyecto.nombre)}</span>
      </span>`;
  }
  return `
    <span class="pin pin--chico">
      <img class="pin__circulo" src="/img/mapa/pin-circulo.svg" alt="" width="64" height="64">
      <img class="pin__punta" src="/img/mapa/pin-punta.svg" alt="" width="40" height="26">
      <img class="pin__relleno" src="/img/mapa/pin-relleno.svg" alt="" width="58" height="58">
      <img class="pin__simbolo" src="/img/mapa/pin-simbolo.svg" alt="" width="33" height="25">
    </span>`;
}

function escapar(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/* La portada del proyecto o, si la hoja no trae o no carga (una foto de Drive
   que no está compartida con «Cualquier persona con el enlace»), el símbolo
   sobre fondo de marca. */
function Foto({ className, foto, sizes }: { className: string; foto: ProyectoAnterior['foto']; sizes: string }) {
  const [fallo, setFallo] = useState(false);
  const img = useRef<HTMLImageElement>(null);

  /* Si falló antes de que React tomara la página, el onError ya pasó. */
  useEffect(() => {
    if (img.current?.complete && !img.current.naturalWidth) setFallo(true);
  }, []);

  if (foto && !fallo) {
    return (
      <img
        ref={img}
        className={className}
        src={foto.src}
        srcSet={foto.srcset}
        sizes={foto.srcset && sizes}
        alt=""
        loading="lazy"
        /* Drive (lh3.googleusercontent.com) limita las fotos que se piden
           desde otras páginas: con muchas seguidas contesta 429 en vez de la
           foto, y en las pruebas lo hacía con Referer http://localhost y no
           sin Referer. */
        referrerPolicy="no-referrer"
        onError={() => setFallo(true)}
      />
    );
  }
  return (
    <div className={`${className} sin-foto`}>
      <img src="/img/marca/simbolo-morado.svg" alt="" width="22" height="24" />
    </div>
  );
}

/* ============================== FILA DE TARJETAS ============================== */

/* Margen para no quedar a un píxel del final por redondeo del scroll. */
const TOLERANCIA = 2;
/* Lo que hay que correr el mouse con el botón apretado para que cuente como
   arrastre y no como clic en «Ver proyecto». */
const UMBRAL_ARRASTRE = 6;
/* Al soltar rápido, la fila sigue de largo lo que recorrería en este tiempo
   (ms) a esa velocidad, y encaja en la tarjeta siguiente. */
const INERCIA = 250;
const VELOCIDAD_MINIMA = 0.15; // px/ms

const sinAnimacion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const entre = (valor: number, min: number, max: number) => Math.min(Math.max(valor, min), max);

/* El scroll que pone cada tarjeta en su lugar de encaje (scroll-snap-align:
   start, contando el scroll-padding). Las últimas pueden quedar más allá del
   final de la pista: quien las use las recorta. */
function encajes(pista: HTMLElement): number[] {
  const relleno = parseFloat(getComputedStyle(pista).scrollPaddingLeft) || 0;
  const borde = pista.getBoundingClientRect().left;
  return [...pista.children].map((tarjeta) => pista.scrollLeft + tarjeta.getBoundingClientRect().left - borde - relleno);
}

/* La pista de tarjetas: sin barra, con flechas y arrastrable. Con el dedo el
   arrastre es el scroll nativo; con el mouse lo hace este hook. */
function usePista(cantidad: number) {
  const pista = useRef<HTMLUListElement>(null);
  /* Antes de medir (en el HTML del servidor) se asume el principio de la
     fila: se puede avanzar y no retroceder. */
  const [puede, setPuede] = useState({ atras: false, adelante: cantidad > 1 });

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    const medir = () => {
      const fin = el.scrollWidth - el.clientWidth;
      setPuede({ atras: el.scrollLeft > TOLERANCIA, adelante: el.scrollLeft < fin - TOLERANCIA });
    };
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => {
      el.removeEventListener('scroll', medir);
      observador.disconnect();
    };
  }, [cantidad]);

  /* Arrastre con el mouse. Mientras dura, el scroll-snap se apaga para que la
     fila siga al puntero; al soltar, la fila termina de correrse hasta una
     tarjeta (la siguiente en el sentido en que iba, o la más cercana si se
     soltó quieta) y recién ahí se vuelve a encender. */
  useEffect(() => {
    const el = pista.current;
    if (!el) return;

    let inicio: { x: number; scroll: number; puntero: number } | null = null;
    let arrastra = false;
    let velocidad = 0;
    let ultimo = { x: 0, t: 0 };
    let espera = 0;
    let tragarClic = false;

    const encender = () => {
      window.clearTimeout(espera);
      el.removeEventListener('scrollend', encender);
      el.style.scrollSnapType = '';
    };

    const bajar = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      inicio = { x: e.clientX, scroll: el.scrollLeft, puntero: e.pointerId };
    };

    const mover = (e: PointerEvent) => {
      if (!inicio || e.pointerId !== inicio.puntero) return;
      /* Se soltó el botón afuera de la ventana sin llegar a arrastrar. */
      if (!(e.buttons & 1)) {
        inicio = null;
        return;
      }
      if (!arrastra) {
        if (Math.abs(e.clientX - inicio.x) < UMBRAL_ARRASTRE) return;
        arrastra = true;
        encender();
        el.style.scrollSnapType = 'none';
        el.setPointerCapture(e.pointerId);
        el.classList.add('mapa__tarjetas--arrastrando');
        window.getSelection()?.removeAllRanges();
        /* Arranca desde acá: si la fila todavía se estaba corriendo, no salta. */
        inicio = { ...inicio, x: e.clientX, scroll: el.scrollLeft };
        velocidad = 0;
        ultimo = { x: e.clientX, t: e.timeStamp };
      }
      const dt = e.timeStamp - ultimo.t;
      if (dt > 0) velocidad = 0.8 * velocidad + 0.2 * ((ultimo.x - e.clientX) / dt);
      ultimo = { x: e.clientX, t: e.timeStamp };
      el.scrollLeft = inicio.scroll - (e.clientX - inicio.x);
    };

    const soltar = (e: PointerEvent) => {
      if (!inicio || e.pointerId !== inicio.puntero) return;
      inicio = null;
      if (!arrastra) return;
      arrastra = false;
      el.classList.remove('mapa__tarjetas--arrastrando');
      /* El clic que sigue al soltar no es un «Ver proyecto». */
      tragarClic = true;
      window.setTimeout(() => (tragarClic = false));

      /* Quieto un rato antes de soltar: sin inercia. */
      if (e.timeStamp - ultimo.t > 100) velocidad = 0;
      const fin = el.scrollWidth - el.clientWidth;
      const puntos = encajes(el).map((p) => entre(p, 0, fin));
      const actual = el.scrollLeft;
      /* Un tirón muy fuerte no recorre más de lo que se ve de la fila. */
      const lanzado = actual + entre(velocidad * INERCIA, -el.clientWidth, el.clientWidth);
      let destino: number;
      if (velocidad > VELOCIDAD_MINIMA) {
        destino = puntos.find((p) => p >= lanzado && p > actual + 1) ?? fin;
      } else if (velocidad < -VELOCIDAD_MINIMA) {
        destino = [...puntos].reverse().find((p) => p <= lanzado && p < actual - 1) ?? 0;
      } else {
        destino = puntos.reduce((a, b) => (Math.abs(b - actual) < Math.abs(a - actual) ? b : a), puntos[0] ?? actual);
      }

      if (Math.abs(destino - actual) < 1) {
        encender();
        return;
      }
      /* Por si el navegador no avisa cuándo terminó (scrollend). */
      el.addEventListener('scrollend', encender);
      espera = window.setTimeout(encender, 1500);
      el.scrollTo({ left: destino, behavior: sinAnimacion() ? 'auto' : 'smooth' });
    };

    const clic = (e: MouseEvent) => {
      if (!tragarClic) return;
      e.stopPropagation();
      e.preventDefault();
    };
    /* Sin esto, arrastrar desde una foto la arrastra a ella. */
    const noArrastrarImagen = (e: DragEvent) => e.preventDefault();

    el.addEventListener('pointerdown', bajar);
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
    el.addEventListener('click', clic, true);
    el.addEventListener('dragstart', noArrastrarImagen);
    return () => {
      encender();
      el.removeEventListener('pointerdown', bajar);
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
      el.removeEventListener('pointercancel', soltar);
      el.removeEventListener('click', clic, true);
      el.removeEventListener('dragstart', noArrastrarImagen);
    };
  }, []);

  /* Cada flecha corre la fila las tarjetas que se ven enteras (al menos una):
     de a cinco en una pantalla ancha. */
  const correr = (sentido: 1 | -1) => {
    const el = pista.current;
    const tarjeta = el?.firstElementChild;
    if (!el || !tarjeta) return;
    const estilo = getComputedStyle(el);
    const espacio = parseFloat(estilo.columnGap) || 0;
    const relleno = (parseFloat(estilo.scrollPaddingLeft) || 0) + (parseFloat(estilo.scrollPaddingRight) || 0);
    const paso = tarjeta.getBoundingClientRect().width + espacio;
    const porVista = Math.max(1, Math.floor((el.clientWidth - relleno + espacio + 1) / paso));

    const puntos = encajes(el);
    const actual = el.scrollLeft;
    const indice = puntos.reduce((a, p, i) => (Math.abs(p - actual) < Math.abs(puntos[a] - actual) ? i : a), 0);
    const destino = puntos[entre(indice + sentido * porVista, 0, puntos.length - 1)];
    el.scrollTo({
      left: entre(destino, 0, el.scrollWidth - el.clientWidth),
      behavior: sinAnimacion() ? 'auto' : 'smooth',
    });
  };

  return { pista, puede, correr };
}

type FlechaProps = {
  sentido: 'atras' | 'adelante';
  activa: boolean;
  controla: string;
  onClick: () => void;
};

/* Los botones redondos del carrusel de «Proyectos abiertos». La de atrás es
   la misma flecha girada; la que no tiene a dónde ir se esconde. */
function Flecha({ sentido, activa, controla, onClick }: FlechaProps) {
  return (
    <button
      type="button"
      className={`mapa__flecha mapa__flecha--${sentido}`}
      aria-label={sentido === 'atras' ? 'Proyectos anteriores' : 'Más proyectos'}
      aria-controls={controla}
      disabled={!activa}
      onClick={onClick}
    >
      <img src="/img/iconos/flecha-activa.svg" alt="" width="40" height="40" />
    </button>
  );
}

export default function MapaProyectos({ proyectos }: Props) {
  const [elegidoId, setElegidoId] = useState(proyectos[0]?.id ?? '');
  const [busqueda, setBusqueda] = useState('');
  const [listo, setListo] = useState(false);
  /* Sólo cuenta en el teléfono: la × cierra la ficha flotante. */
  const [fichaAbierta, setFichaAbierta] = useState(true);

  const seccion = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const mapa = useRef<Mapa | null>(null);
  /* Los ids de los pines que están puestos en el mapa. */
  const puestos = useRef(new Set<string>());
  /* El alto de la ficha la última vez que se vio: cerrada mide 0, y al
     reabrirla hay que centrar contando lo que va a tapar. */
  const altoFicha = useRef(0);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return proyectos;
    return proyectos.filter((p) => normalizar(`${p.nombre} ${p.direccion} ${p.categoria}`).includes(q));
  }, [busqueda, proyectos]);

  const elegido = visibles.find((p) => p.id === elegidoId) ?? visibles[0] ?? null;

  const pistaId = useId();
  const { pista, puede, correr } = usePista(visibles.length);

  /* Lo que tapa el panel: a la izquierda en escritorio, abajo en el teléfono
     (si la ficha está abierta). */
  const tapado = (abierta = fichaAbierta) => {
    const ancho = panel.current && window.matchMedia(PANEL_ENCIMA).matches ? panel.current.offsetWidth + 22 : 0;
    if (panel.current?.offsetHeight) altoFicha.current = panel.current.offsetHeight;
    const alto =
      abierta && window.matchMedia(FICHA_ABAJO).matches ? Math.max(altoFicha.current - FICHA_AFUERA, 0) : 0;
    return { ancho, alto };
  };

  /* Centra un punto en la parte visible del mapa (a la derecha del panel o
     encima de la ficha). */
  const centrar = (p: ProyectoAnterior, animar = true, abierta = fichaAbierta) => {
    const m = mapa.current;
    if (!m) return;
    const { ancho, alto } = tapado(abierta);
    m.centrar(p, Math.max(m.zoom(), ZOOM), { izquierda: ancho, abajo: alto, arriba: 0, derecha: 0 }, animar);
  };

  /* Crea el mapa una sola vez. */
  useEffect(() => {
    let cancelado = false;
    const contenedor = lienzo.current;
    if (!contenedor || !proyectos.length) return;

    const centro = { latitud: mediana(proyectos.map((p) => p.latitud)), longitud: mediana(proyectos.map((p) => p.longitud)) };
    crearMapa(contenedor, {
      centro,
      zoom: 12,
      inclinacion: INCLINACION,
      /* En el teléfono la ficha tapa la esquina de abajo, donde van los
         créditos: ahí suben a la de arriba a la izquierda. */
      creditosArriba: window.matchMedia(FICHA_ABAJO).matches,
    }).then((m) => {
      if (cancelado) return m.destruir();
      mapa.current = m;

      /* De lejos los pines chicos se encogen (ver mapa.css): en el norte de
         Cali hay varios a pocas cuadras y a tamaño completo se tapan. */
      m.alCambiarZoom((zoom) => contenedor.classList.toggle('mapa__lienzo--lejos', zoom < ZOOM - 1));

      const cerca = proyectos.filter((p) => distancia(centro, p) <= RADIO_INICIAL);
      if (cerca.length > 1) {
        const { ancho, alto } = tapado();
        m.encuadrar(cerca, { izquierda: ancho ? ancho + 38 : 40, arriba: 140, derecha: 60, abajo: alto + 120 }, ZOOM);
      } else {
        centrar(proyectos[0], false);
      }
      contenedor.classList.toggle('mapa__lienzo--lejos', m.zoom() < ZOOM - 1);
      setListo(true);
    });
    return () => {
      cancelado = true;
      mapa.current?.destruir();
      mapa.current = null;
      puestos.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Pinta los pines: el elegido grande, el resto chicos; los que no pasan el
     filtro de búsqueda se sacan. */
  useEffect(() => {
    const m = mapa.current;
    if (!listo || !m) return;

    for (const id of puestos.current) {
      if (!visibles.some((p) => p.id === id)) {
        m.quitarPin(id);
        puestos.current.delete(id);
      }
    }

    for (const p of visibles) {
      const esElegido = p.id === elegido?.id;
      m.ponerPin(p.id, {
        punto: p,
        html: htmlPin(p, esElegido),
        tamano: esElegido ? [86, 148] : [64, 84],
        ancla: esElegido ? [43, 117] : [32, 83],
        titulo: p.nombre,
        clase: 'pin-mapa',
        encima: esElegido,
        /* Elige el proyecto y el mapa vuela hasta él, acercándose. */
        alClic: () => elegir(p, false),
      });
      puestos.current.add(p.id);
    }
  }, [listo, visibles, elegido?.id]);

  const elegir = (p: ProyectoAnterior, desplazar: boolean) => {
    setElegidoId(p.id);
    setFichaAbierta(true);
    centrar(p, true, true);
    if (desplazar) seccion.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="mapa-zona">
      {/* «Ver proyecto» sube hasta acá: al mapa, que en el teléfono queda 31
          más abajo que .mapa-zona (el título va en otra fila de la grilla). */}
      <div className="mapa" ref={seccion}>
        <div className="mapa__lienzo" ref={lienzo} role="region" aria-label="Mapa de proyectos anteriores en Cali" />

        <aside className={fichaAbierta ? 'mapa__panel' : 'mapa__panel mapa__panel--cerrado'} ref={panel} aria-live="polite">
          <form
            className="mapa__buscador"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (visibles[0]) elegir(visibles[0], false);
            }}
          >
            <img src="/img/iconos/search.svg" alt="" width="26" height="26" />
            <label className="sr-only" htmlFor="buscar-proyectos">
              Buscar un proyecto
            </label>
            <input
              id="buscar-proyectos"
              type="search"
              placeholder="Proyectos Elexa"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </form>

          {elegido ? (
            <div className="mapa__ficha">
              <Foto
                key={elegido.id}
                className="mapa__foto"
                foto={elegido.foto}
                sizes="(min-width: 1240px) 413px, (min-width: 1024px) 352px, 100vw"
              />
              <div className="mapa__nombre">
                <h3 className="display">{elegido.nombre}</h3>
                {elegido.direccion && <p>{elegido.direccion}</p>}
              </div>
              <button type="button" className="mapa__cerrar" onClick={() => setFichaAbierta(false)}>
                <img src="/img/iconos/cancel.svg" alt="" width="38" height="38" />
                <span className="sr-only">Cerrar la ficha de {elegido.nombre}</span>
              </button>
              {elegido.categoria && <p className="mapa__categoria">{elegido.categoria}</p>}
            </div>
          ) : (
            <p className="mapa__vacio">Ningún proyecto coincide con «{busqueda}».</p>
          )}
        </aside>
      </div>

      <div className="mapa__carrusel">
        <ul
          ref={pista}
          id={pistaId}
          className={puede.atras || puede.adelante ? 'mapa__tarjetas mapa__tarjetas--desliza' : 'mapa__tarjetas'}
          data-cursor={puede.atras || puede.adelante ? 'arrastrar' : undefined}
          role="list"
        >
          {visibles.map((p) => (
            <li key={p.id} className={p.id === elegido?.id ? 'anterior anterior--elegido' : 'anterior'}>
              <Foto className="anterior__foto" foto={p.foto} sizes="236px" />
              <div className="anterior__texto">
                <p className="anterior__nombre">{p.nombre}</p>
                {p.direccion && <p className="anterior__direccion">{p.direccion}</p>}
                {p.categoria && <p className="anterior__datos">{p.categoria}</p>}
              </div>
              <button
                type="button"
                className="btn btn--primario anterior__boton"
                aria-pressed={p.id === elegido?.id}
                onClick={() => elegir(p, true)}
              >
                Ver proyecto<span className="sr-only"> {p.nombre} en el mapa</span>
              </button>
            </li>
          ))}
        </ul>

        <Flecha sentido="atras" activa={puede.atras} controla={pistaId} onClick={() => correr(-1)} />
        <Flecha sentido="adelante" activa={puede.adelante} controla={pistaId} onClick={() => correr(1)} />
      </div>
    </div>
  );
}
