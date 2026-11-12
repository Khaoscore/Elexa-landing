/* La imagen para historias de la ficha de /comerciales (estado de WhatsApp,
   historias de Instagram): 1080 × 1920, la foto de portada arriba y abajo,
   sobre el morado oscuro de la marca, el nombre, el lugar, el precio en una
   pastilla magenta, el área y la disponibilidad. Sin contacto ni marca Elexa:
   el asesor la sube con lo suyo.

   Se dibuja en el navegador, en un <canvas>. La foto viene de Drive, que
   permite dibujarla (CORS); si no se puede (otra fuente que no lo permite,
   o no carga), la imagen sale igual sin foto.

   Instagram tapa unos 250 px de arriba (el nombre de la cuenta) y unos 300
   de abajo (la caja de respuesta): el texto queda entre esas dos franjas. */

export type DatosHistoria = {
  nombre: string;
  barrio: string;
  direccion: string;
  area: string;
  precio: string;
  nota: string;
  disponibilidad: string;
  /** La foto de portada, de un servidor que permita dibujarla (CORS). */
  foto: string;
};

const ANCHO = 1080;
const ALTO = 1920;
const MARGEN = 72;
const FIN_TEXTO = 1640;

const COLOR = {
  fondo: '#1d0b30', // palette/brand/500
  primario: '#5f249f', // palette/brand/300
  acento: '#981e97', // palette/accent/300
  lila: '#e6c3f0',
  blanco: '#ffffff',
};

const DISPLAY = '"DM Sans Variable", "DM Sans", system-ui, sans-serif';
const CUERPO = 'Roboto, system-ui, sans-serif';

function cargarImagen(src: string, ajena: boolean): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const imagen = new Image();
    if (ajena) {
      imagen.crossOrigin = 'anonymous';
      // Drive contesta 429 con un Referer de localhost (ver src/lib/espacios.ts).
      imagen.referrerPolicy = 'no-referrer';
    }
    const espera = window.setTimeout(() => rechazar(new Error('La foto tardó demasiado')), 15000);
    imagen.onload = () => {
      clearTimeout(espera);
      resolver(imagen);
    };
    imagen.onerror = () => {
      clearTimeout(espera);
      rechazar(new Error(`No cargó ${src}`));
    };
    imagen.src = src;
  });
}

/* Parte el texto en renglones que quepan; con `maximo`, el último termina
   en «…» si sobra. */
function renglones(ctx: CanvasRenderingContext2D, texto: string, ancho: number, maximo = Infinity): string[] {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of palabras) {
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width <= ancho || !actual) actual = prueba;
    else {
      lineas.push(actual);
      actual = palabra;
    }
  }
  if (actual) lineas.push(actual);
  if (lineas.length <= maximo) return lineas;
  const cortadas = lineas.slice(0, maximo);
  let ultima = cortadas[maximo - 1];
  while (ultima && ctx.measureText(`${ultima}…`).width > ancho) ultima = ultima.replace(/\s*\S+$/, '');
  cortadas[maximo - 1] = `${ultima}…`;
  return cortadas;
}

function pastilla(ctx: CanvasRenderingContext2D, x: number, y: number, ancho: number, alto: number) {
  const r = alto / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + ancho, y, x + ancho, y + alto, r);
  ctx.arcTo(x + ancho, y + alto, x, y + alto, r);
  ctx.arcTo(x, y + alto, x, y, r);
  ctx.arcTo(x, y, x + ancho, y, r);
  ctx.closePath();
}

function aBlob(lienzo: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolver, rechazar) => {
    try {
      lienzo.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error('Sin imagen'))), 'image/jpeg', 0.9);
    } catch (error) {
      rechazar(error); // la foto «ensució» el lienzo (sin CORS)
    }
  });
}

