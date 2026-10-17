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
   (grid-template-rows 0fr → 1fr) y, cerrada, queda `inert`. */
import { useId, useState, type CSSProperties } from 'react';
import type { Pregunta } from '../data/faq';
import { estiloMuescas } from '../lib/formas';
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

  return (
    <ul className="faq__lista" role="list">
      {preguntas.map((item, i) => {
        const esAbierta = abierta === i;
        const boton = `${base}-boton-${i}`;
        const panel = `${base}-panel-${i}`;
        return (
          <li key={i} className={esAbierta ? 'faq__item faq__item--abierta' : 'faq__item'}>
            {esAbierta && (
              <span className="faq__marco muescas" style={FORMA_ABIERTA} aria-hidden="true">
                <span className="muescas__trazo" />
              </span>
            )}

            <h3 className="faq__h">
              <button
                type="button"
                id={boton}
                className="faq__fila"
                aria-expanded={esAbierta}
                aria-controls={panel}
                onClick={() => setAbierta(esAbierta ? null : i)}
              >
                <span className="faq__pregunta display">{item.pregunta}</span>
                <span className="faq__icono">
                  <img src={esAbierta ? '/img/iconos/remove.svg' : '/img/iconos/add.svg'} alt="" width="40" height="40" />
                </span>
              </button>
            </h3>

            <div id={panel} className="faq__panel" role="region" aria-labelledby={boton} inert={!esAbierta}>
              <div className="faq__panel-interior">
                <p className="faq__respuesta">{conNegritas(item.respuesta)}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* «texto **negrita** texto» → nodos con <strong>. */
function conNegritas(texto: string) {
  return texto.split(/\*\*(.+?)\*\*/g).map((parte, i) => (i % 2 ? <strong key={i}>{parte}</strong> : parte));
}
