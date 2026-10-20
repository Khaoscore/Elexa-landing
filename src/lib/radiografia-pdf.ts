/* El PDF del resultado de la radiografía financiera.

   jsPDF se baja sola la primera vez que hace falta (al llegar al resultado),
   no con la página: quien nunca termina la radiografía no paga ese peso. Si
   no se puede bajar (sin señal, red que la bloquea), Radiografia.tsx cae a
   imprimir, que en el celular también guarda como PDF. */
import {
  type Calculo,
  diagnostico,
  indicadores,
  pesos,
  sinNegritas,
  veredicto,
} from './radiografia';

const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js';

/* jsPDF llega por <script> y no trae tipos en el proyecto. */
type JsPDF = any;
type Ventana = Window & { jspdf?: { jsPDF: new (opciones: object) => JsPDF } };

let promesa: Promise<new (opciones: object) => JsPDF> | null = null;

export function cargarJsPDF() {
  if (promesa) return promesa;
  promesa = new Promise((listo, falla) => {
    const w = window as Ventana;
    if (w.jspdf?.jsPDF) return listo(w.jspdf.jsPDF);
    const s = document.createElement('script');
    s.src = JSPDF_URL;
    s.async = true;
    s.onload = () => (w.jspdf?.jsPDF ? listo(w.jspdf.jsPDF) : falla(new Error('jsPDF no expuso su constructor')));
    s.onerror = () => falla(new Error('no se pudo bajar jsPDF'));
    document.head.appendChild(s);
  });
  promesa.catch(() => {
    promesa = null; // que se pueda reintentar
  });
  return promesa;
}

/* Las fuentes de base de un PDF hablan Latin-1: las tildes, la ñ y la raya
   entran; el infinito y las comillas tipográficas no. */
function aLatin1(s: string): string {
  return String(s)
    .replace(/∞/g, 'sin límite')
    .replace(/≈/g, '~')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/–/g, '—')
    .replace(/…/g, '...')
    .replace(/ /g, ' ');
}

type RGB = [number, number, number];
const TINTA: Record<string, RGB> = {
  acento: [95, 36, 159], // brand-300
  ink: [29, 11, 48], // brand-500
  ink2: [51, 63, 72], // ink-300
  ink3: [131, 131, 126], // texto tenue
  linea: [217, 217, 214], // neutral-300
  fondo: [240, 240, 239], // neutral-200
  bien: [26, 158, 92],
  cerca: [217, 154, 11],
  lejos: [214, 58, 47],
};

export type DatosPDF = {
  nombre: string;
  edad: number;
  c: Calculo;
  hipoPct: number;
  lvAhorro: number;
  lvMover: number;
};

