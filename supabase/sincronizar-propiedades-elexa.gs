/* =========================================================================
   Hoja «Propiedades Elexa» → tabla `propiedades_elexa` de Supabase.

   Es el Apps Script de la hoja (Extensiones → Apps Script): se copia acá para
   tenerlo versionado junto al sitio. Deja la tabla igual a la hoja (crea,
   actualiza y borra filas):
   · al editar una celda a mano (activador «Al editar»);
   · al insertar o borrar filas (activador «Al cambiar»);
   · una vez por hora, por si algo se escapó (cambios hechos por otro script
     o por la API, una foto nueva en una carpeta…);
   · con el menú Supabase → Sincronizar ahora.
   El sitio (/proyectos) lee la tabla en cada visita y la guarda un minuto.

   Además de copiar las columnas tal cual:
   · Fotos: si la celda trae el enlace de una CARPETA de Drive, a Supabase va
     la lista de las fotos de adentro (una URL por renglón). Primero la que se
     llame «Portada…» (es la que muestra el mapa); después el resto, por
     nombre. Las fotos tienen que ser públicas («Cualquier persona con el
     enlace»; basta con compartir así la carpeta): si no, el sitio muestra el
     símbolo de Elexa en su lugar. También se pueden pegar enlaces de fotos
     sueltas, uno por renglón.

   Instalación o actualización:
   1. En Supabase, que la tabla tenga la columna `fotos` (supabase/esquema.sql).
   2. Pegar este archivo en el editor de Apps Script, reemplazando el anterior.
   3. Ejecutar installTriggers a mano: pide permiso para leer Drive (por las
      carpetas de fotos), reinstala los activadores y sincroniza.
   Propiedades del script: SUPABASE_URL y SUPABASE_SECRET_KEY.
   ========================================================================= */

const TABLE = 'propiedades_elexa';
const SHEET_INDEX = 0;
const KEY_FIELD = 'codigo'; // identificador de cada fila
const PAGE_SIZE = 500;
const WRITE_CHUNK = 200;
const MAX_DELETE_FRACTION = 0.3;
const LOCK_WAIT_MS = 60 * 1000;
const MAX_FOTOS = 30; // por proyecto

// Encabezado de la hoja → columna en Supabase (el orden en la hoja no importa).
const COLUMNS = [
  { header: 'Código', field: 'codigo' },
  { header: 'Nombre del Proyecto', field: 'nombre_del_proyecto' },
  { header: 'Dirección', field: 'direccion' },
  { header: 'Categoría', field: 'categoria' },
  { header: 'Latitud', field: 'latitud' },
  { header: 'Longitud', field: 'longitud' },
  { header: 'Fotos', field: 'fotos' }
];

const FIELDS = COLUMNS.map(c => c.field);

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
    .replace(/[\u0300-\u036f]/g, '')
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

// Las fotos de una carpeta: la «Portada…» primero y el resto por nombre.
// `cache` evita leer dos veces la misma carpeta en una sincronización
// (varias filas pueden compartirla).
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

// Devuelve los registros de la hoja. No modifica la hoja.
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
  const keyIndex = cols.find(c => c.field === KEY_FIELD).index;

  const records = [];
  const seen = new Set();
  const carpetas = {};

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    if (row.every(v => str_(v) === '')) continue;

    const key = str_(row[keyIndex]);
    if (!key) {
      console.warn(`Fila ${i + 1}: tiene datos pero no código, no se sincroniza.`);
      continue;
    }
    if (seen.has(key)) {
      console.warn(`Fila ${i + 1}: el código "${key}" está repetido, se usa la primera fila.`);
      continue;
    }
    seen.add(key);

    const record = {};
    cols.forEach(c => { record[c.field] = str_(row[c.index]); });
    record.fotos = resolverFotos_(record.fotos, carpetas);
    records.push(record);
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
      `${TABLE}?select=${FIELDS.join(',')}&order=${KEY_FIELD}.asc&limit=${PAGE_SIZE}&offset=${offset}`
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
  run_(true);
}

function run_(force) {
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

    // Si la hoja no cambió desde la última sincronización, no hace nada.
    const props = PropertiesService.getScriptProperties();
    const digest = Utilities.base64Encode(
      Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(rows))
    );
    if (!force && props.getProperty('LAST_DIGEST') === digest) {
      console.log('Sin cambios en la hoja. No se sincroniza.');
      return;
    }

    const existing = fetchExisting_();
    const byKey = {};
    existing.forEach(e => { byKey[str_(e[KEY_FIELD])] = e; });

    // 1. Solo las filas nuevas o modificadas.
    const now = new Date().toISOString();
    const toSave = rows
      .filter(r => !byKey[r[KEY_FIELD]] || changed_(r, byKey[r[KEY_FIELD]]))
      .map(r => Object.assign({}, r, { updated_at: now }));

    const created = toSave.filter(r => !byKey[r[KEY_FIELD]]).length;

    for (let i = 0; i < toSave.length; i += WRITE_CHUNK) {
      supabase_(
        'post',
        `${TABLE}?on_conflict=${KEY_FIELD}`,
        toSave.slice(i, i + WRITE_CHUNK),
        'resolution=merge-duplicates,return=minimal'
      );
    }

    // 2. Lo que ya no está en la hoja.
    const keep = new Set(rows.map(r => r[KEY_FIELD]));
    const toDelete = existing.map(e => str_(e[KEY_FIELD])).filter(k => !keep.has(k));

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
        .map(k => `"${k.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
        .join(',');
      supabase_(
        'delete',
        `${TABLE}?${KEY_FIELD}=in.(${encodeURIComponent(chunk)})`,
        undefined,
        'return=minimal'
      );
    }

    // Solo se guarda la huella si todo salió bien.
    props.setProperty('LAST_DIGEST', digest);

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
  run_(false);
}

function syncOnChange(e) {
  const type = e && e.changeType;
  if (['INSERT_ROW', 'REMOVE_ROW', 'OTHER'].indexOf(type) === -1) return;
  run_(false);
}

// Ejecutar UNA vez a mano: valida la conexión, instala activadores y sincroniza.
function installTriggers() {
  // Falla aquí si faltan las propiedades o la tabla no es accesible.
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

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Supabase')
    .addItem('Sincronizar ahora', 'syncAll')
    .addToUi();
}
