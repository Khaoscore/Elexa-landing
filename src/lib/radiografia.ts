/* La radiografía financiera, sin pantalla: los campos, la aritmética, los
   textos del resultado y lo que se envía a la hoja.

   Es la lógica de florentino.elexa.com.co/radiografia portada sin cambios de
   fórmula (mismo NPER, mismos umbrales, mismos ids de campo), para que una
   radiografía hecha acá y una hecha allá den la misma cifra y caigan en las
   mismas columnas de la hoja. Lo que cambió es el tono (tú en vez de vos,
   como el resto del sitio) y que los textos marcan las negritas con **…**
   (ver negritas.ts) en vez de llevar HTML: la pantalla las pinta en
   <strong> y el PDF las quita. La pantalla está en
   components/radiografia/Radiografia.tsx. */

/* ============================== FORMATO ============================== */

export const fmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

export function pesos(n: number): string {
  if (!isFinite(n)) return '—';
  return (n < 0 ? '-$' : '$') + fmt.format(Math.round(Math.abs(n)));
}

export function porcentaje(x: number, d = 0): string {
  if (!isFinite(x)) return '—';
  return (x * 100).toFixed(d).replace('.', ',') + '%';
}

export function decimal(x: number, d: number): string {
  if (!isFinite(x)) return '—';
  return x.toFixed(d).replace('.', ',');
}

export function soloDigitos(s: string): string {
  return String(s).replace(/\D+/g, '');
}

export function aNumero(s: string): number {
  const v = soloDigitos(s);
  return v === '' ? 0 : parseInt(v, 10);
}

/* La cifra leída en palabras, debajo de cada campo de plata: con tantos
   ceros, «350 millones» se lee de un vistazo y «35.000.000» no. Es también
   la defensa más barata contra el error de escribir un cero de menos. */
export function enPalabras(n: number): string {
  if (n >= 1e6) {
    const m = n / 1e6;
    const lugares = m < 10 ? 2 : m < 100 ? 1 : 0;
    const redondo = Math.round(m * 10 ** lugares) / 10 ** lugares;
    const texto = new Intl.NumberFormat('es-CO', { maximumFractionDigits: lugares }).format(redondo);
    const aprox = redondo * 1e6 === n ? '' : '≈ ';
    return aprox + texto + (redondo === 1 ? ' millón' : ' millones');
  }
  if (n >= 1e4) {
    const mil = Math.round(n / 1e3);
    return (mil * 1e3 === n ? '' : '≈ ') + fmt.format(mil) + ' mil';
  }
  return '';
}

/* ============================== CAMPOS ==============================
   `minimo` es el piso por debajo del cual la cifra casi con seguridad está
   mal escrita (ceros de menos): solo lo tienen las del balance. */

export const MIN_INMUEBLE = 50_000_000;
export const MIN_SALDO = 1_000_000;

export type Campo = { id: string; nombre: string; ayuda?: string; minimo?: number };

export const INGRESOS_ACTIVOS: Campo[] = [
  { id: 'salario', nombre: 'Salario' },
  { id: 'honorarios', nombre: 'Honorarios' },
  { id: 'independiente', nombre: 'Negocio propio' },
  { id: 'otroA', nombre: 'Otro por tu trabajo' },
];

export const INGRESOS_PASIVOS: Campo[] = [
  { id: 'alquileres', nombre: 'Arriendos' },
  { id: 'dividendos', nombre: 'Dividendos o intereses' },
  { id: 'regalias', nombre: 'Regalías' },
  { id: 'otroP', nombre: 'Otro ingreso pasivo' },
];

export const ACTIVOS_PRODUCTIVOS: Campo[] = [
  { id: 'apBienes', nombre: 'Inmuebles en renta', minimo: MIN_INMUEBLE },
  { id: 'apFin', nombre: 'Acciones, bonos o ETFs', minimo: MIN_SALDO },
  { id: 'apCdt', nombre: 'CDTs', minimo: MIN_SALDO },
  { id: 'apOtros', nombre: 'Otras inversiones', minimo: MIN_SALDO },
];

export const ACTIVOS_IMPRODUCTIVOS: Campo[] = [
  { id: 'aiCasa', nombre: 'Casa donde vives', minimo: MIN_INMUEBLE },
  { id: 'aiCarro', nombre: 'Carro', minimo: MIN_SALDO },
  { id: 'aiFinca', nombre: 'Finca', minimo: MIN_INMUEBLE },
  { id: 'aiOtros', nombre: 'Otros bienes', minimo: MIN_SALDO },
];

