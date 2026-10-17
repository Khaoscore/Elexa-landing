/* Proyectos anteriores (tabla `proyectos_anteriores`): los pines del mapa y
   las tarjetas de debajo, en /proyectos. Cada fila lleva sus coordenadas
   (latitud y longitud, las mismas que da Google Maps al hacer clic derecho
   sobre un punto). */

import { consultar, hayBaseDeDatos, urlImagen } from './supabase';
import { anterioresRespaldo } from '../data/anteriores';

export type ProyectoAnterior = {
  id: string;
  nombre: string;
  /** El texto corto bajo el pin seleccionado («Rooftop»). */
  etiquetaMapa: string;
  direccion: string;
  imagen: string;
  imagenAlt: string;
  /** Las dos etiquetas del panel («Esquinero», «Con ascensor»). */
  caracteristicas: string[];
  area: string;
  espacio: string;
  ventaja: string;
  precio: string;
  latitud: number;
  longitud: number;
};

type Fila = {
  id: string;
  nombre: string;
  etiqueta_mapa: string | null;
  direccion: string | null;
  imagen: string;
  imagen_alt: string | null;
  caracteristicas: string[] | null;
  area: string | null;
  espacio: string | null;
  ventaja: string | null;
  precio: string | null;
  latitud: number;
  longitud: number;
};

export async function getProyectosAnteriores(): Promise<ProyectoAnterior[]> {
  if (!hayBaseDeDatos) return anterioresRespaldo;

  try {
    const filas = await consultar<Fila>('proyectos_anteriores', {
      select:
        'id,nombre,etiqueta_mapa,direccion,imagen,imagen_alt,caracteristicas,area,espacio,ventaja,precio,latitud,longitud',
      publicado: 'is.true',
      order: 'orden.asc,creado_en.asc',
    });
    return filas.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      etiquetaMapa: fila.etiqueta_mapa || fila.nombre,
      direccion: fila.direccion ?? '',
      imagen: urlImagen(fila.imagen),
      imagenAlt: fila.imagen_alt ?? '',
      caracteristicas: fila.caracteristicas ?? [],
      area: fila.area ?? '',
      espacio: fila.espacio ?? '',
      ventaja: fila.ventaja ?? '',
      precio: fila.precio ?? '',
      latitud: fila.latitud,
      longitud: fila.longitud,
    }));
  } catch (error) {
    console.error('[anteriores] No se pudo leer la tabla de Supabase:', error);
    return [];
  }
}
