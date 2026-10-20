/* Preguntas frecuentes de la landing.

   Salen de src/data/faq.md, que se escribe como texto plano (las reglas
   están en el comentario de arriba del archivo):

   · cada pregunta empieza con «## »; lo de antes de la primera se ignora
     (el título del archivo y el comentario);
   · lo que va debajo es la respuesta: una línea en blanco separa párrafos y
     un salto de línea simple se respeta tal cual. Lo que va entre ** ** sale
     en negrita (ver negritas.ts); no se interpreta nada más;
   · sin nada debajo, la pregunta sale con la respuesta marcada como
     pendiente;
   · «[abierta]» al final del título la deja desplegada al cargar. Sólo puede
     haber una abierta a la vez: si hay varias, vale la primera.

   El archivo se importa como texto (`?raw`) y queda dentro del código: la
   portada se arma en el servidor de Vercel, donde no hay carpeta src/ que
   leer. */

import texto from '../data/faq.md?raw';

export type Pregunta = {
  pregunta: string;
  /* Párrafos de la respuesta, cada uno con sus saltos de línea. Vacía si la
     pregunta todavía no tiene texto. */
  respuesta: string[];
  abierta: boolean;
};

const ABIERTA = /\s*\[abierta\]\s*$/i;

function leerPreguntas(md: string): Pregunta[] {
  const limpio = md.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, '');

  return limpio
    .split(/^##[ \t]+/m)
    .slice(1)
    .map((bloque) => {
      const [titulo, ...resto] = bloque.split('\n');
      const respuesta = resto
        .join('\n')
        .split(/\n[ \t]*\n/)
        .map((parrafo) =>
          parrafo
            .split('\n')
            .map((linea) => linea.trim())
            .join('\n')
            .trim(),
        )
        .filter(Boolean);

      return { pregunta: titulo.replace(ABIERTA, '').trim(), respuesta, abierta: ABIERTA.test(titulo) };
    })
    .filter((p) => p.pregunta);
}

export const preguntas = leerPreguntas(texto);
