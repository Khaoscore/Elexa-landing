/* Datos que se repiten en más de una sección. Si un enlace cambia, se cambia
   acá y las vistas lo toman solas.

   Un destino en `null` es un enlace que el diseño dibuja pero que todavía no
   tiene a dónde ir (páginas que no existen aún, como «Trabaja con nosotros»).
   Se pinta igual, como <a> sin href: no lleva a ningún lado, no recibe foco y
   no se ve roto. Cuando exista la página, basta con poner la URL. */

export const SITE_URL = 'https://www.elexa.com.co';
export const SITE_NAME = 'Elexa Real Estate Investments';

/* Los mismos destinos que usan las landings de Florentino y Proyecto e. */
export const WHATSAPP_URL = 'https://wa.link/avoqut';
export const INSTAGRAM_URL = 'https://www.instagram.com/luis_inversionista/';
/* La radiografía ahora vive dentro del sitio (sección «Libertad»); esta URL
   queda de respaldo para quien no tenga JavaScript. */
export const RADIOGRAFIA_URL = 'https://florentino.elexa.com.co/radiografia';

/* «Hablemos», el botón de la barra: la conversación por WhatsApp. */
export const HABLEMOS_URL = WHATSAPP_URL;

/* «Agenda tu cita» (preguntas frecuentes y «10 minutos con Luis» en
   /como-participar). Florentino y Proyecto e tienen cada uno su Calendly; para
   la marca general todavía no hay uno, así que por ahora abre el WhatsApp. */
export const AGENDA_URL: string | null = WHATSAPP_URL;

/* «Log in», el botón de la barra: el portal de inversionistas (Agora). */
export const LOGIN_URL: string | null = 'https://elexa.portal.agorareal.com/#/login?redirectUrl=%2F';

/* «Ver más proyectos» (portada) y «Ver espacios disponibles» (/proyectos). */
export const PROYECTOS_URL = '/proyectos';
export const ESPACIOS_URL = '/espacios';

export type Enlace = { label: string; href: string | null };

/* Barra: una página por enlace. */
export const navLinks: { label: string; href: string }[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Nosotros', href: '/nosotros' },
  { label: 'Proyectos', href: '/proyectos' },
  { label: 'Cómo participar', href: '/como-participar' },
];

/* Columnas del pie («Footer», 6:412 y 303:4606). */
export const footerColumns: { titulo: string; enlaces: Enlace[] }[] = [
  {
    titulo: 'Proyectos',
    enlaces: [
      { label: 'Florentino', href: 'https://florentino.elexa.com.co' },
      { label: 'Proyecto e', href: 'https://proyecto-e.elexa.com.co' },
      { label: 'Ver todos', href: PROYECTOS_URL },
      { label: 'En alquiler', href: ESPACIOS_URL },
    ],
  },
  {
    titulo: 'Elexa',
    enlaces: [
      { label: 'Inicio', href: '/' },
      { label: 'Nosotros', href: '/nosotros' },
      { label: 'Proyectos', href: '/proyectos' },
      { label: 'Cómo participar', href: '/como-participar' },
    ],
  },
];

/* «Síguenos» del pie: el ícono es el nombre del archivo en public/img/pie/.
   El número abre la misma conversación de WhatsApp que el resto del sitio. */
export const redes: { icono: 'whatsapp' | 'instagram' | 'youtube'; label: string; href: string }[] = [
  { icono: 'whatsapp', label: '333 4307 840', href: WHATSAPP_URL },
  { icono: 'instagram', label: '@elexa_real_estate', href: 'https://www.instagram.com/elexa_real_estate/' },
  { icono: 'youtube', label: '@luis_inversionista', href: 'https://www.youtube.com/@luis_inversionista' },
];

/* Crédito de la agencia, en el centro de la línea legal del pie. */
export const POWERED_BY = { label: 'Khaos Core', href: 'https://khaoscore.com' };

/* Los enlaces que salen del sitio se abren en otra pestaña. */
export function esExterno(href: string | null): boolean {
  return href !== null && /^https?:\/\//.test(href);
}
