/* Acceso de sólo lectura a Supabase, compartido por las tres tablas del sitio:
   `proyectos` (proyectos abiertos), `proyectos_anteriores` (el mapa) y
   `espacios` (locales en alquiler). El esquema está en supabase/esquema.sql.

   Se consulta la API REST (PostgREST) con un fetch: para leer filas públicas
   no hace falta cargar el cliente @supabase/supabase-js. La clave es la
   pública del proyecto; lo que se puede leer con ella lo deciden las
   políticas RLS de cada tabla, que sólo dejan ver lo publicado.

   Las credenciales se leen en el servidor (`astro:env/server`) y nunca llegan
   al navegador. Si no están, `hayBaseDeDatos` es false y cada sección usa sus
   datos de respaldo de src/data/. */

import { SUPABASE_KEY, SUPABASE_URL } from 'astro:env/server';

export const hayBaseDeDatos = Boolean(SUPABASE_URL && SUPABASE_KEY);

/* Todas las fotos van en un solo bucket público, con una carpeta por tabla
   (`proyectos/`, `anteriores/`, `espacios/`). */
const BUCKET = 'imagenes';

/* Si Supabase no contesta en este tiempo se corta, en vez de dejar la página
   colgada. */
const TIMEOUT_MS = 4000;

/** GET /rest/v1/{tabla}?{filtros}. Lanza un error si la respuesta no es 2xx. */
export async function consultar<T>(tabla: string, filtros: Record<string, string>): Promise<T[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase no está configurado');

  const url = new URL(`/rest/v1/${tabla}`, SUPABASE_URL);
  for (const [clave, valor] of Object.entries(filtros)) url.searchParams.set(clave, valor);

  /* Las claves nuevas de Supabase (`sb_publishable_…`) van sólo en `apikey`:
     no son un JWT y el header Authorization las rechaza. La `anon` de los
     proyectos viejos sí es un JWT y se manda en los dos, como hace el cliente
     oficial. */
  const headers: Record<string, string> = { apikey: SUPABASE_KEY };
  if (SUPABASE_KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${SUPABASE_KEY}`;

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${tabla}: HTTP ${res.status}: ${await res.text()}`);
  return (await res.json()) as T[];
}

/* Las columnas de imagen aceptan una URL completa (una foto alojada en
   cualquier lado) o la ruta de un archivo subido al bucket, por ejemplo
   `espacios/rooftop.jpg`. */
export function urlImagen(imagen: string): string {
  if (/^https?:\/\//.test(imagen) || !SUPABASE_URL) return imagen;
  const ruta = imagen.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  return new URL(`/storage/v1/object/public/${BUCKET}/${ruta}`, SUPABASE_URL).toString();
}
