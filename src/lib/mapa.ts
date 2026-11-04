/* Los mapas del sitio: el de /proyectos (MapaProyectos.tsx) y el de cada
   espacio en alquiler (MapaEspacio.astro). Los dos piden un mapa a
   `crearMapa` y le ponen pines; no saben qué biblioteca hay detrás.

   · Mapbox (lo normal, con PUBLIC_MAPBOX_TOKEN): estilo «Standard» en 3D con
     los colores de Elexa y de la bandera de Cali, las calles principales de
     Cali en rojo y la Torre de Cali pintada con la bandera
     (torre-de-cali.ts). Cada vez que un mapa arranca cuenta como una carga
     en la cuenta de Mapbox (50.000 gratis al mes); moverlo no suma.
   · Leaflet con OpenStreetMap (respaldo): sin token, o si Mapbox no carga
     (token vencido, dominio no permitido en el token, navegador sin WebGL).
     Si Mapbox falla después de arrancar, el mapa se rehace con Leaflet con
     los mismos pines y la misma vista.

   Las dos bibliotecas tocan `window` al cargarse: se importan acá adentro,
   recién cuando alguien pide un mapa, con su CSS.

   El zoom va siempre en la escala de Mapbox (teselas de 512): el mismo
   número en Leaflet (teselas de 256) es un paso más lejos, así que ahí se le
   suma 1. */
import { PUBLIC_MAPBOX_TOKEN } from 'astro:env/client';
import type { Map as MapaMapbox } from 'mapbox-gl';
import type { Coordenadas } from './coordenadas';
import { pintarTorreDeCali } from './torre-de-cali';

export type Relleno = { arriba: number; abajo: number; izquierda: number; derecha: number };

export type Pin = {
  punto: Coordenadas;
  /** El HTML del pin (imágenes con sus clases). */
  html: string;
  /** Ancho y alto de la caja del pin. */
  tamano: [number, number];
  /** El punto de la caja (desde arriba a la izquierda) que cae sobre el lugar. */
  ancla: [number, number];
  titulo: string;
  /** La clase de la caja, para los estilos del pin. */
  clase: string;
  /** Por encima de los demás pines (el elegido). */
  encima?: boolean;
  /** Si tiene, el pin es un botón (clic, Enter o espacio). */
  alClic?: () => void;
};

export type Opciones = {
  centro: Coordenadas;
  zoom: number;
  /** Mapbox: inclinación (0 = desde arriba) y giro (grados desde el norte). */
  inclinacion?: number;
  giro?: number;
  /** Mapbox: lo que se deja libre al arrancar; el centro cae en el resto.
      Sirve para bajar el punto y que se vea lo que hay detrás. */
  relleno?: Relleno;
  /** Créditos y logo arriba a la izquierda (cuando algo tapa abajo). */
  creditosArriba?: boolean;
  pantallaCompleta?: boolean;
};

export interface Mapa {
  readonly biblioteca: 'mapbox' | 'leaflet';
  /** Pone el pin o, si ya existe con ese id, lo cambia. */
  ponerPin(id: string, pin: Pin): void;
  quitarPin(id: string): void;
  zoom(): number;
  /** Encuadra los puntos dejando libre el relleno, sin pasar del zoom. */
  encuadrar(puntos: Coordenadas[], relleno: Relleno, zoomMaximo: number): void;
  /** Pone el punto en el centro de lo que no tapa el relleno. */
  centrar(punto: Coordenadas, zoom: number, relleno: Relleno, animar: boolean): void;
  alCambiarZoom(fn: (zoom: number) => void): void;
  destruir(): void;
}

export const SIN_RELLENO: Relleno = { arriba: 0, abajo: 0, izquierda: 0, derecha: 0 };

/* =============================== Mapbox ================================ */