/* Cada deuda son dos cifras: `${id}_saldo` y `${id}_cuota`. */
export const DEUDAS: Campo[] = [
  { id: 'dHipo', nombre: 'Hipoteca o leasing' },
  { id: 'dConsumo', nombre: 'Crédito de consumo' },
  { id: 'dTc', nombre: 'Tarjetas de crédito' },
  { id: 'dOtros', nombre: 'Otros créditos' },
];

export const GASTOS: Campo[] = [
  { id: 'gVivienda', nombre: 'Vivienda y servicios', ayuda: 'Arriendo, administración, servicios. Sin la cuota del crédito.' },
  { id: 'gMercado', nombre: 'Mercado y alimentación' },
  { id: 'gTransporte', nombre: 'Transporte', ayuda: 'Gasolina, peajes, mantenimiento. Sin la cuota del carro.' },
  { id: 'gFamilia', nombre: 'Educación y salud' },
  { id: 'gImp', nombre: 'Impuestos' },
  { id: 'gOtros', nombre: 'Otros gastos', ayuda: 'Ropa, salidas, suscripciones, viajes.' },
];

export const LO_QUE_QUEDA: Campo[] = [
  { id: 'g2Ahorro', nombre: 'Lo que ahorras al mes', ayuda: 'Sin el abono a capital de tu hipoteca: ese lo sumamos aparte.' },
  { id: 'g2Inv', nombre: 'Lo que inviertes al mes' },
];

/* Todos los ids de plata, en el orden de las columnas de detalle de la hoja. */
export const IDS_DINERO: string[] = [
  ...[INGRESOS_ACTIVOS, INGRESOS_PASIVOS, ACTIVOS_PRODUCTIVOS, ACTIVOS_IMPRODUCTIVOS, GASTOS, LO_QUE_QUEDA].flatMap(
    (lista) => lista.map((c) => c.id),
  ),
  ...DEUDAS.flatMap((d) => [`${d.id}_saldo`, `${d.id}_cuota`]),
];

/* ============================== CÁLCULO ============================== */

export type Valores = Record<string, number>;

export type Entrada = {
  S: Valores;
  /** ¿Tiene claro su presupuesto? Sí → gastos por categoría; no → lo que ahorra e invierte. */
  presupuestoClaro: boolean;
  /** Parte de la cuota hipotecaria que abona a capital (0 a 1). */
  hipoPct: number;
};

function suma(S: Valores, lista: Campo[], sufijo = ''): number {
  let t = 0;
  for (const c of lista) t += S[c.id + sufijo] || 0;
  return t;
}

export type Base = {
  IA: number;
  IP: number;
  IT: number;
  AP: number;
  AI: number;
  deuda: number;
  cuotas: number;
  cuotaHipo: number;
  PN: number;
};

export function base({ S }: Entrada): Base {
  const IA = suma(S, INGRESOS_ACTIVOS);
  const IP = suma(S, INGRESOS_PASIVOS);
  const AP = suma(S, ACTIVOS_PRODUCTIVOS);
  const AI = suma(S, ACTIVOS_IMPRODUCTIVOS);
  const deuda = suma(S, DEUDAS, '_saldo');
  return {
    IA,
    IP,
    IT: IA + IP,
    AP,
    AI,
    deuda,
    cuotas: suma(S, DEUDAS, '_cuota'),
    cuotaHipo: S.dHipo_cuota || 0,
    PN: AP + AI - deuda,
  };
}

/* Ahorro y ritmo de vida. Réplica de la plantilla:
     presupuesto claro:  ahorro = ingresos − gastos + parte a capital de la hipoteca
                         ritmo  = gastos − parte a capital
     si no:              ahorro = ahorro + inversiones + parte a capital
                         ritmo  = ingresos − ahorro
   La parte de la cuota hipotecaria que abona a capital no es consumo:
   construye patrimonio. Ritmo + ahorro siempre suman los ingresos. */
export type Flujo = { gastos: number; ahorro: number; ritmo: number };

