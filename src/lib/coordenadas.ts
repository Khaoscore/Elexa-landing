/* Latitud y longitud de las hojas de Google: el mapa de /proyectos
   (src/lib/anteriores.ts) y el de cada espacio en alquiler
   (src/lib/espacios.ts). Las hojas las mandan como texto. */

export type Coordenadas = { latitud: number; longitud: number };

/* Colombia, con margen. */
const LATITUD = { min: -5, max: 14 };
const LONGITUD = { min: -82, max: -66 };

const dentro = (n: number, { min, max }: { min: number; max: number }) => n >= min && n <= max;

/* «3.4611743», «3,4611743» o el número. */
function numero(valor: string | number | null | undefined): number {
  const texto = String(valor ?? '').replace(/\s/g, '');
  if (!texto) return NaN;
  return Number(/^-?\d+,\d+$/.test(texto) ? texto.replace(',', '.') : texto);
}

/** Metros entre dos puntos (aproximación plana: sobra para una ciudad). */
export function distancia(a: Coordenadas, b: Coordenadas): number {
  const este = (b.longitud - a.longitud) * Math.cos((((a.latitud + b.latitud) / 2) * Math.PI) / 180) * 111320;
  const norte = (b.latitud - a.latitud) * 110574;
  return Math.hypot(este, norte);
}

/** Las dos cifras ya como números, o null si están vacías o no caen en
    Colombia. */
export function coordenadas(
  latitudCelda: string | number | null | undefined,
  longitudCelda: string | number | null | undefined,
): Coordenadas | null {
  let latitud = numero(latitudCelda);
  let longitud = numero(longitudCelda);

  /* Una hoja en español de México toma la coma como separador de miles: al
     pegar «3,4611743» Sheets guarda 34.611.743 y la coma decimal se pierde
     (llegan 34611743 y -765327887). En Colombia la longitud siempre tiene dos
     cifras enteras: de ella sale cuántos decimales se perdieron, y la latitud,
     que viene del mismo lado, se divide igual. */
  if (Number.isInteger(longitud) && !dentro(longitud, LONGITUD)) {
    const escala = 10 ** (String(Math.abs(longitud)).length - 2);
    longitud /= escala;
    if (Number.isInteger(latitud) && !dentro(latitud, LATITUD)) latitud /= escala;
  }

  return dentro(latitud, LATITUD) && dentro(longitud, LONGITUD) ? { latitud, longitud } : null;
}
