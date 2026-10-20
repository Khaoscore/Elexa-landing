/* Espacios en alquiler de respaldo (sin Supabase; ver src/lib/espacios.ts).

   Copia de la hoja «Alquiler Elexa» al 19 de octubre de 2026, tal como la
   deja el script de la hoja en la tabla `propiedades`: los valores de cada
   columna tal cual y, en Fotos, las fotos de cada carpeta de Drive ordenadas
   por nombre de archivo. Con Supabase configurado el sitio lee la tabla y
   esta lista no se usa; sólo sirve en local sin `.env`. */

import type { FilaPropiedad } from '../lib/espacios';

const drive = (...ids: string[]) => ids.map((id) => `https://lh3.googleusercontent.com/d/${id}`).join('\n');

/* Las dos filas del Mall comparten carpeta. */
const FOTOS_MALL = drive(
  '1GeQGZ4-5he731PAyPU19iayS_LZJZQQH',
  '1o4HpOsWnwUrcD4boGvnAEt4jbCHYhi8N',
  '1LPn4q869U45w_XokGkCaY7BE3UQIiZgG',
);

export const propiedadesRespaldo: FilaPropiedad[] = [
  {
    id: '565ff6a3-d299-4efd-bbe4-4b09ab1477e0',
    nombre: 'Mall con Ara de ancla sobre la Cra 66 con 2A - Esquinero',
    barrio: 'El Refugio',
    valor: '$3.934.000 + IVA',
    area: '67',
    parqueadero: 'Si',
    ascensor: 'No',
    amenidades: 'Posibilidad Mezzanine',
    fotos: FOTOS_MALL,
  },
  {
    id: '94e9a66b-e951-43f8-87a9-46c21167066c',
    nombre: 'Mall con Ara de ancla sobre la Cra 66 con 2A - Central',
    barrio: 'El Refugio',
    valor: '$7.300.000 + IVA',
    area: '128',
    parqueadero: 'si',
    ascensor: 'No',
    amenidades: 'Posibilidad Mezzanine',
    fotos: FOTOS_MALL,
  },
  {
    id: '391eb204-821d-415b-b7b3-d286beed9abf',
    nombre: 'Oficina sobre la quinta con 42',
    barrio: 'Tequendama',
    valor: '$1.990.000 + IVA',
    area: '110',
    parqueadero: 'No',
    ascensor: 'No',
    amenidades: 'A 20 min de la estacion del mio',
    fotos: '',
  },
  {
    id: 'e182d644-eac7-4e2f-aa43-da8e1100b4f3',
    nombre: 'Oficina en edificio insula living',
    barrio: 'Juanambú',
    valor: '$1.590.000 + IVA',
    area: '23',
    parqueadero: 'No',
    ascensor: 'No',
    amenidades: 'Sala de muntas, terrazas, jacuzzi y zona bbq',
    fotos: '',
  },
  {
    id: '122c9fe8-9963-405b-9759-0a78abcd0897',
    nombre: 'Local al lado del ara Disponible 2026',
    barrio: 'La luna',
    valor: '6.990.000 + IVA',
    area: '138',
    parqueadero: 'No',
    ascensor: 'No',
    amenidades: 'Con mezzanine',
    fotos: '',
  },
  {
    id: 'c3377cda-1729-4bd6-a38c-044db35b7992',
    nombre: 'Rooftop piso 5 y 6',
    barrio: 'Granada',
    valor: '$10.900.000 + IVA',
    area: '160',
    parqueadero: 'No',
    ascensor: 'Si',
    amenidades: 'Esquinero, vista 360',
    /* La carpeta de Drive del rooftop está vacía. */
    fotos: '',
  },
  {
    id: 'd84dccbd-6863-4312-89e4-3c4181530127',
    nombre: 'Terraza descubierta Edificio esquinero piso 4 de Blestium Mall',
    barrio: 'Granada',
    valor: '$3.900.000 + IVA',
    area: '115',
    parqueadero: 'No',
    ascensor: 'No',
    amenidades: 'Espacio abierto ideal para academias de baile, yoga gimnasio, etc',
    fotos: drive('18Q8lYV_M_2C8sSJlXkSTieNg4sA5Wowt'),
  },
  {
    id: '4db765f2-67b5-4d51-91f6-61fafa93d157',
    nombre: 'Normandía - Frente al Gato areas comerciales disponibles Disponible 2027 Proyecto E',
  },
  {
    id: 'c675355b-a424-4bbd-b797-0c49a3c54e41',
    nombre: 'Florentino Disponible 2028',
    barrio: 'El peñón',
    valor: '',
    area: '',
    parqueadero: 'No',
    ascensor: 'Si',
    amenidades: '',
    fotos: drive(
      '1vWJpqihui8tmS3tk98JrmXjTkp84keqS',
      '1YUgu2CJcx6T7lhx2U_cw2DOVhJawzp_6',
      '1bTljvXdp6axKx34XDLvdHxHTHSQJdXcH',
      '1aNR0GRZmPJqHiZ-5F5NZA659B_ozRxB6',
    ),
  },
  {
    id: '785b1e26-ebe2-40f0-9bfa-22f3b6b612e4',
    nombre: 'La Hispania disponible finales 2027',
    barrio: 'Cra 58 - Costado Sur-Norte',
    area: '150 a 400',
  },
  {
    id: '0a2ef564-80fd-4622-81b1-f35ad1adbe67',
    nombre: 'Palmira disponible 2027',
    barrio: 'Cra 28 con 45',
    area: '1er piso 1.000- 2nd piso 1.000',
    amenidades: 'Esquinero entrega en 12-15 meses',
  },
].map((fila, i) => ({ ...fila, orden: i + 1 }));
