/* Proyectos de respaldo para «Proyectos abiertos».

   La fuente real es la tabla `proyectos` de Supabase (ver src/lib/proyectos.ts
   y supabase/esquema.sql). Esta lista se usa sólo cuando el sitio corre sin
   credenciales de Supabase —en local recién clonado, o en un preview sin
   variables—, para que la sección no quede vacía mientras se desarrolla.

   Son los dos proyectos que trae el diseño de Figma, con su copy tal cual
   (lo que va entre ** sale en negrita, ver src/lib/negritas.ts). Las fotos
   son las originales de las tarjetas (sin el recorte de la forma, que lo pone
   el CSS), achicadas para web; la de Proyecto e ya viene encuadrada como en
   Figma, que la acerca. Son también las que hay que subir a la carpeta
   `proyectos/` del bucket `imagenes` la primera vez.

   La portada y /proyectos usan hoy la misma foto de cada proyecto, así que
   `imagenGrande` repite `imagen`. */

import type { Proyecto } from '../lib/proyectos';

export const proyectosRespaldo: Proyecto[] = [
  {
    id: 'proyecto-e',
    nombre: 'Proyecto e',
    descripcion:
      'Edificio mixto de **14 pisos en Normandía.** Un proyecto colectivo de Elexa con locales, oficinas y apartamentos. Participa desde **$120.9 millones.**',
    imagen: '/img/proyectos/proyecto-e.jpg',
    imagenGrande: '/img/proyectos/proyecto-e.jpg',
    imagenAlt: 'Vista aérea de Proyecto e en Normandía: una torre con balcones cubiertos de plantas entre edificios blancos.',
    enlace: 'https://proyecto-e.elexa.com.co',
  },
  {
    id: 'florentino',
    nombre: 'Florentino',
    descripcion:
      'Contará con 8 pisos, sótano y terraza en **la esquina más visible del Peñón**. Un proyecto colectivo de Elexa con locales, oficinas y apartamentos. Participa desde **$150 millones.**',
    imagen: '/img/proyectos/florentino.jpg',
    imagenGrande: '/img/proyectos/florentino.jpg',
    imagenAlt: 'Render de Florentino al atardecer en una esquina del Peñón, con su escalera helicoidal magenta en la fachada.',
    enlace: 'https://florentino.elexa.com.co',
  },
];
