-- =========================================================================
--  Elexa · base de datos del sitio
--
--  Tres tablas, una por sección que se llena sola:
--   · proyectos             «Proyectos abiertos» (portada) y las tarjetas
--                           grandes de /proyectos
--   · propiedades_elexa     el mapa y las tarjetas de /proyectos; no se
--                           edita acá sino en la hoja de Google
--                           «Propiedades Elexa» (con su propio Apps Script)
--   · propiedades           /espacios y la ficha /espacios/{slug}; ésta no
--                           se edita acá sino en la hoja de Google «Alquiler
--                           Elexa» (ver supabase/sincronizar-hoja.gs)
--  y un bucket público, «imagenes», para las fotos.
--
--  Cómo instalarlo (una sola vez):
--   1. Supabase → SQL Editor → New query. Pegar este archivo y Run. Se puede
--      volver a correr: no duplica nada.
--   2. Storage → bucket «imagenes» → subir las fotos de ejemplo con estas
--      rutas (están en public/img/ del repo):
--        proyectos/proyecto-e.jpg          ← public/img/proyectos/proyecto-e.jpg
--        proyectos/florentino.jpg          ← public/img/proyectos/florentino.jpg
--        espacios/espectacular-rooftop.jpg ← public/img/espacios/espectacular-rooftop.jpg
--   3. Project Settings → API Keys / Data API: copiar la URL y la clave
--      pública a SUPABASE_URL y SUPABASE_KEY (en .env y en Vercel).
--
--  Después, `proyectos` se maneja desde Table Editor:
--   · imagen     ruta dentro del bucket (`espacios/rooftop.jpg`) o una URL
--                completa. JPG o WebP de 1200–1800 px de ancho.
--   · imagen_alt qué se ve en la foto, para lectores de pantalla.
--   · orden      de menor a mayor.
--   · publicado  false = deja de mostrarse sin borrarlo.
--  Los cambios se ven en el sitio en un minuto como mucho.
-- =========================================================================

-- ---------------------------------------------------------------------------
--  Proyectos abiertos
--  Con 1 publicado la portada muestra una tarjeta ancha; con 2, dos tarjetas;
--  con 3 o más, un carrusel. Con 0 la sección no sale.
-- ---------------------------------------------------------------------------
create table if not exists public.proyectos (
  id            uuid        primary key default gen_random_uuid(),
  nombre        text        not null,
  descripcion   text        not null,        -- se corta a 4 líneas (~200 caracteres); **así** sale en negrita
  imagen        text        not null,        -- foto de la tarjeta de la portada
  imagen_grande text,                        -- foto de /proyectos; vacía = la de arriba
  imagen_alt    text        not null default '',
  enlace        text        not null,        -- a dónde lleva «Ver más» / «Ver proyecto»
  orden         integer     not null default 0,
  publicado     boolean     not null default true,
  creado_en     timestamptz not null default now()
);

-- Si la tabla ya existía de la primera versión, le falta esta columna.
alter table public.proyectos add column if not exists imagen_grande text;

-- ---------------------------------------------------------------------------
--  Proyectos anteriores (el mapa)
--  La llena sola la hoja de Google «Propiedades Elexa» con el Apps Script de
--  supabase/sincronizar-propiedades-elexa.gs (upsert por `codigo` al editar
--  la hoja y cada hora, con la clave secreta): lo que se cambie a mano acá lo
--  pisa la próxima sincronización.
--  Sale en el mapa todo lo que esté en la hoja, en el orden de los códigos.
--  latitud / longitud: en Google Maps, clic derecho sobre el lugar → el
--  primer renglón del menú son las dos cifras (3.46…, -76.53…). El script
--  las manda como texto y el sitio las interpreta (src/lib/anteriores.ts).
--  fotos: una URL por renglón; el script cambia la carpeta de Drive de la
--  hoja por sus fotos, con la «Portada…» primero. Sin fotos (o si no son
--  públicas) sale el símbolo de Elexa.
--  Si la tabla ya existía (la creó el script), el create no la toca y sólo
--  se le agrega `fotos`. La tabla `proyectos_anteriores` de la primera
--  versión ya no se usa.
-- ---------------------------------------------------------------------------
create table if not exists public.propiedades_elexa (
  codigo              text        primary key,
  nombre_del_proyecto text,
  direccion           text,
  categoria           text,       -- «Propiedades», «Inversiones»
  latitud             text,
  longitud            text,
  fotos               text,       -- una URL por renglón; la primera es la portada
  updated_at          timestamptz not null default now()
);

alter table public.propiedades_elexa add column if not exists fotos text;

