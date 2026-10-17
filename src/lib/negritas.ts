/* Negritas en los textos que vienen de la base de datos.

   Las descripciones de los proyectos resaltan algunos datos («14 pisos en
   Normandía», «$120.9 millones»). En Supabase se escriben entre dos
   asteriscos, como en WhatsApp o Markdown:

     Edificio mixto de **14 pisos en Normandía.** Participa desde **$120.9 millones.**

   y la vista pinta esos tramos en <strong>. No se interpreta nada más: el
   resto del texto sale tal cual (escapado por Astro / React). Un `**` sin
   cerrar se muestra como texto normal. */

export type Tramo = { texto: string; negrita: boolean };

export function partirNegritas(texto: string): Tramo[] {
  const partes = texto.split('**');
  /* Con un número par de partes hay un ** sin pareja: el último tramo
     vuelve a ser texto normal, con sus asteriscos. */
  if (partes.length % 2 === 0) {
    const ultima = partes.pop() ?? '';
    partes[partes.length - 1] += `**${ultima}`;
  }
  return partes.map((parte, i) => ({ texto: parte, negrita: i % 2 === 1 })).filter((tramo) => tramo.texto !== '');
}
