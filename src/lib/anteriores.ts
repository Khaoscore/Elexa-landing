/* Proyectos anteriores: los pines del mapa y las tarjetas de debajo, en
   /proyectos.

   Salen de la tabla `propiedades_elexa` de Supabase, que llena sola la hoja
   de Google «Propiedades Elexa» (su Apps Script sincroniza al editar y cada
   hora; ver supabase/sincronizar-propiedades-elexa.gs). Columnas: codigo,
   nombre_del_proyecto, direccion, categoria, latitud, longitud y fotos, todo
   como texto.

   · fotos  una URL por renglón: el script cambia la carpeta de Drive de la
            celda por sus fotos, con la que se llame «Portada…» primero. Acá
            se usa la primera, con la misma interpretación que los espacios
            en alquiler (fotosDe). Sin fotos, el panel y las tarjetas muestran
            un recuadro de marca.

   Las filas sin coordenadas que caigan en Colombia no se pueden ubicar en el
   mapa: se dejan fuera y quedan avisadas en el log. */

import { consultar, hayBaseDeDatos } from './supabase';
import { fotosDe, type Foto } from './espacios';
import { anterioresRespaldo } from '../data/anteriores';

export type ProyectoAnterior = {
  /** El código de la hoja. */
  id: string;
  nombre: string;
  direccion: string;
  /** «Propiedades», «Inversiones»… */
  categoria: string;
  /** La portada; null = recuadro de marca. */
  foto: Foto | null;
  latitud: number;
  longitud: number;
};

/** Una fila de `propiedades_elexa` tal como la escribe el script de la hoja. */
export type FilaAnterior = {
  codigo: string;
  nombre_del_proyecto: string | null;
  direccion?: string | null;
  categoria?: string | null;
  latitud: string | number | null;
  longitud: string | number | null;
  fotos?: string | null;
};

const limpio = (v: string | null | undefined) => (v ?? '').replace(/\s+/g, ' ').trim();

/* Colombia, con margen. */
const LATITUD = { min: -5, max: 14 };
const LONGITUD = { min: -82, max: -66 };

const dentro = (n: number, { min, max }: { min: number; max: number }) => n >= min && n <= max;

/* «3.4611743», «3,4611743» o el número. */
function numero(valor: string | number | null): number {
  const texto = String(valor ?? '').replace(/\s/g, '');
  if (!texto) return NaN;
  return Number(/^-?\d+,\d+$/.test(texto) ? texto.replace(',', '.') : texto);
}

function coordenadas(fila: FilaAnterior): { latitud: number; longitud: number } | null {
  let latitud = numero(fila.latitud);
  let longitud = numero(fila.longitud);

  /* La hoja está en español de México, donde la coma separa los miles: al
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

export function aAnterior(fila: FilaAnterior): ProyectoAnterior | null {
  const id = limpio(String(fila.codigo ?? ''));
  const nombre = limpio(fila.nombre_del_proyecto);
  if (!id || !nombre) return null;

  const ubicacion = coordenadas(fila);
  if (!ubicacion) {
    console.warn(
      `[anteriores] «${nombre}» (${id}) no sale en el mapa: latitud «${fila.latitud}» y longitud «${fila.longitud}» no caen en Colombia.`,
    );
    return null;
  }

  return {
    id,
    nombre,
    direccion: limpio(fila.direccion),
    categoria: limpio(fila.categoria),
    foto: fotosDe(fila.fotos ?? '', nombre)[0] ?? null,
    ...ubicacion,
  };
}

/* En el orden de los códigos (el de la hoja), comparando los números como
   números: 12002 antes que 12010. */
const porCodigo = (a: ProyectoAnterior, b: ProyectoAnterior) => a.id.localeCompare(b.id, 'es', { numeric: true });

export async function getProyectosAnteriores(): Promise<ProyectoAnterior[]> {
  try {
    const filas = hayBaseDeDatos
      ? await consultar<FilaAnterior>('propiedades_elexa', { select: '*' })
      : anterioresRespaldo;
    /* Con RLS activo y sin la política de lectura, Supabase no da error:
       devuelve la tabla vacía. */
    if (!filas.length) console.warn('[anteriores] `propiedades_elexa` vino vacía (¿falta la política de lectura?).');
    return filas.flatMap((fila) => aAnterior(fila) ?? []).sort(porCodigo);
  } catch (error) {
    console.error('[anteriores] No se pudo leer la tabla `propiedades_elexa` de Supabase:', error);
    return [];
  }
}
