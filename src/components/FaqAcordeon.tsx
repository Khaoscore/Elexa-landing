/* El acordeón de «Preguntas frecuentes» — «Frame 45» (40:1138), 590 de ancho.

   Cerrada, cada pregunta es una caja de 488 × 74 con borde de 1 px y, a 27 a
   su derecha, el círculo morado de 74 con «add». Abierta (45:1142), el marco
   pasa a envolver también la respuesta y deja una muesca arriba a la derecha
   donde queda el círculo, ahora con «remove».

   Ese marco abierto es en Figma un vector de 589 × 266 de alto fijo. Acá el
   alto depende de la respuesta, así que se dibuja con las mismas muescas en
   CSS que las tarjetas de proyectos (src/lib/formas.ts), con la medida de
   la muesca del trazado: 100.75 × 102.5.

   En móvil (303:4573) la caja es de 283 × 70, el círculo de 43 queda a 16 y
   la muesca del marco abierto (303:4601) mide 58.5 × 84.5. Las dos formas
   van en variables propias y faq.css elige cuál pasa a .muescas según el
   ancho.

   Una sola abierta por vez. Toda la fila es un <button> con aria-expanded; la
   respuesta es una región que se despliega con una transición de alto
   (grid-template-rows 0fr → 1fr) y, cerrada, queda `inert`. El marco está
   siempre: al abrir se funde con el borde de la pregunta y crece con la
   respuesta; al cerrar se encoge con ella y en el último tramo vuelve a ser
   el borde. Para eso la que se está cerrando lleva .faq__item--cerrando
   hasta que termina la transición del alto. El «+» es CSS (dos barras) para que
   gire hasta quedar en «−». Ver faq.css. */
import { useId, useState, type CSSProperties } from 'react';
import type { Pregunta } from '../lib/faq';
import { estiloMuescas } from '../lib/formas';
import { partirNegritas } from '../lib/negritas';
import './faq.css';

const ESCRITORIO = estiloMuescas([{ esquina: 'tr', ancho: 100.75, alto: 102.5 }]);
const MOVIL = estiloMuescas([{ esquina: 'tr', ancho: 58.5, alto: 84.5 }]);
const FORMA_ABIERTA = {
  '--marco-mascara': ESCRITORIO['--muescas-mascara'],
  '--marco-trazo': ESCRITORIO['--muescas-trazo'],
  '--marco-mascara-movil': MOVIL['--muescas-mascara'],
  '--marco-trazo-movil': MOVIL['--muescas-trazo'],
} as CSSProperties;

type Props = { preguntas: Pregunta[] };

export default function FaqAcordeon({ preguntas }: Props) {
  const base = useId();
  const inicial = preguntas.findIndex((p) => p.abierta);
  const [abierta, setAbierta] = useState<number | null>(inicial === -1 ? null : inicial);
  const [cerrando, setCerrando] = useState<number | null>(null);

  /* Sin animación (menos movimiento) no hay transición que esperar: la que
     se cierra no pasa por «cerrando». */
  function alternar(i: number) {
    if (abierta !== null && !matchMedia('(prefers-reduced-motion: reduce)').matches) setCerrando(abierta);
    setAbierta(abierta === i ? null : i);
  }

  return (
    <ul className="faq__lista" role="list">
      {preguntas.map((item, i) => {
        const esAbierta = abierta === i;
        const boton = `${base}-boton-${i}`;
        const panel = `${base}-panel-${i}`;
        const clase = esAbierta
          ? 'faq__item faq__item--abierta'
          : cerrando === i
            ? 'faq__item faq__item--cerrando'
            : 'faq__item';
        return (
          <li key={i} className={clase}>
            <span className="faq__marco muescas" style={FORMA_ABIERTA} aria-hidden="true">
              <span className="muescas__trazo" />
            </span>

            <h3 className="faq__h">
              <button
                type="button"
                id={boton}
                className="faq__fila"
                aria-expanded={esAbierta}
                aria-controls={panel}
                onClick={() => alternar(i)}
              >
                <span className="faq__pregunta display">{item.pregunta}</span>
                <span className="faq__icono" aria-hidden="true">
                  <span className="faq__signo" />
                </span>
              </button>
            </h3>

            <div
              id={panel}
              className="faq__panel"
              role="region"
              aria-labelledby={boton}
              inert={!esAbierta}
              onTransitionEnd={(e) => {
                if (e.target === e.currentTarget && e.propertyName === 'grid-template-rows' && cerrando === i) {
                  setCerrando(null);
                }
              }}
            >
              <div className="faq__panel-interior">
                <div className="faq__respuesta">
                  {item.respuesta.length > 0 ? (
                    item.respuesta.map((parrafo, j) => <p key={j}>{conFormato(parrafo)}</p>)
                  ) : (
                    <p className="faq__pendiente">Respuesta pendiente de copy.</p>
                  )}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* Un párrafo de la respuesta: cada salto de línea, un <br>, y lo que va entre
   ** **, en <strong>. */
function conFormato(parrafo: string) {
  return parrafo.split('\n').flatMap((linea, i) => [
    ...(i > 0 ? [<br key={`br-${i}`} />] : []),
    ...partirNegritas(linea).map((tramo, j) =>
      tramo.negrita ? <strong key={`${i}-${j}`}>{tramo.texto}</strong> : tramo.texto,
    ),
  ]);
}