export function flujo(e: Entrada, b: Base = base(e)): Flujo {
  const aCapital = b.cuotaHipo * e.hipoPct;
  if (e.presupuestoClaro) {
    const gastos = suma(e.S, GASTOS) + b.cuotas;
    return { gastos, ahorro: b.IT - gastos + aCapital, ritmo: gastos - aCapital };
  }
  const total = suma(e.S, LO_QUE_QUEDA) + aCapital;
  return { gastos: b.IT - total, ahorro: total, ritmo: b.IT - total };
}

/* NPER, la misma función financiera del Excel. */
export function nper(rate: number, pmt: number, pv: number, fv: number): number {
  if (rate === 0) return pmt === 0 ? Infinity : -(pv + fv) / pmt;
  const num = pmt - fv * rate;
  const den = pmt + pv * rate;
  if (den === 0) return Infinity;
  const r = num / den;
  if (!(r > 0)) return Infinity;
  return Math.log(r) / Math.log(1 + rate);
}

const arriba1 = (x: number) => Math.ceil(x * 10) / 10;

/* Las tres referencias del panel de indicadores. */
export const OBJ = { ahorro: 0.3, improd: 0.4, lfpt: 1.2 };

export type Calculo = {
  b: Base;
  f: Flujo;
  AP: number;
  AI: number;
  ritmo: number;
  ahorro: number;
  pAhorro: number;
  pImprod: number;
  lfpt: number;
  rentaMes: number;
  objetivoAP: number;
  anios: number;
  edad: number | null;
  rate: number;
};

/** `extraAhorro` y `mover` son las dos palancas del resultado: lo que se le
    baja al gasto cada mes y lo que pasa de improductivo a productivo. */
export function calcular(e: Entrada, rate: number, extraAhorro = 0, mover = 0): Calculo {
  const b = base(e);
  const f = flujo(e, b);

  const AP = b.AP + mover;
  const AI = Math.max(0, b.AI - mover);
  const ritmo = f.ritmo - extraAhorro;
  const ahorro = f.ahorro + extraAhorro;

  const pAhorro = b.IT > 0 ? ahorro / b.IT : NaN;
  const pImprod = b.PN > 0 ? AI / b.PN : NaN;
  const rentaMes = (AP * rate) / 12;
  const lfpt = ritmo > 0 ? rentaMes / ritmo : Infinity;

  const objetivoAP = ritmo > 0 ? (ritmo * 12) / rate : 0;
  let anios: number;
  if (ritmo <= 0 || AP >= objetivoAP) {
    anios = 0;
  } else {
    const n = nper(rate, -ahorro * 12, -AP, objetivoAP);
    anios = isFinite(n) ? Math.max(0, arriba1(n)) : Infinity;
  }
  const edadHoy = e.S.edad || 0;
  const edad = edadHoy > 0 && isFinite(anios) ? Math.ceil(edadHoy + anios) : null;

  return { b, f, AP, AI, ritmo, ahorro, pAhorro, pImprod, lfpt, rentaMes, objetivoAP, anios, edad, rate };
}

/* ============================== RESULTADO ==============================
   La pantalla y el PDF salen de acá, de una sola fuente: si cambia un texto
   o un umbral, no hay forma de que el PDF diga una cosa y la pantalla otra. */

export type Veredicto = {
  /** La cifra grande. `anios` es el número a animar cuando lo hay. */
  cifra: string;
  anios: number | null;
  etiqueta: string;
  detalle: string;
};

export function veredicto(c: Calculo): Veredicto {
  const si = `Si hicieras que tus activos productivos rentaran el **${Math.round(c.rate * 100)}%** anual, `;
  if (c.b.IT <= 0) return { cifra: '—', anios: null, etiqueta: 'Faltan datos', detalle: '' };
  if (c.anios === 0) {
    return {
      cifra: 'Ya llegaste',
      anios: null,
      etiqueta: 'Tus activos productivos cubren tu ritmo de vida.',
      detalle: `${si}generarían **${pesos(c.rentaMes)}** al mes, y tu ritmo de vida cuesta **${pesos(c.ritmo)}** al mes. Ya no necesitas tu trabajo para sostenerlo.`,
    };
  }
  if (!isFinite(c.anios) || c.anios > 60) {
    return {
      cifra: '+60',
      anios: null,
      etiqueta: 'años al ritmo actual',
      detalle: `${si}con lo que ahorras hoy la cuenta no cierra en una vida. No es una sentencia: es lo que dice la aritmética **hoy**. Mueve las palancas de abajo.`,
    };
  }
  return {
    cifra: decimal(c.anios, 1),
    anios: c.anios,
    etiqueta: (c.anios === 1 ? 'año' : 'años') + ' para tu libertad financiera',
    detalle:
      si +
      (c.edad ? `llegarías a los **${c.edad} años**. ` : `te faltarían **${decimal(c.anios, 1)} años**. `) +
      `Necesitarías **${pesos(c.objetivoAP)}** en activos productivos; hoy tienes **${pesos(c.AP)}**.`,
  };
}