-- ---------------------------------------------------------------------------
--  Espacios en alquiler
--  La llena sola la hoja de Google «Alquiler Elexa» con el Apps Script de
--  supabase/sincronizar-hoja.gs, que escribe con la clave secreta: lo que se
--  cambie a mano acá lo pisa la próxima sincronización. Todo es texto, como
--  en la hoja; el sitio lo interpreta (src/lib/espacios.ts).
--  Si la tabla ya existía (la creó el script), el create no la toca y sólo
--  se le agrega `orden`.
-- ---------------------------------------------------------------------------
create table if not exists public.propiedades (
  id          text        primary key,   -- lo pone el script en la hoja
  nombre      text        not null,
  barrio      text,
  valor       text,                      -- «$3.934.000 + IVA»
  area        text,                      -- «67» (en m²) o «150 a 400»
  parqueadero text,                      -- «Sí» / «No» / cuántos
  ascensor    text,                      -- «Sí» / «No»
  amenidades  text,                      -- una por renglón
  fotos       text,                      -- URLs de las fotos, una por renglón
  orden       integer,                   -- la posición de la fila en la hoja
  updated_at  timestamptz not null default now()
);

alter table public.propiedades add column if not exists orden integer;

-- ---------------------------------------------------------------------------
--  Permisos: con la clave pública sólo se puede LEER (en `proyectos`, sólo
--  lo publicado). Se edita desde el panel de Supabase o con la clave
--  secreta, que no pasan por estas políticas.
-- ---------------------------------------------------------------------------
alter table public.proyectos         enable row level security;
alter table public.propiedades_elexa enable row level security;
alter table public.propiedades       enable row level security;

drop policy if exists "Lectura pública de proyectos publicados" on public.proyectos;
create policy "Lectura pública de proyectos publicados"
  on public.proyectos for select to anon, authenticated using (publicado);

-- Como en `propiedades`, todo lo que está en la hoja se publica.
drop policy if exists "Lectura pública de proyectos anteriores" on public.propiedades_elexa;
create policy "Lectura pública de proyectos anteriores"
  on public.propiedades_elexa for select to anon, authenticated using (true);

-- Todo lo que está en la hoja se publica: para quitar un espacio se borra
-- su fila.
drop policy if exists "Lectura pública de propiedades" on public.propiedades;
create policy "Lectura pública de propiedades"
  on public.propiedades for select to anon, authenticated using (true);

grant select on public.proyectos, public.propiedades_elexa, public.propiedades to anon, authenticated;

-- El script de la hoja «Alquiler Elexa» escribe con la clave secreta (rol
-- service_role): se salta las políticas, pero igual necesita permiso sobre
-- la tabla si el proyecto no los da solo a las tablas nuevas.
grant select, insert, update, delete on public.propiedades to service_role;

-- Lo mismo para el de la hoja «Propiedades Elexa».
grant select, insert, update, delete on public.propiedades_elexa to service_role;

-- Bucket público para las fotos: cualquiera las ve por URL; sólo el equipo
-- (desde el panel) sube o borra.
insert into storage.buckets (id, name, public)
values ('imagenes', 'imagenes', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  Datos iniciales: los del diseño de Figma. Sólo se cargan si la tabla está
--  vacía. `propiedades` y `propiedades_elexa` no llevan: sus filas son las
--  de cada hoja (si se cargaran acá, el script las borraría por no estar en
--  la hoja).
-- ---------------------------------------------------------------------------
insert into public.proyectos (nombre, descripcion, imagen, imagen_grande, imagen_alt, enlace, orden)
select * from (values
  ('Proyecto e',
   'Edificio mixto de **14 pisos en Normandía.** Un proyecto colectivo de Elexa con locales, oficinas y apartamentos. Participa desde **$120.9 millones.**',
   'proyectos/proyecto-e.jpg', null,
   'Vista aérea de Proyecto e en Normandía: una torre con balcones cubiertos de plantas entre edificios blancos.',
   'https://proyecto-e.elexa.com.co', 1),
  ('Florentino',
   'Contará con 8 pisos, sótano y terraza en **la esquina más visible del Peñón**. Un proyecto colectivo de Elexa con locales, oficinas y apartamentos. Participa desde **$150 millones.**',
   'proyectos/florentino.jpg', null,
   'Render de Florentino al atardecer en una esquina del Peñón, con su escalera helicoidal magenta en la fachada.',
   'https://florentino.elexa.com.co', 2)
) as v(nombre, descripcion, imagen, imagen_grande, imagen_alt, enlace, orden)
where not exists (select 1 from public.proyectos);
