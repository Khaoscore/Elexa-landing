-- =========================================================================
--  Elexa · base de datos del sitio
--
--  Tres tablas, una por sección que se llena sola:
--   · proyectos             «Proyectos abiertos» (portada) y las tarjetas
--                           grandes de /proyectos
--   · proyectos_anteriores  el mapa y las tarjetas de /proyectos
--   · espacios              /espacios y la ficha /espacios/{slug}
--  y un bucket público, «imagenes», para las fotos.
--
--  Cómo instalarlo (una sola vez):
--   1. Supabase → SQL Editor → New query. Pegar este archivo y Run. Se puede
--      volver a correr: no duplica nada.
--   2. Storage → bucket «imagenes» → subir las fotos de ejemplo con estas
--      rutas (están en public/img/ del repo):
--        proyectos/proyecto-e.jpg          ← public/img/proyectos/proyecto-e.jpg
--        proyectos/florentino.jpg          ← public/img/proyectos/florentino.jpg
--        espacios/{slug}.jpg               ← public/img/espacios/*.jpg (las seis)
--   3. Project Settings → API Keys / Data API: copiar la URL y la clave
--      pública a SUPABASE_URL y SUPABASE_KEY (en .env y en Vercel).
--
--  Después, todo se maneja desde Table Editor. En las tres tablas:
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
--  latitud / longitud: en Google Maps, clic derecho sobre el lugar → el
--  primer renglón del menú son las dos cifras (3.46…, -76.53…).
-- ---------------------------------------------------------------------------
create table if not exists public.proyectos_anteriores (
  id              uuid             primary key default gen_random_uuid(),
  nombre          text             not null,
  etiqueta_mapa   text,                       -- texto corto bajo el pin; vacío = el nombre
  direccion       text,                       -- «Sobre la AV 9N - Granada»
  imagen          text             not null,
  imagen_alt      text             not null default '',
  caracteristicas text[]           not null default '{}',  -- {Esquinero,"Con ascensor"}
  area            text,                       -- «160 m²»
  espacio         text,                       -- «Piso 5 y 6»
  ventaja         text,                       -- «Vista 360»
  precio          text,                       -- «$150 M»
  latitud         double precision not null,
  longitud        double precision not null,
  orden           integer          not null default 0,
  publicado       boolean          not null default true,
  creado_en       timestamptz      not null default now()
);

-- ---------------------------------------------------------------------------
--  Espacios en alquiler
--  slug: el tramo de la URL (/espacios/local-al-lado-de-ara). Minúsculas,
--  números y guiones; único.
--  caracteristicas: la lista de la ficha, cada una con su ícono, por ejemplo
--    [{"icono":"ubicacion","texto":"Sobre la Cra 66 con 2A"},
--     {"icono":"area","texto":"32 metros cuadrados"}]
--  Íconos: ubicacion, area, niveles, entorno, parqueadero.
-- ---------------------------------------------------------------------------
create table if not exists public.espacios (
  id              uuid        primary key default gen_random_uuid(),
  slug            text        not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titulo          text        not null,       -- «Espectacular Rooftop» o «Disponible en: 2027»
  direccion       text,                       -- línea chica: «Sobre la AV 9N»
  zona            text,                       -- en grande: «Granada»
  imagen          text        not null,
  imagen_alt      text        not null default '',
  precio          text,                       -- «$2.990.000»; vacío = sin precio
  precio_nota     text,                       -- «+ IVA»
  caracteristicas jsonb       not null default '[]',
  orden           integer     not null default 0,
  publicado       boolean     not null default true,
  creado_en       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  Permisos: con la clave pública sólo se puede LEER lo publicado. Se edita
--  desde el panel de Supabase, que no pasa por estas políticas.
-- ---------------------------------------------------------------------------
alter table public.proyectos            enable row level security;
alter table public.proyectos_anteriores enable row level security;
alter table public.espacios             enable row level security;

drop policy if exists "Lectura pública de proyectos publicados" on public.proyectos;
create policy "Lectura pública de proyectos publicados"
  on public.proyectos for select to anon, authenticated using (publicado);

drop policy if exists "Lectura pública de proyectos anteriores publicados" on public.proyectos_anteriores;
create policy "Lectura pública de proyectos anteriores publicados"
  on public.proyectos_anteriores for select to anon, authenticated using (publicado);

drop policy if exists "Lectura pública de espacios publicados" on public.espacios;
create policy "Lectura pública de espacios publicados"
  on public.espacios for select to anon, authenticated using (publicado);

grant select on public.proyectos, public.proyectos_anteriores, public.espacios to anon, authenticated;

-- Bucket público para las fotos: cualquiera las ve por URL; sólo el equipo
-- (desde el panel) sube o borra.
insert into storage.buckets (id, name, public)
values ('imagenes', 'imagenes', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  Datos iniciales: los del diseño de Figma. Sólo se cargan si la tabla está
--  vacía.
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

-- El diseño trae un solo proyecto anterior de ejemplo. Coordenadas
-- aproximadas (Av. 9N, Granada): cambiar por las reales.
insert into public.proyectos_anteriores
  (nombre, etiqueta_mapa, direccion, imagen, imagen_alt, caracteristicas, area, espacio, ventaja, precio, latitud, longitud, orden)
select * from (values
  ('Espectacular Rooftop', 'Rooftop', 'Sobre la AV 9N - Granada',
   'espacios/espectacular-rooftop.jpg',
   'Edificio de fachada oscura iluminado de noche, sobre la Avenida 9N en Granada.',
   array['Esquinero', 'Con ascensor'], '160 m²', 'Piso 5 y 6', 'Vista 360', '$150 M',
   3.4609, -76.5316, 1)
) as v(nombre, etiqueta_mapa, direccion, imagen, imagen_alt, caracteristicas, area, espacio, ventaja, precio, latitud, longitud, orden)
where not exists (select 1 from public.proyectos_anteriores);

insert into public.espacios
  (slug, titulo, direccion, zona, imagen, imagen_alt, precio, precio_nota, caracteristicas, orden)
select slug, titulo, direccion, zona, imagen, imagen_alt, precio, precio_nota, caracteristicas::jsonb, orden
from (values
  ('espectacular-rooftop', 'Espectacular Rooftop', 'Sobre la AV 9N', 'Granada',
   'espacios/espectacular-rooftop.jpg',
   'Edificio de fachada oscura iluminado de noche, sobre la Avenida 9N.',
   null, null, '[{"icono":"ubicacion","texto":"Sobre la AV 9N"}]', 1),
  ('rooftop-sobre-via-principal', 'Rooftop sobre vía principal', '260 m en dos niveles', 'Parque del perro',
   'espacios/rooftop-sobre-via-principal.jpg',
   'Fachada de un edificio con locales comerciales en el primer piso, frente al Parque del Perro.',
   null, null, '[{"icono":"area","texto":"260 m en dos niveles"}]', 2),
  ('local-al-lado-de-ara', 'Local al lado del Ara', 'Sobre la Cra 66 con 2A', 'El refugio',
   'espacios/local-al-lado-de-ara.jpg',
   'Locales con persiana en un mall de conveniencia, junto a un supermercado Ara; el local disponible está marcado.',
   '$2.990.000', '+ IVA',
   '[{"icono":"ubicacion","texto":"Sobre la Cra 66 con 2A"},{"icono":"area","texto":"32 metros cuadrados"},{"icono":"niveles","texto":"Posibilidad de mazzanine"},{"icono":"entorno","texto":"En mall de conveniencia"},{"icono":"parqueadero","texto":"Con parqueaderos"}]',
   3),
  ('terraza-descubierta', 'Terraza descubierta', 'Edificio esquinero', 'Granada',
   'espacios/terraza-descubierta.jpg',
   'Edificio esquinero con terraza descubierta y restaurante en el primer piso, entre árboles.',
   null, null, '[{"icono":"ubicacion","texto":"Edificio esquinero"}]', 4),
  ('autopista-cra-58', 'Disponible en: 2027', 'Cra 58 - Costado Sur-Norte', 'Autopista',
   'espacios/autopista-cra-58.jpg',
   'Lote sobre la autopista, con una bodega roja al fondo y un taxi en la vía.',
   null, null, '[{"icono":"ubicacion","texto":"Cra 58 - Costado Sur-Norte"}]', 5),
  ('palmira-cra-28', 'Disponible en: 2027', 'Cra 28 con 45', 'Palmira',
   'espacios/palmira-cra-28.jpg',
   'Casa esquinera de dos pisos con local comercial en Palmira.',
   null, null, '[{"icono":"ubicacion","texto":"Cra 28 con 45"}]', 6)
) as v(slug, titulo, direccion, zona, imagen, imagen_alt, precio, precio_nota, caracteristicas, orden)
where not exists (select 1 from public.espacios);
