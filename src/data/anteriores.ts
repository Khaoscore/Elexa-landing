/* Proyectos anteriores de respaldo (sin Supabase; ver src/lib/anteriores.ts).

   El diseño trae un solo proyecto de ejemplo, «Espectacular Rooftop», repetido
   en las cinco tarjetas de debajo del mapa. Acá va una vez, con el copy de
   Figma. Las coordenadas son aproximadas (Av. 9N, Granada): hay que poner
   las reales en la tabla. */

import type { ProyectoAnterior } from '../lib/anteriores';

export const anterioresRespaldo: ProyectoAnterior[] = [
  {
    id: 'espectacular-rooftop',
    nombre: 'Espectacular Rooftop',
    etiquetaMapa: 'Rooftop',
    direccion: 'Sobre la AV 9N - Granada',
    imagen: '/img/espacios/espectacular-rooftop.jpg',
    imagenAlt: 'Edificio de fachada oscura iluminado de noche, sobre la Avenida 9N en Granada.',
    caracteristicas: ['Esquinero', 'Con ascensor'],
    area: '160 m²',
    espacio: 'Piso 5 y 6',
    ventaja: 'Vista 360',
    precio: '$150 M',
    latitud: 3.4609,
    longitud: -76.5316,
  },
];
