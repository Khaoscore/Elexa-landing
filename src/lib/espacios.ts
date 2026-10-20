/* Espacios en alquiler: la grilla de /espacios y la ficha de cada uno en
   /espacios/{slug}.

   Salen de la tabla `propiedades` de Supabase, que llena sola la hoja de
   Google «Alquiler Elexa» (supabase/sincronizar-hoja.gs). Como en la hoja
   todo es texto libre, acá se interpreta cada columna:

   · valor        «$3.934.000 + IVA» → la cifra grande y la nota chica. Un
                  número pelado (3934000) se escribe como $3.934.000.
   · area         «67» → «67 m²». Si ya trae unidad o termina en letra, tal cual.
   · parqueadero  «Sí» → «Con parqueadero»; un número → «2 parqueaderos»;
   · ascensor     «Sí» → «Con ascensor». «No» o vacío no se muestra.
   · amenidades   una por renglón (Alt + Enter en la celda) o separadas por
                  punto y coma. Las comas no separan: «academias de baile,
                  yoga, etc.» es una sola.
   · fotos        URLs separadas por espacios, comas o renglones: fotos de
                  Drive (el script convierte el enlace de la carpeta en la
                  lista de sus fotos), cualquier URL de imagen o una ruta del
                  bucket `imagenes`. La primera es la portada.

   La hoja no tiene slug: la URL es el nombre más el principio del ID
   (`/espacios/rooftop-piso-5-y-6-c3377cda`). Si cambia el nombre, el ID sigue
   encontrando el espacio y la ficha redirige a la URL nueva. */

import { consultar, hayBaseDeDatos, urlImagen } from './supabase';
import { propiedadesRespaldo } from '../data/espacios';

export type Icono = 'ubicacion' | 'area' | 'niveles' | 'parqueadero' | 'ascensor' | 'amenidad';

export type Caracteristica = { icono: Icono; texto: string };

export type Foto = {
  src: string;
  srcset?: string;
  /** Para la vista previa al compartir el enlace: JPEG, que WhatsApp lee
      siempre (con WebP a veces no muestra la foto). */
  jpeg: string;
};

export type Espacio = {
  id: string;
  /** El tramo de la URL: /espacios/{slug}. */
  slug: string;
  nombre: string;
  barrio: string;
  /** «67 m²». */
  area: string;
  /** «$3.934.000». Vacío = sin precio. */
  precio: string;
  /** Lo que va en chico al lado del precio («+ IVA»). */
  precioNota: string;
  fotos: Foto[];
  /** La lista de la ficha, cada una con su ícono. */
  caracteristicas: Caracteristica[];
};

/** Una fila de `propiedades` tal como la escribe el script de la hoja. */
export type FilaPropiedad = {
  id: string;
  nombre: string;
  barrio?: string | null;
  valor?: string | null;
  area?: string | null;
  parqueadero?: string | null;
  ascensor?: string | null;
  amenidades?: string | null;
  fotos?: string | null;
  /** La posición de la fila en la hoja. */
  orden?: number | string | null;
};

/* ------------------------------- Textos -------------------------------- */

const limpio = (v: string | null | undefined) => (v ?? '').replace(/\s+/g, ' ').trim();

const capital = (texto: string) => texto.charAt(0).toLocaleUpperCase('es-CO') + texto.slice(1);