export async function dibujarHistoria(d: DatosHistoria): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`900 76px ${DISPLAY}`),
    document.fonts.load(`700 36px ${CUERPO}`),
    document.fonts.load(`400 36px ${CUERPO}`),
  ]).catch(() => undefined);

  const [foto, icono] = await Promise.all([
    d.foto ? cargarImagen(d.foto, true).catch(() => null) : Promise.resolve(null),
    cargarImagen('/img/comerciales/local.svg', false).catch(() => null),
  ]);

  const lienzo = document.createElement('canvas');
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const ctx = lienzo.getContext('2d')!;
  const anchoTexto = ANCHO - 2 * MARGEN;

  const dibujar = (conFoto: HTMLImageElement | null) => {
    ctx.clearRect(0, 0, ANCHO, ALTO);
    ctx.fillStyle = COLOR.fondo;
    ctx.fillRect(0, 0, ANCHO, ALTO);

    /* ---- Primero se mide el bloque de texto, para saber dónde empieza ---- */
    ctx.font = `900 76px ${DISPLAY}`;
    const nombre = renglones(ctx, d.nombre, anchoTexto, 3);
    ctx.font = `400 36px ${CUERPO}`;
    const lugar = renglones(ctx, [d.barrio, d.direccion].filter(Boolean).join(' · '), anchoTexto, 2);
    const datos = [d.area, d.disponibilidad].filter(Boolean);

    const ALTO_PRECIO = 120;
    const alto =
      34 + // «EN ALQUILER»
      28 +
      nombre.length * 84 +
      (lugar.length ? 20 + lugar.length * 46 : 0) +
      (d.precio ? 40 + ALTO_PRECIO : 0) +
      (datos.length ? 36 + datos.length * 52 : 0);
    const inicio = Math.min(1180, Math.max(820, FIN_TEXTO - alto));

    /* ---- La foto, hasta un poco más abajo de donde empieza el texto ---- */
    const altoFoto = inicio + 40;
    if (conFoto) {
      const escala = Math.max(ANCHO / conFoto.naturalWidth, altoFoto / conFoto.naturalHeight);
      const ancho = ANCHO / escala;
      const altoRecorte = altoFoto / escala;
      ctx.drawImage(
        conFoto,
        (conFoto.naturalWidth - ancho) / 2,
        (conFoto.naturalHeight - altoRecorte) / 2,
        ancho,
        altoRecorte,
        0,
        0,
        ANCHO,
        altoFoto,
      );
    } else {
      const degradado = ctx.createLinearGradient(0, 0, ANCHO, altoFoto);
      degradado.addColorStop(0, COLOR.primario);
      degradado.addColorStop(1, COLOR.acento);
      ctx.fillStyle = degradado;
      ctx.fillRect(0, 0, ANCHO, altoFoto);
      if (icono) {
        ctx.globalAlpha = 0.18;
        ctx.drawImage(icono, ANCHO / 2 - 160, altoFoto / 2 - 200, 320, 320);
        ctx.globalAlpha = 1;
      }
    }

    // Arriba, una sombra suave para que se lea la etiqueta.
    const arriba = ctx.createLinearGradient(0, 0, 0, 480);
    arriba.addColorStop(0, 'rgba(15, 19, 22, 0.55)');
    arriba.addColorStop(1, 'rgba(15, 19, 22, 0)');
    ctx.fillStyle = arriba;
    ctx.fillRect(0, 0, ANCHO, 480);

    // Abajo, la foto se funde con el morado.
    const abajo = ctx.createLinearGradient(0, altoFoto - 480, 0, altoFoto);
    abajo.addColorStop(0, 'rgba(29, 11, 48, 0)');
    abajo.addColorStop(1, COLOR.fondo);
    ctx.fillStyle = abajo;
    ctx.fillRect(0, altoFoto - 480, ANCHO, 480);

    /* ---- La etiqueta: la tienda en un círculo y «Espacios comerciales» ---- */
    const yEtiqueta = 300;
    ctx.fillStyle = COLOR.primario;
    ctx.beginPath();
    ctx.arc(MARGEN + 40, yEtiqueta, 40, 0, Math.PI * 2);
    ctx.fill();
    if (icono) ctx.drawImage(icono, MARGEN + 16, yEtiqueta - 24, 48, 48);
    ctx.fillStyle = COLOR.blanco;
    ctx.font = `900 40px ${DISPLAY}`;
    ctx.textBaseline = 'middle';
    ctx.fillText('Espacios comerciales', MARGEN + 100, yEtiqueta + 2);

    /* ---- El texto ---- */
    ctx.textBaseline = 'alphabetic';
    let y = inicio;

    ctx.fillStyle = COLOR.lila;
    ctx.font = `700 30px ${CUERPO}`;
    if ('letterSpacing' in ctx) (ctx as { letterSpacing: string }).letterSpacing = '4px';
    ctx.fillText('EN ALQUILER', MARGEN, y + 28);
    if ('letterSpacing' in ctx) (ctx as { letterSpacing: string }).letterSpacing = '0px';
    y += 34 + 28;

    ctx.fillStyle = COLOR.blanco;
    ctx.font = `900 76px ${DISPLAY}`;
    for (const linea of nombre) {
      y += 84;
      ctx.fillText(linea, MARGEN, y - 14);
    }

    if (lugar.length) {
      y += 20;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.font = `400 36px ${CUERPO}`;
      for (const linea of lugar) {
        y += 46;
        ctx.fillText(linea, MARGEN, y - 8);
      }
    }

    if (d.precio) {
      y += 40;
      ctx.font = `900 64px ${DISPLAY}`;
      const anchoPrecio = ctx.measureText(d.precio).width;
      ctx.font = `700 32px ${CUERPO}`;
      const anchoNota = d.nota ? ctx.measureText(d.nota).width + 16 : 0;
      const anchoPastilla = Math.min(anchoTexto, anchoPrecio + anchoNota + 80);
      ctx.fillStyle = COLOR.acento;
      pastilla(ctx, MARGEN, y, anchoPastilla, ALTO_PRECIO);
      ctx.fill();
      ctx.fillStyle = COLOR.blanco;
      ctx.font = `900 64px ${DISPLAY}`;
      ctx.fillText(d.precio, MARGEN + 40, y + 82, anchoTexto - 80 - anchoNota);
      if (d.nota) {
        ctx.font = `700 32px ${CUERPO}`;
        ctx.fillText(d.nota, MARGEN + 40 + anchoPrecio + 16, y + 80);
      }
      y += ALTO_PRECIO;
    }

    if (datos.length) {
      y += 36;
      ctx.font = `700 36px ${CUERPO}`;
      for (const dato of datos) {
        y += 52;
        ctx.fillStyle = COLOR.acento;
        ctx.beginPath();
        ctx.arc(MARGEN + 8, y - 20, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLOR.blanco;
        ctx.fillText(dato, MARGEN + 32, y - 8, anchoTexto - 32);
      }
    }
  };

  dibujar(foto);
  try {
    return await aBlob(lienzo);
  } catch {
    dibujar(null);
    return aBlob(lienzo);
  }
}
