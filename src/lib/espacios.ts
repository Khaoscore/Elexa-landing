/* Espacios en alquiler: la grilla de /espacios y la ficha de cada uno en
   /espacios/{slug}.

   Salen de la tabla `propiedades` de Supabase, que llena sola la hoja de
   Google «Alquiler Elexa» (supabase/sincronizar-hoja.gs). Como en la hoja
   todo es texto libre, acá se interpreta cada columna:

   · valor        «$3.934.000 + IVA» → la cifra grande y la nota chica. Un
                  número pelado (3934000) se escribe como $3.934.000.
   · area         «67» → «67 m²». Si ya trae unidad o termina en letra, tal cual.
   · amenidades   la columna «Características y atractivos»: el texto de la
                  sección «Descripción» de la ficha. Cada renglón de la celda
                  (Alt + Enter) es un párrafo.
   · disponibilidad  «Inmediata» → «Disponibilidad inmediata»; un año
                  («2027») o un mes y año → «Disponible en 2027». Otro texto,
                  tal cual. Vacío no se muestra.
   · direccion    tal cual, en la lista de la ficha.
   · latitud /    el punto del mapa de la ficha. En Google Maps, clic derecho
     longitud     sobre el lugar → el primer renglón del menú son las dos
                  cifras (3.39…, -76.55…). Sin ellas la ficha no lleva mapa.
   · fotos        URLs separadas por espacios, comas o renglones: fotos de
                  Drive (el script convierte el enlace de la carpeta en la
                  lista de sus fotos), cualquier URL de imagen o una ruta del
                  bucket `imagenes`. La primera es la portada.
   · carpeta      la columna «Carpeta» de la hoja (o, si está vacía, la
                  carpeta de Drive de Fotos): el botón «Información general» de
                  la ficha. Sólo cuenta un enlace de carpeta de Drive; vacía
                  o con otro texto, el botón no sale.

   La hoja no tiene slug: la URL es el nombre más el principio del ID
   (`/espacios/rooftop-piso-5-y-6-c3377cda`). Si cambia el nombre, el ID sigue
   encontrando el espacio y la ficha redirige a la URL nueva. */

import { consultar, hayBaseDeDatos, urlImagen } from './supabase';
import { coordenadas, type Coordenadas } from './coordenadas';
import { propiedadesRespaldo } from '../data/espacios';

export type Icono = 'ubicacion' | 'area' | 'disponibilidad' | 'direccion';

export type Caracteristica = {
  icono: Icono;
  /** Lo que es, en chico encima del dato: «Barrio», «Área»… */
  etiqueta: string;
  texto: string;
  /** Un enlace chico debajo del texto («Ver en el mapa»). */
  enlace?: { href: string; texto: string };
};

/** El id de la sección del mapa en la ficha. */
export const ANCLA_MAPA = 'ubicacion';

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
  /** «Cra 66 # 2 A - 33». */
  direccion: string;
  /** El punto del mapa; null = la ficha va sin mapa. */
  ubicacion: Coordenadas | null;
  /** Los párrafos de «Descripción» (la columna «Características y
      atractivos»). */
  descripcion: string[];
  fotos: Foto[];
  /** La carpeta de Drive del espacio, para «Información general». Vacío = sin
      botón. */
  carpeta: string;
  /** «Disponibilidad inmediata», «Disponible en 2027». Vacío = sin dato. */
  disponibilidad: string;
  /** La lista de la ficha, cada una con su ícono: barrio, área,
      disponibilidad y dirección. */
  caracteristicas: Caracteristica[];
};

/** Una fila de `propiedades` tal como la escribe el script de la hoja. */
export type FilaPropiedad = {
  id: string;
  nombre: string;
  barrio?: string | null;
  valor?: string | null;
  area?: string | null;
  /** «Características y atractivos» en la hoja. */
  amenidades?: string | null;
  disponibilidad?: string | null;
  direccion?: string | null;
  latitud?: string | number | null;
  longitud?: string | number | null;
  fotos?: string | null;
  /** La carpeta de Drive de «Información general» (columna Carpeta de la hoja). */
  carpeta?: string | null;
  /** La posición de la fila en la hoja. */
  orden?: number | string | null;
};

/* ------------------------------- Textos -------------------------------- */

const limpio = (v: string | null | undefined) => (v ?? '').replace(/\s+/g, ' ').trim();

