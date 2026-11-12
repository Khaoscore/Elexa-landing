/* Los enlaces de la ventana de «Compartir» (src/components/Compartir.astro).
   Los arma el servidor al pintar la ventana y el navegador cuando el enlace
   cambia después (la selección de /comerciales): por eso viven acá. */

export type Red = 'whatsapp' | 'facebook' | 'x' | 'telegram';

export const REDES: { red: Red; nombre: string }[] = [
  { red: 'whatsapp', nombre: 'WhatsApp' },
  { red: 'facebook', nombre: 'Facebook' },
  { red: 'x', nombre: 'X' },
  { red: 'telegram', nombre: 'Telegram' },
];

/** El enlace de cada red para compartir `url` con el mensaje `texto`. */
export function enlaceDe(red: Red, url: string, texto: string): string {
  const e = encodeURIComponent;
  switch (red) {
    case 'whatsapp':
      return `https://wa.me/?text=${e(`${texto} ${url}`)}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`;
    case 'x':
      return `https://x.com/intent/post?text=${e(texto)}&url=${e(url)}`;
    case 'telegram':
      return `https://t.me/share/url?url=${e(url)}&text=${e(texto)}`;
  }
}
