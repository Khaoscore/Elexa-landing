// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import { readFile, writeFile } from 'node:fs/promises';

/* Vercel sirve lo de public/ con `max-age=0`: en cada página el navegador
   vuelve a preguntar por cada foto, logo y video aunque ya los tenga, y cada
   pregunta es un viaje más hasta el servidor. Con esto los guarda un día sin
   preguntar, y la semana siguiente los sigue usando mientras revisa por
   detrás si cambiaron. Un día y no un año porque los nombres no cambian al
   reemplazar una foto (a diferencia de /_astro/, que el adaptador ya marca
   como inmutable).
   La regla se agrega a .vercel/output/config.json después de que el
   adaptador lo escribe: Astro corre el adaptador antes que las demás
   integraciones. */
const CACHE_IMG = 'public, max-age=86400, stale-while-revalidate=604800';

/** @returns {import('astro').AstroIntegration} */
function cacheDeImagenes() {
  return {
    name: 'elexa:cache-de-imagenes',
    hooks: {
      'astro:build:done': async ({ logger }) => {
        const ruta = new URL('./.vercel/output/config.json', import.meta.url);
        const config = JSON.parse(await readFile(ruta, 'utf8'));
        config.routes.unshift({ src: '^/img/(.*)$', headers: { 'cache-control': CACHE_IMG }, continue: true });
        await writeFile(ruta, JSON.stringify(config, null, 2));
        logger.info(`/img/* → cache-control: ${CACHE_IMG}`);
      },
    },
  };
}

export default defineConfig({
  site: 'https://www.elexa.com.co',
  integrations: [react(), cacheDeImagenes()],

  /* Todo el sitio sale estático salvo la portada, que lleva
     `export const prerender = false`: «Proyectos abiertos» se arma en cada
     pedido con lo que haya en Supabase, así que un proyecto nuevo aparece sin
     volver a desplegar. El adaptador es el que convierte esa página en una
     función de Vercel. */
  adapter: vercel(),

  /* Las credenciales de Supabase se leen en el servidor y en tiempo de
     ejecución (no quedan horneadas en el build ni llegan al navegador). Son
     opcionales: sin ellas la sección muestra los proyectos de respaldo de
     src/data/proyectos.ts, que es lo que pasa en local recién clonado.

     PUBLIC_MAPBOX_TOKEN es el token público de Mapbox (`pk.…`): va al
     navegador a propósito, como pide Mapbox, y se protege restringiéndolo a
     los dominios del sitio en la cuenta de Mapbox. En Vercel va como
     «Config», en Production y Preview. Sin él, los mapas usan Leaflet con
     OpenStreetMap. */
  env: {
    schema: {
      SUPABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true, url: true }),
      SUPABASE_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_MAPBOX_TOKEN: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },

  /* `npm run build` con `npm run dev` abierto, sin que se estorben:
     · el build guarda sus dependencias preparadas en su propia carpeta. Si
       usara la del servidor de desarrollo (node_modules/.vite) le dejaría ahí
       React de producción, y las islas de React (el mapa de /proyectos)
       revientan con «_jsxDEV is not a function» hasta borrar esa carpeta;
     · el servidor de desarrollo no vigila lo que genera el build
       (.vercel/output y el dist/ viejo): en Windows los archivos que se
       reescriben quedan bloqueados un instante y se caía con «EBUSY:
       resource busy or locked». */
  vite: {
    cacheDir: process.argv.includes('build') ? 'node_modules/.vite-build' : 'node_modules/.vite',
    server: {
      watch: {
        ignored: ['**/.vercel/**', '**/dist/**'],
      },
    },
  },
});
