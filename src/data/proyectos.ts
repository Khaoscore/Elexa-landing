/* Proyectos de respaldo para «Proyectos abiertos».

   La fuente real es la tabla `proyectos` de Supabase (ver src/lib/proyectos.ts
   y supabase/esquema.sql). Esta lista se usa sólo cuando el sitio corre sin
   credenciales de Supabase —en local recién clonado, o en un preview sin
   variables—, para que la sección no quede vacía mientras se desarrolla.

   Son los dos proyectos que trae el diseño de Figma, con su copy tal cual
   (lo que va entre ** sale en negrita, ver src/lib/negritas.ts), y Karanis,
   el tercero, que pasa la portada al carrusel. Las fotos son las originales
   de las tarjetas (sin el recorte de la forma, que lo pone el CSS),
   achicadas para web; la de Proyecto e ya viene encuadrada como en Figma,
   que la acerca, y la de Karanis es el render de la esquina
   (sala/Nuevo evento/Imagenes/render 2). Son también las que hay que subir a
   la carpeta `proyectos/` del bucket `imagenes`.

   La landing de Karanis es parte de este sitio (/karanis), así que su
   «Ver más» abre en la misma pestaña. En Supabase también va `/karanis`
   en la columna `enlace`.

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
  {
    id: 'karanis',
    nombre: 'Karanis',
    descripcion:
      'Un street mall en la **Calle 14 de Cali** que ya cuenta con Dollarcity, D1 y la multinacional Fitness24seven como inquilinos. Participa desde **$100 millones.**',
    imagen: '/img/proyectos/karanis.jpg',
    imagenGrande: '/img/proyectos/karanis.jpg',
    imagenAlt:
      'Render de Karanis en una esquina de Cali: un edificio comercial con locales a la calle y los avisos de Dollarcity, D1 y Fitness24seven.',
    enlace: '/karanis',
  },
];
