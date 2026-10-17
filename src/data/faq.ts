/* Preguntas frecuentes de la landing.

   OJO: el diseño todavía trae texto de relleno —la misma pregunta cinco veces
   y una respuesta tomada de «Construimos valor»—. Se deja tal cual para que
   la página calce con Figma; reemplazar por las preguntas reales.

   `abierta: true` deja esa pregunta desplegada al cargar (en el diseño, la
   última). Sólo puede haber una abierta a la vez. */

export type Pregunta = {
  pregunta: string;
  /* Párrafos de la respuesta. Lo que va entre ** ** sale en negrita. */
  respuesta: string;
  abierta?: boolean;
};

const RESPUESTA_RELLENO =
  'Originamos, estructuramos, desarrollamos y operamos cada proyecto. **Ganamos cuando el proyecto gana.** ' +
  'Originamos, estructuramos, desarrollamos y operamos cada proyecto. **Ganamos cuando el proyecto gana.** ' +
  'Originamos, estructuramos, desarrollamos y operamos cada proyecto. **Ganamos cuando el proyecto gana.**';

export const preguntas: Pregunta[] = [
  { pregunta: '¿Debo pagar la inversión de una?', respuesta: RESPUESTA_RELLENO },
  { pregunta: '¿Debo pagar la inversión de una?', respuesta: RESPUESTA_RELLENO },
  { pregunta: '¿Debo pagar la inversión de una?', respuesta: RESPUESTA_RELLENO },
  { pregunta: '¿Debo pagar la inversión de una?', respuesta: RESPUESTA_RELLENO },
  { pregunta: '¿Debo pagar la inversión de una?', respuesta: RESPUESTA_RELLENO, abierta: true },
];
