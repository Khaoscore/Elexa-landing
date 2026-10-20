/* =========================================================================
   Hoja «Alquiler Elexa» → tabla `propiedades` de Supabase.

   Es el Apps Script de la hoja (Extensiones → Apps Script): se copia acá para
   tenerlo versionado junto al sitio. Cada edición de la hoja, y una vez por
   hora, deja la tabla igual a la hoja: crea, actualiza y borra filas.

   Además de copiar las columnas tal cual:
   · Fotos: si la celda trae el enlace de una CARPETA de Drive, a Supabase va
     la lista de las fotos de adentro (una URL por renglón): primero la que
     se llame «Portada…» (si hay) y después por nombre del archivo. La
     primera es la portada de la tarjeta. Para elegir el orden basta con
     nombrarlas 01.jpg, 02.jpg… Las fotos tienen que ser públicas
     («Cualquier persona con el enlace»; basta con compartir así la carpeta).
     También se pueden pegar enlaces de fotos sueltas, uno por renglón.
     Una foto nueva en la carpeta no edita la hoja: aparece en la revisión
     de cada hora o con Supabase → Sincronizar ahora.
   · orden: la posición de la fila en la hoja. El sitio muestra los espacios
     en ese orden.

   Instalación o actualización:
   1. En Supabase, correr supabase/esquema.sql (agrega la columna `orden` y
      deja la tabla de sólo lectura para la clave pública).
   2. Pegar este archivo en el editor de Apps Script, reemplazando el anterior.
   3. Ejecutar installTriggers a mano: pide permiso para leer Drive (por las
      carpetas de fotos), reinstala los activadores y sincroniza.
   Propiedades del script: SUPABASE_URL y SUPABASE_SECRET_KEY.
   ========================================================================= */

const TABLE = 'propiedades';
const SHEET_INDEX = 0;
const PAGE_SIZE = 500;
const WRITE_CHUNK = 200;
const MAX_DELETE_FRACTION = 0.3;
const LOCK_WAIT_MS = 60 * 1000;
const MAX_FOTOS = 30; // por espacio

// Encabezado de la hoja → columna en Supabase (el orden en la hoja no importa).
const COLUMNS = [
  { header: 'ID', field: 'id' },
  { header: 'Nombre', field: 'nombre' },
  { header: 'Barrio', field: 'barrio' },
  { header: 'Valor', field: 'valor' },
  { header: 'Area', field: 'area' },
  { header: 'Parqueadero', field: 'parqueadero' },
  { header: 'Ascensor', field: 'ascensor' },
  { header: 'Amenidades', field: 'amenidades' },
  { header: 'Fotos', field: 'fotos' }
];

// Las columnas de la hoja más las que calcula el script.
const FIELDS = COLUMNS.map(c => c.field).concat(['orden']);

/* ----------------------------- Utilidades ----------------------------- */

function cfg_() {
  const p = PropertiesService.getScriptProperties();
  const url = p.getProperty('SUPABASE_URL');
  const key = p.getProperty('SUPABASE_SECRET_KEY');
  if (!url || !key) throw new Error('Falta configurar SUPABASE_URL o SUPABASE_SECRET_KEY.');
  return { url: url.trim().replace(/\/+$/, ''), key: key.trim() };
}