export type Tono = 'bien' | 'cerca' | 'lejos';

export type Indicador = {
  k: 'ahorro' | 'improd' | 'lfpt';
  nombre: string;
  sub: string;
  ref: string;
  /** Dónde va la línea del objetivo, en % del ancho de la barra. */
  marca: number;
  valor: string;
  tono: Tono;
  /** Cuánto se llena la barra, en %. */
  lleno: number;
};

const tonoDe = (ok: boolean, cerca: boolean): Tono => (ok ? 'bien' : cerca ? 'cerca' : 'lejos');

export function indicadores(c: Calculo): Indicador[] {
  const pa = c.pAhorro;
  const pi = c.pImprod;
  const lf = isFinite(c.lfpt) ? c.lfpt : null;
  return [
    {
      k: 'ahorro',
      nombre: 'Tasa de ahorro',
      sub: 'Cuánto de lo que entra se queda contigo',
      ref: 'objetivo 30%',
      marca: (OBJ.ahorro / 0.5) * 100,
      valor: isFinite(pa) ? porcentaje(pa) : '—',
      tono: !isFinite(pa) ? 'lejos' : tonoDe(pa >= OBJ.ahorro, pa >= OBJ.ahorro * 0.66),
      lleno: isFinite(pa) ? (pa / 0.5) * 100 : 0,
    },
    {
      k: 'improd',
      nombre: 'Activos improductivos sobre tu patrimonio',
      sub: 'Cuánto de lo que tienes genera gastos en vez de ingresos',
      ref: 'objetivo 40%',
      marca: (OBJ.improd / 1.2) * 100,
      valor: isFinite(pi) ? porcentaje(pi) : '—',
      tono: !isFinite(pi) ? 'lejos' : tonoDe(pi <= OBJ.improd, pi <= OBJ.improd * 1.5),
      lleno: isFinite(pi) ? (pi / 1.2) * 100 : 0,
    },
    {
      k: 'lfpt',
      nombre: 'Cobertura de tu ritmo de vida',
      sub: 'Qué parte de tu vida pagan hoy tus activos, sin que trabajes',
      ref: 'objetivo 1,20',
      marca: (OBJ.lfpt / 1.5) * 100,
      valor: lf === null ? '∞' : decimal(lf, 2),
      tono: lf === null ? 'bien' : tonoDe(lf >= OBJ.lfpt, lf >= 0.6),
      lleno: lf === null ? 100 : (lf / 1.5) * 100,
    },
  ];
}

export const ESTADO_TONO: Record<Tono, string> = {
  bien: 'En objetivo',
  cerca: 'Cerca',
  lejos: 'Fuera de objetivo',
};

export function diagnostico(c: Calculo): string[] {
  const pa = c.pAhorro;
  const pi = c.pImprod;
  const lf = isFinite(c.lfpt) ? c.lfpt : null;
  const d: string[] = [];
  if (isFinite(pa)) {
    d.push(
      pa >= OBJ.ahorro
        ? `Tu tasa de ahorro está en **${porcentaje(pa)}**, por encima del 30% de referencia. Eso es disciplina, y es la parte difícil.`
        : `Tu tasa de ahorro está en **${porcentaje(pa)}**, por debajo del 30% de referencia. De cada peso que entra, se queda contigo ${porcentaje(pa)}.`,
    );
  }
  if (isFinite(pi)) {
    d.push(
      pi > OBJ.improd
        ? `Tus activos improductivos son el **${porcentaje(pi)}** de tu patrimonio. No es que estén mal — la casa donde vives y el carro que manejas son parte de la vida. Pero mientras estén ahí, generan gastos en vez de ingresos, y no te acercan a la libertad financiera.`
        : `Tus activos improductivos son el **${porcentaje(pi)}** de tu patrimonio, dentro del rango de referencia. La mayor parte de lo que tienes está trabajando.`,
    );
  }
  if (lf !== null) {
    d.push(
      lf >= OBJ.lfpt
        ? `Y lo más importante: tus activos productivos ya cubren **${decimal(lf, 2)} veces** tu ritmo de vida. Técnicamente, ya eres libre financieramente.`
        : `Hoy tus activos productivos cubren el **${porcentaje(lf)}** de tu ritmo de vida. El otro ${porcentaje(1 - lf)} lo estás pagando con tu trabajo.`,
    );
  }
  return d;
}

