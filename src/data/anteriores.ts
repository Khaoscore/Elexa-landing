/* Proyectos anteriores de respaldo (sin Supabase; ver src/lib/anteriores.ts).

   Una muestra de la hoja «Propiedades Elexa», escrita como filas de la tabla
   `propiedades_elexa` para que pasen por la misma interpretación que los
   datos reales: siete en Cali y uno en Cota, que queda fuera de la vista
   inicial del mapa. */

import type { FilaAnterior } from '../lib/anteriores';

export const anterioresRespaldo: FilaAnterior[] = [
  {
    codigo: '12002',
    nombre_del_proyecto: 'Tequendama',
    direccion: 'CL 5 # 42 - 35',
    categoria: 'Propiedades',
    latitud: '3.4218040',
    longitud: '-76.5473936',
  },
  {
    codigo: '12003',
    nombre_del_proyecto: 'Santa Mónica',
    direccion: 'AV 6 BIS # 27 NORTE - 52',
    categoria: 'Propiedades',
    latitud: '3.4696496',
    longitud: '-76.5290640',
  },
  {
    codigo: '12005',
    nombre_del_proyecto: 'Leforet',
    direccion: 'Av. 9 Nte. #12, Santa Monica Residential, Cali, Valle del Cauca',
    categoria: 'Propiedades',
    latitud: '3.4646335',
    longitud: '-76.5340279',
  },
  {
    codigo: '12009',
    nombre_del_proyecto: 'Granada',
    direccion: 'AV 9 A # 14 NORTE - 34',
    categoria: 'Propiedades',
    latitud: '3.4595281',
    longitud: '-76.5351519',
  },
  {
    codigo: '12015',
    nombre_del_proyecto: 'Constantino',
    direccion: 'Av. 9 Nte. #17N - 14, Santa Monica Residential, Cali, Valle del Cauca',
    categoria: 'Propiedades',
    latitud: '3.4611743',
    longitud: '-76.5327887',
  },
  {
    codigo: '12023',
    nombre_del_proyecto: 'Farmatodo Cota',
    direccion: 'BOGOTA ZONA NORTE DEPTO: CUNDINAMARCA MUNICIPIO: COTA',
    categoria: 'Inversiones',
    latitud: '4.8609660',
    longitud: '-74.0473740',
  },
  {
    codigo: '12027',
    nombre_del_proyecto: 'Proyecto E',
    direccion: 'AV 4 OESTE # 3 OESTE - 104',
    categoria: 'Propiedades',
    latitud: '3.4515178',
    longitud: '-76.5438006',
  },
  {
    codigo: '12030',
    nombre_del_proyecto: 'Florentino',
    direccion: 'KR 4 # 1 OESTE - 177',
    categoria: 'Propiedades',
    latitud: '3.4491236',
    longitud: '-76.5399742',
  },
];
