/* Eventos del pixel de Meta. El mapa completo de qué se reporta y dónde está
   en src/components/MetaPixel.astro. */

/** El evento que una página reporta al cargar, después de la visita
    (PageView). `propio` es un evento personalizado (trackCustom), que Meta no
    trae de fábrica. Lo recibe Base.astro. */
export type EventoPagina = {
  evento: string;
  propio?: boolean;
  parametros: Record<string, string>;
};

/** «Proyecto e» → «Proyecto_E»: el nombre del proyecto como lo lee el
    reporte de Meta (cada palabra con mayúscula, sin tildes, unidas con _). */
export function nombreParaPixel(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .split(/\s+/)
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join('_');
}

/** Reporta un evento desde el código (el formulario de la radiografía). Sin
    pixel —en local, en las vistas previas o si el navegador lo bloquea— no
    hace nada. */
export function reportarPixel(evento: string, parametros: Record<string, string>): void {
  const fbq = (window as { fbq?: (...args: unknown[]) => void }).fbq;
  if (typeof fbq === 'function') fbq('track', evento, parametros);
}
