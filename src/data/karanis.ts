/* Datos de la página de Karanis (/karanis): lo que se cambia sin tocar el
   diseño. Los textos largos (los párrafos, los títulos con su palabra en
   morado) están en cada sección, en src/components/karanis/.

   Copy: el frame «Desktop - 7» (521:748) del archivo de Figma y, donde el
   diseño trae texto de relleno, el «Brief landing page Karanis» (5 nov 2026,
   sala/Nuevo evento/Info/). Según el brief sólo hay tres cifras confirmadas
   con Luis (ticket, flujo y plazo); el resto (sociedad, dirección,
   vehículo) sale del contrato. */

import type { Coordenadas } from '../lib/coordenadas';

export const KARANIS = {
  nombre: 'Karanis',

  /* La dirección del contrato. El diseño pone «El Refugio / Cra 66 # 2 A -
     33», que es texto de relleno: el lote está en la Calle 14, en Primero de
     Mayo (Comuna 17), como dice el primer punto de «Una ubicación que el
     mercado ya eligió». */
  barrio: 'Primero de Mayo',
  direccion: 'Calle 14 # 53-07',

  /* El pin del mapa y el destino de «¿Cómo llegar?». Es el cruce de la Calle
     14 con la Carrera 53 en OpenStreetMap, a 7 m de la placa: confirmar con
     el punto exacto del lote (de Google Maps, clic derecho → copiar las
     coordenadas) y reemplazarlo acá. */
  ubicacion: { latitud: 3.40556, longitud: -76.53096 } satisfies Coordenadas,
} as const;

/* «Conoce más» del hero: el WhatsApp de Luis (333 430 7840) con el mensaje
   ya escrito. */
const MENSAJE_WHATSAPP = 'Hola, Luis. Quisiera conocer más acerca del proyecto Karanis.';
export const WHATSAPP_KARANIS = `https://api.whatsapp.com/send?phone=573334307840&text=${encodeURIComponent(MENSAJE_WHATSAPP)}`;

/* «Una ubicación que el mercado ya eligió»: los tres puntos al lado del mapa. */
export const puntosUbicacion = [
  { titulo: 'Sector consolidado', texto: 'Entre la calle 14 entre carreras 50 y 56' },
  { titulo: 'Base de clientes en el entorno', texto: 'Alta densidad residencial' },
  { titulo: 'Validación del retail', texto: 'D1, Dollarcity y 24Seven firmaron carta de intención por este lote' },
];

/* La banda de cifras. Las tres primeras son las confirmadas del brief. */
export const cifrasKaranis = [
  { antes: 'Desde', cifra: '$100M', texto: 'Ticket de entrada' },
  { antes: 'Hasta', cifra: '9,4%', texto: 'Flujo estimado primer año' },
  { antes: 'Hasta', cifra: '4 meses', texto: 'Para completar tu aporte' },
  { antes: 'Ya firmadas', cifra: '3 marcas', texto: 'Dollarcity, D1 y Fitness24Seven' },
];

/* «Por qué Karanis»: los tres pilares. El ícono es el archivo de
   public/img/iconos/ (los dos últimos llevan el mismo en Figma). */
export const pilares = [
  {
    icono: 'attach-money',
    titulo: 'Flujo desde el primer año',
    texto: 'Hasta 9,4% de flujo estimado el primer año, con distribuciones trimestrales.',
  },
  {
    icono: 'corporate-fare',
    titulo: 'Aporte en pocos meses',
    texto: 'Completas tu participación en hasta 4 meses, sin financiar una obra de años.',
  },
  {
    icono: 'corporate-fare',
    titulo: 'Cero administración',
    texto: 'Elexa gestiona el activo y tú sigues todo desde el Portal de Socios.',
  },
];
