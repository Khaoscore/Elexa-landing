/* La Torre de Cali pintada con la bandera de la ciudad en los mapas de
   Mapbox.

   El estilo Standard de Mapbox no deja pintar un edificio suyo por partes,
   así que encima del suyo se levanta otra torre con la misma planta, un poco
   más ancha y más alta para taparlo, hecha de cinco tramos apilados: las
   cinco franjas de la bandera de abajo hacia arriba (verde, rojo, blanco,
   rojo, azul), con sus proporciones (64, 12, 64, 12, 64; ver
   commons.wikimedia.org/wiki/File:Flag_of_Santiago_de_Cali.svg). El azul,
   el cielo, queda arriba.

   La planta y la altura son las de OpenStreetMap (way 308976770, «Hotel Torre
   de Cali», height=185.5, 45 pisos), Avenida de las Américas, Versalles. */
import type { Map as MapaMapbox } from 'mapbox-gl';
import { distancia } from './coordenadas';

/* Los colores de la bandera (#00d, #d00, #fff, #0a0) un punto menos
   chillones: con la luz del mapa se ven igual de vivos. */
const FRANJAS = [
  { color: '#12a136', alto: 64 }, // verde: los campos
  { color: '#d91c1c', alto: 12 }, // rojo
  { color: '#ffffff', alto: 64 }, // blanco
  { color: '#d91c1c', alto: 12 }, // rojo
  { color: '#1336d6', alto: 64 }, // azul: el cielo
];

/* 185.5 m en OpenStreetMap; 1.5 más para que el techo del edificio de
   Mapbox no asome. */
const ALTURA = 187;

/* Por lo mismo, la planta va sin sus entrantes (el contorno exterior, la
   «envolvente convexa») y agrandada desde el centro un 42 % (~8 m por lado):
   las paredes de la de Mapbox tienen que quedar bien adentro. Con menos, de
   lejos el mapa no distingue cuál pared va adelante y la de Mapbox asoma
   como manchas lila (probado: con 1.3 todavía pasa). Queda algo más gruesa
   que la real. */
const ESCALA = 1.42;

const PLANTA: [number, number][] = [
  [-76.5287996, 3.4584531],
  [-76.5287462, 3.4583635],
  [-76.5287246, 3.4583763],
  [-76.528697, 3.4583299],
  [-76.5286575, 3.4583533],
  [-76.5286091, 3.4582742],
  [-76.5285479, 3.4583169],
  [-76.5284673, 3.4583689],
  [-76.5284857, 3.4583998],
  [-76.5284561, 3.4584173],
  [-76.5284709, 3.4584422],
  [-76.5284402, 3.4584604],
  [-76.5284683, 3.4585076],
  [-76.5284468, 3.4585227],
  [-76.5285122, 3.4586182],
  [-76.5285664, 3.458586],
  [-76.5285877, 3.4586218],
  [-76.5286268, 3.4585985],
  [-76.5286416, 3.4586234],
  [-76.5287514, 3.4585582],
  [-76.5287341, 3.4585292],
  [-76.5287826, 3.4585005],
  [-76.5287661, 3.4584729],
  [-76.5287996, 3.4584531],
];

/* Envolvente convexa (cadena monótona de Andrew), cerrada. */
function envolvente(puntos: [number, number][]): [number, number][] {
  const p = [...puntos].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const giro = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const media = (lista: [number, number][]) => {
    const cadena: [number, number][] = [];
    for (const punto of lista) {
      while (cadena.length >= 2 && giro(cadena[cadena.length - 2], cadena[cadena.length - 1], punto) <= 0) cadena.pop();
      cadena.push(punto);
    }
    return cadena.slice(0, -1);
  };
  const casco = [...media(p), ...media([...p].reverse())];
  return [...casco, casco[0]];
}

function planta(): [number, number][] {
  const casco = envolvente(PLANTA.slice(0, -1));
  const puntos = casco.slice(0, -1);
  const centro = [
    puntos.reduce((s, p) => s + p[0], 0) / puntos.length,
    puntos.reduce((s, p) => s + p[1], 0) / puntos.length,
  ];
  return casco.map(([lng, lat]) => [centro[0] + (lng - centro[0]) * ESCALA, centro[1] + (lat - centro[1]) * ESCALA]);
}

function tramos(): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  const total = FRANJAS.reduce((s, f) => s + f.alto, 0);
  const anillo = planta();
  let base = 0;
  return {
    type: 'FeatureCollection',
    features: FRANJAS.map(({ color, alto }) => {
      const techo = base + (alto / total) * ALTURA;
      const tramo: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: 'Feature',
        properties: { color, base, techo },
        geometry: { type: 'Polygon', coordinates: [anillo] },
      };
      base = techo;
      return tramo;
    }),
  };
}

/* ------------------------- Hacia dónde mirar -------------------------- */

/* El centro de la planta. */
const TORRE = {
  longitud: PLANTA.slice(0, -1).reduce((s, p) => s + p[0], 0) / (PLANTA.length - 1),
  latitud: PLANTA.slice(0, -1).reduce((s, p) => s + p[1], 0) / (PLANTA.length - 1),
};

/* Hasta esta distancia (en metros) la torre entra en el mapa inclinado de la
   ficha si se mira hacia ella: más lejos queda arriba del borde. */
const RADIO = 1700;

/* Mirando derecho a la torre, el pin (que está en el centro) la tapa: se gira
   un poco para que quede arriba a la izquierda del pin. */
const DE_LADO = 28;

/** La cámara para que la torre se vea entera detrás del punto: girada hacia
    ella y más inclinada (con el horizonte arriba). Quien la usa además baja
    el punto en el mapa para dejarle lugar arriba a la torre. null si el
    punto está lejos (o encima) de la torre. */
export function camaraHaciaLaTorre(latitud: number, longitud: number): { bearing: number; pitch: number } | null {
  const metros = distancia({ latitud, longitud }, TORRE);
  if (metros > RADIO || metros < 120) return null;
  const este = (TORRE.longitud - longitud) * Math.cos((latitud * Math.PI) / 180);
  const norte = TORRE.latitud - latitud;
  const rumbo = (Math.atan2(este, norte) * 180) / Math.PI;
  return { bearing: (((rumbo + DE_LADO) % 360) + 360) % 360, pitch: 62 };
}

/** Levanta la torre en un mapa de Mapbox ya cargado (en `style.load`). */
export function pintarTorreDeCali(mapa: MapaMapbox) {
  if (mapa.getSource('torre-de-cali')) return;
  mapa.addSource('torre-de-cali', { type: 'geojson', data: tramos() });
  mapa.addLayer({
    id: 'torre-de-cali',
    type: 'fill-extrusion',
    source: 'torre-de-cali',
    /* Con los edificios, debajo de los nombres: si va arriba de todo
       (sin slot) tapa el ícono y el nombre del «Hotel Torre de Cali». */
    slot: 'middle',
    minzoom: 13,
    paint: {
      'fill-extrusion-color': ['get', 'color'],
      'fill-extrusion-base': ['get', 'base'],
      'fill-extrusion-height': ['get', 'techo'],
      'fill-extrusion-opacity': 1,
      /* Sin el degradado hacia abajo que trae por defecto: cada franja de un
         solo color, como la tela. */
      'fill-extrusion-vertical-gradient': false,
    },
  });
}
