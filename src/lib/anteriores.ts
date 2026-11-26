/* Proyectos anteriores: los pines del mapa y las tarjetas de debajo, en
   /proyectos.

   Salen de la tabla `propiedades_elexa` de Supabase, que llena sola la hoja
   de Google «Propiedades Elexa» (su Apps Script sincroniza al editar y cada
   hora; ver supabase/sincronizar-propiedades-elexa.gs). Columnas: codigo,
   nombre_del_proyecto, direccion, categoria, latitud, longitud y fotos, y las
   opcionales area, espacio, ventaja y caracteristicas, todo como texto.

   · fotos            una URL por renglón: el script cambia la carpeta de
                      Drive de la celda por sus fotos, con la que se llame
                      «Portada…» primero. Se usa la primera, con la misma
                      interpretación que los espacios en alquiler (fotosDe),
                      en el panel y en la tarjeta. Sin fotos, los dos
                      muestran un recuadro de marca.
   · area             «160» (se le suma « m²») o «160 m²».
   · espacio, ventaja «Piso 5 y 6», «Vista 360».
   · caracteristicas  separadas por coma o renglón: «Esquinero, Con ascensor».
   Las opcionales vacías no se muestran.

   «Proyecto abierto» no está en la hoja: lo lleva el que se llame como uno
   de los proyectos abiertos (tabla `proyectos`), sin contar mayúsculas ni
   tildes, solo o con algo más después: «Karanis I» en la hoja es Karanis.
   Así, al despublicar el proyecto abierto la etiqueta se va sola.

   Los que tienen marca propia (src/data/marcas.ts, con la misma regla de
   nombres) llevan su pin, su sello y sus colores en el mapa.

   Las filas sin coordenadas que caigan en Colombia no se pueden ubicar en el
   mapa: se dejan fuera y quedan avisadas en el log. */

import { consultar, hayBaseDeDatos } from './supabase';
import { fotosDe, type Foto } from './espacios';
import { coordenadas } from './coordenadas';
import { anterioresRespaldo } from '../data/anteriores';
import { marcas, type Marca } from '../data/marcas';

export type ProyectoAnterior = {
  /** El código de la hoja. */
  id: string;
  nombre: string;
  direccion: string;
  /** «Propiedades», «Inversiones»… */
  categoria: string;
  /** La portada; null = recuadro de marca. */
  foto: Foto | null;
  /** «160 m²»; vacío si la hoja no lo trae, como los dos de abajo. */
  area: string;
  espacio: string;
  ventaja: string;
  /** «Esquinero», «Con ascensor»… */
  caracteristicas: string[];
  /** Se llama igual que uno de los proyectos abiertos. */
  abierto: boolean;
  /** Pin, sello y colores propios; null = los de Elexa. */
  marca: Marca | null;
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
  area?: string | null;
  espacio?: string | null;
  ventaja?: string | null;
  caracteristicas?: string | null;
};

const limpio = (v: string | null | undefined) => (v ?? '').replace(/\s+/g, ' ').trim();

/* Sólo la cifra («160», «160,5»): se le suma la unidad. */
const conUnidad = (area: string) => (/^\d+(?:[.,]\d+)?$/.test(area) ? `${area} m²` : area);

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/* El de la hoja se llama como `otro`: igual, o igual y algo más después de
   un espacio («karanis i» es «karanis», pero «proyecto esmeralda» no es
   «proyecto e»). */
const seLlamaComo = (nombre: string, otro: string) => {
  const n = normalizar(nombre);
  const o = normalizar(otro);
  return Boolean(o) && (n === o || n.startsWith(`${o} `));
};

export function aAnterior(fila: FilaAnterior): ProyectoAnterior | null {
  const id = limpio(String(fila.codigo ?? ''));
  const nombre = limpio(fila.nombre_del_proyecto);
  if (!id || !nombre) return null;

  const ubicacion = coordenadas(fila.latitud, fila.longitud);
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
    area: conUnidad(limpio(fila.area)),
    espacio: limpio(fila.espacio),
    ventaja: limpio(fila.ventaja),
    caracteristicas: (fila.caracteristicas ?? '')
      .split(/[,\n]/)
      .map((c) => limpio(c))
      .filter(Boolean),
    abierto: false,
    marca: marcas.find((m) => seLlamaComo(nombre, m.nombre))?.marca ?? null,
    ...ubicacion,
  };
}

/* En el orden de los códigos (el de la hoja), comparando los números como
   números: 12002 antes que 12010. */
const porCodigo = (a: ProyectoAnterior, b: ProyectoAnterior) => a.id.localeCompare(b.id, 'es', { numeric: true });

/** @param abiertos los nombres de los proyectos abiertos (tabla `proyectos`). */
export async function getProyectosAnteriores(abiertos: string[] = []): Promise<ProyectoAnterior[]> {
  try {
    const filas = hayBaseDeDatos
      ? await consultar<FilaAnterior>('propiedades_elexa', { select: '*' })
      : anterioresRespaldo;
    /* Con RLS activo y sin la política de lectura, Supabase no da error:
       devuelve la tabla vacía. */
    if (!filas.length) console.warn('[anteriores] `propiedades_elexa` vino vacía (¿falta la política de lectura?).');
    return filas
      .flatMap((fila) => aAnterior(fila) ?? [])
      .map((p) => ({ ...p, abierto: abiertos.some((a) => seLlamaComo(p.nombre, a)) }))
      .sort(porCodigo);
  } catch (error) {
    console.error('[anteriores] No se pudo leer la tabla `propiedades_elexa` de Supabase:', error);
    return [];
  }
}