export function alertas(c: Calculo): string[] {
  const a: string[] = [];
  if (c.b.IT <= 0) a.push('**No registraste ingresos.** Sin ese dato la radiografía no dice nada. Vuelve al paso de ingresos.');
  if (c.f.ahorro < 0) a.push('**Estás gastando más de lo que te entra.** Antes de pensar en rentabilidades, esa es la conversación.');
  if (c.b.PN < 0) a.push('**Tu patrimonio es negativo:** debes más de lo que tienes. El primer objetivo no es invertir, es volver a cero.');
  return a;
}

export const TASA_BASE = 0.07;

/** Cuánto cambia la cifra con las palancas, frente al escenario base (7%, sin mover nada). */
export function delta(e: Entrada, c: Calculo, movido: boolean): { texto: string; mejora: boolean } {
  if (!movido && c.rate === TASA_BASE) return { texto: 'Mueve cualquiera de las tres y te muestro cuánto cambia.', mejora: false };
  const b0 = calcular(e, TASA_BASE);
  if (isFinite(b0.anios) && isFinite(c.anios)) {
    const diff = b0.anios - c.anios;
    if (Math.abs(diff) < 0.05) return { texto: 'Prácticamente igual que tu escenario base.', mejora: false };
    if (diff > 0) return { texto: `Estarías ${decimal(diff, 1)} años más cerca de tu libertad financiera.`, mejora: true };
    return { texto: `Estarías ${decimal(-diff, 1)} años más lejos.`, mejora: false };
  }
  return isFinite(c.anios)
    ? { texto: `Con este escenario la cuenta por fin cierra: ${decimal(c.anios, 1)} años.`, mejora: true }
    : { texto: 'Ni con este escenario cierra la cuenta.', mejora: false };
}

export function sinNegritas(texto: string): string {
  return texto.replace(/\*\*/g, '');
}

/** El resultado en texto plano, para copiar o compartir por WhatsApp. */
export function resumen(c: Calculo): string {
  const ahorro = isFinite(c.pAhorro) ? porcentaje(c.pAhorro) : '—';
  const improd = isFinite(c.pImprod) ? porcentaje(c.pImprod) : '—';
  const cobertura = isFinite(c.lfpt) ? decimal(c.lfpt, 2) : '∞';
  const anios = c.anios === 0 ? 'ya llegué' : isFinite(c.anios) ? `${decimal(c.anios, 1)} años` : 'más de 60 años';
  return (
    'MI RADIOGRAFÍA FINANCIERA\n' +
    '—————————————————\n' +
    `Tasa de ahorro: ${ahorro}  (objetivo: 30%)\n` +
    `Activos improductivos / patrimonio: ${improd}  (objetivo: 40%)\n` +
    `Cobertura de mi ritmo de vida: ${cobertura}  (objetivo: 1,20)\n` +
    `Me faltan: ${anios}${c.edad ? `  ·  llegaría a los ${c.edad}` : ''}\n` +
    `Calculado con una tasa del ${Math.round(c.rate * 100)}% anual.\n` +
    'Haz la tuya en elexa.com.co'
  );
}

/* ============================== ENVÍO ==============================
   Las mismas claves que manda la radiografía de Florentino, así que caen en
   las mismas columnas de la hoja «Radiografías». `sitio` y `pagina` son
   nuevas: el receptor (Apps Script) les crea la columna solo, y dicen que la
   persona la hizo acá y desde qué página. */

export type Contacto = {
  id: string;
  nombre: string;
  correo: string;
  whatsapp: string;
  edad: number;
};

/* De dónde llegó la persona: la campaña del enlace (utm_) y, si no hay, el
   sitio de referencia. */
