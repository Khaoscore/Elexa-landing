# Elexa — sitio

Astro 7 + React 19 (islas), CSS propio, desplegado en Vercel. Las páginas
salen del archivo de Figma
[Web Elexa](https://www.figma.com/design/qVq48vnuCBrticCTv3pmdi/Web-Elexa?node-id=1-3),
página «Pantallas». **Los proyectos y los espacios en alquiler se llenan desde
una base de datos (Supabase)**: agregar, editar o quitar una fila ahí cambia el
sitio solo, sin volver a desplegar.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # salida para Vercel en .vercel/output
npm run check    # tipos
```

## Páginas

| Ruta | Frame de Figma | Contenido | Se genera |
|---|---|---|---|
| `/` | Desktop - 1 | portada | en cada pedido (lee `proyectos`) |
| `/nosotros` | Desktop - 2 | historia, fundador, equipo | en el build |
| `/proyectos` | Desktop - 3 | proyectos abiertos + mapa de anteriores | en cada pedido |
| `/espacios` | Desktop - 4 | espacios en alquiler | en cada pedido |
| `/espacios/{slug}` | Desktop - 5 | ficha de un espacio | en cada pedido |
| `/como-participar` | Desktop - 6 | «Cómo hacer parte»: pasos, «10 minutos con Luis», galería | en el build |

Las que leen la base de datos se arman en el servidor y el CDN de Vercel las
guarda 60 s: un cambio en Supabase se ve en **~1 minuto**.

## Estructura

```
src/
├── pages/                         una por ruta (tabla de arriba) + 404
├── layouts/Base.astro             <html>, metadatos, fuentes, barra clara, pie
├── styles/global.css              tokens de Figma, tipografías, botones, .muescas
├── components/
│   ├── Navbar.astro               barra oscura (portada) y clara (internas), siempre a la vista
│   ├── EncabezadoPagina.astro     título + párrafo de las páginas internas
│   ├── BandaLogos.astro           «Respaldo institucional» / «Marcas que…»
│   ├── Hero, LoQueHacemos, Diferencias, Cifras, Modelo, Libertad, Faq…
│   ├── Galeria.astro              tres marcos (/nosotros y /como-participar)
│   ├── ProyectosAbiertos.astro    portada: lee Supabase y monta la isla ↓
│   ├── CarruselProyectos.tsx      isla: variante 1 / 2 / 3+ y flechas
│   ├── TarjetaProyecto.tsx
│   ├── nosotros/                  Fundador, SobreElexa, Equipo
│   ├── participar/                Pasos, DiezMinutos («10 minutos con Luis»)
│   ├── proyectos/                 TarjetaProyectoGrande, ProyectosAnteriores,
│   │                              MapaProyectos.tsx (isla del mapa), BandaEspacios
│   └── espacios/                  TarjetaEspacio, EncabezadoEspacios
├── lib/
│   ├── supabase.ts                la consulta a la API y las URLs de imágenes
│   ├── proyectos.ts  anteriores.ts  espacios.ts   una por tabla
│   ├── negritas.ts                los **tramos en negrita** de las descripciones
│   └── formas.ts                  las tarjetas «con muesca» en CSS (ver el archivo)
└── data/
    ├── site.ts                    enlaces de todo el sitio (un solo lugar)
    ├── equipo.ts                  «Nuestro equipo»
    ├── faq.ts                     preguntas frecuentes
    └── proyectos.ts  anteriores.ts  espacios.ts   respaldo sin Supabase
public/img/                        assets exportados de Figma
supabase/esquema.sql               tablas, permisos, bucket y datos iniciales
```

## Base de datos

Tres tablas en Supabase, todas con las columnas `orden` (de menor a mayor) y
`publicado` (en `false` deja de mostrarse sin borrarlo):

| Tabla | Dónde se ve | Columnas propias |
|---|---|---|
| `proyectos` | «Proyectos abiertos» de la portada y tarjetas grandes de `/proyectos` | nombre, descripcion, imagen, imagen_grande, enlace |
| `proyectos_anteriores` | mapa y tarjetas de `/proyectos` | nombre, etiqueta_mapa, direccion, caracteristicas, area, espacio, ventaja, precio, **latitud, longitud** |
| `espacios` | `/espacios` y `/espacios/{slug}` | slug, titulo, direccion, zona, precio, precio_nota, caracteristicas (con ícono) |

Detalles de cada columna, con ejemplos, en los comentarios de
`supabase/esquema.sql`.

En la portada, «Proyectos abiertos» cambia de variante según cuántos haya
publicados: 0 → no sale; 1 → una tarjeta ancha; 2 → dos tarjetas; 3 o más →
carrusel con flechas.

### Puesta en marcha (una vez)

1. Crear un proyecto en [Supabase](https://supabase.com) (el plan gratis alcanza).
2. **SQL Editor** → pegar `supabase/esquema.sql` → **Run**. Crea las tablas,
   las deja de sólo lectura para el público (sólo lo publicado), crea el
   bucket `imagenes` para las fotos y carga el contenido del diseño.
3. **Storage → imagenes → Upload**: subir las fotos de ejemplo con las rutas
   que lista el comentario del principio de `supabase/esquema.sql`.
4. **Project Settings → API Keys / Data API**: copiar la URL y la clave
   pública (`sb_publishable_…`, o la `anon` en proyectos viejos; **nunca** la
   secret / service_role) a:
   - `.env` en local (ver `.env.example`);
   - Vercel → Project Settings → Environment Variables: `SUPABASE_URL` y
     `SUPABASE_KEY`, y volver a desplegar.

Sin esas variables el sitio usa los datos de respaldo de `src/data/`, así que
en local funciona recién clonado.

### Día a día

Todo desde **Table Editor**. Para las fotos, subirlas al bucket `imagenes`
(una carpeta por tabla: `proyectos/`, `anteriores/`, `espacios/`) y escribir
la ruta en la columna `imagen`, o pegar una URL completa. JPG o WebP de
1200–1800 px de ancho; la forma de la tarjeta la recorta sola.

- **Negritas en la descripción de un proyecto**: el texto entre dos pares de
  asteriscos sale en negrita en la tarjeta de la portada:
  `Edificio mixto de **14 pisos en Normandía.** Participa desde **$120.9 millones.**`
- **Coordenadas del mapa**: en Google Maps, clic derecho sobre el lugar → el
  primer renglón del menú son la latitud y la longitud.
- **Ficha de un espacio**: `caracteristicas` es una lista con su ícono:
  `[{"icono":"ubicacion","texto":"Sobre la Cra 66 con 2A"}]`. Íconos:
  `ubicacion`, `area`, `niveles`, `entorno`, `parqueadero`.
- **Si Supabase no responde**, la página sale igual pero sin esa sección (no
  muestra datos viejos que podrían anunciar algo ya cerrado); el error queda
  en los logs de la función en Vercel.

## El mapa de proyectos anteriores

En Figma es una captura de Google Maps; acá es un mapa real (Leaflet con
OpenStreetMap) para que se pueda recorrer y cada proyecto se ubique por sus
coordenadas. Los pines, el panel y las tarjetas son los del diseño. Las
teselas de OpenStreetMap son libres con atribución y pensadas para tráfico
moderado; para un estilo más parecido al del diseño se puede cambiar el
proveedor (MapTiler, Stadia… con su clave) en `TESELAS`, al principio de
`src/components/proyectos/MapaProyectos.tsx`. En el teléfono el mapa no se
arrastra con un dedo (movería la página): se usa con los botones de zoom y
tocando los pines.

## Pendientes del diseño

El archivo de Figma todavía trae marcadores de posición; el sitio los
reproduce tal cual:

- **Preguntas frecuentes**: la misma pregunta cinco veces, en `src/data/faq.ts`.
- **Proyectos anteriores**: el diseño trae un solo proyecto de ejemplo
  repetido cinco veces; las coordenadas cargadas son aproximadas.
- **Espacios**: sólo «Local al lado del Ara» tiene ficha completa en el
  diseño; los demás salen con su dirección como única característica.
- **«Cómo hacer parte»**: sigue marcado en Figma como pendiente el
  «Formulario precalificación, datos y CTA. Testimonios y desarrollados».
- **«Construimos valor, juntos.»**: el diseño la sacó de la portada (quedó
  fuera del lienzo, a la izquierda de «Desktop - 1»). El componente
  `ConstruimosValor.astro` y sus imágenes (`public/img/valor/`) siguen en el
  repo por si vuelve; hoy no se usa en ninguna página.
- **Cifras en móvil**: los frames del teléfono dicen «+8» años (y en la
  portada ponen esa cifra primero); los de escritorio siguen con «+7» al
  final, y el sitio sigue al escritorio hasta que se unifiquen.
- **Preguntas frecuentes en móvil**: el frame no trae «Agenda tu cita»; el
  sitio lo deja, como en escritorio.
- **Ficha de un espacio en móvil**: el frame no muestra el precio; el sitio
  lo pone en la muesca de la foto, como en escritorio.
- **Enlaces**: los destinos que todavía no existen están en `null` en
  `src/data/site.ts` (Log in, legales…) y se ven pero no navegan. «Agenda tu
  cita» abre el WhatsApp mientras no haya un Calendly general de Elexa. En
  «Síguenos» del pie, Instagram y YouTube apuntan a los perfiles que nombra
  el diseño (@elexa_real_estate, @luis_inversionista).

## Video del hero

El fondo del hero de la portada es `public/img/hero/Elexa_hero_loop_v6.webm`
(1920 × 1080, en bucle y sin sonido), con un velo oscuro encima para que el
texto blanco se lea en los momentos claros. Al lado van los archivos que se
sacan de él: un corte vertical del centro para teléfonos (más liviano: ~1.4 MB
contra 5.4) y el primer cuadro como imagen fija, que es lo que se ve mientras
carga y lo único que ven quienes tienen activado «reducir movimiento» en su
sistema o un iPhone/iPad con iOS anterior a 17.4 (no leen WebM; no hay
versión MP4 a propósito).

Para cambiar el video, poner el nuevo con el mismo nombre (o cambiar las rutas
en `src/components/Hero.astro`) y regenerar los demás desde
`public/img/hero/` con [ffmpeg](https://ffmpeg.org):

```bash
V=Elexa_hero_loop_v6.webm
ffmpeg -i $V -frames:v 1 -q:v 4 Elexa_hero_loop_v6-poster.jpg
ffmpeg -i $V -an -vf "crop=516:1080:(in_w-516)/2:0" -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 Elexa_hero_loop_v6-movil.webm
```

## Equipo

`src/data/equipo.ts`. Cada foto es la tarjeta exportada de Figma (con la forma
y el degradado ya aplicados) en WebP en `public/img/equipo/`.

## Responsive

Desde 1240 px el sitio sigue los frames de escritorio (1440). Bajo 768 sigue
la página «Mobile» del archivo (303:4413): un frame de 390 por página
(«iPhone 13 & 14 - 1» a «- 6») y la barra móvil («Navbar mobile», 303:6266),
con los estilos de texto Elexa/Mobile/…. Los frames traen arriba la barra de
estado del teléfono (63 de alto): en el sitio todo queda 52 px más arriba que
en Figma, con la barra de Elexa a 12 del borde. Cuando el diseño muestra
menos elementos que los datos (tres personas del equipo, dos espacios…) es
una muestra: el sitio muestra todos.

Entre 768 y 1240 (tablet) no hay frame: se usan las piezas móviles un poco
más holgadas (la barra con menú, el hero móvil, carruseles que se deslizan).

Las tarjetas «con muesca» que cambian de proporción en el teléfono llevan dos
formas en variables propias (`--mascara-escritorio` / `--mascara-movil` o
similares) y el CSS elige cuál según el ancho; ver `src/lib/formas.ts`.