/* Opciones del estilo Standard (docs.mapbox.com/map-styles/standard/api).
   · Elexa: tierra y edificios lila muy claro; los nombres de los lugares
     (bancos, supermercados…) en brand/300.
   · Bandera de Cali (azul, rojo, blanco, rojo, verde; #00d, #d00, #fff y
     #0a0): el agua en su azul, las calles en su blanco, las zonas verdes en
     su verde y las vías principales en su rojo (ver CALLES_PRINCIPALES).
     Aclarados para que no tapen los pines ni los nombres. */
const ESTILO = {
  lightPreset: 'day',
  theme: 'default',
  show3dObjects: true,
  showTransitLabels: false,
  showPointOfInterestLabels: true,
  densityPointOfInterestLabels: 2,
  colorModePointOfInterestLabels: 'single',
  colorPointOfInterestLabels: '#5f249f',
  colorPlaceLabels: '#1d0b30',
  colorRoadLabels: '#4a4458',
  colorLand: '#f4f1f7',
  colorCommercial: '#efe8f6',
  colorBuildings: '#e8e2ef',
  colorWater: '#6f8cf0',
  colorRoads: '#ffffff',
  colorTrunks: '#e5615a',
  colorMotorways: '#e5615a',
  colorGreenspace: '#a8d99b',
};

const TEXTOS = {
  'NavigationControl.ZoomIn': 'Acercar',
  'NavigationControl.ZoomOut': 'Alejar',
  'NavigationControl.ResetBearing': 'Volver al norte',
  'FullscreenControl.Enter': 'Pantalla completa',
  'FullscreenControl.Exit': 'Salir de pantalla completa',
  'AttributionControl.ToggleAttribution': 'Créditos del mapa',
  'ScrollZoomBlocker.CtrlMessage': 'Para acercar el mapa: Ctrl + rueda del mouse',
  'ScrollZoomBlocker.CmdMessage': 'Para acercar el mapa: ⌘ + rueda del mouse',
  'TouchPanBlocker.Message': 'Mueva el mapa con dos dedos',
};

/* Las calles principales de Cali en rojo (la 5ta, Pasoancho, la Simón
   Bolívar, la Autopista, la Roosevelt…): el estilo Standard pinta igual
   todas las calles que no son autopistas, así que encima de las vías
   principales («primary») y las rápidas («trunk», «motorway») de los datos
   de Mapbox va una línea roja del ancho de la calle, debajo de los nombres.
   Sólo dentro de Cali (el recuadro); Palmira y lo demás quedan como el
   resto. */
const CALI: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [
    [
      [-76.62, 3.3],
      [-76.44, 3.3],
      [-76.44, 3.52],
      [-76.62, 3.52],
      [-76.62, 3.3],
    ],
  ],
};
const ROJO_CALLES = '#e5615a';

function pintarCallesPrincipales(mapa: MapaMapbox) {
  if (mapa.getSource('calles-elexa')) return;
  mapa.addSource('calles-elexa', { type: 'vector', url: 'mapbox://mapbox.mapbox-streets-v8' });
  mapa.addLayer({
    id: 'calles-principales-cali',
    type: 'line',
    source: 'calles-elexa',
    'source-layer': 'road',
    slot: 'middle',
    minzoom: 10,
    filter: [
      'all',
      ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], true, false],
      ['match', ['get', 'structure'], ['tunnel'], false, true],
      ['within', CALI],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ROJO_CALLES,
      /* Más o menos el ancho de una vía principal del estilo en cada zoom:
         de lejos una raya fina, de cerca toda la calle. */
      'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 10, 1, 13, 2.2, 15, 6, 17, 18, 19, 52],
      'line-opacity': 0.9,
    },
  });
}

const aPadding = (r: Relleno) => ({ top: r.arriba, bottom: r.abajo, left: r.izquierda, right: r.derecha });

/* fitBounds de Mapbox no hace nada si el relleno no deja lugar: se achica
   en proporción para que quepa con 40 px de aire. */