export function visita(): Record<string, string> {
  let params: URLSearchParams | null = null;
  try {
    params = new URLSearchParams(location.search);
  } catch {
    /* sin location: nada que leer */
  }
  const param = (k: string) => (params?.get(k) || '').slice(0, 80);
  let referido = '';
  try {
    if (document.referrer) {
      const h = new URL(document.referrer).hostname;
      referido = h === location.hostname ? '' : h;
    }
  } catch {
    /* referrer ilegible */
  }
  return {
    origen: param('utm_source') || referido || 'directo',
    campana: param('utm_campaign'),
    medio: param('utm_medium'),
    referido,
    sitio: location.hostname,
    pagina: location.pathname,
  };
}

export function datosInicio(k: Contacto): Record<string, string | number> {
  return {
    id: k.id,
    fecha: new Date().toISOString(),
    nombre: k.nombre.trim(),
    correo: k.correo.trim(),
    whatsapp: k.whatsapp.trim(),
    autoriza: 'SÍ',
    edad: k.edad || '',
    ...visita(),
    etapa: 'inicio',
  };
}

export function datosCompletos(k: Contacto, e: Entrada, rate: number): Record<string, string | number> {
  const c = calcular(e, rate);
  const d: Record<string, string | number> = {
    ...datosInicio(k),
    etapa: 'completo',
    ingresosActivos: c.b.IA,
    ingresosPasivos: c.b.IP,
    ingresosTotales: c.b.IT,
    activosProductivos: c.b.AP,
    activosImproductivos: c.b.AI,
    deudaTotal: c.b.deuda,
    cuotasMes: c.b.cuotas,
    patrimonio: c.b.PN,
    gastosTotales: c.f.gastos,
    ritmoDeVida: c.ritmo,
    capacidadAhorro: c.ahorro,
    pctAhorro: isFinite(c.pAhorro) ? Math.round(c.pAhorro * 1000) / 10 : '',
    pctImproductivos: isFinite(c.pImprod) ? Math.round(c.pImprod * 1000) / 10 : '',
    cobertura: isFinite(c.lfpt) ? Math.round(c.lfpt * 100) / 100 : '',
    aniosFaltantes: isFinite(c.anios) ? c.anios : '>60',
    edadLibertad: c.edad || '',
    objetivoActivosProd: Math.round(c.objetivoAP),
    tasa: Math.round(rate * 100),
    presupuestoClaro: e.presupuestoClaro ? 'SÍ' : 'NO',
    pctCuotaCapital: Math.round(e.hipoPct * 100),
  };
  for (const id of IDS_DINERO) d[`d_${id}`] = e.S[id] || 0;
  return d;
}

/* Guarda sin bloquear a la persona: el resultado se muestra igual.
   1) POST con keepalive, para que sobreviva si el celular manda la pestaña a
      segundo plano en mitad del envío. Va como text/plain a propósito: con
      application/json el navegador haría un preflight que Apps Script no
      responde.
   2) Si no se puede leer la respuesta, reintento en modo no-cors. */
export function enviar(endpoint: string, datos: Record<string, string | number>): Promise<void> {
  const cuerpo = JSON.stringify(datos);
  const opciones: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: cuerpo,
    keepalive: true,
  };
  return fetch(endpoint, opciones)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    })
    .catch(() => fetch(endpoint, { ...opciones, mode: 'no-cors' }).then(() => undefined));
}

/* ============================== EJEMPLO ==============================
   Las cifras de muestra de «Ver un ejemplo». */
export const EJEMPLO: Valores = {
  edad: 42,
  salario: 12_000_000,
  honorarios: 3_000_000,
  alquileres: 1_800_000,
  apBienes: 280_000_000,
  apFin: 35_000_000,
  apCdt: 20_000_000,
  aiCasa: 520_000_000,
  aiCarro: 85_000_000,
  aiOtros: 15_000_000,
  dHipo_saldo: 210_000_000,
  dHipo_cuota: 2_400_000,
  dConsumo_saldo: 18_000_000,
  dConsumo_cuota: 900_000,
  dTc_saldo: 6_000_000,
  dTc_cuota: 600_000,
  gVivienda: 2_600_000,
  gMercado: 2_400_000,
  gTransporte: 900_000,
  gFamilia: 2_800_000,
  gOtros: 1_900_000,
  gImp: 1_200_000,
};
