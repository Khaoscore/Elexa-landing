/* «Nuestro equipo» (página /nosotros). Cada persona es una tarjeta de
   387 × 486 con la foto ya recortada con la forma del diseño (muescas arriba a
   la izquierda y abajo a la derecha, y el degradado de abajo).

   Para sumar a alguien: exportar su tarjeta desde Figma (el vector con la
   foto, a 2×) como WebP en public/img/equipo/ y agregar una fila acá.

   Al pasar el mouse por encima de la tarjeta (o al tocarla en el teléfono)
   sale una capa morada: con el `correo` y el `telefono` de la gente de
   Elexa, o con el logo de la `empresa` de los aliados externos, que lleva a
   su sitio. Quien no tenga ninguno de los dos no muestra nada. */

export type Empresa = {
  /* La línea en negrita debajo del nombre. */
  nombre: string;
  sitio: string;
  /* Logo blanco (va sobre el morado); `ancho` y `alto` son los del archivo. */
  logo: { src: string; ancho: number; alto: number };
};

export type Integrante = {
  nombre: string;
  cargo: string;
  empresa?: Empresa;
  foto: string;
  /* Como se lee: «+57 302 2964127». Al tocarlo abre su chat de WhatsApp
     (wa.me con los puros dígitos), así que tiene que ser un celular. */
  telefono?: string;
  correo?: string;
};

/* Los logos son los de la banda de «Respaldo institucional». */
const khaosCore: Empresa = {
  nombre: 'Khaos Core',
  sitio: 'https://www.khaoscore.com/',
  logo: { src: '/img/logos/banda/khaoscore.webp', ancho: 432, alto: 160 },
};

const avilaToro: Empresa = {
  nombre: 'Ávila Toro - Boutique Legal',
  sitio: 'https://avilatoro.com/',
  logo: { src: '/img/logos/banda/avila-toro.webp', ancho: 683, alto: 160 },
};

const wefilm: Empresa = {
  nombre: 'WEFILM',
  sitio: 'https://www.instagram.com/wefilmbc/',
  logo: { src: '/img/logos/banda/wefilm.webp', ancho: 253, alto: 160 },
};

export const equipo: Integrante[] = [
  {
    nombre: 'Isabella Lucumí',
    cargo: 'Auxiliar Administrativa',
    foto: '/img/equipo/isabella-lucumi.webp',
    telefono: '+57 302 2964127',
    correo: 'ilucumi@elexa.com.co',
  },
  {
    nombre: 'Juan Pablo',
    cargo: 'Director Administrativo',
    foto: '/img/equipo/juan-pablo.webp',
    telefono: '+57 302 2964122',
    correo: 'jpbaron@elexa.com.co',
  },
  {
    nombre: 'Álvaro Ruiz',
    cargo: 'Coordinador de Marketing',
    foto: '/img/equipo/alvaro-ruiz.webp',
    telefono: '+57 324 5841949',
    correo: 'marketing@elexa.com.co',
  },
  {
    nombre: 'Johan',
    cargo: 'Ingeniero de Proyectos',
    foto: '/img/equipo/johan.webp',
    telefono: '+57 301 5031398',
    correo: 'proyectos@elexa.com.co',
  },
  {
    nombre: 'Jonathan',
    cargo: 'Contador',
    foto: '/img/equipo/jonathan.webp',
    telefono: '+57 312 3209545',
    correo: 'contador@elexa.com.co',
  },
  {
    nombre: 'Andrea',
    cargo: 'Auxiliar Contable',
    foto: '/img/equipo/andrea.webp',
    telefono: '+57 300 4513120',
    correo: 'contabilidad@elexa.com.co',
  },
  {
    nombre: 'Nicolás Osorno',
    empresa: khaosCore,
    cargo: 'Aliado de Diseño y Tecnología',
    foto: '/img/equipo/nicolas-osorno.webp',
  },
  {
    nombre: 'Isabella Rodríguez',
    empresa: khaosCore,
    cargo: 'Aliada de Diseño y Tecnología',
    foto: '/img/equipo/isabella-rodriguez.webp',
  },
  {
    nombre: 'Juan Cedeño',
    empresa: khaosCore,
    cargo: 'Aliado de Diseño y Tecnología',
    foto: '/img/equipo/juan-cedeno.webp',
  },
  {
    nombre: 'Juan Ávila Toro',
    empresa: avilaToro,
    cargo: 'Abogados aliados',
    foto: '/img/equipo/juan-avila-toro.webp',
  },
  {
    nombre: 'Daniela',
    empresa: avilaToro,
    cargo: 'Abogados aliados',
    foto: '/img/equipo/daniela.webp',
  },
  {
    nombre: 'Steph & Jorge',
    empresa: wefilm,
    cargo: 'Aliados producción audiovisual',
    foto: '/img/equipo/steph-jorge.webp',
  },
];
