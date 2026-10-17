/* Proyectos abiertos (tabla `proyectos`): las tarjetas de la portada y de
   /proyectos. Se muestran las filas con `publicado = true`, ordenadas por
   `orden`; agregar, editar, despublicar o reordenar un proyecto en Supabase
   cambia las dos páginas sin tocar código ni volver a desplegar. */

import { consultar, hayBaseDeDatos, urlImagen } from './supabase';
import { proyectosRespaldo } from '../data/proyectos';

export type Proyecto = {
  id: string;
  nombre: string;
  descripcion: string;
  /** URL absoluta de la foto, lista para el <img>. */
  imagen: string;
  /** Foto para la tarjeta ancha de /proyectos; si no hay, la de arriba. */
  imagenGrande: string;
  imagenAlt: string;
  /** A dónde lleva «Ver más» / «Ver proyecto». */
  enlace: string;
};

/* Una fila tal como la devuelve la API (columnas en snake_case). */
type Fila = {
  id: string;
  nombre: string;
  descripcion: string;
  imagen: string;
  imagen_grande: string | null;
  imagen_alt: string | null;
  enlace: string;
};

export async function getProyectosAbiertos(): Promise<Proyecto[]> {
  if (!hayBaseDeDatos) return proyectosRespaldo;

  try {
    const filas = await consultar<Fila>('proyectos', {
      select: 'id,nombre,descripcion,imagen,imagen_grande,imagen_alt,enlace',
      publicado: 'is.true',
      order: 'orden.asc,creado_en.asc',
    });
    return filas.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      descripcion: fila.descripcion,
      imagen: urlImagen(fila.imagen),
      imagenGrande: urlImagen(fila.imagen_grande || fila.imagen),
      imagenAlt: fila.imagen_alt ?? '',
      enlace: fila.enlace,
    }));
  } catch (error) {
    /* Sin datos frescos la sección no se muestra. Los de respaldo podrían
       anunciar como abierto un proyecto que ya cerró. */
    console.error('[proyectos] No se pudo leer la tabla de Supabase:', error);
    return [];
  }
}
