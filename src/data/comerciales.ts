/* /comerciales: los mismos espacios en alquiler de /espacios, pero sin la
   marca Elexa, para que los asesores comerciales externos los puedan
   promocionar con su propio enlace.

   Sale todo de la misma hoja y la misma tabla que /espacios (ver
   src/lib/espacios.ts): un espacio nuevo aparece en las dos a la vez.

   Lo que cambia frente a /espacios:
   · barra y pie propios (src/components/comerciales/), con el nombre de
     abajo en vez del logo de Elexa; el pie conserva la línea legal (© Elexa,
     Powered by Khaos Core y los documentos legales);
   · sin el símbolo de Elexa en el cursor, el pin del mapa, las tarjetas sin
     foto ni el ícono de la pestaña (se usa el de la tienda de abajo);
   · los textos, el título de la pestaña y la vista previa al compartir no
     nombran a Elexa;
   · ningún contacto (ni WhatsApp ni número): los asesores son varios e
     independientes, cada uno pone el suyo al compartir. En su lugar, botones
     de compartir: la lista (barra y pie) y cada espacio (su ficha);
   · no se indexa en Google (noindex): es para compartir el enlace, no para
     competir con /espacios en las búsquedas. */

import { SITE_URL } from './site';

export const COMERCIALES_URL = '/comerciales';

/** El nombre que va en la barra, el pie, la pestaña y la vista previa al
    compartir el enlace. */
export const COMERCIALES_NOMBRE = 'Espacios comerciales';

/** «Compartir espacios» de la barra y el pie: la lista con todos los
    espacios, para src/components/Compartir.astro. */
export const COMPARTIR_LISTA = {
  titulo: `${COMERCIALES_NOMBRE} en alquiler`,
  detalle: 'todos los disponibles',
  url: `${SITE_URL}${COMERCIALES_URL}`,
  texto: 'Mira los espacios comerciales disponibles para alquilar:',
  evento: 'CompartirListado',
  categoria: 'comerciales',
};