function rellenoQueCabe(r: Relleno, ancho: number, alto: number): Relleno {
  const kx = Math.min(1, Math.max(0, ancho - 40) / Math.max(1, r.izquierda + r.derecha));
  const ky = Math.min(1, Math.max(0, alto - 40) / Math.max(1, r.arriba + r.abajo));
  return { arriba: r.arriba * ky, abajo: r.abajo * ky, izquierda: r.izquierda * kx, derecha: r.derecha * kx };
}

async function conMapbox(contenedor: HTMLElement, o: Opciones, siFalla: () => void): Promise<Mapa> {
  const [{ default: mapboxgl }] = await Promise.all([import('mapbox-gl'), import('mapbox-gl/dist/mapbox-gl.css')]);
  mapboxgl.accessToken = PUBLIC_MAPBOX_TOKEN ?? '';

  const mapa = new mapboxgl.Map({
    container: contenedor,
    style: 'mapbox://styles/mapbox/standard',
    config: { basemap: ESTILO },
    center: [o.centro.longitud, o.centro.latitud],
    zoom: o.zoom,
    pitch: o.inclinacion ?? 0,
    bearing: o.giro ?? 0,
    language: 'es',
    antialias: true,
    cooperativeGestures: true,
    locale: TEXTOS,
    attributionControl: !o.creditosArriba,
    logoPosition: o.creditosArriba ? 'top-left' : 'bottom-left',
  });
  if (o.creditosArriba) mapa.addControl(new mapboxgl.AttributionControl({ compact: true }), 'top-left');
  mapa.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
  if (o.pantallaCompleta) mapa.addControl(new mapboxgl.FullscreenControl(), 'top-right');
  if (o.relleno) mapa.setPadding(aPadding(o.relleno));

  /* Si el estilo no llega (token inválido o dominio no permitido), se pasa a
     Leaflet. Los errores de después (una tesela que no cargó) no. */
  let cargado = false;
  let fallo = false;
  mapa.on('style.load', () => {
    cargado = true;
    pintarCallesPrincipales(mapa);
    pintarTorreDeCali(mapa);
  });
  mapa.on('error', (evento) => {
    if (cargado || fallo) return;
    fallo = true;
    console.warn('[mapa] Mapbox no cargó; se usa OpenStreetMap.', evento.error);
    siFalla();
  });

  type Entrada = { marcador: import('mapbox-gl').Marker; pin: Pin };
  const marcadores = new Map<string, Entrada>();

  return {
    biblioteca: 'mapbox',

    ponerPin(id, pin) {
      let entrada = marcadores.get(id);
      if (!entrada) {
        const caja = document.createElement('div');
        caja.classList.add(pin.clase);
        const tocar = (evento: Event) => {
          const actual = marcadores.get(id)?.pin;
          if (!actual?.alClic) return;
          evento.preventDefault();
          evento.stopPropagation();
          actual.alClic();
        };
        caja.addEventListener('click', tocar);
        caja.addEventListener('keydown', (evento) => {
          if (evento.key === 'Enter' || evento.key === ' ') tocar(evento);
        });
        const marcador = new mapboxgl.Marker({ element: caja, anchor: 'top-left' })
          .setLngLat([pin.punto.longitud, pin.punto.latitud])
          .addTo(mapa);
        entrada = { marcador, pin };
        marcadores.set(id, entrada);
      }

      const anterior = entrada.pin;
      entrada.pin = pin;
      const caja = entrada.marcador.getElement();
      if (caja.dataset.html !== pin.html) {
        caja.innerHTML = pin.html;
        caja.dataset.html = pin.html;
      }
      caja.style.width = `${pin.tamano[0]}px`;
      caja.style.height = `${pin.tamano[1]}px`;
      caja.style.zIndex = pin.encima ? '10' : '';
      caja.title = pin.titulo;
      if (pin.alClic) {
        caja.tabIndex = 0;
        caja.setAttribute('role', 'button');
        caja.setAttribute('aria-label', pin.titulo);
      }
      entrada.marcador.setOffset([-pin.ancla[0], -pin.ancla[1]]);
      if (anterior.punto.latitud !== pin.punto.latitud || anterior.punto.longitud !== pin.punto.longitud) {
        entrada.marcador.setLngLat([pin.punto.longitud, pin.punto.latitud]);
      }
    },

    quitarPin(id) {
      marcadores.get(id)?.marcador.remove();
      marcadores.delete(id);
    },

    zoom: () => mapa.getZoom(),

    encuadrar(puntos, relleno, zoomMaximo) {
      if (!puntos.length) return;
      const limites = new mapboxgl.LngLatBounds();
      for (const p of puntos) limites.extend([p.longitud, p.latitud]);
      const lienzo = mapa.getContainer();
      mapa.setPadding(aPadding(SIN_RELLENO));
      mapa.fitBounds(limites, {
        padding: aPadding(rellenoQueCabe(relleno, lienzo.clientWidth, lienzo.clientHeight)),
        maxZoom: zoomMaximo,
        pitch: mapa.getPitch(),
        bearing: mapa.getBearing(),
        duration: 0,
      });
    },

    centrar(punto, zoom, relleno, animar) {
      const camara = { center: [punto.longitud, punto.latitud] as [number, number], zoom, padding: aPadding(relleno) };
      /* Vuela: se aleja un poco, viaja y se acerca. Con «reducir movimiento»
         en el sistema, Mapbox salta sin animar. */
      if (animar) mapa.flyTo({ ...camara, speed: 1.4, curve: 1.3 });
      else mapa.jumpTo(camara);
    },

    alCambiarZoom(fn) {
      mapa.on('zoomend', () => fn(mapa.getZoom()));
    },

    destruir() {
      mapa.remove();
    },
  };
}

