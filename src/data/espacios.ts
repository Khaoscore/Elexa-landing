/* Espacios en alquiler de respaldo (sin Supabase; ver src/lib/espacios.ts).

   Son los seis del diseño de Figma (frame "Desktop - 4"), con su copy tal
   cual. Sólo «Local al lado de Ara» tiene ficha completa en el diseño
   ("Desktop - 5": precio y características); los demás salen con la
   dirección como única característica hasta que se carguen los datos reales. */

import type { Espacio } from '../lib/espacios';

export const espaciosRespaldo: Espacio[] = [
  {
    id: 'espectacular-rooftop',
    slug: 'espectacular-rooftop',
    titulo: 'Espectacular Rooftop',
    direccion: 'Sobre la AV 9N',
    zona: 'Granada',
    imagen: '/img/espacios/espectacular-rooftop.jpg',
    imagenAlt: 'Edificio de fachada oscura iluminado de noche, sobre la Avenida 9N.',
    precio: '',
    precioNota: '',
    caracteristicas: [{ icono: 'ubicacion', texto: 'Sobre la AV 9N' }],
  },
  {
    id: 'rooftop-sobre-via-principal',
    slug: 'rooftop-sobre-via-principal',
    titulo: 'Rooftop sobre vía principal',
    direccion: '260 m en dos niveles',
    zona: 'Parque del perro',
    imagen: '/img/espacios/rooftop-sobre-via-principal.jpg',
    imagenAlt: 'Fachada de un edificio con locales comerciales en el primer piso, frente al Parque del Perro.',
    precio: '',
    precioNota: '',
    caracteristicas: [{ icono: 'area', texto: '260 m en dos niveles' }],
  },
  {
    id: 'local-al-lado-de-ara',
    slug: 'local-al-lado-de-ara',
    titulo: 'Local al lado del Ara',
    direccion: 'Sobre la Cra 66 con 2A',
    zona: 'El refugio',
    imagen: '/img/espacios/local-al-lado-de-ara.jpg',
    imagenAlt: 'Locales con persiana en un mall de conveniencia, junto a un supermercado Ara; el local disponible está marcado.',
    precio: '$2.990.000',
    precioNota: '+ IVA',
    caracteristicas: [
      { icono: 'ubicacion', texto: 'Sobre la Cra 66 con 2A' },
      { icono: 'area', texto: '32 metros cuadrados' },
      { icono: 'niveles', texto: 'Posibilidad de mazzanine' },
      { icono: 'entorno', texto: 'En mall de conveniencia' },
      { icono: 'parqueadero', texto: 'Con parqueaderos' },
    ],
  },
  {
    id: 'terraza-descubierta',
    slug: 'terraza-descubierta',
    titulo: 'Terraza descubierta',
    direccion: 'Edificio esquinero',
    zona: 'Granada',
    imagen: '/img/espacios/terraza-descubierta.jpg',
    imagenAlt: 'Edificio esquinero con terraza descubierta y restaurante en el primer piso, entre árboles.',
    precio: '',
    precioNota: '',
    caracteristicas: [{ icono: 'ubicacion', texto: 'Edificio esquinero' }],
  },
  {
    id: 'autopista-cra-58',
    slug: 'autopista-cra-58',
    titulo: 'Disponible en: 2027',
    direccion: 'Cra 58 - Costado Sur-Norte',
    zona: 'Autopista',
    imagen: '/img/espacios/autopista-cra-58.jpg',
    imagenAlt: 'Lote sobre la autopista, con una bodega roja al fondo y un taxi en la vía.',
    precio: '',
    precioNota: '',
    caracteristicas: [{ icono: 'ubicacion', texto: 'Cra 58 - Costado Sur-Norte' }],
  },
  {
    id: 'palmira-cra-28',
    slug: 'palmira-cra-28',
    titulo: 'Disponible en: 2027',
    direccion: 'Cra 28 con 45',
    zona: 'Palmira',
    imagen: '/img/espacios/palmira-cra-28.jpg',
    imagenAlt: 'Casa esquinera de dos pisos con local comercial en Palmira.',
    precio: '',
    precioNota: '',
    caracteristicas: [{ icono: 'ubicacion', texto: 'Cra 28 con 45' }],
  },
];
