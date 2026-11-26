/* La forma del hero: «Vector 1» (6:340), 1397 × 998, la misma en la portada
   (Hero.astro) y en la de Karanis («Vector 1» 521:1001, karanis/HeroKaranis).

   Es un rectángulo de radio 24 con dos recortes. Arriba a la derecha baja 82
   px en diagonal y deja un escalón blanco donde se apoyan los botones de la
   barra; abajo a la derecha se abre otro, también en diagonal, donde van los
   dos botones del hero.

   La exportación del vector que da Figma sale transparente, así que la forma
   se reconstruye acá con su trazado exacto, como un clip-path: polygon().
   Cada punto se ancla a un borde para que la forma se estire sin deformarse:
   · lo de la izquierda queda a px del borde izquierdo;
   · el final de la pestaña sigue a los enlaces de la barra, que con
     space-between terminan siempre en «50 % + 146 px»;
   · el recorte de abajo queda a px del borde derecho, con los botones.
   Las curvas (esquinas de 24 y empalmes de la diagonal) se muestrean en
   tramos rectos: con 10 por curva el error es de centésimas de píxel.

   Bajo 1240 px va la forma del frame móvil («Frame 8» 303:4415, «Vector 1»
   303:4416), 366 × 767 a 12 px de los bordes: la pestaña de arriba deja a la
   derecha el escalón del ícono de menú, y abajo el negro sigue sólo por la
   izquierda, en diagonal, para dejarles lugar a los dos botones. Se arma
   igual que la de escritorio; acá lo de la izquierda (hasta x = 110) queda a
   px del borde izquierdo y todo lo demás a px del derecho. */

const ANCHO = 1397;
const CENTRO = ANCHO / 2;
const ANCHO_MOVIL = 366;

type P = [number, number];
/* El trazado de Figma, tramo por tramo: [inicio, control 1, control 2, fin]
   para las curvas y [fin] para las rectas. */
const tramos: P[][] = [
  [[0, 24]],
  [[0, 24], [0, 10.7452], [10.7452, 0], [24, 0]],
  [[844.039, 0]],
  [[844.039, 0], [849.818, 0], [855.403, 2.08536], [859.768, 5.87296]],
  [[940.732, 76.127]],
  [[940.732, 76.127], [945.097, 79.9146], [950.682, 82], [956.461, 82]],
  [[1373, 82]],
  [[1373, 82], [1386.25, 82], [1397, 92.7452], [1397, 106]],
  [[1397, 779]],
  [[1397, 779], [1397, 792.255], [1386.25, 803], [1373, 803]],
  [[1006.53, 803]],
  [[1006.53, 803], [990.747, 803], [979.261, 817.969], [983.345, 833.212]],
  [[1019.4, 967.788]],
  [[1019.4, 967.788], [1023.49, 983.031], [1012, 998], [996.223, 998]],
  [[24, 998]],
  [[24, 998], [10.7452, 998], [0, 987.255], [0, 974]],
];

const tramosMovil: P[][] = [
  [[0, 24]],
  [[0, 24], [0, 10.7452], [10.7452, 0], [24, 0]],
  [[237.563, 0]],
  [[237.563, 0], [246.181, 0], [254.137, 4.62013], [258.408, 12.1047]],
  [[281.115, 51.8953]],
  [[281.115, 51.8953], [285.386, 59.3799], [293.342, 64], [301.96, 64]],
  [[342, 64]],
  [[342, 64], [355.255, 64], [366, 74.7452], [366, 88]],
  [[366, 607.5]],
  [[366, 607.5], [366, 620.755], [355.255, 631.5], [342, 631.5]],
  [[99.7225, 631.5]],
  [[99.7225, 631.5], [83.656, 631.5], [72.1267, 646.979], [76.7277, 662.373]],
  [[98.7723, 736.127]],
  [[98.7723, 736.127], [103.373, 751.521], [91.844, 767], [75.7775, 767]],
  [[24, 767]],
  [[24, 767], [10.7452, 767], [0, 756.255], [0, 743]],
];

const PASOS = 10;
function muestrear(inicio: P, lista: P[][]): P[] {
  const puntos: P[] = [inicio];
  for (const tramo of lista) {
    if (tramo.length === 1) {
      puntos.push(tramo[0]);
      continue;
    }
    const [p0, p1, p2, p3] = tramo;
    for (let i = 1; i <= PASOS; i++) {
      const t = i / PASOS;
      const u = 1 - t;
      const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      puntos.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
    }
  }
  return puntos;
}

const r = (v: number) => Math.round(v * 100) / 100;
function x([px, py]: P): string {
  if (px <= 30) return `${r(px)}px`;
  if (px < 970 && py <= 85) return `calc(50% + ${r(px - CENTRO)}px)`;
  return `calc(100% - ${r(ANCHO - px)}px)`;
}
function xMovil([px]: P): string {
  return px <= 110 ? `${r(px)}px` : `calc(100% - ${r(ANCHO_MOVIL - px)}px)`;
}

/** El clip-path de escritorio (1240 px o más). */
export const FORMA_HERO = `polygon(${muestrear([0, 974], tramos).map((p) => `${x(p)} ${r(p[1])}px`).join(', ')})`;

/** El clip-path del teléfono y la tableta. */
export const FORMA_HERO_MOVIL = `polygon(${muestrear([0, 743], tramosMovil).map((p) => `${xMovil(p)} ${r(p[1])}px`).join(', ')})`;
