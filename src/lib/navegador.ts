/* Ayudas que sólo corren en el navegador y usan varios componentes: copiar
   al portapapeles y reportar un evento propio al pixel de Meta. */

type Fbq = (...args: unknown[]) => void;

/** Un evento personalizado (trackCustom) del pixel. Sin pixel —en local, en
    las vistas previas o si el navegador lo bloquea— no hace nada. Ver el mapa
    de eventos en src/components/MetaPixel.astro. */
export function reportarPropio(evento: string, nombre: string, categoria: string): void {
  (window as { fbq?: Fbq }).fbq?.('trackCustom', evento, {
    content_name: nombre,
    content_category: categoria,
  });
}

/* Respaldo para navegadores sin portapapeles (o sin permiso). */
function copiarAPulso(texto: string): boolean {
  try {
    const campo = document.createElement('textarea');
    campo.value = texto;
    campo.setAttribute('readonly', '');
    campo.style.position = 'fixed';
    campo.style.opacity = '0';
    document.body.appendChild(campo);
    campo.select();
    const ok = document.execCommand('copy');
    campo.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Copia el texto; true si se pudo. */
export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return copiarAPulso(texto);
  }
}
