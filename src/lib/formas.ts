/* Tarjetas «con muesca».

   Varias piezas del diseño son un rectángulo redondeado al que le falta una
   esquina: el hueco donde se apoya el ícono morado (arriba a la izquierda) o
   el botón «Ver más» (abajo a la derecha). Todas las esquinas, cóncavas y
   convexas, tienen radio 16.

          ┌──────────────────┐            ●  = ícono
     ●    │                  │
   ┌──────┘                  │
   │                         │
   │                ┌────────┘
   └────────────────┘ [botón]

   En Figma esas formas son vectores con la foto como relleno, así que el
   archivo exporta la foto ya recortada. Acá la foto viene de la base de datos,
   así que la forma tiene que ser un recorte aplicado en el navegador, y tiene
   que valer para cualquier ancho (la tarjeta se estira con la pantalla) sin
   que las esquinas se deformen.

   La solución es CSS puro, con `mask`:
   · el elemento es un rectángulo y la máscara le resta las cuatro esquinas: las que
     tienen muesca, el hueco más las dos esquinas convexas que lo rodean; las
     demás, sólo lo que queda fuera del radio de 16. Cada esquina es un SVG
     chico de tamaño fijo, anclado a su vértice con mask-position, así que no
     se estira y los radios son siempre de 16 px;
   · el trazo gris de 2 px es un box-shadow interior para los lados rectos y,
     de fondo, un SVG por esquina con el tramo curvo, anclado igual.

   Las esquinas lisas van en la máscara y no con border-radius a propósito:
   Chrome pinta el borde suavizado del recorte redondeado por fuera de la
   máscara, y en las esquinas con muesca quedaba un hilo gris flotando.

   Las medidas de cada muesca salen de los trazados de Figma (ver
   TarjetaProyecto.tsx y FaqAcordeon.tsx). */

export type Esquina = 'tl' | 'tr' | 'br' | 'bl';
export type Muesca = { esquina: Esquina; ancho: number; alto: number };

const R = 16;
const TRAZO = '#d9d9d6'; // palette/neutral/300
const ESQUINAS: Esquina[] = ['tl', 'tr', 'br', 'bl'];

/* Cada pieza se pasa MARGEN px por fuera de la tarjeta: con anchos fluidos el
   borde puede caer entre dos píxeles, que si no quedarían a medio enmascarar.
   Lo que cae afuera del elemento no se ve. */
const MARGEN = 2;

const POSICION: Record<Esquina, string> = {
  tl: `left -${MARGEN}px top -${MARGEN}px`,
  tr: `right -${MARGEN}px top -${MARGEN}px`,
  br: `right -${MARGEN}px bottom -${MARGEN}px`,
  bl: `left -${MARGEN}px bottom -${MARGEN}px`,
};

/* Las cuatro esquinas son el mismo dibujo: se traza la de arriba a la
   izquierda y se refleja. */
function reflejo(esquina: Esquina, w: number, h: number): string {
  switch (esquina) {
    case 'tl':
      return '';
    case 'tr':
      return `matrix(-1 0 0 1 ${w} 0)`;
    case 'br':
      return `matrix(-1 0 0 -1 ${w} ${h})`;
    case 'bl':
      return `matrix(1 0 0 -1 0 ${h})`;
  }
}

function svg(w: number, h: number, transform: string, contenido: string): string {
  const g = transform ? `<g transform="${transform}">${contenido}</g>` : contenido;
  const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${g}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(markup)}")`;
}

const n = (v: number) => Math.round(v * 100) / 100;

/* El hueco de a × b en la esquina superior izquierda, más el pedazo que se
   come cada esquina convexa vecina. Caja de (a + R) × (b + R). */
function hueco(a: number, b: number): string {
  return (
    `M0 0H${n(a + R)}A${R} ${R} 0 0 0 ${n(a)} ${R}` +
    `V${n(b - R)}A${R} ${R} 0 0 1 ${n(a - R)} ${n(b)}` +
    `H${R}A${R} ${R} 0 0 0 0 ${n(b + R)}Z`
  );
}

/* El borde del hueco, corrido 1 px hacia adentro de la tarjeta para que el
   trazo de 2 px empalme con el box-shadow interior (que va de 0 a 2 px). */
function bordeHueco(a: number, b: number): string {
  const ri = R - 1;
  const re = R + 1;
  return (
    `M${n(a + R)} 1A${ri} ${ri} 0 0 0 ${n(a + 1)} ${R}` +
    `V${n(b - R)}A${re} ${re} 0 0 1 ${n(a - R)} ${n(b + 1)}` +
    `H${R}A${ri} ${ri} 0 0 0 1 ${n(b + R)}`
  );
}

/* Una esquina lisa: lo que queda fuera del cuarto de círculo, y su trazo. */
const ESQUINA_LISA = `M0 0H${R}A${R} ${R} 0 0 0 0 ${R}Z`;
const BORDE_LISO = `M${R} 1A${R - 1} ${R - 1} 0 0 0 1 ${R}`;

/* Propiedades CSS para la tarjeta. Las lee la clase `.muescas` de
   global.css: el elemento recortado y su capa de trazo. */
export function estiloMuescas(muescas: Muesca[], conTrazo = true): Record<string, string> {
  const mascaras: string[] = [];
  const trazos: string[] = [];

  for (const esquina of ESQUINAS) {
    const muesca = muescas.find((m) => m.esquina === esquina);
    const w = n((muesca?.ancho ?? 0) + R + MARGEN);
    const h = n((muesca?.alto ?? 0) + R + MARGEN);
    const t = reflejo(esquina, w, h);
    const lugar = `${POSICION[esquina]} / ${w}px ${h}px no-repeat`;
    const corrido = `transform="translate(${MARGEN} ${MARGEN})"`;

    const forma = muesca ? hueco(muesca.ancho, muesca.alto) : ESQUINA_LISA;
    const margenes = `<rect width="${w}" height="${MARGEN}"/><rect width="${MARGEN}" height="${h}"/>`;
    mascaras.push(`${svg(w, h, t, `<path ${corrido} d="${forma}"/>${margenes}`)} ${lugar}`);

    if (conTrazo) {
      const borde = muesca ? bordeHueco(muesca.ancho, muesca.alto) : BORDE_LISO;
      const trazo = `<path ${corrido} d="${borde}" fill="none" stroke="${TRAZO}" stroke-width="2"/>`;
      trazos.push(`${svg(w, h, t, trazo)} ${lugar}`);
    }
  }

  /* El rectángulo entero va primero (la capa de arriba) y las cuatro esquinas
     debajo. En global.css las esquinas se suman entre sí y el rectángulo les
     resta esa unión (`subtract, add, add, add, add`). Con `exclude` (XOR) el
     resultado sería el mismo salvo en un borde que cae en medio píxel, donde
     quedaba una línea a medio enmascarar. */
  mascaras.unshift('linear-gradient(#000 0 0)');

  return {
    '--muescas-mascara': mascaras.join(', '),
    '--muescas-trazo': trazos.length ? trazos.join(', ') : 'none',
  };
}