export function construirPDF(d: DatosPDF): Promise<JsPDF> {
  return cargarJsPDF().then((Constructor) => {
    const { c } = d;
    const v = veredicto(c);
    const doc = new Constructor({ unit: 'mm', format: 'a4', compress: true });

    const M = 18;
    const ANCHO = 210 - M * 2;
    let y = 0;

    const color = (f: string, rgb: RGB) => doc[f](rgb[0], rgb[1], rgb[2]);
    type Opciones = { tam?: number; peso?: string; color?: RGB; alineado?: string; alto?: number };
    function texto(t: string, x: number, yy: number, o: Opciones = {}) {
      doc.setFont('helvetica', o.peso || 'normal');
      doc.setFontSize(o.tam || 10);
      color('setTextColor', o.color || TINTA.ink);
      doc.text(aLatin1(t), x, yy, o.alineado ? { align: o.alineado } : undefined);
    }
    function parrafo(t: string, x: number, yy: number, ancho: number, o: Opciones = {}) {
      doc.setFont('helvetica', o.peso || 'normal');
      doc.setFontSize(o.tam || 9.5);
      color('setTextColor', o.color || TINTA.ink2);
      const lineas = doc.splitTextToSize(aLatin1(t), ancho);
      doc.text(lineas, x, yy);
      return lineas.length * (o.alto || 4.6);
    }
    const volanta = (t: string, yy: number) => texto(t.toUpperCase(), M, yy, { tam: 7.5, peso: 'bold', color: TINTA.ink3 });
    function regla(yy: number) {
      color('setDrawColor', TINTA.linea);
      doc.setLineWidth(0.3);
      doc.line(M, yy, M + ANCHO, yy);
    }

    /* ---- encabezado ---- */
    color('setFillColor', TINTA.acento);
    doc.rect(0, 0, 210, 6, 'F');
    y = 20;
    texto('RADIOGRAFÍA FINANCIERA', M, y, { tam: 8, peso: 'bold', color: TINTA.acento });
    y += 9;
    texto(d.nombre.trim() || 'Mi radiografía', M, y, { tam: 19, peso: 'bold' });
    y += 6;
    const hoy = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    texto(hoy + (d.edad ? `  ·  ${d.edad} años` : ''), M, y, { tam: 9, color: TINTA.ink3 });
    y += 4;
    regla(y);

    /* ---- la cifra ---- */
    y += 12;
    volanta('Tu cifra', y);
    y += 15;
    texto(v.cifra, M, y, { tam: 38, peso: 'bold', color: TINTA.acento });
    y += 7;
    texto(v.etiqueta, M, y, { tam: 11, peso: 'bold' });
    y += 7;
    if (v.detalle) y += parrafo(sinNegritas(v.detalle), M, y, ANCHO, { tam: 9.5 });

    /* Si movió las palancas, el PDF no puede parecer el diagnóstico base. */
    if (d.lvAhorro > 0 || d.lvMover > 0) {
      y += 3;
      color('setFillColor', TINTA.fondo);
      doc.roundedRect(M, y - 3.5, ANCHO, 12, 1.5, 1.5, 'F');
      y += 2;
      parrafo(
        `Escenario simulado: con ${pesos(d.lvAhorro)} menos de gasto al mes y ${pesos(d.lvMover)} movidos a activos productivos.`,
        M + 3,
        y,
        ANCHO - 6,
        { tam: 8.5 },
      );
      y += 9;
    }

    /* ---- indicadores ---- */
    y += 8;
    regla(y - 4);
    volanta('Panel de indicadores', y);
    y += 8;
    for (const g of indicadores(c)) {
      const rgb = TINTA[g.tono];
      texto(g.nombre, M, y, { tam: 10, peso: 'bold' });
      texto(g.valor, M + ANCHO, y, { tam: 13, peso: 'bold', color: rgb, alineado: 'right' });
      y += 4;
      const bw = ANCHO - 34;
      const bh = 2.4;
      color('setFillColor', TINTA.fondo);
      doc.roundedRect(M, y, bw, bh, 1.2, 1.2, 'F');
      const lleno = (Math.max(0, Math.min(100, g.lleno)) / 100) * bw;
      if (lleno > 0.6) {
        color('setFillColor', rgb);
        doc.roundedRect(M, y, lleno, bh, 1.2, 1.2, 'F');
      }
      color('setFillColor', TINTA.ink);
      doc.rect(M + (g.marca / 100) * bw - 0.25, y - 1, 0.5, bh + 2, 'F');
      texto(g.ref, M + ANCHO, y + 2.2, { tam: 8, color: TINTA.ink3, alineado: 'right' });
      y += 9;
    }

    /* ---- diagnóstico ---- */
    const diag = diagnostico(c);
    if (diag.length) {
      y += 3;
      regla(y - 4);
      volanta('Diagnóstico', y);
      y += 6;
      for (const p of diag) y += parrafo(sinNegritas(p), M, y, ANCHO, { tam: 9, alto: 4.2 }) + 2.5;
      y += 1;
    }

    /* ---- cifras ---- */
    y += 3;
    regla(y - 4);
    volanta('Tus cifras del mes', y);
    y += 7;
    const filas: [string, string][] = [
      ['Ingresos totales', pesos(c.b.IT)],
      ['Ritmo de vida', pesos(c.ritmo)],
      ['Capacidad de ahorro', pesos(c.ahorro)],
      ['Activos productivos', pesos(c.AP)],
      ['Activos improductivos', pesos(c.AI)],
      ['Deuda total', pesos(c.b.deuda)],
      ['Patrimonio', pesos(c.b.PN)],
    ];
    if (isFinite(c.anios) && c.anios > 0) filas.push(['Activos productivos que necesitarías', pesos(c.objetivoAP)]);
    filas.forEach(([nombre, valor], i) => {
      if (i % 2 === 0) {
        color('setFillColor', [250, 250, 249]);
        doc.rect(M, y - 3.6, ANCHO, 6.4, 'F');
      }
      texto(nombre, M + 2, y, { tam: 9.5, color: TINTA.ink2 });
      texto(valor, M + ANCHO - 2, y, { tam: 9.5, peso: 'bold', alineado: 'right' });
      y += 6.4;
    });

    /* ---- letra chica ---- */
    y += 6;
    regla(y - 4);
    volanta('Los supuestos, sin letra menuda', y);
    y += 6;
    parrafo(
      `Calculado con una tasa del ${Math.round(c.rate * 100)}% anual, la que tú elegiste. ` +
        'Supone que tus activos productivos rinden esa tasa todos los años y que reinviertes lo que ahorras. ' +
        `La parte de tu cuota hipotecaria que abona a capital (${Math.round(d.hipoPct * 100)}%) no cuenta ` +
        'como gasto sino como ahorro, porque esa parte se vuelve tuya. ' +
        'Esto es una herramienta educativa, no una asesoría financiera ni una oferta de inversión, ' +
        'y tampoco una proyección de rentabilidad: nadie puede garantizarte una tasa.',
      M,
      y,
      ANCHO,
      { tam: 8, color: TINTA.ink3, alto: 3.8 },
    );

    /* ---- pie ---- */
    color('setDrawColor', TINTA.linea);
    doc.setLineWidth(0.3);
    doc.line(M, 281, M + ANCHO, 281);
    texto('Elexa  ·  Luis Puerto (@luis_inversionista)', M, 286, { tam: 8.5, peso: 'bold', color: TINTA.ink2 });
    texto('elexa.com.co', M + ANCHO, 286, { tam: 8.5, color: TINTA.ink3, alineado: 'right' });

    doc.setProperties({
      title: 'Radiografia financiera',
      subject: 'Diagnostico de libertad financiera',
      author: 'Elexa',
    });
    return doc;
  });
}

export function nombreArchivo(nombre: string): string {
  let n = nombre.trim().toLowerCase();
  n = n.normalize('NFD').replace(/[̀-ͯ]/g, ''); // fuera tildes y ñ
  n = n.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `radiografia-${n || 'financiera'}-${new Date().toISOString().slice(0, 10)}.pdf`;
}
