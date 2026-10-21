/* Los servidores de afuera de una lista de fotos, para el
   <link rel="preconnect"> de Base.astro. Sin eso, la conexión con Drive o
   Supabase se abre recién cuando aparece la primera <img> (medio segundo
   más). Las rutas propias (/img/…) no cuentan: esa conexión ya está
   abierta. */
export function origenesDe(urls: (string | null | undefined)[]): string[] {
  const origenes = new Set<string>();
  for (const url of urls) {
    if (url && /^https?:\/\//.test(url)) origenes.add(new URL(url).origin);
  }
  return [...origenes];
}
