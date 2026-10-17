// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.elexa.com.co',
  integrations: [react()],

  /* Todo el sitio sale estático salvo la portada, que lleva
     `export const prerender = false`: «Proyectos abiertos» se arma en cada
     pedido con lo que haya en Supabase, así que un proyecto nuevo aparece sin
     volver a desplegar. El adaptador es el que convierte esa página en una
     función de Vercel. */
  adapter: vercel(),

  /* Las credenciales de Supabase se leen en el servidor y en tiempo de
     ejecución (no quedan horneadas en el build ni llegan al navegador). Son
     opcionales: sin ellas la sección muestra los proyectos de respaldo de
     src/data/proyectos.ts, que es lo que pasa en local recién clonado. */
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true, url: true }),
      SUPABASE_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
