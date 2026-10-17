/* «Proyectos anteriores»: el mapa, el panel del proyecto elegido y las
   tarjetas de debajo (/proyectos, frame "Desktop - 3").

   En Figma el mapa es una captura de Google Maps (Rectangle 16, 1352 × 978)
   con pines de Elexa encima y la instrucción «Desplazate en el mapa y haz
   click en el proyecto que quieres conocer». Para que eso funcione con los
   35 proyectos repartidos por la ciudad, acá es un mapa de verdad (Leaflet
   con OpenStreetMap) y cada proyecto se ubica por latitud y longitud desde la
   tabla `proyectos_anteriores`. Los pines, el panel y las tarjetas son los
   del diseño:

   · pin elegido — «Group 12» (85 × 110, con sombra) con el símbolo encima, un
     punto morado donde está el proyecto y su etiqueta corta debajo;
   · los demás  — «Group 13» (64 × 83), más chico;
   · panel — «Frame 87» (461 × 827, blanco, radio 24) a 22 del borde del mapa:
     buscador, foto, nombre, dirección, dos etiquetas y tres datos;
   · tarjetas — «Background+Border» (264 × 381), montadas 50 px sobre el borde
     de abajo del mapa. «Ver proyecto» elige ese proyecto en el mapa.

   En el teléfono («iPhone 13 & 14 - 3», 303:4780) no hay buscador: el panel es
   la ficha flotante «Frame 87» (342 × 336) encima de la parte de abajo del
   mapa, con una × que la cierra (se vuelve a abrir al elegir otro proyecto),
   y las tarjetas («Cards», 303:4904) son las mismas al 84 %, en una fila que
   se desliza debajo del panel gris.

   Leaflet toca `window` al cargarse, así que se importa recién en el
   navegador (dentro del efecto). Antes de eso el mapa es un fondo gris y el
   panel y las tarjetas ya están en el HTML. */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map as MapaLeaflet, Marker } from 'leaflet';
import type { ProyectoAnterior } from '../../lib/anteriores';
import 'leaflet/dist/leaflet.css';
import './mapa.css';

type Props = { proyectos: ProyectoAnterior[] };

/* Teselas de OpenStreetMap: libres, con atribución obligatoria y pensadas
   para tráfico moderado. Para un estilo más parecido al del diseño se puede
   cambiar por un proveedor con clave (MapTiler, Stadia…) sólo acá. */
const TESELAS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const ZOOM = 16;

/* El panel tapa la parte izquierda del mapa en escritorio: el punto elegido
   se centra en lo que queda a la derecha. En el teléfono la ficha tapa la
   parte de abajo: se centra en lo que queda arriba. */
const PANEL_ENCIMA = '(min-width: 1024px)';
const FICHA_ABAJO = '(max-width: 767px)';
/* La ficha del teléfono se sale 17 por debajo del mapa (ver mapa.css). */
const FICHA_AFUERA = 17;

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
        <span class="pin__etiqueta">${escapar(proyecto.etiquetaMapa)}</span>
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

