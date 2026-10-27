/* Una tarjeta de «Proyectos abiertos»: la foto del proyecto recortada con la
   forma del diseño, el ícono morado en la muesca de arriba, el nombre y la
   descripción sobre la foto, y el botón en la muesca de abajo.

   Hay dos tamaños, uno por variante del componente de Figma:
   · ancha  (Projects=1, 130:556): 1202 de ancho, ícono en píldora de 150.7,
     título de 60 y «Ver proyecto»;
   · normal (Projects=2 y 3+, 130:587 / 130:739): 590 de ancho, ícono
     redondo de 74, título de 36 y «Ver más», con un velo de ink/400 al 20 %
     sobre la foto (la ancha no lo lleva).

   Las medidas de las muescas salen de los trazados de cada vector: el hueco
   de arriba es el ícono más ~24 px, el de abajo el botón más 17.

   En el teléfono todas las tarjetas, anchas o no, son la de «Proyectos
   abiertos mobile» (294:1255): 342 × 278.87, ícono redondo de 43.4 con
   «corporate_fare» de 22.7, título de 30, descripción en negrita 14/18 y
   «Ver proyecto». Los huecos de su forma se midieron sobre el vector
   exportado (294:1256): 60 × 58.87 arriba y 179.5 × 61.43 abajo.

   La tarjeta lleva en su style las dos formas, la del teléfono y la de
   pantallas anchas, con las variables de estiloMuescas() renombradas
   (`-movil` / `-ancho`); proyectos.css elige cuál pasa a ser la que lee
   `.muescas` según el ancho de la pantalla. */
import type { CSSProperties } from 'react';
import type { Proyecto } from '../lib/proyectos';
import { estiloMuescas, type Muesca } from '../lib/formas';
import { partirNegritas } from '../lib/negritas';
import { nombreParaPixel } from '../lib/pixel';

function forma(muescas: Muesca[], sufijo: 'movil' | 'ancho'): Record<string, string> {
  const estilo = estiloMuescas(muescas);
  return {
    [`--muescas-mascara-${sufijo}`]: estilo['--muescas-mascara'],
    [`--muescas-trazo-${sufijo}`]: estilo['--muescas-trazo'],
  };
}

const FORMA_MOVIL = forma(
  [
    { esquina: 'tl', ancho: 60, alto: 58.87 },
    { esquina: 'br', ancho: 179.5, alto: 61.43 },
  ],
  'movil',
);

const FORMA_ANCHA = {
  ...FORMA_MOVIL,
  ...forma(
    [
      { esquina: 'tl', ancho: 174, alto: 89.6 },
      { esquina: 'br', ancho: 219, alto: 63.42 },
    ],
    'ancho',
  ),
} as CSSProperties;

const FORMA_NORMAL = {
  ...FORMA_MOVIL,
  ...forma(
    [
      { esquina: 'tl', ancho: 98.74, alto: 89.49 },
      { esquina: 'br', ancho: 140, alto: 63.35 },
    ],
    'ancho',
  ),
} as CSSProperties;

type Props = {
  proyecto: Proyecto;
  ancha?: boolean;
};

export default function TarjetaProyecto({ proyecto, ancha = false }: Props) {
  const externo = /^https?:\/\//.test(proyecto.enlace);

  return (
    <article className={ancha ? 'tarjeta tarjeta--ancha' : 'tarjeta'}>
      <div className="tarjeta__marco muescas" style={ancha ? FORMA_ANCHA : FORMA_NORMAL}>
        <img
          className="tarjeta__foto"
          src={proyecto.imagen}
          alt={proyecto.imagenAlt}
          loading="lazy"
          decoding="async"
        />
        <span className="tarjeta__velo muescas__trazo" aria-hidden="true" />
        <div className="tarjeta__texto">
          <h3 className="tarjeta__nombre display">{proyecto.nombre}</h3>
          <p className="tarjeta__descripcion">
            {partirNegritas(proyecto.descripcion).map((tramo, i) =>
              tramo.negrita ? <strong key={i}>{tramo.texto}</strong> : tramo.texto,
            )}
          </p>
        </div>
      </div>

      <span className="tarjeta__icono" aria-hidden="true">
        <picture>
          <source
            media="(max-width: 767px)"
            srcSet="/img/proyectos/corporate-fare-movil.svg"
            width="22.7027"
            height="22.7027"
          />
          <img src="/img/iconos/corporate-fare.svg" alt="" width="40" height="40" />
        </picture>
      </span>

      <a
        className="btn btn--primario tarjeta__boton"
        href={proyecto.enlace}
        {...(externo ? { target: '_blank', rel: 'noopener' } : {})}
        data-pixel="ViewContent"
        data-pixel-nombre={nombreParaPixel(proyecto.nombre)}
        data-pixel-categoria="proyectos"
      >
        {ancha ? (
          'Ver proyecto'
        ) : (
          <>
            <span className="tarjeta__boton-movil">Ver proyecto</span>
            <span className="tarjeta__boton-ancho">Ver más</span>
          </>
        )}
        <span className="sr-only"> sobre {proyecto.nombre}</span>
      </a>
    </article>
  );
}
