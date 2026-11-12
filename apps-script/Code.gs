/**
 * =====================================================================
 *  SALA KARANIS · Endpoint de captura (Google Apps Script)
 * ---------------------------------------------------------------------
 *  Recibe lo que pasa en www.elexa.com.co/sala (entradas, señales de
 *  presencia, respuestas, clics, preguntas) y guarda el estado que fija
 *  /panel. Es el mismo código de la sala de Florentino con otro nombre y
 *  otras claves: Karanis va en su propia hoja.
 *
 *  Cómo instalarlo (5 minutos):
 *   1. Crea una hoja de Google nueva para Karanis (no uses la de Florentino).
 *   2. Extensiones → Apps Script. Borra lo que haya y pega este archivo.
 *   3. Ejecuta una vez la función `setup` (botón ▶). Acepta los permisos.
 *      Crea las pestañas Asistentes / Preguntas / Eventos / Calendario y las
 *      claves del panel.
 *   4. Implementar → Nueva implementación → tipo "Aplicación web":
 *        - Ejecutar como: Yo
 *        - Quién tiene acceso: Cualquier usuario
 *      Copia la URL que termina en /exec y pégala en src/data/sala.ts → ENDPOINT.
 *   5. Cambia las claves: Configuración del proyecto ⚙ → Propiedades del
 *      script. PANEL_KEY (por defecto: karanis2026) ve todo el /panel.
 *      MOD_KEY (por defecto: modkaranis2026) entra al mismo /panel pero sólo
 *      ve el chat: borra mensajes y expulsa personas. PANEL_KEY también
 *      modera. Si borras MOD_KEY, sólo modera PANEL_KEY.
 *   6. Prueba: abre `…/exec?action=estado`. Tiene que responder con
 *      `"enlace":false`.
 *
 *  Cada vez que edites este código: Implementar → Gestionar implementaciones
 *  → ✎ → Versión: Nueva → Implementar. La URL /exec no cambia. Mientras no se
 *  publique la versión nueva, la sala sigue hablando con el código viejo.
 *  («Nueva implementación» crea otra URL, que la sala no conoce.)
 *
 *  Para un webinar nuevo en la misma hoja: renombra Asistentes, Preguntas,
 *  Eventos y Calendario (p. ej. «Preguntas 26-nov») y corre `setup` desde el
 *  menú. Crea las pestañas vacías; si no, el muro de la sala muestra las
 *  preguntas del webinar anterior.
 * =====================================================================
 */

var TZ = 'America/Bogota';
var HOJAS = { asistentes: 'Asistentes', preguntas: 'Preguntas', eventos: 'Eventos', registrados: 'Registrados', calendario: 'Calendario' };
// Pestaña Calendario: una fila por persona que pulsó «Agregar a Google Calendar».
var CAL_COLUMNAS = ['primer_clic', 'nombre', 'numero', 'correo', 'desde', 'clics', 'ultimo_clic'];
var CLAVE_POR_DEFECTO = 'karanis2026';
var CLAVE_MOD_POR_DEFECTO = 'modkaranis2026';

// Una fila por persona. Los ejercicios escriben en su propia columna; si llega un
// campo nuevo la columna se crea sola al final.
// La sala hace una sola pregunta —EJERCICIOS en src/data/sala.ts, campo `e1_decision`—
// y esa es la única columna de ejercicio que existe. Si algún día vuelve a haber más de
// una, se agregan acá en el mismo orden en el que salen en el directo.
var COLUMNAS = [
  'nombre', 'numero', 'correo', 'entrada_ts', 'ultima_senal', 'minutos_vistos', 'dias_asistidos', 'sesiones',
  'dispositivo', 'utm_source',
  'e1_decision',
  'accion_final', 'acciones_log', 'dossier_email', 'pregunta', 'registrado', 'navegador'
];

// Si entre dos señales pasan más de estos minutos, ese tramo no cuenta como "visto"
// (la persona cerró la pestaña y volvió). El ping normal llega cada 1 min.
var MAX_BRECHA_MIN = 2.5;
// "Activos ahora" = última señal hace menos de estos segundos.
var ACTIVO_SEG = 120;

/* ======================= configuración inicial ======================= */