const sinTildes = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function slugDe(texto: string): string {
  const slug = sinTildes(texto).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (slug.length <= 60) return slug;
  return slug.slice(0, 60).replace(/-[^-]*$/, '');
}

/* Del ID, lo que va en la URL: el primer bloque si es un UUID (los que pone
   el script), si no el ID entero. También identifica cada espacio en la
   selección de /comerciales (?ver=…): no cambia si cambia el nombre. */
export function claveDe(id: string): string {
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
  /* El precio por metro, siempre igual: «$70.000 m²», «$70.000 x m2» o
     «$70.000 por metro cuadrado» → «$70.000/m²». */
  precio = precio.replace(
    /(\$\s*[\d.,]+)\s*(?:\/|x|por)?\s*(?:m²|mts?2|m2|mts?²|metros?\s+cuadrados?)(?![a-z0-9])/i,
    '$1/m²',
  );
  return { precio, nota };
}

/** El precio de la hoja en partes, para la muesca de la foto de la ficha:
    «Desde $70.000/m²» → «Desde» (renglón chico de arriba), «$70.000» y
    «/m²» (en chico, con la nota). Si no tiene esa forma, todo va en `cifra`. */
export function partesDelPrecio(precio: string): { antes: string; cifra: string; unidad: string } {
  const partes = precio.match(/^(desde|hasta|a partir de)?\s*(\$\s*[\d.,]+)(\/m²)?$/i);
  if (!partes) return { antes: '', cifra: precio, unidad: '' };
  const [, antes = '', cifra, unidad = ''] = partes;
  return { antes: antes && mayuscula(antes.toLocaleLowerCase('es-CO')), cifra: cifra.replace(/\s+/g, ''), unidad };
}

function conUnidad(area: string): string {
  const v = limpio(area);
  if (/\bm2\b/i.test(v)) return v.replace(/\bm2\b/i, 'm²');
  return /\d$/.test(v) ? `${v} m²` : v;
}

const mayuscula = (texto: string) => texto.charAt(0).toLocaleUpperCase('es-CO') + texto.slice(1);

/* «Inmediata» / «2027» / «Diciembre 2026» / otro texto, en frase
   («Disponible en 2027», para la descripción al compartir) y corto («Desde
   2027», para el pin, que ya dice «Disponibilidad» encima). */
function disponibilidad(valor: string): { frase: string; corta: string } {
  const v = limpio(valor);
  const n = sinTildes(v);
  if (!v) return { frase: '', corta: '' };
  if (/^(inmediat[ao]|ya|ahora|disponible)$/.test(n)) return { frase: 'Disponibilidad inmediata', corta: 'Inmediata' };
  if (/^([a-z]+\s+(de\s+)?)?\d{4}$/.test(n)) {
    const fecha = v.toLocaleLowerCase('es-CO');
    return { frase: `Disponible en ${fecha}`, corta: `Desde ${fecha}` };
  }
  if (/^disponib/.test(n)) {
    const resto = v.replace(/^disponib\S*\s+(en\s+|desde\s+)?/i, '');
    return { frase: mayuscula(v), corta: mayuscula(resto || v) };
  }
  return { frase: mayuscula(v), corta: mayuscula(v) };
}

/* La celda de «Características y atractivos» → un párrafo por renglón. */
function parrafos(valor: string): string[] {
  return (valor ?? '').split(/\r?\n/).map(limpio).filter(Boolean);
}

/* -------------------------------- Fotos -------------------------------- */

/* Drive sirve cada foto pública al ancho que se le pida y en WebP (`-rw`):
   la de 28 MB del dron llega en ~400 KB. Las <img> van con
   referrerpolicy="no-referrer": con un Referer de localhost Drive contesta
   429 en vez de la foto, así que sin eso en `npm run dev` no se ven.
   La de 2400 es para el visor a pantalla completa de la ficha en pantallas
   grandes o de alta densidad; las tarjetas y la foto de la ficha no la piden. */
const ANCHOS = [640, 1080, 1600, 2400];

const DRIVE_ARCHIVO = [
  /drive\.google\.com\/file\/(?:u\/\d+\/)?d\/([\w-]{20,})/,
  /(?:drive|docs)\.google\.com\/(?:open|uc|thumbnail)\?(?:.*&)?id=([\w-]{20,})/,
  /lh3\.googleusercontent\.com\/d\/([\w-]{20,})/,
];
const DRIVE_CARPETA = /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]{10,})/;