const sinTildes = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function slugDe(texto: string): string {
  const slug = sinTildes(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (slug.length <= 60) return slug;
  return slug.slice(0, 60).replace(/-[^-]*$/, '');
}

/* Del ID, lo que va en la URL: el primer bloque si es un UUID (los que pone
   el script), si no el ID entero. */
function claveDe(id: string): string {
  const uuid = id.match(/^([0-9a-f]{8})-[0-9a-f]{4}-/i);
  return uuid ? uuid[1].toLowerCase() : slugDe(id);
}

function separarValor(valor: string): { precio: string; nota: string } {
  const v = limpio(valor);
  const iva = v.match(/^(.*?)\s*(\+\s*iva\b.*)$/i);
  let precio = (iva ? iva[1] : v).trim();
  const nota = iva ? iva[2].replace(/^\+\s*iva/i, '+ IVA') : '';

  if (/^\$?\s*[\d.,]+$/.test(precio)) {
    const cifra = precio.replace(/[^\d.,]/g, '');
    precio = /^\d+$/.test(cifra) ? `$${new Intl.NumberFormat('es-CO').format(Number(cifra))}` : `$${cifra}`;
  }
  return { precio, nota };
}

function conUnidad(area: string): string {
  const v = limpio(area);
  if (/\bm2\b/i.test(v)) return v.replace(/\bm2\b/i, 'm²');
  return /\d$/.test(v) ? `${v} m²` : v;
}

/* «Sí» / «No» / un número / otro texto. */
function respuesta(valor: string): boolean | number | string {
  const v = limpio(valor);
  const n = sinTildes(v);
  if (!n || /^(no|n|false|falso|0|-)$/.test(n)) return false;
  if (/^(si|s|yes|x|true|verdadero)$/.test(n)) return true;
  if (/^\d+$/.test(n)) return Number(n);
  return capital(v);
}

function parqueadero(valor: string): string {
  const r = respuesta(valor);
  if (r === false) return '';
  if (r === true || r === 1) return 'Con parqueadero';
  if (typeof r === 'number') return `${r} parqueaderos`;
  return r;
}

function ascensor(valor: string): string {
  const r = respuesta(valor);
  if (r === false) return '';
  return typeof r === 'string' ? r : 'Con ascensor';
}

function amenidades(valor: string): Caracteristica[] {
  return (valor ?? '')
    .split(/\r?\n|;|•|\|/)
    .map(limpio)
    .filter(Boolean)
    .map((texto) => ({
      icono: /mez+an+ine|nivel/i.test(texto) ? 'niveles' : 'amenidad',
      texto: capital(texto),
    }));
}

/* -------------------------------- Fotos -------------------------------- */

/* Drive sirve cada foto pública al ancho que se le pida y en WebP (`-rw`):
   la de 28 MB del dron llega en ~400 KB. Las <img> van con
   referrerpolicy="no-referrer": con un Referer de localhost Drive contesta
   429 en vez de la foto, así que sin eso en `npm run dev` no se ven. */
const ANCHOS = [640, 1080, 1600];

const DRIVE_ARCHIVO = [
  /drive\.google\.com\/file\/(?:u\/\d+\/)?d\/([\w-]{20,})/,
  /(?:drive|docs)\.google\.com\/(?:open|uc|thumbnail)\?(?:.*&)?id=([\w-]{20,})/,
  /lh3\.googleusercontent\.com\/d\/([\w-]{20,})/,
];
const DRIVE_CARPETA = /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//;

function fotoDe(texto: string, nombre: string): Foto | null {
  for (const patron of DRIVE_ARCHIVO) {
    const id = texto.match(patron)?.[1];
    if (!id) continue;
    const url = (ancho: number) => `https://lh3.googleusercontent.com/d/${id}=w${ancho}-rw`;
    return {
      src: url(1600),
      srcset: ANCHOS.map((a) => `${url(a)} ${a}w`).join(', '),
      jpeg: `https://lh3.googleusercontent.com/d/${id}=w1200`,
    };
  }

  /* Una carpeta no se puede mostrar: el script de la hoja la cambia por sus
     fotos. Si llega acá es que el script todavía no corrió. */
  if (DRIVE_CARPETA.test(texto)) {
    console.warn(`[fotos] «${nombre}»: la foto es una carpeta de Drive sin convertir; ejecutar syncAll en la hoja.`);
    return null;
  }

  if (/^https?:\/\//.test(texto) || /\.(jpe?g|png|webp|avif|gif)$/i.test(texto)) {
    const src = urlImagen(texto);
    return { src, jpeg: src };
  }
  return null;
}

/* También la usan los proyectos anteriores (src/lib/anteriores.ts). */
export const fotosDe = (celda: string, nombre: string) =>
  (celda ?? '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .flatMap((texto) => fotoDe(texto, nombre) ?? []);

/* ------------------------------- Espacio ------------------------------- */

export function aEspacio(fila: FilaPropiedad): Espacio {
  const nombre = limpio(fila.nombre);
  const barrio = limpio(fila.barrio);
  const area = conUnidad(fila.area ?? '');
  const { precio, nota } = separarValor(fila.valor ?? '');

  const caracteristicas: Caracteristica[] = [];
  if (barrio) caracteristicas.push({ icono: 'ubicacion', texto: barrio });
  if (area) caracteristicas.push({ icono: 'area', texto: area });
  caracteristicas.push(...amenidades(fila.amenidades ?? ''));
  const conParqueadero = parqueadero(fila.parqueadero ?? '');
  if (conParqueadero) caracteristicas.push({ icono: 'parqueadero', texto: conParqueadero });
  const conAscensor = ascensor(fila.ascensor ?? '');
  if (conAscensor) caracteristicas.push({ icono: 'ascensor', texto: conAscensor });

  const id = String(fila.id);
  return {
    id,
    slug: [slugDe(nombre), claveDe(id)].filter(Boolean).join('-'),
    nombre,
    barrio,
    area,
    precio,
    precioNota: precio ? nota : '',
    fotos: fotosDe(fila.fotos ?? '', nombre),
    caracteristicas,
  };
}

/* En el orden de la hoja. Las filas sin `orden` (antes de actualizar el
   script) van al final, por nombre. */
function ordenar(filas: FilaPropiedad[]): FilaPropiedad[] {
  const puesto = (f: FilaPropiedad) => {
    const n = f.orden === null || f.orden === undefined || f.orden === '' ? NaN : Number(f.orden);
    return Number.isFinite(n) ? n : Infinity;
  };
  return [...filas].sort((a, b) => puesto(a) - puesto(b) || a.nombre.localeCompare(b.nombre, 'es'));
}

/* `select=*` y no la lista de columnas: si a la tabla le falta una (por
   ejemplo `orden`), la consulta igual funciona. Lanza el error si Supabase
   falla. */
async function leer(): Promise<Espacio[]> {
  const filas = hayBaseDeDatos
    ? await consultar<FilaPropiedad>('propiedades', { select: '*' })
    : propiedadesRespaldo;
  return ordenar(filas.filter((f) => limpio(f.nombre))).map(aEspacio);
}

export async function getEspacios(): Promise<Espacio[]> {
  try {
    return await leer();
  } catch (error) {
    console.error('[espacios] No se pudo leer la tabla `propiedades` de Supabase:', error);
    return [];
  }
}

/** El espacio de esa URL, o null si ya no está en la hoja. `exacto` es false
    cuando se encontró por el ID pero el nombre cambió: la ficha redirige a
    la URL nueva. Si Supabase falla lanza el error: mejor un 500 que un «no
    existe» falso. */
export async function getEspacio(slug: string): Promise<{ espacio: Espacio; exacto: boolean } | null> {
  const espacios = await leer();
  const exacto = espacios.find((e) => e.slug === slug);
  if (exacto) return { espacio: exacto, exacto: true };

  const porId = espacios.find((e) => {
    const clave = claveDe(e.id);
    return slug === clave || slug.endsWith(`-${clave}`);
  });
  return porId ? { espacio: porId, exacto: false } : null;
}