function setup() {
  var ss = SpreadsheetApp.getActive();
  try { ss.setSpreadsheetTimeZone(TZ); } catch (e) {}

  var sa = hoja_(ss, HOJAS.asistentes);
  if (sa.getLastRow() === 0) {
    sa.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold').setBackground('#fbe6a2');
    sa.setFrozenRows(1);
  } else {
    // agrega columnas que falten, sin mover las existentes
    var h = encabezados_(sa);
    COLUMNAS.forEach(function (c) { if (h.indexOf(c) < 0) { sa.getRange(1, h.length + 1).setValue(c).setFontWeight('bold'); h.push(c); } });
  }
  var cNum = encabezados_(sa).indexOf('numero') + 1;
  if (cNum > 0) sa.getRange(1, cNum, sa.getMaxRows(), 1).setNumberFormat('@'); // celular como texto (conserva ceros y +)
  ['entrada_ts', 'ultima_senal'].forEach(function (c) {
    var i = encabezados_(sa).indexOf(c) + 1;
    if (i > 0) sa.getRange(2, i, sa.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  });

  var sp = hoja_(ss, HOJAS.preguntas);
  if (sp.getLastRow() === 0) { sp.appendRow(['hora', 'nombre', 'numero', 'pregunta', 'estado']); sp.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#fbe6a2'); sp.setFrozenRows(1); sp.getRange('C:C').setNumberFormat('@'); }
  else if (!String(sp.getRange(1, 5).getValue())) sp.getRange(1, 5).setValue('estado').setFontWeight('bold').setBackground('#fbe6a2');

  var se = hoja_(ss, HOJAS.eventos);
  if (se.getLastRow() === 0) { se.appendRow(['hora', 'tipo', 'numero', 'detalle']); se.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#fbe6a2'); se.setFrozenRows(1); se.getRange('C:C').setNumberFormat('@'); }

  hojaCalendario_(ss);

  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('PANEL_KEY')) props.setProperty('PANEL_KEY', CLAVE_POR_DEFECTO);
  if (!props.getProperty('MOD_KEY')) props.setProperty('MOD_KEY', CLAVE_MOD_POR_DEFECTO);
  if (!props.getProperty('ESTADO')) guardarEstado_({ ejercicio: 0, ctas: false, enlace: false });

  Logger.log('Listo. Clave del panel: ' + props.getProperty('PANEL_KEY') + ' · clave de moderación: ' + props.getProperty('MOD_KEY') + ' (cámbialas en Propiedades del script → PANEL_KEY / MOD_KEY)');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Sala Karanis')
    .addItem('Configurar hojas (setup)', 'setup')
    .addItem('Limpiar columnas de ejercicios viejos', 'limpiarEjerciciosViejos')
    .addItem('Ordenar columnas', 'ordenarColumnas')
    .addItem('Cruzar con registrados', 'cruzarConRegistrados')
    .addItem('Ocultar ejercicio, botones y enlace', 'reiniciarEstado')
    .addToUi();
}

function reiniciarEstado() { guardarEstado_({ ejercicio: 0, ctas: false, enlace: false }); }

/* ============== limpieza de las columnas de ejercicios ==============
   Por si la hoja arrastra columnas de preguntas que ya no se hacen (de un
   ensayo o de un webinar anterior: e1_conocia, e2_ayuda, e3_momento…).
   Esta función borra toda columna `eN_…` que no esté en COLUMNAS y deja las que
   sí están en el espacio que ocupaban ellas, no al final de la hoja:

   · si la columna vigente todavía no existe, se reutiliza el primer hueco
     (cambia el encabezado y se vacía);
   · si ya existe más a la derecha —el script la creó al final porque alguien
     respondió antes de limpiar—, sus respuestas se mudan a ese hueco y la
     columna suelta se borra.

   Pide confirmación: lo que haya en las columnas viejas se pierde. */
function limpiarEjerciciosViejos() {
  var ui = SpreadsheetApp.getUi();
  var sh = hojaAsistentes_();
  var h = encabezados_(sh);
  var vigentes = COLUMNAS.filter(function (c) { return /^e\d+_/.test(c); });
  var faltan = vigentes.filter(function (c) { return h.indexOf(c) < 0; });
  var viejas = [];
  h.forEach(function (n, i) { if (/^e\d+_/.test(n) && vigentes.indexOf(n) < 0) viejas.push({ nombre: n, col: i + 1 }); });

  if (!viejas.length && !faltan.length) { ui.alert('Nada que limpiar: de los ejercicios la hoja guarda sólo ' + vigentes.join(', ') + '.'); return; }
  if (!viejas.length) { setup(); ui.alert('No había columnas viejas. Se creó ' + faltan.join(', ') + ' al final de la hoja.'); return; }

  // qué va a dónde: cada columna vigente toma el hueco que dejó una vieja
  var libres = viejas.slice(), plan = [], borrar = [], detalle = '';
  vigentes.forEach(function (nombre) {
    if (!libres.length) return;
    var actual = h.indexOf(nombre) + 1;   // 0 = todavía no existe
    var hueco = libres[0];
    if (!actual) {
      libres.shift();
      plan.push({ nombre: nombre, destino: hueco.col, origen: 0 });
      detalle += '· ' + hueco.nombre + ' (' + letra_(hueco.col) + ')  →  ' + nombre + ', vacía\n';
    } else if (actual > hueco.col) {
      libres.shift();
      plan.push({ nombre: nombre, destino: hueco.col, origen: actual });
      borrar.push(actual);
      detalle += '· ' + hueco.nombre + ' (' + letra_(hueco.col) + ')  →  ' + nombre + ', con las respuestas que hoy están en ' + letra_(actual) + '\n';
    }
  });
  libres.forEach(function (v) { borrar.push(v.col); detalle += '· ' + v.nombre + ' (' + letra_(v.col) + ')  →  se borra la columna entera\n'; });

  var r = ui.alert('Limpiar las columnas de ejercicios',
    'En la pestaña ' + HOJAS.asistentes + ':\n\n' + detalle + '\nLo que tengan escrito las columnas viejas se pierde. ¿Seguimos?',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;

  var last = sh.getLastRow();
  plan.forEach(function (p) {
    sh.getRange(1, p.destino).setValue(p.nombre).setFontWeight('bold');
    if (last < 2) return;
    if (p.origen) sh.getRange(2, p.destino, last - 1, 1).setValues(sh.getRange(2, p.origen, last - 1, 1).getValues());
    else sh.getRange(2, p.destino, last - 1, 1).clearContent();
  });
  // de derecha a izquierda: al borrar una columna, las de su derecha se corren
  borrar.sort(function (a, b) { return b - a; }).forEach(function (c) { sh.deleteColumn(c); });

  setup();  // por si quedara alguna columna de COLUMNAS sin crear
  ui.alert('Listo. De los ejercicios la hoja guarda ahora sólo ' + vigentes.join(', ') + '.');
}

/* ================== orden de las columnas de Asistentes ==================
   Deja la pestaña en el orden de COLUMNAS (para cambiar el orden, se cambia
   COLUMNAS y se vuelve a correr). Mueve columnas enteras, con sus datos y su
   formato; la que falte se inserta vacía en su lugar. Las que no están en
   COLUMNAS (ejercicios viejos, campos sueltos) quedan al final, en el orden
   que traían. No borra nada.

   El script escribe cada dato buscando su columna por el encabezado, así que
   no se pierde nada al mover; igual conviene correrlo fuera del directo. */
function ordenarColumnas() {
  var ui = SpreadsheetApp.getUi();
  var sh = hojaAsistentes_();
  var h = encabezados_(sh);

  var detalle = '', pos = 0, sim = h.slice();
  COLUMNAS.forEach(function (nombre) {
    pos++;
    var i = sim.indexOf(nombre) + 1;
    if (!i) { sim.splice(pos - 1, 0, nombre); detalle += '· ' + nombre + ' → nueva, en ' + letra_(pos) + '\n'; }
    else if (i !== pos) { sim.splice(i - 1, 1); sim.splice(pos - 1, 0, nombre); detalle += '· ' + nombre + ': ' + letra_(i) + ' → ' + letra_(pos) + '\n'; }
  });
  if (!detalle) { ui.alert('Las columnas ya están en orden.'); return; }

  var r = ui.alert('Ordenar las columnas',
    'En la pestaña ' + HOJAS.asistentes + ' (cada movimiento corre las demás):\n\n' + detalle + '\nNo se borra ningún dato. ¿Seguimos?',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;

  var lock = LockService.getScriptLock();
  var conLock = lock.tryLock(30000);
  try {
    h = encabezados_(sh);  // por si entró alguien mientras se confirmaba
    COLUMNAS.forEach(function (nombre, k) {
      var pos = k + 1, i = h.indexOf(nombre) + 1;
      if (i === pos) return;
      if (!i) {
        if (pos > h.length) sh.getRange(1, pos).setValue(nombre);
        else { sh.insertColumnBefore(pos); sh.getRange(1, pos).setValue(nombre); }
        sh.getRange(1, pos).setFontWeight('bold').setBackground('#fbe6a2');
        h.splice(pos - 1, 0, nombre);
      } else {
        // i > pos siempre: las posiciones anteriores ya quedaron ocupadas
        sh.moveColumns(sh.getRange(1, i), pos);
        h.splice(i - 1, 1); h.splice(pos - 1, 0, nombre);
      }
    });
    SpreadsheetApp.flush();
  } finally {
    if (conLock) lock.releaseLock();
  }
  setup();  // vuelve a aplicar los formatos (celular como texto, fechas)
  ui.alert('Listo. Las columnas quedaron en el orden de COLUMNAS.');
}

/* ============================ web app ============================ */

function doGet(e) {
  var p = (e && e.parameter) || {};
  var action = p.action || 'ping';
  try {
    if (action === 'ping') return json_({ ok: true, servicio: 'sala-karanis', hora: ahora_() });
    if (action === 'estado') {
      // la sala manda su número: así se entera, en la misma consulta, si la expulsaron
      var est = leerEstado_();
      if (p.numero) est.expulsado = esExpulsado_(normalizar_(p.numero));
      return json_(Object.assign({ ok: true }, est));
    }
    if (action === 'preguntas') return json_({ ok: true, preguntas: preguntasPublicas_(), hora: ahora_() });
    if (action === 'stats') { var rol = exigirClave_(p.key, true); return json_(Object.assign({ ok: true, rol: rol }, stats_())); }
    return json_({ ok: false, error: 'acción desconocida' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

// Lo que la sala manda y no se puede guardar deja una fila en Eventos, para saber por qué:
// `sin_numero` (llegó sin celular), `tipo_desconocido` (la versión publicada no conoce ese
// envío: pasó con el calendario mientras corría el código anterior) y `error` (falló al
// escribir en la hoja). La sala manda casi todo con sendBeacon y no lee la respuesta, así
// que sin estas filas el envío se pierde sin dejar rastro.
function doPost(e) {
  var d = null;
  try { d = JSON.parse(e.postData.contents); } catch (err) {
    try { d = JSON.parse((e.parameter && e.parameter.payload) || ''); } catch (err2) { return json_({ ok: false, error: 'JSON inválido' }); }
  }
  try {
    var tipo = String(d.tipo || '');
    if (tipo === 'panel') { exigirClave_(d.key); return json_({ ok: true, estado: guardarEstado_(d) }); }
    if (tipo === 'moderar') { exigirClave_(d.key, true); return json_(moderar_(d)); }

    var numero = normalizar_(d.numero);
    if (!numero) {
      registrarEvento_('sin_numero', '', { tipo: tipo, campos: Object.keys(d || {}) });  // sólo los nombres de los campos
      return json_({ ok: false, error: 'numero requerido' });
    }
    // una persona expulsada no escribe nada más en la hoja: ni preguntas, ni señales, ni respuestas
    if (esExpulsado_(numero)) { registrarEvento_('bloqueado', numero, { tipo: tipo }); return json_({ ok: false, expulsado: true, error: 'expulsado' }); }

    switch (tipo) {
      case 'entrada':   return json_(entrada_(numero, d));
      case 'ping':      return json_(ping_(numero, d));
      case 'respuesta': return json_(respuesta_(numero, d));
      case 'cta':       return json_(cta_(numero, d));
      case 'enlace':    return json_(enlace_(numero, d));
      case 'dossier':   return json_(dossier_(numero, d));
      case 'pregunta':  return json_(pregunta_(numero, d));
      case 'calendario': return json_(calendario_(numero, d));
      default:
        registrarEvento_('tipo_desconocido', numero, { tipo: tipo });
        return json_({ ok: false, error: 'tipo desconocido: ' + tipo });
    }
  } catch (err) {
    var msg = String(err && err.message || err);
    registrarEvento_('error', normalizar_(d && d.numero), { tipo: String(d && d.tipo || ''), error: msg.slice(0, 300) });
    return json_({ ok: false, error: msg });
  }
}

/* ============================ acciones ============================ */

// Entrada por el gate. Crea la fila si no existe (nombre y celular son los primeros datos).
// Si ya existe (recarga, segundo día), no toca entrada_ts: suma una sesión y actualiza la señal.
function entrada_(numero, d) {
  var sh = hojaAsistentes_(), t = tabla_(sh), now = new Date();
  var lock = LockService.getScriptLock();
  var conLock = lock.tryLock(10000);
  var correo = correo_(d.correo);
  try {
    var row = buscarFila_(sh, t, numero);
    if (!row) {
      t.col('correo');  // en hojas de antes del correo, la columna se crea antes de armar la fila
      var o = {};
      t.h.forEach(function (n) { o[n] = ''; });
      o.nombre = limpiar_(d.nombre, 120);
      o.numero = numero;
      o.correo = correo;
      o.entrada_ts = now;
      o.ultima_senal = now;
      o.minutos_vistos = 0;
      o.dias_asistidos = dia_(now);
      o.sesiones = 1;
      o.dispositivo = limpiar_(d.dispositivo, 20);
      o.utm_source = limpiar_(d.utm_source, 80);
      o.navegador = limpiar_(d.navegador, 200);
      sh.appendRow(t.h.map(function (n) { return o[n]; }));
      // celular y días quedan como texto aunque la fila nueva esté fuera del formato aplicado en
      // setup: sin esto Sheets se come el 0 inicial del celular y convierte "01/10" en fecha
      var nueva = buscarFila_(sh, t, numero);
      if (nueva) {
        sh.getRange(nueva, t.col('numero')).setNumberFormat('@').setValue(numero);
        sh.getRange(nueva, t.col('dias_asistidos')).setNumberFormat('@').setValue(o.dias_asistidos);
      }
      registrarEvento_('entrada', numero, d);
      return { ok: true, nuevo: true };
    }
    var f = t.leer(row, ['nombre', 'correo', 'ultima_senal', 'dias_asistidos', 'sesiones', 'dispositivo', 'utm_source']);
    var cambios = { ultima_senal: now, dias_asistidos: agregarDia_(f.dias_asistidos, now), sesiones: (Number(f.sesiones) || 0) + 1 };
    if (!f.nombre && d.nombre) cambios.nombre = limpiar_(d.nombre, 120);
    if (correo && correo !== f.correo) cambios.correo = correo;  // gana el último que escribió
    if (!f.dispositivo && d.dispositivo) cambios.dispositivo = limpiar_(d.dispositivo, 20);
    if (!f.utm_source && d.utm_source) cambios.utm_source = limpiar_(d.utm_source, 80);
    t.escribir(row, cambios);
    registrarEvento_('reingreso', numero, d);
    return { ok: true, nuevo: false };
  } finally {
    if (conLock) lock.releaseLock();
  }
}

// Señal cada 60 s. Acumula minutos vistos solo si la brecha con la señal anterior es corta.
// Cada ping trae también el nombre (la sala se lo suma a todo lo que manda): si la entrada
// se perdió en el camino, la fila se crea igual y el nombre se completa con la señal.
function ping_(numero, d) {
  var sh = hojaAsistentes_(), t = tabla_(sh), now = new Date();
  var row = buscarFila_(sh, t, numero);
  if (!row) return entrada_(numero, { nombre: d.nombre || '', dispositivo: '', utm_source: '' });
  var f = t.leer(row, ['nombre', 'ultima_senal', 'minutos_vistos', 'dias_asistidos', 'entrada_ts']);
  var last = (f.ultima_senal instanceof Date) ? f.ultima_senal : ((f.entrada_ts instanceof Date) ? f.entrada_ts : now);
  var delta = (now.getTime() - last.getTime()) / 60000;
  var minutos = Number(f.minutos_vistos) || 0;
  if (delta > 0 && delta <= MAX_BRECHA_MIN) minutos = Math.round((minutos + delta) * 10) / 10;
  var cambios = { ultima_senal: now, minutos_vistos: minutos, dias_asistidos: agregarDia_(f.dias_asistidos, now) };
  if (!String(f.nombre).trim() && d.nombre) cambios.nombre = limpiar_(d.nombre, 120);
  t.escribir(row, cambios);
  return { ok: true, minutos: minutos };
}

// Respuesta de un ejercicio: se guarda en la columna `campo` de la fila de esa persona.
// Hoy sólo llega `e1_decision`; si mañana se agrega otra pregunta en src/data/sala.ts,
// su columna se crea sola (conviene sumarla también a COLUMNAS).
function respuesta_(numero, d) {
  var campo = String(d.campo || '').toLowerCase();
  if (!/^[a-z0-9_]{1,40}$/.test(campo)) return { ok: false, error: 'campo inválido' };
  var sh = hojaAsistentes_(), t = tabla_(sh);
  var row = buscarFila_(sh, t, numero) || crearMinima_(sh, t, numero, d);
  var valor = limpiar_(d.valor, 2000);
  var cambios = {}; cambios[campo] = valor;
  t.escribir(row, cambios);
  registrarEvento_(d.omitido ? 'omitido' : 'respuesta', numero, { campo: campo, valor: valor });
  return { ok: true };
}

// Clic en un botón de cierre. accion_final guarda el último clic; acciones_log guarda todos.
function cta_(numero, d) {
  var accion = String(d.accion || '').toLowerCase();
  if (['separo', 'agendo', 'dossier'].indexOf(accion) < 0) return { ok: false, error: 'acción inválida' };
  var sh = hojaAsistentes_(), t = tabla_(sh);
  var row = buscarFila_(sh, t, numero) || crearMinima_(sh, t, numero, d);
  var f = t.leer(row, ['acciones_log']);
  t.escribir(row, { accion_final: accion, acciones_log: (f.acciones_log ? f.acciones_log + ' | ' : '') + hora_() + ' ' + accion });
  registrarEvento_('cta', numero, { accion: accion });
  return { ok: true };
}

// Clic en «Abrir enlace» de la tarjeta que prende el panel (hoy, la radiografía).
// Queda en acciones_log —de ahí lo cuenta el panel— pero no toca accion_final: no es
// un botón de cierre, es material de apoyo durante el directo.
function enlace_(numero, d) {
  var sh = hojaAsistentes_(), t = tabla_(sh);
  var row = buscarFila_(sh, t, numero) || crearMinima_(sh, t, numero, d);
  var f = t.leer(row, ['acciones_log']);
  t.escribir(row, { acciones_log: (f.acciones_log ? f.acciones_log + ' | ' : '') + hora_() + ' enlace' });
  registrarEvento_('enlace', numero, { url: limpiar_(d.url, 300) });
  return { ok: true };
}

// Clic en «Agregar a Google Calendar». Google no avisa quién guarda el evento: lo que queda
// es quién pulsó el botón, con los datos del formulario de entrada (`desde` = entrada) o los
// de la persona que ya está en la sala (`desde` = sala). Va en su propia pestaña y no en
// Asistentes: quien lo agrega días antes todavía no asistió. Una fila por persona; si vuelve
// a pulsar, suma en `clics` y actualiza `ultimo_clic`.
function calendario_(numero, d) {
  var sc = hojaCalendario_(SpreadsheetApp.getActive());
  var now = new Date(), nombre = limpiar_(d.nombre, 120), correo = correo_(d.correo);
  var desde = d.origen === 'sala' ? 'sala' : 'entrada';
  var lock = LockService.getScriptLock();
  var conLock = lock.tryLock(10000);
  try {
    var last = sc.getLastRow(), k = sinCeros_(numero), fila = 0;
    if (last > 1) {
      var nums = sc.getRange(2, 3, last - 1, 1).getValues();
      for (var i = 0; i < nums.length; i++) { if (sinCeros_(normalizar_(nums[i][0])) === k) { fila = i + 2; break; } }
    }
    if (!fila) {
      sc.appendRow([now, nombre, numero, correo, desde, 1, now]);
      sc.getRange(sc.getLastRow(), 3).setNumberFormat('@').setValue(numero);
    } else {
      var f = sc.getRange(fila, 1, 1, CAL_COLUMNAS.length).getValues()[0];
      sc.getRange(fila, 6, 1, 2).setValues([[(Number(f[5]) || 0) + 1, now]]);
      if (nombre && !String(f[1]).trim()) sc.getRange(fila, 2).setValue(nombre);
      if (correo && correo !== String(f[3])) sc.getRange(fila, 4).setValue(correo);  // gana el último que escribió
    }
  } finally {
    if (conLock) lock.releaseLock();
  }
  registrarEvento_('calendario', numero, { desde: desde });
  return { ok: true };
}

function hojaCalendario_(ss) {
  var sc = hoja_(ss, HOJAS.calendario);
  if (sc.getLastRow() === 0) {
    sc.getRange(1, 1, 1, CAL_COLUMNAS.length).setValues([CAL_COLUMNAS]).setFontWeight('bold').setBackground('#fbe6a2');
    sc.setFrozenRows(1);
    sc.getRange('C:C').setNumberFormat('@');
    sc.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sc.getRange('G:G').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  }
  return sc;
}

// Correo del gate: en minúsculas y solo si tiene forma de correo; si no, queda vacío.
function correo_(v) {
  var c = limpiar_(v, 120).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c) ? c : '';
}

// Formulario de un campo del dossier (correo).
function dossier_(numero, d) {
  var email = limpiar_(d.email, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, error: 'correo inválido' };
  var sh = hojaAsistentes_(), t = tabla_(sh);
  var row = buscarFila_(sh, t, numero) || crearMinima_(sh, t, numero, d);
  t.escribir(row, { dossier_email: email });
  registrarEvento_('dossier', numero, { email: email });
  return { ok: true };
}

// Pregunta en vivo: fila propia en "Preguntas" (para el panel) y concatenada en la fila de la persona.
function pregunta_(numero, d) {
  var texto = limpiar_(d.texto, 500);
  if (!texto) return { ok: false, error: 'texto vacío' };
  var ss = SpreadsheetApp.getActive();
  var sp = ss.getSheetByName(HOJAS.preguntas) || hoja_(ss, HOJAS.preguntas);
  sp.appendRow([new Date(), limpiar_(d.nombre, 120), numero, texto]);
  var sh = hojaAsistentes_(), t = tabla_(sh);
  var row = buscarFila_(sh, t, numero) || crearMinima_(sh, t, numero, d);
  var f = t.leer(row, ['pregunta']);
  t.escribir(row, { pregunta: (f.pregunta ? f.pregunta + ' || ' : '') + texto });
  try { CacheService.getScriptCache().remove(MURO_CACHE); } catch (e) {}
  return { ok: true };
}

/* ===================== muro público de preguntas =====================
   Lo consulta la sala sin clave (action=preguntas). Devuelve solo hora, nombre corto y
   texto: el celular y el apellido completo nunca salen de la hoja. El resultado se guarda
   en caché para que, con mucha gente conectada, la hoja no se lea una vez por persona;
   el caché se borra en cuanto entra una pregunta nueva, así el muro no se queda atrás.
   Los mensajes que el moderador borra (columna `estado` = «borrada») no salen. */
var MURO_MAX = 40, MURO_CACHE = 'muro_preguntas', MURO_CACHE_SEG = 25;

function preguntasPublicas_() {
  var cache = null;
  try { cache = CacheService.getScriptCache(); } catch (e) {}
  if (cache) { var guardado = cache.get(MURO_CACHE); if (guardado) { try { return JSON.parse(guardado); } catch (e) {} } }

  var sp = SpreadsheetApp.getActive().getSheetByName(HOJAS.preguntas);
  var lista = [];
  if (sp && sp.getLastRow() > 1) {
    // se leen de más para que, aunque haya borrados, el muro siga mostrando MURO_MAX
    var n = Math.min(MURO_MAX * 2, sp.getLastRow() - 1);
    lista = sp.getRange(sp.getLastRow() - n + 1, 1, n, 5).getValues().filter(function (r) {
      return String(r[3]) && !String(r[4]);
    }).slice(-MURO_MAX).map(function (r) {
      var mod = esDelModerador_(r[2]);
      var q = {
        ts: (r[0] instanceof Date) ? Utilities.formatDate(r[0], TZ, 'HH:mm') : String(r[0]),
        nombre: mod ? (String(r[1]).trim() || 'Moderador') : nombreCorto_(r[1]),  // la firma del equipo va completa
        texto: String(r[3])
      };
      if (mod) q.mod = true;
      return q;
    });
  }
  if (cache) { try { cache.put(MURO_CACHE, JSON.stringify(lista), MURO_CACHE_SEG); } catch (e) {} }
  return lista;
}

// Lo que se ve en el muro: primer nombre + inicial de la última palabra.
// "Luis Fernando Puerto" -> "Luis P."   ·   "Ana" -> "Ana"   ·   sin nombre -> "Invitado"
function nombreCorto_(nombre) {
  var partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return 'Invitado';
  var apellido = partes.length > 1 ? partes[partes.length - 1] : '';
  return partes[0] + (apellido ? ' ' + apellido.charAt(0).toUpperCase() + '.' : '');
}

/* =========================== moderación ===========================
   Desde el panel (PANEL_KEY o MOD_KEY):
   · borrar / restaurar un mensaje: marca la columna `estado` de Preguntas. La fila no
     se borra —el equipo conserva lo que se escribió— pero desaparece del muro.
     El mensaje se identifica por su fila y se confirma con el número: si alguien
     ordenó o borró filas en la hoja, la fila ya no coincide y no se toca nada.
   · expulsar / readmitir: la lista vive en la propiedad EXPULSADOS. Al expulsar, sus
     mensajes salen del muro; la sala de esa persona se cierra en la siguiente consulta
     del estado (~12 s) y el script rechaza todo lo que vuelva a mandar. Se compara por
     los últimos 10 dígitos, así «+57 300…» y «300…» son la misma persona.
   · publicar: el moderador escribe en el muro desde el panel, sin entrar a la sala.
     Queda como una fila más de Preguntas con «moderador» en la columna del celular;
     el muro la marca (`mod`) para que la sala la resalte, y se borra como cualquier otra. */
var EXPULSADOS_CACHE = 'expulsados';
var NUMERO_MOD = 'moderador';
function esDelModerador_(v) { return String(v).trim().toLowerCase() === NUMERO_MOD; }

function leerExpulsados_() {
  var cache = CacheService.getScriptCache();
  var s = cache.get(EXPULSADOS_CACHE);
  if (!s) { s = PropertiesService.getScriptProperties().getProperty('EXPULSADOS') || '{}'; cache.put(EXPULSADOS_CACHE, s, 21600); }
  try { return JSON.parse(s) || {}; } catch (e) { return {}; }
}
function guardarExpulsados_(m) {
  var s = JSON.stringify(m);
  PropertiesService.getScriptProperties().setProperty('EXPULSADOS', s);
  CacheService.getScriptCache().put(EXPULSADOS_CACHE, s, 21600);
}
function claveNumero_(n) { return normalizar_(n).slice(-10); }
function esExpulsado_(numero) {
  var k = claveNumero_(numero);
  return !!k && Object.keys(leerExpulsados_()).some(function (n) { return claveNumero_(n) === k; });
}

function moderar_(d) {
  var accion = String(d.accion || '');
  var numero = normalizar_(d.numero);
  var sp = hoja_(SpreadsheetApp.getActive(), HOJAS.preguntas);
  if (!String(sp.getRange(1, 5).getValue())) sp.getRange(1, 5).setValue('estado').setFontWeight('bold');
  var lock = LockService.getScriptLock();
  var conLock = lock.tryLock(10000);
  try {
    if (accion === 'publicar') {
      var texto = limpiar_(d.texto, 500);
      if (!texto) return { ok: false, error: 'texto vacío' };
      var firma = limpiar_(d.nombre, 60) || 'Moderador';
      sp.appendRow([new Date(), firma, NUMERO_MOD, texto, '']);
      registrarEvento_('moderacion', '', { accion: 'publicar', nombre: firma });
    } else if (accion === 'borrar' || accion === 'restaurar') {
      var fila = Number(d.fila);
      if (!(fila >= 2 && fila <= sp.getLastRow())) return { ok: false, error: 'mensaje no encontrado' };
      if (normalizar_(sp.getRange(fila, 3).getValue()) !== numero) return { ok: false, error: 'la hoja cambió: actualiza el panel' };
      sp.getRange(fila, 5).setValue(accion === 'borrar' ? 'borrada' : '');
      registrarEvento_('moderacion', numero, { accion: accion, fila: fila });
    } else if (accion === 'expulsar') {
      if (!numero) return { ok: false, error: 'numero requerido' };
      var m = leerExpulsados_();
      m[numero] = { nombre: limpiar_(d.nombre, 120), ts: ahora_() };
      guardarExpulsados_(m);
      // sus mensajes salen del muro (se pueden restaurar uno por uno)
      var last = sp.getLastRow();
      if (last > 1) {
        var k = claveNumero_(numero);
        var vals = sp.getRange(2, 3, last - 1, 3).getValues();
        vals.forEach(function (r, i) { if (claveNumero_(r[0]) === k && String(r[1]) && !String(r[2])) sp.getRange(i + 2, 5).setValue('borrada'); });
      }
      registrarEvento_('expulsion', numero, { nombre: m[numero].nombre });
    } else if (accion === 'readmitir') {
      var m2 = leerExpulsados_(), k2 = claveNumero_(numero);
      Object.keys(m2).forEach(function (n) { if (claveNumero_(n) === k2) delete m2[n]; });
      guardarExpulsados_(m2);
      registrarEvento_('readmision', numero, {});
    } else {
      return { ok: false, error: 'acción de moderación desconocida' };
    }
  } finally {
    if (conLock) lock.releaseLock();
  }
  try { CacheService.getScriptCache().remove(MURO_CACHE); } catch (e) {}
  return { ok: true };
}

/* ======================= estado del panel =======================
   Tres interruptores: el ejercicio activo, cada botón de cierre y la tarjeta del
   enlace. `enlace` es lo último que se sumó: si la implementación publicada no lo
   guarda, el panel lo manda, el script lo descarta y la tarjeta nunca sale en la
   sala. Para comprobarlo, `…/exec?action=estado` tiene que traer `"enlace"`. */

// Cada botón de cierre se muestra u oculta por separado: ctas = { separo, agendo, dossier }.
var CTA_IDS = ['separo', 'agendo', 'dossier'];
function normalizarCtas_(v) {
  var o = {};
  CTA_IDS.forEach(function (id) { o[id] = (v && typeof v === 'object') ? !!v[id] : v === true; });
  return o;
}

function leerEstado_() {
  var cache = CacheService.getScriptCache();
  var s = cache.get('ESTADO');
  if (!s) {
    s = PropertiesService.getScriptProperties().getProperty('ESTADO') || JSON.stringify({ ejercicio: 0, ctas: normalizarCtas_(false), enlace: false, ejercicio_ts: 0, ctas_ts: 0, enlace_ts: 0 });
    cache.put('ESTADO', s, 21600);
  }
  var e = JSON.parse(s);
  e.ctas = normalizarCtas_(e.ctas);
  e.enlace = !!e.enlace;  // el estado que dejó una implementación anterior no traía la clave
  return e;
}

// d.ctas puede ser un booleano (aplica a los tres) o un objeto parcial, p. ej. { separo: true } (cambia solo ese).
// d.enlace es un booleano: prende o apaga la tarjeta del enlace en todas las salas.
function guardarEstado_(d) {
  var actual = leerEstado_();
  var ctas = normalizarCtas_(actual.ctas);
  if (d.ctas !== undefined && d.ctas !== null) {
    if (typeof d.ctas === 'object') { CTA_IDS.forEach(function (id) { if (d.ctas[id] !== undefined) ctas[id] = !!d.ctas[id]; }); }
    else { CTA_IDS.forEach(function (id) { ctas[id] = !!d.ctas; }); }
  }
  var nuevo = {
    ejercicio: (d.ejercicio !== undefined && d.ejercicio !== null) ? (Number(d.ejercicio) || 0) : (Number(actual.ejercicio) || 0),
    ctas: ctas,
    enlace: (d.enlace !== undefined && d.enlace !== null) ? !!d.enlace : !!actual.enlace
  };
  nuevo.ejercicio_ts = (nuevo.ejercicio !== (Number(actual.ejercicio) || 0)) ? Date.now() : (actual.ejercicio_ts || Date.now());
  nuevo.ctas_ts = (JSON.stringify(ctas) !== JSON.stringify(actual.ctas)) ? Date.now() : (actual.ctas_ts || Date.now());
  nuevo.enlace_ts = (nuevo.enlace !== !!actual.enlace) ? Date.now() : (actual.enlace_ts || Date.now());
  var s = JSON.stringify(nuevo);
  PropertiesService.getScriptProperties().setProperty('ESTADO', s);
  CacheService.getScriptCache().put('ESTADO', s, 21600);
  registrarEvento_('panel', '', nuevo);
  return nuevo;
}

/* ============================ stats ============================ */

function stats_() {
  var ss = SpreadsheetApp.getActive();
  var sh = hojaAsistentes_(), t = tabla_(sh);
  var last = sh.getLastRow();
  var rows = last > 1 ? sh.getRange(2, 1, last - 1, t.h.length).getValues() : [];
  var ix = function (n) { return t.h.indexOf(n); };
  var now = Date.now(), activos = 0, movil = 0;
  var acciones = { separo: 0, agendo: 0, dossier: 0, enlace: 0 };
  var camposEj = t.h.filter(function (n) { return /^e\d+_/.test(n); });
  var respuestas = {}; camposEj.forEach(function (c) { respuestas[c] = 0; });

  rows.forEach(function (r) {
    var us = r[ix('ultima_senal')];
    if (us instanceof Date && now - us.getTime() < ACTIVO_SEG * 1000) activos++;
    if (String(r[ix('dispositivo')]) === 'movil') movil++;
    var log = String(r[ix('acciones_log')] || '');
    Object.keys(acciones).forEach(function (a) { var m = log.match(new RegExp('\\b' + a + '\\b', 'g')); if (m) acciones[a] += m.length; });
    camposEj.forEach(function (c) { var v = String(r[ix(c)] || '').trim(); if (v && v !== '(omitido)') respuestas[c]++; });
  });

  var mapa = leerExpulsados_(), fuera = {};
  Object.keys(mapa).forEach(function (k) { fuera[claveNumero_(k)] = true; });
  var sp = ss.getSheetByName(HOJAS.preguntas);
  var preguntas = [];
  if (sp && sp.getLastRow() > 1) {
    var n = Math.min(60, sp.getLastRow() - 1), desde = sp.getLastRow() - n + 1;
    preguntas = sp.getRange(desde, 1, n, 5).getValues().map(function (r, i) {
      return {
        fila: desde + i,
        ts: (r[0] instanceof Date) ? Utilities.formatDate(r[0], TZ, 'HH:mm') : String(r[0]),
        nombre: String(r[1]), numero: String(r[2]), texto: String(r[3]),
        borrada: !!String(r[4]), expulsado: !!fuera[claveNumero_(r[2])], mod: esDelModerador_(r[2])
      };
    }).reverse();
  }
  var expulsados = Object.keys(mapa).map(function (k) { return { numero: k, nombre: mapa[k].nombre || '', ts: mapa[k].ts || '' }; });
  // personas que pulsaron «Agregar a Google Calendar» (una fila por persona en Calendario)
  var sc = ss.getSheetByName(HOJAS.calendario);
  var calendario = sc ? Math.max(0, sc.getLastRow() - 1) : 0;
  return { entradas: rows.length, activos: activos, movil: movil, acciones: acciones, calendario: calendario, respuestas: respuestas, preguntas: preguntas, expulsados: expulsados, estado: leerEstado_(), hora: ahora_() };
}

/* ================= cruce con la lista de registrados ================= */

// Pestaña "Registrados": pega ahí la hoja del formulario de registro (con una columna de celular).
// Marca la columna `registrado` de Asistentes: "sí" (coinciden últimos 10 dígitos),
// "sí (8)" (coinciden últimos 8) o "no" (lead nuevo). Menú: Sala Karanis → Cruzar con registrados.
function cruzarConRegistrados() {
  var ss = SpreadsheetApp.getActive();
  var sr = ss.getSheetByName(HOJAS.registrados);
  if (!sr || sr.getLastRow() < 2) { SpreadsheetApp.getUi().alert('Crea la pestaña "' + HOJAS.registrados + '" y pega ahí la lista del formulario de registro (con una columna de celular).'); return; }
  var hr = encabezados_(sr);
  var col = -1;
  for (var i = 0; i < hr.length; i++) { if (/cel|tel|num|phone|whats|m[oó]vil/i.test(hr[i])) { col = i; break; } }
  if (col < 0) { SpreadsheetApp.getUi().alert('No encuentro una columna de celular en "' + HOJAS.registrados + '" (busco: celular, teléfono, número, phone, whatsapp).'); return; }
  var reg = sr.getRange(2, col + 1, sr.getLastRow() - 1, 1).getValues();
  var set10 = {}, set8 = {};
  reg.forEach(function (r) { var n = normalizar_(r[0]); if (n.length >= 8) { set10[n.slice(-10)] = true; set8[n.slice(-8)] = true; } });

  var sh = hojaAsistentes_(), t = tabla_(sh);
  var last = sh.getLastRow(); if (last < 2) return;
  var cNum = t.col('numero'), cReg = t.col('registrado');
  var nums = sh.getRange(2, cNum, last - 1, 1).getValues();
  var out = nums.map(function (r) {
    var n = normalizar_(r[0]); if (!n) return [''];
    if (set10[n.slice(-10)]) return ['sí'];
    if (set8[n.slice(-8)]) return ['sí (8)'];
    return ['no'];
  });
  sh.getRange(2, cReg, out.length, 1).setValues(out);
  var si = out.filter(function (r) { return r[0].indexOf('sí') === 0; }).length;
  SpreadsheetApp.getUi().alert('Cruce listo: ' + si + ' de ' + out.length + ' asistentes estaban registrados (' + Object.keys(set10).length + ' registrados en la lista).');
}

/* ============================ helpers ============================ */

function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function ahora_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function hora_() { return Utilities.formatDate(new Date(), TZ, 'HH:mm:ss'); }
function dia_(d) { return Utilities.formatDate(d, TZ, 'dd/MM'); }
// "01/10, 02/10". Si Sheets guardó "01/10" como fecha, se lee de vuelta como día; lo que no tenga
// forma dd/MM se descarta (así se limpian las celdas que quedaron como "Thu Oct 01 2026 …, 01/10").
function agregarDia_(actual, d) {
  var dias = (actual instanceof Date) ? [dia_(actual)] : String(actual || '').split(/,\s*/).filter(function (x) { return /^\d{2}\/\d{2}$/.test(x); });
  var hoy = dia_(d);
  if (dias.indexOf(hoy) < 0) dias.push(hoy);
  return dias.join(', ');
}
function normalizar_(v) { return String(v === undefined || v === null ? '' : v).replace(/\D+/g, ''); }
// Limpia texto libre: saltos de línea y tabs pasan a espacio; se quitan caracteres de control (código < 32 y 127).
function limpiar_(s, max) { var t = String(s === undefined || s === null ? '' : s).replace(/\s+/g, ' '), o = ''; for (var i = 0; i < t.length; i++) { var c = t.charCodeAt(i); if (c >= 32 && c !== 127) o += t.charAt(i); } return o.trim().slice(0, max || 500); }
// 10 -> "J", 19 -> "S": para nombrar las columnas en los avisos como las ve la persona.
function letra_(col) { var s = ''; while (col > 0) { var r = (col - 1) % 26; s = String.fromCharCode(65 + r) + s; col = Math.floor((col - 1) / 26); } return s; }
function hoja_(ss, nombre) { return ss.getSheetByName(nombre) || ss.insertSheet(nombre); }
function hojaAsistentes_() { var ss = SpreadsheetApp.getActive(); var sh = ss.getSheetByName(HOJAS.asistentes); if (!sh || sh.getLastRow() === 0) { setup(); sh = ss.getSheetByName(HOJAS.asistentes); } return sh; }
function encabezados_(sh) { var lc = sh.getLastColumn(); return lc ? sh.getRange(1, 1, 1, lc).getValues()[0].map(String) : []; }

// Devuelve el rol de quien entra: 'admin' (PANEL_KEY) o 'moderador' (MOD_KEY, sólo si
// `conModerador`). Todo lo que no sea moderar el chat exige PANEL_KEY.
function exigirClave_(k, conModerador) {
  var props = PropertiesService.getScriptProperties();
  var real = props.getProperty('PANEL_KEY') || CLAVE_POR_DEFECTO;
  var mod = props.getProperty('MOD_KEY') || '';
  k = String(k || '');
  if (k && k === real) return 'admin';
  if (conModerador && mod && k === mod) return 'moderador';
  throw new Error('clave del panel incorrecta');
}

function registrarEvento_(tipo, numero, detalle) {
  try {
    var ss = SpreadsheetApp.getActive();
    var se = ss.getSheetByName(HOJAS.eventos) || hoja_(ss, HOJAS.eventos);
    se.appendRow([new Date(), tipo, numero || '', JSON.stringify(detalle || {}).slice(0, 1000)]);
  } catch (e) {}
}

// Acceso a la hoja Asistentes por nombre de columna (lee encabezados una sola vez por petición).
function tabla_(sh) {
  var t = { sh: sh, h: encabezados_(sh) };
  t.col = function (n) {
    var i = this.h.indexOf(n);
    if (i < 0) { this.h.push(n); i = this.h.length - 1; this.sh.getRange(1, i + 1).setValue(n).setFontWeight('bold'); }
    return i + 1;
  };
  t.leer = function (row, nombres) {
    var self = this, o = {};
    var cols = nombres.map(function (n) { return self.col(n); });
    var min = Math.min.apply(null, cols), max = Math.max.apply(null, cols);
    var vals = this.sh.getRange(row, min, 1, max - min + 1).getValues()[0];
    nombres.forEach(function (n, i) { o[n] = vals[cols[i] - min]; });
    return o;
  };
  // Escribe solo las celdas indicadas (nunca la fila completa) para que dos peticiones
  // simultáneas de la misma persona (ping + respuesta) no se pisen.
  t.escribir = function (row, obj) {
    var self = this;
    Object.keys(obj).forEach(function (n) { self.sh.getRange(row, self.col(n)).setValue(obj[n]); });
  };
  return t;
}

// Compara sin los ceros de la izquierda: un celular que empieza por 0 (07912…) cae en una
// celda que no es de texto, Sheets lo guarda como número y se come el 0. Si se comparara
// tal cual, la fila nunca aparecería y cada ping crearía una fila nueva para la misma persona.
function buscarFila_(sh, t, numero) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var k = sinCeros_(numero);
  var vals = sh.getRange(2, t.col('numero'), last - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) { if (sinCeros_(normalizar_(vals[i][0])) === k) return i + 2; }
  return 0;
}
function sinCeros_(n) { return n.replace(/^0+/, '') || n; }

// Fila mínima para eventos que llegan sin entrada previa (no debería pasar, pero no se pierde el dato).
function crearMinima_(sh, t, numero, d) {
  entrada_(numero, { nombre: d && d.nombre || '', dispositivo: '', utm_source: '' });
  return buscarFila_(sh, t, numero);
}