/* Sólo un enlace de carpeta de Drive llega al botón, y siempre en su forma
   limpia (sin `/u/0/` ni `?usp=sharing`). */
function carpetaDe(valor: string | null | undefined): string {
  const id = limpio(valor).match(DRIVE_CARPETA)?.[1];
  return id ? `https://drive.google.com/drive/folders/${id}` : '';
}

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

  const direccion = limpio(fila.direccion);
  const ubicacion = coordenadas(fila.latitud, fila.longitud);
  if (!ubicacion && (limpio(String(fila.latitud ?? '')) || limpio(String(fila.longitud ?? '')))) {
    console.warn(
      `[espacios] «${nombre}» va sin mapa: latitud «${fila.latitud}» y longitud «${fila.longitud}» no caen en Colombia.`,
    );
  }

  const caracteristicas: Caracteristica[] = [];
  if (barrio) caracteristicas.push({ icono: 'ubicacion', etiqueta: 'Barrio', texto: barrio });
  if (area) caracteristicas.push({ icono: 'area', etiqueta: 'Área', texto: area });
  const disponible = disponibilidad(fila.disponibilidad ?? '');
  if (disponible.corta) {
    caracteristicas.push({ icono: 'disponibilidad', etiqueta: 'Disponibilidad', texto: disponible.corta });
  }
  if (direccion) {
    caracteristicas.push({
      icono: 'direccion',
      etiqueta: 'Dirección',
      texto: direccion,
      enlace: ubicacion ? { href: `#${ANCLA_MAPA}`, texto: 'Ver en el mapa' } : undefined,
    });
  }

  const id = String(fila.id);
  return {
    id,
    slug: [slugDe(nombre), claveDe(id)].filter(Boolean).join('-'),
    nombre,
    barrio,
    area,
    precio,
    precioNota: precio ? nota : '',
    direccion,
    ubicacion,
    disponibilidad: disponible.frase,
    descripcion: parrafos(fila.amenidades ?? ''),
    fotos: fotosDe(fila.fotos ?? '', nombre),
    carpeta: carpetaDe(fila.carpeta),
    caracteristicas,
  };
}

/** «Cómo llegar»: Google Maps con la ruta hasta el punto (en el teléfono
    abre la app). */
export const comoLlegar = ({ latitud, longitud }: Coordenadas) =>
  `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`;

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

/* «Otros espacios disponibles» al pie de la ficha: primero los del mismo
   barrio y después los que siguen en la hoja (dando la vuelta), sin repetir
   el de la ficha. */
function otrosEspacios(espacio: Espacio, espacios: Espacio[], cuantos: number): Espacio[] {
  const desde = espacios.indexOf(espacio);
  const siguientes = [...espacios.slice(desde + 1), ...espacios.slice(0, desde)];
  const mismoBarrio = espacio.barrio ? siguientes.filter((e) => e.barrio === espacio.barrio) : [];
  return [...mismoBarrio, ...siguientes.filter((e) => !mismoBarrio.includes(e))].slice(0, cuantos);
}

/** El espacio de esa URL, o null si ya no está en la hoja, con dos más para
    sugerir al pie. `exacto` es false cuando se encontró por el ID pero el
    nombre cambió: la ficha redirige a la URL nueva. Si Supabase falla lanza
    el error: mejor un 500 que un «no existe» falso. */
export async function getEspacio(
  slug: string,
): Promise<{ espacio: Espacio; exacto: boolean; otros: Espacio[] } | null> {
  const espacios = await leer();
  const exacto = espacios.find((e) => e.slug === slug);
  const porId =
    exacto ??
    espacios.find((e) => {
      const clave = claveDe(e.id);
      return slug === clave || slug.endsWith(`-${clave}`);
    });
  if (!porId) return null;
  return { espacio: porId, exacto: Boolean(exacto), otros: otrosEspacios(porId, espacios, 2) };
}

/** La selección de /comerciales (?ver=clave1,clave2): los espacios de esas
    claves que sigan en la hoja, en ese orden y sin repetir. Si Supabase
    falla lanza el error, como getEspacio. */
export async function getSeleccion(claves: string[]): Promise<Espacio[]> {
  const espacios = await leer();
  const porClave = new Map(espacios.map((e) => [claveDe(e.id), e]));
  const vistos = new Set<Espacio>();
  for (const clave of claves) {
    const espacio = porClave.get(clave.trim().toLowerCase());
    if (espacio) vistos.add(espacio);
  }
  return [...vistos];
}