function supabase_(method, path, body, prefer) {
  const { url, key } = cfg_();
  const headers = { apikey: key, Authorization: 'Bearer ' + key };
  if (prefer) headers.Prefer = prefer;

  const req = { method: method, headers: headers, muteHttpExceptions: true };
  if (body !== undefined) {
    req.contentType = 'application/json';
    req.payload = JSON.stringify(body);
  }

  const res = UrlFetchApp.fetch(`${url}/rest/v1/${path}`, req);
  const code = res.getResponseCode();
  const text = res.getContentText();
  if (code >= 300) {
    throw new Error(`Supabase ${code} en ${method.toUpperCase()} ${path.split('?')[0]}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

function normalize_(v) {
  return String(v === null || v === undefined ? '' : v)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function str_(v) {
  return String(v === null || v === undefined ? '' : v).trim();
}

function sheet_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[SHEET_INDEX];
  if (!sh) throw new Error('No se encontró la pestaña configurada.');
  return sh;
}

/* -------------------------------- Fotos -------------------------------- */

const DRIVE_CARPETA = /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/;
const DRIVE_ARCHIVO = [
  /drive\.google\.com\/file\/(?:u\/\d+\/)?d\/([\w-]{20,})/,
  /(?:drive|docs)\.google\.com\/(?:open|uc|thumbnail)\?(?:.*&)?id=([\w-]{20,})/,
  /lh3\.googleusercontent\.com\/d\/([\w-]{20,})/
];

function urlFoto_(id) {
  return 'https://lh3.googleusercontent.com/d/' + id;
}

// Las fotos de una carpeta, por nombre. `cache` evita leer dos veces la misma
// carpeta en una sincronización (varias filas pueden compartirla).
function fotosDeCarpeta_(id, cache) {
  if (cache[id]) return cache[id];

  let fotos = [];
  try {
    const archivos = DriveApp.getFolderById(id).getFiles();
    while (archivos.hasNext()) {
      const f = archivos.next();
      if (f.getMimeType().indexOf('image/') === 0 && !f.isTrashed()) {
        fotos.push({ nombre: f.getName(), id: f.getId() });
      }
    }
    // «Portada…» va primero; las demás, por nombre.
    const portada = f => (/^portada/i.test(f.nombre) ? 0 : 1);
    fotos.sort((a, b) => portada(a) - portada(b) || a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
    if (!fotos.length) console.warn(`La carpeta ${id} no tiene fotos.`);
  } catch (err) {
    console.warn(`No se pudo leer la carpeta de fotos ${id}: ${err.message}`);
    fotos = [];
  }

  cache[id] = fotos.map(f => urlFoto_(f.id));
  return cache[id];
}

// La celda de Fotos → una URL por renglón: cada carpeta se cambia por sus
// fotos y cada enlace de Drive por su URL directa; lo demás queda igual.
function resolverFotos_(celda, cache) {
  const urls = [];
  str_(celda).split(/[\s,]+/).filter(Boolean).forEach(texto => {
    const carpeta = texto.match(DRIVE_CARPETA);
    if (carpeta) {
      urls.push(...fotosDeCarpeta_(carpeta[1], cache));
      return;
    }
    for (const patron of DRIVE_ARCHIVO) {
      const m = texto.match(patron);
      if (m) {
        urls.push(urlFoto_(m[1]));
        return;
      }
    }
    urls.push(texto);
  });
  return urls.filter((u, i) => urls.indexOf(u) === i).slice(0, MAX_FOTOS).join('\n');
}

/* ------------------------------ Lectura ------------------------------- */

// Devuelve los registros de la hoja y asigna IDs faltantes o duplicados.
function readSheet_() {
  const sh = sheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];

  const values = sh.getRange(1, 1, lastRow, sh.getLastColumn()).getValues();
  const headers = values[0].map(normalize_);

  const cols = COLUMNS.map(c => {
    const index = headers.indexOf(normalize_(c.header));
    if (index === -1) throw new Error(`Falta la columna "${c.header}" en la fila 1 de la hoja.`);
    return { index: index, field: c.field };
  });
  const idIndex = cols.find(c => c.field === 'id').index;
  const nameIndex = cols.find(c => c.field === 'nombre').index;

  const records = [];
  const seen = new Set();
  const carpetas = {};
  let idsChanged = false;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    if (row.every(v => str_(v) === '')) continue;

    if (!str_(row[nameIndex])) {
      console.warn(`Fila ${i + 1}: tiene datos pero no nombre, no se sincroniza.`);
      continue;
    }

    let id = str_(row[idIndex]);
    if (!id || seen.has(id)) {
      id = Utilities.getUuid();
      row[idIndex] = id;
      idsChanged = true;
    }
    seen.add(id);

    const record = {};
    cols.forEach(c => { record[c.field] = str_(row[c.index]); });
    record.id = id;
    record.fotos = resolverFotos_(record.fotos, carpetas);
    record.orden = records.length + 1;
    records.push(record);
  }

  // Escribe solo la columna ID, sin tocar el resto.
  if (idsChanged) {
    sh.getRange(2, idIndex + 1, values.length - 1, 1)
      .setValues(values.slice(1).map(r => [r[idIndex]]));
  }

  return records;
}

// Trae todas las filas actuales de Supabase, por páginas.
function fetchExisting_() {
  const all = [];
  let offset = 0;
  while (true) {
    const page = supabase_(
      'get',
      `${TABLE}?select=${FIELDS.join(',')}&order=id.asc&limit=${PAGE_SIZE}&offset=${offset}`
    );
    if (!Array.isArray(page)) throw new Error('La respuesta de Supabase no es una lista válida.');
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return all;
}

function changed_(record, previous) {
  return FIELDS.some(f => str_(record[f]) !== str_(previous[f]));
}

/* ---------------------------- Sincronización --------------------------- */

function syncAll() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) {
    console.warn('Otra sincronización sigue en curso; la siguiente edición o la revisión horaria se pondrán al día.');
    return;
  }

  try {
    const rows = readSheet_();

    // Nunca borrar la tabla por una hoja vacía.
    if (!rows.length) {
      console.log('No hay registros válidos. No se borró nada.');
      return;
    }

    const existing = fetchExisting_();
    const byId = {};
    existing.forEach(e => { byId[String(e.id)] = e; });

    // 1. Solo las filas nuevas o modificadas.
    const now = new Date().toISOString();
    const toSave = rows
      .filter(r => !byId[r.id] || changed_(r, byId[r.id]))
      .map(r => Object.assign({}, r, { updated_at: now }));

    const created = toSave.filter(r => !byId[r.id]).length;

    for (let i = 0; i < toSave.length; i += WRITE_CHUNK) {
      supabase_(
        'post',
        `${TABLE}?on_conflict=id`,
        toSave.slice(i, i + WRITE_CHUNK),
        'resolution=merge-duplicates,return=minimal'
      );
    }

    // 2. Lo que ya no está en la hoja.
    const keep = new Set(rows.map(r => r.id));
    const toDelete = existing.map(e => String(e.id)).filter(id => !keep.has(id));

    // Seguro contra borrados masivos.
    const limit = Math.max(3, Math.floor(existing.length * MAX_DELETE_FRACTION));
    if (toDelete.length > limit) {
      throw new Error(
        `No se borró nada: iba a borrar ${toDelete.length} de ${existing.length} registros (límite ${limit}). ` +
        'Si es correcto, sube MAX_DELETE_FRACTION y ejecuta syncAll.'
      );
    }

    // 3. Borrar.
    for (let i = 0; i < toDelete.length; i += 50) {
      const chunk = toDelete.slice(i, i + 50)
        .map(id => `"${id.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
        .join(',');
      supabase_('delete', `${TABLE}?id=in.(${encodeURIComponent(chunk)})`, undefined, 'return=minimal');
    }

    console.log(
      `Sincronización: ${created} nuevos, ${toSave.length - created} actualizados, ` +
      `${toDelete.length} borrados (${rows.length} filas en la hoja).`
    );
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------ Activadores ---------------------------- */

function syncOnEdit(e) {
  if (e && e.range && e.range.getSheet().getSheetId() !== sheet_().getSheetId()) return;
  syncAll();
}

function syncOnChange(e) {
  const type = e && e.changeType;
  if (['INSERT_ROW', 'REMOVE_ROW', 'OTHER'].indexOf(type) === -1) return;
  syncAll();
}

// Ejecutar UNA vez a mano: valida la conexión, instala activadores y sincroniza.
function installTriggers() {
  // Falla aquí si faltan las propiedades, la tabla no es accesible o le
  // falta la columna `orden` (correr supabase/esquema.sql).
  supabase_('get', `${TABLE}?select=${FIELDS.join(',')}&limit=1`);

  const own = ['syncAll', 'syncOnEdit', 'syncOnChange'];
  ScriptApp.getProjectTriggers()
    .filter(t => own.indexOf(t.getHandlerFunction()) !== -1)
    .forEach(t => ScriptApp.deleteTrigger(t));

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('syncOnEdit').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('syncOnChange').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('syncAll').timeBased().everyHours(1).create();

  syncAll();
}

// Para revisar sin tocar Supabase: muestra en el registro cómo quedaría cada
// fila (sobre todo las fotos). Ojo: como la sincronización, asigna los IDs
// que falten en la hoja.
function verificarHoja() {
  readSheet_().forEach(r => {
    const fotos = r.fotos ? r.fotos.split('\n').length : 0;
    console.log(`${r.orden}. ${r.nombre}: ${fotos} foto(s)`);
  });
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Supabase')
    .addItem('Sincronizar ahora', 'syncAll')
    .addToUi();
}