/* ========================= Leaflet (respaldo) ========================= */

/* Teselas de OpenStreetMap: libres, con atribución obligatoria y pensadas
   para tráfico moderado. */
const TESELAS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const A_LEAFLET = 1;

async function conLeaflet(contenedor: HTMLElement, o: Opciones): Promise<Mapa> {
  const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
  const mapa = L.map(contenedor, {
    center: [o.centro.latitud, o.centro.longitud],
    zoom: o.zoom + A_LEAFLET,
    zoomControl: false,
    attributionControl: !o.creditosArriba,
    scrollWheelZoom: false,
    /* En el teléfono un dedo mueve la página, no el mapa: ahí se usa con los
       botones de zoom y tocando los pines. */
    dragging: !L.Browser.mobile,
  });
  if (o.creditosArriba) L.control.attribution({ position: 'topleft' }).addTo(mapa);
  L.control.zoom({ position: 'topright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(mapa);
  L.tileLayer(TESELAS, { maxZoom: 19, attribution: ATRIBUCION }).addTo(mapa);

  type Entrada = { marcador: import('leaflet').Marker; pin: Pin };
  const marcadores = new Map<string, Entrada>();
  const icono = (pin: Pin) =>
    L.divIcon({ className: pin.clase, html: pin.html, iconSize: pin.tamano, iconAnchor: pin.ancla });

  return {
    biblioteca: 'leaflet',

    ponerPin(id, pin) {
      let entrada = marcadores.get(id);
      if (!entrada) {
        const marcador = L.marker([pin.punto.latitud, pin.punto.longitud], {
          icon: icono(pin),
          title: pin.titulo,
          keyboard: Boolean(pin.alClic),
          riseOnHover: true,
        });
        marcador.on('click', () => marcadores.get(id)?.pin.alClic?.());
        marcador.addTo(mapa);
        entrada = { marcador, pin };
        marcadores.set(id, entrada);
      } else {
        entrada.pin = pin;
        entrada.marcador.setIcon(icono(pin));
        entrada.marcador.setLatLng([pin.punto.latitud, pin.punto.longitud]);
      }
      entrada.marcador.setZIndexOffset(pin.encima ? 1000 : 0);
    },

    quitarPin(id) {
      marcadores.get(id)?.marcador.remove();
      marcadores.delete(id);
    },

    zoom: () => mapa.getZoom() - A_LEAFLET,

    encuadrar(puntos, relleno, zoomMaximo) {
      if (!puntos.length) return;
      mapa.fitBounds(L.latLngBounds(puntos.map((p) => [p.latitud, p.longitud])), {
        paddingTopLeft: [relleno.izquierda, relleno.arriba],
        paddingBottomRight: [relleno.derecha, relleno.abajo],
        maxZoom: zoomMaximo + A_LEAFLET,
      });
    },

    centrar(punto, zoom, relleno, animar) {
      const z = zoom + A_LEAFLET;
      const centro = mapa
        .project([punto.latitud, punto.longitud], z)
        .subtract([(relleno.izquierda - relleno.derecha) / 2, (relleno.arriba - relleno.abajo) / 2]);
      if (animar) mapa.flyTo(mapa.unproject(centro, z), z, { duration: 1 });
      else mapa.setView(mapa.unproject(centro, z), z, { animate: false });
    },

    alCambiarZoom(fn) {
      mapa.on('zoomend', () => fn(mapa.getZoom() - A_LEAFLET));
    },

    destruir() {
      mapa.remove();
    },
  };
}

/* ============================== El mapa =============================== */

/** Arma el mapa en el contenedor: Mapbox si hay token, si no (o si falla)
    Leaflet. */
export async function crearMapa(contenedor: HTMLElement, opciones: Opciones): Promise<Mapa> {
  /* Lo que se le pidió al mapa, para rehacerlo igual si Mapbox falla. */
  const pines = new Map<string, Pin>();
  const oyentes: ((zoom: number) => void)[] = [];
  let ultimaVista: ((m: Mapa) => void) | null = null;
  let destruido = false;
  let motor: Mapa;

  const aLeaflet = async () => {
    contenedor.replaceChildren();
    const nuevo = await conLeaflet(contenedor, opciones);
    if (destruido) return nuevo.destruir();
    motor = nuevo;
    oyentes.forEach((fn) => motor.alCambiarZoom(fn));
    pines.forEach((pin, id) => motor.ponerPin(id, pin));
    ultimaVista?.(motor);
  };

  if (PUBLIC_MAPBOX_TOKEN) {
    try {
      motor = await conMapbox(contenedor, opciones, () => {
        /* Llega después de armado: el error del estilo es asíncrono. */
        queueMicrotask(() => {
          if (destruido) return;
          motor.destruir();
          aLeaflet();
        });
      });
    } catch (error) {
      console.warn('[mapa] Mapbox no arrancó; se usa OpenStreetMap.', error);
      contenedor.replaceChildren();
      motor = await conLeaflet(contenedor, opciones);
    }
  } else {
    motor = await conLeaflet(contenedor, opciones);
  }

  return {
    get biblioteca() {
      return motor.biblioteca;
    },
    ponerPin(id, pin) {
      pines.set(id, pin);
      motor.ponerPin(id, pin);
    },
    quitarPin(id) {
      pines.delete(id);
      motor.quitarPin(id);
    },
    zoom: () => motor.zoom(),
    encuadrar(puntos, relleno, zoomMaximo) {
      ultimaVista = (m) => m.encuadrar(puntos, relleno, zoomMaximo);
      motor.encuadrar(puntos, relleno, zoomMaximo);
    },
    centrar(punto, zoom, relleno, animar) {
      ultimaVista = (m) => m.centrar(punto, zoom, relleno, false);
      motor.centrar(punto, zoom, relleno, animar);
    },
    alCambiarZoom(fn) {
      oyentes.push(fn);
      motor.alCambiarZoom(fn);
    },
    destruir() {
      destruido = true;
      motor.destruir();
    },
  };
}
