/* Espacios en alquiler (tabla `espacios`): la grilla de /espacios y la ficha
   de cada uno en /espacios/{slug}. */

import { consultar, hayBaseDeDatos, urlImagen } from './supabase';
import { espaciosRespaldo } from '../data/espacios';

/* Los íconos de la ficha. Son los cinco del diseño (Material Icons); cada
   característica elige uno por nombre. */
export const ICONOS = ['ubicacion', 'area', 'niveles', 'entorno', 'parqueadero'] as const;
export type Icono = (typeof ICONOS)[number];

export type Caracteristica = { icono: Icono; texto: string };

export type Espacio = {
  id: string;
  /** El tramo de la URL: /espacios/{slug}. */
  slug: string;
  /** Lo primero que se lee en la tarjeta y el título de la ficha. */
  titulo: string;
  /** La línea chica de la tarjeta («Sobre la AV 9N»). */
  direccion: string;
  /** El barrio o la zona, en grande («Granada»). */
  zona: string;
  imagen: string;
  imagenAlt: string;
  /** «$2.990.000». Vacío = la ficha no muestra precio. */
  precio: string;
  /** Lo que va en chico al lado del precio («+ IVA»). */
  precioNota: string;
  caracteristicas: Caracteristica[];
};

type Fila = {
  id: string;
  slug: string;
  titulo: string;
  direccion: string | null;
  zona: string | null;
  imagen: string;
  imagen_alt: string | null;
  precio: string | null;
  precio_nota: string | null;
  caracteristicas: { icono?: string; texto?: string }[] | null;
};

const COLUMNAS = 'id,slug,titulo,direccion,zona,imagen,imagen_alt,precio,precio_nota,caracteristicas';

function aEspacio(fila: Fila): Espacio {
  return {
    id: fila.id,
    slug: fila.slug,
    titulo: fila.titulo,
    direccion: fila.direccion ?? '',
    zona: fila.zona ?? '',
    imagen: urlImagen(fila.imagen),
    imagenAlt: fila.imagen_alt ?? '',
    precio: fila.precio ?? '',
    precioNota: fila.precio_nota ?? '',
    caracteristicas: (fila.caracteristicas ?? [])
      .filter((c) => c.texto)
      .map((c) => ({
        icono: ICONOS.includes(c.icono as Icono) ? (c.icono as Icono) : 'ubicacion',
        texto: c.texto as string,
      })),
  };
}

export async function getEspacios(): Promise<Espacio[]> {
  if (!hayBaseDeDatos) return espaciosRespaldo;

  try {
    const filas = await consultar<Fila>('espacios', {
      select: COLUMNAS,
      publicado: 'is.true',
      order: 'orden.asc,creado_en.asc',
    });
    return filas.map(aEspacio);
  } catch (error) {
    console.error('[espacios] No se pudo leer la tabla de Supabase:', error);
    return [];
  }
}

/** El espacio publicado con ese slug, o null si no existe. Si Supabase falla
    lanza el error: mejor un 500 que un «no existe» falso. */
export async function getEspacio(slug: string): Promise<Espacio | null> {
  if (!hayBaseDeDatos) return espaciosRespaldo.find((e) => e.slug === slug) ?? null;

  const filas = await consultar<Fila>('espacios', {
    select: COLUMNAS,
    publicado: 'is.true',
    slug: `eq.${slug}`,
    limit: '1',
  });
  return filas[0] ? aEspacio(filas[0]) : null;
}
