/* Los filtros de /comerciales (área, precio y disponibilidad) y el precio
   corto de los pines del mapa. Se calculan en el servidor con lo que trae la
   hoja y van a cada tarjeta como data-; el navegador sólo compara.

   La hoja trae los datos como texto libre, así que cada espacio queda como
   un rango [mínimo, máximo] (máximo null = sin tope):
   · área: los números seguidos de «m²». «64 m² (24+40 terraza)» → 64;
     «De 180 m² a 400 m²» → 180 a 400; «Desde 30 m²» → 30 en adelante.
   · precio (el canon del mes): «$3.956.000 + IVA» → ese; «Desde $70.000 m²»
     es por metro, así que se multiplica por el área («desde» = sin tope).
     Sin área no se puede saber: queda sin precio para el filtro.
   Un espacio pasa el filtro si su rango toca el de la opción elegida. */
import type { Espacio } from './espacios';

export type Rango = [number, number | null];

export type Opcion = { id: string; nombre: string; rango: Rango };

export const OPCIONES_AREA: Opcion[] = [
  { id: 'hasta-50', nombre: 'Hasta 50 m²', rango: [0, 50] },
  { id: '50-100', nombre: '50 a 100 m²', rango: [50, 100] },
  { id: '100-200', nombre: '100 a 200 m²', rango: [100, 200] },
  { id: 'mas-200', nombre: 'Más de 200 m²', rango: [200, null] },
];

export const OPCIONES_PRECIO: Opcion[] = [
  { id: 'hasta-3', nombre: 'Hasta $3 millones', rango: [0, 3_000_000] },
  { id: '3-6', nombre: '$3 a $6 millones', rango: [3_000_000, 6_000_000] },
  { id: '6-10', nombre: '$6 a $10 millones', rango: [6_000_000, 10_000_000] },
  { id: 'mas-10', nombre: 'Más de $10 millones', rango: [10_000_000, null] },
];

export const OPCIONES_DISPONIBILIDAD = [
  { id: 'inmediata', nombre: 'Inmediata' },
  { id: 'proxima', nombre: 'Próximamente' },
];

/* «1.200» → 1200; «24,5» → 24.5. */
function numero(texto: string): number {
  if (/^\d{1,3}(\.\d{3})+$/.test(texto)) return Number(texto.replace(/\./g, ''));
  return Number(texto.replace(',', '.'));
}

export function rangoArea(area: string): Rango | null {
  const numeros = [...area.matchAll(/(\d[\d.,]*)\s*m²/g)].map((m) => numero(m[1])).filter(Number.isFinite);
  if (!numeros.length) return null;
  const desde = /^\s*desde\b/i.test(area);
  if (desde) return [numeros[0], null];
  return [numeros[0], numeros.length > 1 ? numeros[numeros.length - 1] : numeros[0]];
}

/** El precio de la hoja en pesos, y si es por metro o «desde». */
function leerPrecio(precio: string): { pesos: number; porMetro: boolean; desde: boolean } | null {
  const cifra = precio.match(/\$\s*([\d.,]+)/)?.[1] ?? precio.match(/([\d.,]{4,})/)?.[1];
  if (!cifra) return null;
  const pesos = Number(cifra.replace(/[.,]/g, ''));
  if (!Number.isFinite(pesos) || pesos <= 0) return null;
  return { pesos, porMetro: /m²|m2\b|metro/i.test(precio), desde: /\bdesde\b/i.test(precio) };
}

export function rangoPrecio(espacio: Pick<Espacio, 'precio' | 'area'>): Rango | null {
  const precio = leerPrecio(espacio.precio);
  if (!precio) return null;
  if (!precio.porMetro) return [precio.pesos, precio.desde ? null : precio.pesos];
  const area = rangoArea(espacio.area);
  if (!area) return null;
  const [minimo, maximo] = area;
  return [precio.pesos * minimo, precio.desde || maximo === null ? null : precio.pesos * maximo];
}

export function disponibilidadDe(espacio: Pick<Espacio, 'disponibilidad'>): '' | 'inmediata' | 'proxima' {
  if (!espacio.disponibilidad) return '';
  return /inmediat/i.test(espacio.disponibilidad) ? 'inmediata' : 'proxima';
}

/** «120-400», «30-» (sin tope) o vacío: así viaja en data-. */
export const rangoATexto = (rango: Rango | null) => (rango ? `${rango[0]}-${rango[1] ?? ''}` : '');

/** Para el pin del mapa: «$3,96 M», «$950 mil», «$70 mil/m²». */
export function precioCorto(precio: string): string {
  const leido = leerPrecio(precio);
  if (!leido) return '';
  const { pesos, porMetro } = leido;
  const formato = (n: number, decimales: number) =>
    new Intl.NumberFormat('es-CO', { maximumFractionDigits: decimales }).format(n);
  if (porMetro) return `$${formato(pesos / 1000, 0)} mil/m²`;
  if (pesos >= 1_000_000) return `$${formato(pesos / 1_000_000, pesos < 10_000_000 ? 2 : 1)} M`;
  return `$${formato(pesos / 1000, 0)} mil`;
}
