/* Documentos legales: política de privacidad, términos y tratamiento de
   datos.

   Cada uno es un .md en src/data/legal/ (las reglas para editarlos están en
   la cabecera de politica-de-privacidad.md). El nombre del archivo es la
   ruta: politica-de-privacidad.md → /politica-de-privacidad. Añadir un .md
   ahí crea la página y su enlace en el pie.

   Se importan con Vite (no se leen del disco), así que también llegan a la
   portada, que se arma en el servidor de Vercel. */

import type { MarkdownInstance } from 'astro';

type Datos = {
  titulo: string;
  acento?: string;
  documento: string;
  descripcion: string;
  /* año-mes-día, entre comillas: sin ellas YAML lo convierte en fecha. */
  actualizado: string;
  orden?: number;
};

export type DocumentoLegal = Datos & {
  slug: string;
  href: string;
  /* «23 de agosto de 2026». */
  actualizadoTexto: string;
  Content: MarkdownInstance<Datos>['Content'];
};

const archivos = import.meta.glob<MarkdownInstance<Datos>>('../data/legal/*.md', { eager: true });

const fecha = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const documentosLegales: DocumentoLegal[] = Object.entries(archivos)
  .map(([ruta, md]) => {
    const slug = ruta.replace(/^.*\//, '').replace(/\.md$/, '');
    return {
      ...md.frontmatter,
      slug,
      href: `/${slug}`,
      actualizadoTexto: fecha.format(new Date(md.frontmatter.actualizado)),
      Content: md.Content,
    };
  })
  .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