export default function MapaProyectos({ proyectos }: Props) {
  const [elegidoId, setElegidoId] = useState(proyectos[0]?.id ?? '');
  const [busqueda, setBusqueda] = useState('');
  const [listo, setListo] = useState(false);
  /* Sólo cuenta en el teléfono: la × cierra la ficha flotante. */
  const [fichaAbierta, setFichaAbierta] = useState(true);

  const seccion = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const mapa = useRef<MapaLeaflet | null>(null);
  const leaflet = useRef<typeof import('leaflet') | null>(null);
  const marcadores = useRef(new Map<string, Marker>());
  /* El alto de la ficha la última vez que se vio: cerrada mide 0, y al
     reabrirla hay que centrar contando lo que va a tapar. */
  const altoFicha = useRef(0);

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!q) return proyectos;
    return proyectos.filter((p) => normalizar(`${p.nombre} ${p.etiquetaMapa} ${p.direccion}`).includes(q));
  }, [busqueda, proyectos]);

  const elegido = visibles.find((p) => p.id === elegidoId) ?? visibles[0] ?? null;

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
    const zoom = Math.max(m.getZoom(), ZOOM);
    const { ancho, alto } = tapado(abierta);
    const punto = m.project([p.latitud, p.longitud], zoom).subtract([ancho / 2, -alto / 2]);
    m.setView(m.unproject(punto, zoom), zoom, { animate: animar });
  };

  /* Crea el mapa una sola vez. */
  useEffect(() => {
    let cancelado = false;
    import('leaflet').then(({ default: L }) => {
      if (cancelado || !lienzo.current) return;
      leaflet.current = L;
      /* En el teléfono la ficha tapa la esquina de abajo, donde va la
         atribución: ahí sube a la de arriba a la izquierda. */
      const fichaAbajo = window.matchMedia(FICHA_ABAJO).matches;
      const m = L.map(lienzo.current, {
        zoomControl: false,
        attributionControl: !fichaAbajo,
        scrollWheelZoom: false,
        /* En el teléfono arrastrar con un dedo movería el mapa en vez de la
           página: ahí se mueve con los botones de zoom y tocando pines. */
        dragging: !L.Browser.mobile,
      });
      if (fichaAbajo) L.control.attribution({ position: 'topleft' }).addTo(m);
      L.control.zoom({ position: 'topright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(m);
      L.tileLayer(TESELAS, { maxZoom: 19, attribution: ATRIBUCION }).addTo(m);
      mapa.current = m;

      if (proyectos.length > 1) {
        const limites = L.latLngBounds(proyectos.map((p) => [p.latitud, p.longitud]));
        const { ancho, alto } = tapado();
        m.fitBounds(limites, {
          paddingTopLeft: [ancho ? ancho + 38 : 40, 140],
          paddingBottomRight: [60, alto + 120],
          maxZoom: ZOOM,
        });
      } else if (proyectos[0]) {
        m.setView([proyectos[0].latitud, proyectos[0].longitud], ZOOM);
        centrar(proyectos[0], false);
      }
      setListo(true);
    });
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
      marcadores.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Pinta los pines: el elegido grande, el resto chicos; los que no pasan el
     filtro de búsqueda se sacan. */
  useEffect(() => {
    const L = leaflet.current;
    const m = mapa.current;
    if (!listo || !L || !m) return;

    for (const [id, marcador] of marcadores.current) {
      if (!visibles.some((p) => p.id === id)) {
        marcador.remove();
        marcadores.current.delete(id);
      }
    }

    for (const p of visibles) {
      const esElegido = p.id === elegido?.id;
      const icono = L.divIcon({
        className: 'pin-mapa',
        html: htmlPin(p, esElegido),
        iconSize: esElegido ? [86, 148] : [64, 84],
        iconAnchor: esElegido ? [43, 117] : [32, 83],
      });
      let marcador = marcadores.current.get(p.id);
      if (!marcador) {
        marcador = L.marker([p.latitud, p.longitud], { icon: icono, title: p.nombre, keyboard: true, riseOnHover: true });
        marcador.on('click', () => {
          setElegidoId(p.id);
          setFichaAbierta(true);
        });
        marcador.addTo(m);
        marcadores.current.set(p.id, marcador);
      } else {
        marcador.setIcon(icono);
      }
      marcador.setZIndexOffset(esElegido ? 1000 : 0);
    }
  }, [listo, visibles, elegido?.id]);

  const elegir = (p: ProyectoAnterior, desplazar: boolean) => {
    setElegidoId(p.id);
    setFichaAbierta(true);
    centrar(p, true, true);
    if (desplazar) seccion.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const datos = elegido
    ? [
        { titulo: 'Área', valor: elegido.area },
        { titulo: 'Espacio', valor: elegido.espacio },
        { titulo: 'Ventaja', valor: elegido.ventaja },
      ].filter((d) => d.valor)
    : [];

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
              <img className="mapa__foto" src={elegido.imagen} alt={elegido.imagenAlt} loading="lazy" />
              <div className="mapa__nombre">
                <h3 className="display">{elegido.nombre}</h3>
                {elegido.direccion && <p>{elegido.direccion}</p>}
              </div>
              <button type="button" className="mapa__cerrar" onClick={() => setFichaAbierta(false)}>
                <img src="/img/iconos/cancel.svg" alt="" width="38" height="38" />
                <span className="sr-only">Cerrar la ficha de {elegido.nombre}</span>
              </button>
              {elegido.caracteristicas.length > 0 && (
                <ul className="mapa__etiquetas" role="list">
                  {elegido.caracteristicas.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              {datos.length > 0 && (
                <dl className="mapa__datos">
                  {datos.map((d) => (
                    <div key={d.titulo}>
                      <dt className="display">{d.titulo}</dt>
                      <dd>{d.valor}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          ) : (
            <p className="mapa__vacio">Ningún proyecto coincide con «{busqueda}».</p>
          )}
        </aside>
      </div>

      <ul className="mapa__tarjetas" role="list">
        {visibles.map((p) => (
          <li key={p.id} className={p.id === elegido?.id ? 'anterior anterior--elegido' : 'anterior'}>
            <img className="anterior__foto" src={p.imagen} alt="" loading="lazy" />
            <div className="anterior__texto">
              <p className="anterior__nombre">{p.nombre}</p>
              {p.direccion && <p className="anterior__direccion">{p.direccion}</p>}
              <p className="anterior__datos">{[p.area, p.espacio, p.ventaja].filter(Boolean).join(' · ')}</p>
            </div>
            {p.precio && <p className="anterior__precio display">{p.precio}</p>}
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
    </div>
  );
}
