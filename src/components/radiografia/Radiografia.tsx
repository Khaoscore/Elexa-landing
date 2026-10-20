/* La radiografía financiera, dentro de la sección «¿Qué tan lejos estás de
   tu libertad financiera?» (Libertad.astro).

   Cerrada, es la invitación del diseño («Frame 89», 138:619): el título y el
   botón a la izquierda, lo que hay que saber antes a la derecha. Al tocar
   «Empezar», la sección se convierte en la radiografía, ahí mismo, sin salir
   de la página: un panel gris con los pasos arriba, la pregunta en una
   tarjeta blanca y, en escritorio, la columna «Tu radiografía» que se arma
   con cada respuesta y deja la cifra final borrosa hasta el último paso.

   Las mismas cuatro pantallas y la misma aritmética que
   florentino.elexa.com.co/radiografia (src/lib/radiografia.ts), con menos
   a la vista: en vez de mostrar todas las casillas de entrada (más de 30),
   cada pantalla pregunta «¿qué tienes?» con fichas y solo abre la casilla de
   lo que la persona marca. Sigue siendo completa —están todas las
   categorías— pero quien no tiene finca ni regalías no las ve.

   Conserva todo lo de la original: el contacto se guarda al pasar el primer
   paso (así queda registrado quien abandona) y la fila se completa al ver el
   resultado; autoguardado en el navegador con «Retomar»; el ejemplo con
   cifras de muestra; los avisos de ceros de menos; las tres palancas; el
   PDF, compartir y copiar.

   Sin JavaScript, o antes de que la isla despierte, el botón es un enlace a
   la radiografía de Florentino. */
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { RADIOGRAFIA_CONFIG as CFG } from '../../data/radiografia';
import { AGENDA_URL, PROYECTOS_URL, RADIOGRAFIA_URL, esExterno } from '../../data/site';
import { partirNegritas } from '../../lib/negritas';
import * as R from '../../lib/radiografia';
import { cargarJsPDF, construirPDF, nombreArchivo } from '../../lib/radiografia-pdf';
import CampoDinero from './CampoDinero';
import './radiografia.css';

/* En `npm run dev` no se envía nada (ver data/radiografia.ts). */
const MODO_PRUEBA = !CFG.endpoint || (import.meta.env.DEV && !CFG.enviarEnDesarrollo);

type Contacto = { nombre: string; correo: string; whatsapp: string; autoriza: boolean };
const SIN_CONTACTO: Contacto = { nombre: '', correo: '', whatsapp: '', autoriza: false };

/* 0 = la invitación; 1 a 4, las pantallas; 5, el resultado. */
type Paso = 0 | 1 | 2 | 3 | 4 | 5;
const NOMBRES_PASOS = ['Tú', 'Ingresos', 'Patrimonio', 'Gastos', 'Tu cifra'];

const PUNTOS = [
  {
    titulo: 'Arranco pidiéndote tus datos',
    texto: 'Nombre, edad, correo y WhatsApp, para enviarte tu radiografía y mantenerte al tanto sobre los proyectos.',
  },
  {
    titulo: 'No es una proyección de rentabilidad',
    texto: 'Tú eliges la tasa con la que quieres calcular. Nadie puede garantizarte una.',
  },
  {
    titulo: 'Necesitas tener a mano',
    texto: 'Tus ingresos y gastos de un mes normal, y una idea de cuánto valen tus bienes y cuánto debes.',
  },
];

/* ============================== AUTOGUARDADO ==============================
   Solo en este navegador. Evita que una llamada entrante, un cambio de app
   o una pestaña descartada borren cinco minutos de trabajo: el motivo más
   común de abandono en el celular. Guarda también el id de la fila, así que
   al retomar se completa la misma fila de la hoja y no una nueva. */
const CLAVE = 'elexa.radiografia.v1';
const VENCE_MS = 7 * 24 * 60 * 60 * 1000;

type Guardado = {
  v: 1;
  t: number;
  id: string;
  paso: number;
  pres: boolean;
  hipo: number;
  S: R.Valores;
  abiertos: string[];
  c: Contacto;
  completo: boolean;
};

function leerGuardado(): Guardado | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return null;
    const d = JSON.parse(raw) as Guardado;
    if (!d || d.v !== 1 || !d.S) return null;
    if (Date.now() - (d.t || 0) > VENCE_MS) {
      localStorage.removeItem(CLAVE);
      return null;
    }
    const algo = Object.values(d.S).some((v) => (v || 0) > 0) || !!(d.c && (d.c.nombre || d.c.correo));
    return algo ? d : null;
  } catch {
    return null;
  }
}

function borrarGuardado() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* modo privado */
  }
}

const nuevoId = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function primerNombre(nombre: string): string {
  const n = nombre.trim().split(/\s+/)[0] || '';
  return n ? n.charAt(0).toLocaleUpperCase('es-CO') + n.slice(1) : '';
}

/* Las fichas que se abren solas: las que ya tienen cifra. */
function abiertosDe(S: R.Valores): string[] {
  return Object.keys(S)
    .filter((k) => k !== 'edad' && (S[k] || 0) > 0)
    .map((k) => k.replace(/_(saldo|cuota)$/, ''))
    .filter((k, i, a) => a.indexOf(k) === i);
}

function Negritas({ texto }: { texto: string }) {
  return (
    <>
      {partirNegritas(texto).map((t, i) =>
        t.negrita ? <strong key={i}>{t.texto}</strong> : <Fragment key={i}>{t.texto}</Fragment>,
      )}
    </>
  );
}

const menosMovimiento = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ================================ ISLA ================================ */

export default function Radiografia() {
  const [paso, setPaso] = useState<Paso>(0);
  const [alcanzado, setAlcanzado] = useState(0);
  const [S, setS] = useState<R.Valores>({});
  const [contacto, setContacto] = useState<Contacto>(SIN_CONTACTO);
  const [presupuestoClaro, setPresupuestoClaro] = useState(true);
  const [hipoPct, setHipoPct] = useState(0.5);
  const [abiertos, setAbiertos] = useState<string[]>(['salario']);
  const [recien, setRecien] = useState<string | null>(null);
  const [error, setError] = useState<{ paso: number; texto: string; campo?: string } | null>(null);
  const [demo, setDemo] = useState(false);

  /* Lo que quedó a medias (de otra visita, o de «Salir»). */
  const [retomable, setRetomable] = useState<{ paso: number; nombre: string } | null>(null);

  /* Resultado */
  const [rate, setRate] = useState(R.TASA_BASE);
  const [lvAhorro, setLvAhorro] = useState(0);
  const [lvMover, setLvMover] = useState(0);
  const [registro, setRegistro] = useState<'guardando' | 'ok' | 'error' | 'prueba' | null>(null);
  const [ocupado, setOcupado] = useState<'pdf' | 'compartir' | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [puedeCompartir, setPuedeCompartir] = useState(false);

  const idFila = useRef(nuevoId());
  const inicioEnviado = useRef(false);
  const completoEnviado = useRef(false);
  const ancla = useRef<HTMLDivElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  const entrada: R.Entrada = useMemo(() => ({ S, presupuestoClaro, hipoPct }), [S, presupuestoClaro, hipoPct]);
  const b = useMemo(() => R.base(entrada), [entrada]);
  const f = useMemo(() => R.flujo(entrada, b), [entrada, b]);
  const nombre = primerNombre(contacto.nombre);

  /* ---------- al despertar: ¿hay algo a medias? ---------- */
  useEffect(() => {
    setPuedeCompartir(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    if (!CFG.autoguardar) return;
    const d = leerGuardado();
    if (!d) return;
    setS(d.S);
    setContacto({ ...SIN_CONTACTO, ...d.c });
    setPresupuestoClaro(d.pres !== false);
    setHipoPct(typeof d.hipo === 'number' ? d.hipo : 0.5);
    setAbiertos(Array.from(new Set([...(d.abiertos || []), ...abiertosDe(d.S)])));
    const p = Math.min(5, Math.max(1, d.paso || 1));
    setAlcanzado(p);
    idFila.current = d.id || nuevoId();
    inicioEnviado.current = p >= 2;
    completoEnviado.current = !!d.completo;
    setRetomable({ paso: p, nombre: primerNombre(d.c?.nombre || '') });
  }, []);

  /* ---------- autoguardado (con 600 ms de respiro) ---------- */
  const instantanea = useRef<Guardado | null>(null);
  instantanea.current =
    CFG.autoguardar && !demo && alcanzado >= 1
      ? {
          v: 1,
          t: Date.now(),
          id: idFila.current,
          paso: paso || retomable?.paso || alcanzado,
          pres: presupuestoClaro,
          hipo: hipoPct,
          S,
          abiertos,
          c: contacto,
          completo: completoEnviado.current,
        }
      : null;

  function guardarYa() {
    if (!instantanea.current) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ ...instantanea.current, t: Date.now() }));
    } catch {
      /* cuota llena o modo privado: seguimos sin guardar */
    }
  }

  useEffect(() => {
    const t = setTimeout(guardarYa, 600);
    return () => clearTimeout(t);
  });

  useEffect(() => {
    const alOcultar = () => document.visibilityState === 'hidden' && guardarYa();
    document.addEventListener('visibilitychange', alOcultar);
    window.addEventListener('pagehide', guardarYa);
    return () => {
      document.removeEventListener('visibilitychange', alOcultar);
      window.removeEventListener('pagehide', guardarYa);
    };
  }, []);

  /* ---------- al cambiar de pantalla: arriba y foco en el título ---------- */
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    /* La invitación, en el teléfono, es display: contents (no tiene caja):
       al volver a ella se apunta a la sección. */
    const el = paso === 0 ? ancla.current?.closest('section') : ancla.current;
    if (el) {
      const top = el.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.4) {
        el.scrollIntoView({ block: 'start', behavior: menosMovimiento() ? 'auto' : 'smooth' });
      }
    }
    titulo.current?.focus({ preventScroll: true });
    if (paso === 5) cargarJsPDF().catch(() => {});
  }, [paso]);

  /* El campo con error recibe el foco cuando ya está en pantalla. */
  useEffect(() => {
    if (error?.campo && error.paso === paso) document.getElementById(error.campo)?.focus();
  }, [error, paso]);

  /* ---------- navegación ---------- */
  /** `limpiar` en false deja a la vista el error que acaba de poner validar(). */
  function ir(n: Paso, limpiar = true) {
    if (limpiar) setError(null);
    setRecien(null);
    setPaso(n);
    if (n >= 1 && n <= 5) setAlcanzado((a) => Math.max(a, n));
  }

  function validar(n: number): boolean {
    if (n === 1) {
      const falla = (texto: string, campo: string) => {
        setError({ paso: 1, texto, campo });
        return false;
      };
      if (contacto.nombre.trim().length < 2) return falla('Escribe tu nombre para poder mandarte la radiografía.', 'rf-nombre');
      if (!(S.edad >= 18 && S.edad <= 90)) return falla('Escribe tu edad: entra en el cálculo de cuándo llegarías.', 'rf-edad');
      if (!EMAIL.test(contacto.correo.trim())) return falla('Ese correo no se ve bien. Revísalo y vuelve a intentar.', 'rf-correo');
      if (!contacto.autoriza) return falla('Necesitamos tu autorización para guardar tus datos y enviarte el resultado.', 'rf-autoriza');
    }
    if (n === 2 && b.IT <= 0) {
      setError({
        paso: 2,
        texto: 'Necesito al menos un ingreso para poder calcular algo. Marca tu salario o lo que recibas en un mes normal.',
        campo: abiertos.includes('salario') ? 'salario' : undefined,
      });
      return false;
    }
    return true;
  }

  function registrarInicio() {
    if (completoEnviado.current || demo) return;
    inicioEnviado.current = true;
    if (MODO_PRUEBA) return;
    R.enviar(CFG.endpoint, R.datosInicio({ id: idFila.current, ...contacto, edad: S.edad || 0 })).catch((e) =>
      console.warn('[radiografia] no se pudo guardar el contacto:', e),
    );
  }

  function verResultado() {
    setLvAhorro(0);
    setLvMover(0);
    ir(5);
    if (demo || !inicioEnviado.current) return;
    if (MODO_PRUEBA) {
      setRegistro('prueba');
      return;
    }
    setRegistro('guardando');
    /* Solo cuenta como enviado cuando el receptor lo confirma: si falla, al
       retomar la radiografía se vuelve a intentar (ver empezar()). */
    R.enviar(CFG.endpoint, R.datosCompletos({ id: idFila.current, ...contacto, edad: S.edad || 0 }, entrada, rate))
      .then(() => {
        completoEnviado.current = true;
        setRegistro('ok');
      })
      .catch((e) => {
        console.warn('[radiografia] no se pudo guardar:', e);
        setRegistro('error');
      });
  }

  /** Avanza validando cada pantalla que se salta; se queda en la primera que falle. */
  function irA(n: number) {
    if (n < paso) return ir(n as Paso);
    for (let k = paso; k < n; k++) {
      if (k >= 1 && !validar(k)) {
        if (k !== paso) ir(k as Paso, false);
        return;
      }
      if (k === 1) registrarInicio();
    }
    if (n === 5) verResultado();
    else ir(n as Paso);
  }

  function continuar() {
    if (paso >= 1 && paso <= 4) irA(paso + 1);
  }

  function empezar() {
    if (retomable) {
      const p = retomable.paso as Paso;
      setRetomable(null);
      if (p === 5 && completoEnviado.current) {
        setRegistro(null);
        ir(5);
      } else if (p === 5) {
        verResultado(); // terminó pero no quedó registrada: se envía ahora
      } else ir(p);
      return;
    }
    ir(1);
  }

  function salir() {
    if (demo) {
      reiniciar();
      ir(0);
      return;
    }
    guardarYa();
    const hayDatos = Object.values(S).some((v) => v > 0) || !!(contacto.nombre.trim() || contacto.correo.trim());
    if (paso >= 1 && hayDatos) setRetomable({ paso, nombre });
    setError(null);
    setPaso(0);
  }

  function reiniciar() {
    setS({});
    setContacto(SIN_CONTACTO);
    setPresupuestoClaro(true);
    setHipoPct(0.5);
    setAbiertos(['salario']);
    setRate(R.TASA_BASE);
    setLvAhorro(0);
    setLvMover(0);
    setDemo(false);
    setRegistro(null);
    setError(null);
    setAlcanzado(0);
    setRetomable(null);
    idFila.current = nuevoId();
    inicioEnviado.current = false;
    completoEnviado.current = false;
    borrarGuardado();
  }

  function empezarDeCero() {
    reiniciar();
    ir(1);
  }

  function verEjemplo() {
    setS({ ...R.EJEMPLO });
    setAbiertos(abiertosDe(R.EJEMPLO));
    setContacto(SIN_CONTACTO);
    setPresupuestoClaro(true);
    setHipoPct(0.5);
    setRate(R.TASA_BASE);
    setLvAhorro(0);
    setLvMover(0);
    setRegistro(null);
    setDemo(true);
    setError(null);
    setPaso(5);
  }

  /* ---------- valores ---------- */
  function poner(id: string, n: number) {
    setS((s) => (s[id] === n ? s : { ...s, [id]: n }));
    if (error && error.paso === paso) setError(null);
  }

  function alternar(c: R.Campo, abierto: boolean, deuda = false) {
    if (abierto) {
      setAbiertos((a) => a.filter((x) => x !== c.id));
      setS((s) => {
        const sin = { ...s };
        for (const k of deuda ? [`${c.id}_saldo`, `${c.id}_cuota`] : [c.id]) delete sin[k];
        return sin;
      });
      setRecien(null);
    } else {
      setAbiertos((a) => [...a, c.id]);
      setRecien(c.id);
    }
  }

  function avisar(texto: string) {
    setAviso(texto);
    window.setTimeout(() => setAviso((a) => (a === texto ? null : a)), 2400);
  }

  /* ============================== VISTAS ============================== */

  if (paso === 0) {
    const etiquetaCta = retomable
      ? retomable.paso === 5
        ? 'Ver mi radiografía'
        : 'Retomar mi radiografía'
      : 'Empezar mi radiografía financiera';
    return (
      <>
        <div className="libertad__invitacion" ref={ancla}>
          <p className="libertad__antetitulo display t-h4">Ya sabes...</p>
          <h2 className="display t-h1" id="libertad-titulo">
            ¿Qué tan lejos estás de tu <span className="acento">libertad financiera?</span>
          </h2>
          <p className="libertad__bajada display t-h4">
            Cuatro pantallas, unos cinco minutos, y una cifra que probablemente no te va a gustar.{' '}
            <span className="acento">Pero es la tuya.</span>
          </p>
          <div className="libertad__acciones">
            {retomable && (
              <p className="libertad__retomar">
                {retomable.paso === 5
                  ? `${retomable.nombre ? `${retomable.nombre}, ya` : 'Ya'} tienes una radiografía hecha.`
                  : `${retomable.nombre ? `${retomable.nombre}, dejaste` : 'Dejaste'} tu radiografía a medio llenar.`}
              </p>
            )}
            <a
              className="btn btn--primario libertad__cta"
              href={RADIOGRAFIA_URL}
              target="_blank"
              rel="noopener"
              onClick={(e) => {
                e.preventDefault();
                empezar();
              }}
            >
              {etiquetaCta}
            </a>
            <button
              type="button"
              className="libertad__secundario"
              onClick={retomable ? empezarDeCero : verEjemplo}
            >
              {retomable ? 'Empezar de cero' : 'Ver un ejemplo con cifras de muestra'}
            </button>
          </div>
        </div>

        <ul className="libertad__puntos" role="list">
          {PUNTOS.map((punto) => (
            <li className="punto" key={punto.titulo}>
              <h3 className="punto__titulo display t-h4">{punto.titulo}</h3>
              <p className="punto__texto">{punto.texto}</p>
              <span className="punto__linea" aria-hidden="true">
                <img src="/img/libertad/divisor.svg" alt="" width="1" height="387" />
              </span>
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <div className="rf" ref={ancla} data-paso={paso}>
      <h2 className="sr-only" id="libertad-titulo">
        Radiografía financiera
      </h2>
      <header className="rf-cabeza">
        <p className="rf-cabeza__marca display">
          Radiografía <span className="acento">financiera</span>
        </p>
        <ol className="rf-pasos" role="list" aria-label="Pasos">
          {NOMBRES_PASOS.map((n, i) => {
            const k = i + 1;
            const estado = k === paso ? 'actual' : k < paso || k <= alcanzado ? 'hecho' : 'pendiente';
            const puede = !demo && k !== paso && k <= Math.max(alcanzado, paso + 1);
            return (
              <li key={n} className={`rf-pasos__item rf-pasos__item--${estado}`}>
                <button
                  type="button"
                  disabled={!puede}
                  aria-current={k === paso ? 'step' : undefined}
                  onClick={() => irA(k)}
                >
                  <span className="rf-pasos__marca" aria-hidden="true">
                    {k === 5 ? '★' : estado === 'hecho' ? '✓' : k}
                  </span>
                  <span className="rf-pasos__nombre">{n}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <button type="button" className="rf-salir" onClick={salir}>
          <span>{demo ? 'Cerrar ejemplo' : 'Salir'}</span>
          <img src="/img/iconos/close.svg" alt="" width="20" height="20" />
        </button>
      </header>

      {paso <= 4 ? (
        <div className="rf-cuerpo">
          <form
            className="rf-tarjeta"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              continuar();
            }}
          >
            <div className="rf-tarjeta__contenido" key={paso}>
              <p className="rf-tarjeta__paso">
                Paso {paso} de 4 · {NOMBRES_PASOS[paso - 1]}
              </p>
              {paso === 1 && PasoContacto()}
              {paso === 2 && PasoIngresos()}
              {paso === 3 && PasoPatrimonio()}
              {paso === 4 && PasoGastos()}
              {error && error.paso === paso && (
                <p className="rf-error" role="alert">
                  {error.texto}
                </p>
              )}
            </div>
            <footer className="rf-pie">
              <button
                type="button"
                className="rf-pie__atras"
                onClick={() => (paso === 1 ? salir() : ir((paso - 1) as Paso))}
              >
                <span aria-hidden="true">←</span> Atrás
              </button>
              <p className="rf-pie__total" aria-live="polite">
                {paso === 1 ? (
                  <span>Faltan 3 pantallas</span>
                ) : (
                  <>
                    <span>{paso === 2 ? 'Te entran al mes' : paso === 3 ? 'Tu patrimonio' : 'Tu ritmo de vida'}</span>
                    <strong className="display">{R.pesos(paso === 2 ? b.IT : paso === 3 ? b.PN : f.ritmo)}</strong>
                  </>
                )}
              </p>
              <button type="submit" className="btn btn--primario rf-pie__seguir">
                {paso === 4 ? 'Ver mi radiografía' : 'Continuar'} <span aria-hidden="true">→</span>
              </button>
            </footer>
          </form>
          {EnVivo()}
        </div>
      ) : (
        Resultado()
      )}

      {aviso && (
        <div className="rf-aviso" role="status">
          {aviso}
        </div>
      )}
    </div>
  );

  /* ============================== PANTALLAS ==============================
     Funciones internas que leen el estado de la isla sin pasarlo por props.
     Se invocan como funciones —{PasoIngresos()}— y no como componentes
     —<PasoIngresos />—: declaradas acá adentro, serían un tipo nuevo en cada
     render y React desmontaría los campos con cada tecla. Por lo mismo,
     ninguna usa hooks. */

  function PasoContacto() {
    return (
      <>
        <h3 className="rf-tarjeta__titulo display" ref={titulo} tabIndex={-1}>
          Primero, ¿quién eres?
        </h3>
        <p className="rf-tarjeta__bajada">
          {MODO_PRUEBA ? (
            <>
              <b>Versión de prueba:</b> nada de lo que escribas se envía a ningún servidor.
            </>
          ) : (
            'Para mandarte la radiografía cuando esté lista, y porque tu edad entra en el cálculo.'
          )}
        </p>
        <div className="rf-contacto">
          <div className="rf-campo rf-campo--ancho">
            <label htmlFor="rf-nombre">Tu nombre</label>
            <input
              id="rf-nombre"
              type="text"
              autoComplete="name"
              enterKeyHint="next"
              value={contacto.nombre}
              aria-invalid={error?.campo === 'rf-nombre' || undefined}
              onChange={(e) => {
                setContacto({ ...contacto, nombre: e.target.value });
                setError(null);
              }}
            />
          </div>
          <div className="rf-campo rf-campo--edad">
            <label htmlFor="rf-edad">Tu edad</label>
            <input
              id="rf-edad"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              enterKeyHint="next"
              maxLength={2}
              value={S.edad ? String(S.edad) : ''}
              aria-invalid={error?.campo === 'rf-edad' || undefined}
              onChange={(e) => poner('edad', R.aNumero(e.target.value.slice(0, 2)))}
            />
          </div>
          <div className="rf-campo">
            <label htmlFor="rf-correo">Tu correo</label>
            <input
              id="rf-correo"
              type="email"
              autoComplete="email"
              enterKeyHint="next"
              value={contacto.correo}
              aria-invalid={error?.campo === 'rf-correo' || undefined}
              onChange={(e) => {
                setContacto({ ...contacto, correo: e.target.value });
                setError(null);
              }}
            />
          </div>
          <div className="rf-campo">
            <label htmlFor="rf-whatsapp">
              Tu WhatsApp <span className="rf-campo__opcional">(opcional)</span>
            </label>
            <input
              id="rf-whatsapp"
              type="tel"
              autoComplete="tel"
              enterKeyHint="done"
              value={contacto.whatsapp}
              onChange={(e) => setContacto({ ...contacto, whatsapp: e.target.value })}
            />
          </div>
        </div>
        <label className="rf-autoriza">
          <input
            id="rf-autoriza"
            type="checkbox"
            checked={contacto.autoriza}
            onChange={(e) => {
              setContacto({ ...contacto, autoriza: e.target.checked });
              setError(null);
            }}
          />
          <span className="rf-autoriza__caja" aria-hidden="true" />
          <span>
            {MODO_PRUEBA
              ? 'Entiendo que esta es una versión de prueba y que nada de lo que escriba se envía a ningún servidor.'
              : 'Autorizo a Elexa Real Estate S.A.S. a guardar y tratar mis datos de contacto y las cifras que voy a ingresar en este diagnóstico, para enviarme mi radiografía e informarme sobre sus proyectos de inversión. Puedo pedir que los eliminen cuando quiera.'}{' '}
            {CFG.politica && (
              <a href={CFG.politica} target="_blank" rel="noopener">
                Política de tratamiento de datos
              </a>
            )}
          </span>
        </label>
      </>
    );
  }

  function PasoIngresos() {
    return (
      <>
        <h3 className="rf-tarjeta__titulo display" ref={titulo} tabIndex={-1}>
          {nombre ? `${nombre}, ¿cuánto` : '¿Cuánto'} te entra en un mes normal?
        </h3>
        <p className="rf-tarjeta__bajada">Marca lo que recibes y escribe cuánto. Aproxima: no necesitas el dato exacto al peso.</p>
        {Grupo({
          titulo: 'Por tu trabajo',
          ayuda: 'Lo que dejarías de recibir si mañana dejaras de trabajar.',
          campos: R.INGRESOS_ACTIVOS,
          total: b.IA,
        })}
        {Grupo({
          titulo: 'Sin trabajar',
          ayuda: 'Lo que te seguiría llegando igual aunque no trabajaras.',
          vacio: '¿Nada por acá? Es lo más común, y justamente ese es el punto.',
          campos: R.INGRESOS_PASIVOS,
          total: b.IP,
        })}
      </>
    );
  }

  function PasoPatrimonio() {
    return (
      <>
        <h3 className="rf-tarjeta__titulo display" ref={titulo} tabIndex={-1}>
          Lo que tienes y lo que debes
        </h3>
        <p className="rf-tarjeta__bajada">
          Escribe el <b>valor comercial de hoy</b>: por cuánto lo venderías, no lo que pagaste ni el avalúo catastral.
        </p>
        {Grupo({
          titulo: 'Lo que te produce',
          ayuda: 'Genera renta, o podría generarla sin que trabajes.',
          vacio: 'Si no tienes ninguno, déjalo así: también es un dato.',
          campos: R.ACTIVOS_PRODUCTIVOS,
          total: b.AP,
        })}
        {Grupo({
          titulo: 'Lo que usas y disfrutas',
          ayuda: 'En vez de generar ingresos, genera gastos.',
          campos: R.ACTIVOS_IMPRODUCTIVOS,
          total: b.AI,
        })}
        {Grupo({
          titulo: 'Lo que debes',
          ayuda: 'El saldo que te falta por pagar y la cuota de cada mes.',
          vacio: 'Sin deudas: un paso adelante.',
          campos: R.DEUDAS,
          total: b.deuda,
          deuda: true,
          extra: b.cuotas > 0 ? `${R.pesos(b.cuotas)} en cuotas al mes` : undefined,
        })}
      </>
    );
  }

  function PasoGastos() {
    return (
      <>
        <h3 className="rf-tarjeta__titulo display" ref={titulo} tabIndex={-1}>
          ¿En qué se te va el mes?
        </h3>
        <p className="rf-tarjeta__bajada">Última pantalla. Primero, una pregunta honesta: ¿tienes claro tu presupuesto?</p>

        <div className="rf-opciones" role="radiogroup" aria-label="¿Tienes claro tu presupuesto?">
          {[
            { v: true, titulo: 'Sí, lo tengo claro', texto: 'Te digo cuánto gasto en cada cosa.' },
            { v: false, titulo: 'No mucho', texto: 'Mejor te digo cuánto me queda.' },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              role="radio"
              aria-checked={presupuestoClaro === o.v}
              className="rf-opcion"
              onClick={() => setPresupuestoClaro(o.v)}
            >
              <span className="rf-opcion__punto" aria-hidden="true" />
              <span className="rf-opcion__titulo display">{o.titulo}</span>
              <span className="rf-opcion__texto">{o.texto}</span>
            </button>
          ))}
        </div>

        {presupuestoClaro ? (
          <div className="rf-grupo" key="gastos">
            <ul className="rf-filas rf-filas--rejilla" role="list">
              {R.GASTOS.map((c) => FilaDinero(c))}
            </ul>
            {b.cuotas > 0 && (
              <p className="rf-nota">
                Más <b>{R.pesos(b.cuotas)}</b> de las cuotas de tus créditos: las tomamos de tus deudas, no las escribas otra
                vez.
              </p>
            )}
          </div>
        ) : (
          <div className="rf-grupo" key="queda">
            <p className="rf-grupo__ayuda">
              Si no sabes en qué gastas, sí sabes qué te queda. Lo que no entra acá, se gastó.
            </p>
            <ul className="rf-filas rf-filas--rejilla" role="list">
              {R.LO_QUE_QUEDA.map((c) => FilaDinero(c))}
            </ul>
          </div>
        )}

        {b.cuotaHipo > 0 && (
          <div className="rf-hipo">
            <label className="rf-hipo__titulo" htmlFor="rf-hipo">
              Cuánto de tu cuota hipotecaria abona a capital
            </label>
            <p className="rf-hipo__texto">
              Una parte de la cuota paga intereses —eso sí es gasto— y la otra abona a capital, que se vuelve patrimonio
              tuyo: esa parte ({R.pesos(b.cuotaHipo * hipoPct)}) cuenta como ahorro. Si conoces tu proporción real,
              ajústala.
            </p>
            {Rango({
              id: 'rf-hipo',
              min: 0,
              max: 100,
              paso: 5,
              valor: Math.round(hipoPct * 100),
              salida: `${Math.round(hipoPct * 100)}%`,
              onCambio: (n) => setHipoPct(n / 100),
            })}
          </div>
        )}

        {BarraFlujo()}
      </>
    );
  }

  /* ---------- piezas de las pantallas ---------- */

  function Grupo(p: {
    titulo: string;
    ayuda: string;
    vacio?: string;
    campos: R.Campo[];
    total: number;
    deuda?: boolean;
    extra?: string;
  }) {
    const marcados = p.campos.filter((c) => abiertos.includes(c.id));
    const idTitulo = `rf-g-${p.campos[0].id}`;
    return (
      <div className="rf-grupo" role="group" aria-labelledby={idTitulo} key={idTitulo}>
        <div className="rf-grupo__cabeza">
          <div>
            <h4 className="rf-grupo__titulo display" id={idTitulo}>
              {p.titulo}
            </h4>
            <p className="rf-grupo__ayuda">{p.ayuda}</p>
          </div>
          <p className={`rf-grupo__total${p.total > 0 ? ' rf-grupo__total--lleno' : ''}`}>
            <strong className="display">{R.pesos(p.total)}</strong>
            {p.extra && <span>{p.extra}</span>}
          </p>
        </div>
        <div className="rf-fichas">
          {p.campos.map((c) => {
            const on = abiertos.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                className="rf-ficha"
                aria-pressed={on}
                onClick={() => alternar(c, on, p.deuda)}
              >
                <span className="rf-ficha__signo" aria-hidden="true" />
                {c.nombre}
              </button>
            );
          })}
        </div>
        {marcados.length > 0 ? (
          <ul className="rf-filas" role="list">
            {marcados.map((c) => (p.deuda ? FilaDeuda(c) : FilaDinero(c)))}
          </ul>
        ) : (
          p.vacio && <p className="rf-grupo__vacio">{p.vacio}</p>
        )}
      </div>
    );
  }

  function FilaDinero(c: R.Campo) {
    return (
      <li className="rf-fila" key={c.id}>
        <label className="rf-fila__nombre" htmlFor={c.id}>
          {c.nombre}
          {c.ayuda && <span className="rf-fila__ayuda">{c.ayuda}</span>}
        </label>
        <CampoDinero
          id={c.id}
          valor={S[c.id] || 0}
          onCambio={(n) => poner(c.id, n)}
          minimo={c.minimo}
          enfocar={recien === c.id}
        />
      </li>
    );
  }

  function FilaDeuda(c: R.Campo) {
    return (
      <li className="rf-fila rf-fila--deuda" key={c.id}>
        <p className="rf-fila__nombre">{c.nombre}</p>
        <div className="rf-fila__par">
          {(
            [
              ['_saldo', 'Saldo', R.MIN_SALDO],
              ['_cuota', 'Cuota mensual', undefined],
            ] as const
          ).map(([sufijo, etiqueta, minimo]) => (
            <div className="rf-fila__mitad" key={sufijo}>
              <label className="rf-fila__sub" htmlFor={c.id + sufijo}>
                <span className="sr-only">{c.nombre}: </span>
                {etiqueta}
              </label>
              <CampoDinero
                id={c.id + sufijo}
                valor={S[c.id + sufijo] || 0}
                onCambio={(n) => poner(c.id + sufijo, n)}
                minimo={minimo}
                enfocar={recien === c.id && sufijo === '_saldo'}
              />
            </div>
          ))}
        </div>
      </li>
    );
  }

  function Rango(p: {
    id: string;
    min: number;
    max: number;
    paso: number;
    valor: number;
    salida: string;
    onCambio: (n: number) => void;
    desactivado?: boolean;
  }) {
    const pct = p.max > p.min ? ((p.valor - p.min) / (p.max - p.min)) * 100 : 0;
    return (
      <div className="rf-rango">
        <input
          id={p.id}
          type="range"
          min={p.min}
          max={p.max}
          step={p.paso}
          value={p.valor}
          disabled={p.desactivado}
          style={{ '--lleno': `${pct}%` } as CSSProperties}
          onChange={(e) => p.onCambio(Number(e.target.value))}
        />
        <output htmlFor={p.id} className="display">
          {p.salida}
        </output>
      </div>
    );
  }

  /* «De cada $100 que te entran»: ritmo de vida y ahorro siempre suman los
     ingresos (ver flujo() en lib/radiografia.ts). */
  function BarraFlujo(compacta = false) {
    if (b.IT <= 0) return null;
    const pAhorro = Math.round(Math.max(0, Math.min(1, f.ahorro / b.IT)) * 100);
    const pGasto = 100 - pAhorro;
    return (
      <div className={`rf-flujo${compacta ? ' rf-flujo--compacta' : ''}`}>
        {!compacta && <p className="rf-flujo__titulo">De cada $100 que te entran</p>}
        <div className="rf-flujo__barra" aria-hidden="true">
          <i className="rf-flujo__gasto" style={{ width: `${pGasto}%` }} />
          <i className="rf-flujo__ahorro" style={{ width: `${pAhorro}%` }} />
        </div>
        {f.ahorro < 0 ? (
          <p className="rf-flujo__leyenda rf-flujo__leyenda--mal">
            <b>Gastas más de lo que te entra:</b> te faltan {R.pesos(-f.ahorro)} al mes.
          </p>
        ) : (
          <p className="rf-flujo__leyenda">
            <span className="rf-punto rf-punto--gasto" aria-hidden="true" />
            <b>${pGasto}</b> se van en tu ritmo de vida
            <span className="rf-punto rf-punto--ahorro" aria-hidden="true" />
            <b>${pAhorro}</b> te quedan
          </p>
        )}
      </div>
    );
  }

  /* ---------- «Tu radiografía», la columna que se arma en vivo ---------- */
  function EnVivo() {
    const c = R.calcular(entrada, R.TASA_BASE);
    const v = R.veredicto(c);
    const bloque = (k: number, etiqueta: string, valor: string, cuerpo: ReactNode) => {
      const listo = alcanzado >= k;
      return (
        <div className={`rf-vivo__bloque${paso === k ? ' rf-vivo__bloque--actual' : ''}${listo ? '' : ' rf-vivo__bloque--espera'}`}>
          <p className="rf-vivo__etiqueta">{etiqueta}</p>
          <p className="rf-vivo__valor display">{listo ? valor : '—'}</p>
          {listo ? cuerpo : <p className="rf-vivo__pista">Lo vemos en el paso {k}.</p>}
        </div>
      );
    };
    const totalBienes = b.AP + b.AI;
    return (
      <aside className="rf-vivo" aria-label="Tu radiografía hasta ahora">
        <p className="rf-vivo__titulo display">{nombre ? `La radiografía de ${nombre}` : 'Tu radiografía'}</p>
        <p className="rf-vivo__sub">Se arma con cada respuesta.</p>

        {bloque(
          2,
          'Te entra al mes',
          R.pesos(b.IT),
          <>
            <div className="rf-mini" aria-hidden="true">
              <i className="rf-mini__a" style={{ width: b.IT > 0 ? `${(b.IA / b.IT) * 100}%` : '0%' }} />
              <i className="rf-mini__b" style={{ width: b.IT > 0 ? `${(b.IP / b.IT) * 100}%` : '0%' }} />
            </div>
            <p className="rf-vivo__nota">
              {b.IT <= 0
                ? 'Todavía nada.'
                : b.IP > 0
                  ? `${R.porcentaje(b.IP / b.IT)} te llega sin trabajar.`
                  : 'Todo depende de tu trabajo.'}
            </p>
          </>,
        )}
        {bloque(
          3,
          'Tu patrimonio',
          R.pesos(b.PN),
          <>
            <div className="rf-mini" aria-hidden="true">
              <i className="rf-mini__b" style={{ width: totalBienes > 0 ? `${(b.AP / totalBienes) * 100}%` : '0%' }} />
              <i className="rf-mini__a" style={{ width: totalBienes > 0 ? `${(b.AI / totalBienes) * 100}%` : '0%' }} />
            </div>
            <p className="rf-vivo__nota">
              {totalBienes > 0
                ? `${R.porcentaje(b.AP / totalBienes)} de lo que tienes te produce.`
                : 'Todavía nada.'}
              {b.deuda > 0 && ` Debes ${R.pesos(b.deuda)}.`}
            </p>
          </>,
        )}
        {bloque(
          4,
          'Tu ritmo de vida',
          `${R.pesos(f.ritmo)}`,
          <>
            {BarraFlujo(true)}
            <p className="rf-vivo__nota">
              {f.ahorro >= 0 ? `Te quedan ${R.pesos(f.ahorro)} al mes.` : 'Gastas más de lo que te entra.'}
            </p>
          </>,
        )}

        <div className="rf-vivo__cifra">
          <p className="rf-vivo__etiqueta">Tu cifra</p>
          <p className="rf-vivo__secreto display" aria-hidden="true">
            {v.anios !== null ? R.decimal(v.anios, 1) : '00,0'}
          </p>
          <p className="rf-vivo__nota">
            {paso === 4 ? 'Un clic más y la ves.' : 'Se revela al final. Años para tu libertad financiera.'}
          </p>
        </div>
      </aside>
    );
  }

  /* ================================ RESULTADO ================================ */
  function Resultado() {
    const c = R.calcular(entrada, rate, lvAhorro, lvMover);
    const v = R.veredicto(c);
    const base0 = R.calcular(entrada, rate);
    const maxAhorro = Math.max(0, Math.round(base0.ritmo * 0.5));
    const maxMover = Math.max(0, b.AI);
    const movido = lvAhorro > 0 || lvMover > 0;
    const d = R.delta(entrada, c, movido);
    const externo = esExterno(AGENDA_URL) ? { target: '_blank', rel: 'noopener' } : {};

    return (
      <div className="rf-resultado">
        {demo && (
          <div className="rf-alerta rf-alerta--demo">
            <span>
              <b>Estás viendo un ejemplo.</b> Estas cifras son inventadas, no son tuyas.
            </span>
            <button type="button" className="btn btn--primario" onClick={empezarDeCero}>
              Hacer la mía
            </button>
          </div>
        )}
        {R.alertas(c).map((t) => (
          <p className="rf-alerta" key={t}>
            <Negritas texto={t} />
          </p>
        ))}

        <section className="rf-placa" aria-labelledby="rf-cifra">
          <div className="rf-placa__cifra">
            <p className="rf-placa__volanta">{nombre && !demo ? `${nombre}, esta es tu cifra` : 'Tu cifra'}</p>
            <h3 className="rf-placa__numero display" id="rf-cifra" ref={titulo} tabIndex={-1}>
              <Contador objetivo={v.anios} texto={v.cifra} />
              <span className="rf-placa__etiqueta">{v.etiqueta}</span>
            </h3>
            {v.detalle && (
              <p className="rf-placa__detalle">
                <Negritas texto={v.detalle} />
              </p>
            )}
            {movido && <p className="rf-placa__simulado">Escenario simulado con las palancas de abajo.</p>}
          </div>

          <div className="rf-placa__panel">
            <h4 className="rf-placa__subtitulo">Panel de indicadores</h4>
            <ul className="rf-indicadores" role="list">
              {R.indicadores(c).map((g) => (
                <li className={`rf-indicador rf-indicador--${g.tono}`} key={g.k}>
                  <div className="rf-indicador__cabeza">
                    <p className="rf-indicador__nombre">
                      {g.nombre}
                      <span>{g.sub}</span>
                    </p>
                    <p className="rf-indicador__valor display">{g.valor}</p>
                  </div>
                  <Medidor lleno={g.lleno} marca={g.marca} />
                  <div className="rf-indicador__pie">
                    <span className="rf-indicador__estado">{R.ESTADO_TONO[g.tono]}</span>
                    <span>{g.ref}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="rf-dupla">
          <section className="rf-caja" aria-labelledby="rf-diag">
            <h4 className="rf-caja__titulo display" id="rf-diag">
              Diagnóstico
            </h4>
            <div className="rf-diagnostico">
              {R.diagnostico(c).map((p) => (
                <p key={p}>
                  <Negritas texto={p} />
                </p>
              ))}
            </div>
          </section>

          <section className="rf-caja rf-palancas" aria-labelledby="rf-si">
            <h4 className="rf-caja__titulo display" id="rf-si">
              ¿Qué pasaría si…?
            </h4>
            <p className="rf-caja__bajada">Muévelas y mira cómo cambia tu cifra. No es una promesa de nada: es aritmética.</p>

            <div className="rf-palanca">
              <label htmlFor="rf-lv-ahorro">Si le bajara a mis gastos, cada mes</label>
              {Rango({
                id: 'rf-lv-ahorro',
                min: 0,
                max: maxAhorro,
                paso: Math.max(1, Math.round(maxAhorro / 100)),
                valor: lvAhorro,
                salida: R.pesos(lvAhorro),
                onCambio: setLvAhorro,
                desactivado: maxAhorro <= 0,
              })}
            </div>
            <div className="rf-palanca">
              <label htmlFor="rf-lv-mover">Si convirtiera activos improductivos en productivos</label>
              {Rango({
                id: 'rf-lv-mover',
                min: 0,
                max: maxMover,
                paso: Math.max(1, Math.round(maxMover / 100)),
                valor: lvMover,
                salida: R.pesos(lvMover),
                onCambio: setLvMover,
                desactivado: maxMover <= 0,
              })}
            </div>
            <div className="rf-palanca" role="group" aria-labelledby="rf-lv-tasa">
              <p id="rf-lv-tasa">Si mis activos rindieran, al año</p>
              <div className="rf-tasas">
                {[3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="rf-ficha rf-ficha--tasa"
                    aria-pressed={Math.round(rate * 100) === t}
                    onClick={() => setRate(t / 100)}
                  >
                    {t}%
                  </button>
                ))}
              </div>
            </div>

            <div className={`rf-delta${d.mejora ? ' rf-delta--mejora' : ''}`} aria-live="polite">
              {(movido || rate !== R.TASA_BASE) && (
                <p className="rf-delta__cifra display">
                  {v.cifra} <span>{v.anios !== null ? (v.anios === 1 ? 'año' : 'años') : ''}</span>
                </p>
              )}
              <p>{d.texto}</p>
              {(movido || rate !== R.TASA_BASE) && (
                <button
                  type="button"
                  className="rf-enlace"
                  onClick={() => {
                    setLvAhorro(0);
                    setLvMover(0);
                    setRate(R.TASA_BASE);
                  }}
                >
                  Volver a mi escenario
                </button>
              )}
            </div>
          </section>
        </div>

        <section className="rf-cierre" aria-labelledby="rf-cierre">
          <div className="rf-cierre__texto">
            <h4 className="display t-h3" id="rf-cierre">
              Si esta cifra te incomodó, <span className="acento">funcionó.</span>
            </h4>
            <p>
              Ninguna de estas tres palancas se mueve sola. Las dos primeras dependen de decisiones tuyas. La tercera depende
              de dónde pongas tu plata, y de que entiendas bien en qué la estás poniendo.
            </p>
            <p className="rf-cierre__cita display">«Yo no necesito que me creas. Necesito que preguntes.»</p>
            <div className="rf-cierre__botones">
              <a className="btn btn--primario" href={AGENDA_URL ?? undefined} {...externo}>
                Agenda tu cita
              </a>
              <a className="btn btn--borde" href={PROYECTOS_URL}>
                Conoce los proyectos
              </a>
            </div>
          </div>

          <div className="rf-cierre__acciones">
            {registro && (
              <p className={`rf-registro rf-registro--${registro}`} role="status">
                {registro === 'guardando'
                  ? 'Guardando tu radiografía…'
                  : registro === 'ok'
                    ? 'Tu radiografía quedó registrada. Si la quieres guardar, descárgala en PDF.'
                    : registro === 'prueba'
                      ? 'Versión de prueba: tu radiografía está completa, pero no se guardó en ningún lado.'
                      : 'No pudimos registrar tu radiografía en este momento. El diagnóstico está completo y puedes descargarlo en PDF.'}
              </p>
            )}
            <button
              type="button"
              className="rf-accion rf-accion--principal"
              disabled={ocupado !== null}
              onClick={descargarPDF}
            >
              {ocupado === 'pdf' ? 'Preparando…' : 'Descargar mi PDF'}
            </button>
            {puedeCompartir && (
              <button type="button" className="rf-accion" disabled={ocupado !== null} onClick={compartir}>
                {ocupado === 'compartir' ? 'Preparando…' : 'Compartir'}
              </button>
            )}
            <button type="button" className="rf-accion" onClick={() => copiar(R.resumen(c))}>
              Copiar como texto
            </button>
            <button
              type="button"
              className="rf-accion rf-accion--tenue"
              onClick={() => {
                empezarDeCero();
              }}
            >
              Volver a empezar
            </button>
          </div>
        </section>

        <p className="rf-letra">
          <b>Los supuestos, sin letra menuda:</b> tus activos productivos rinden la tasa que elegiste, todos los años, y
          reinviertes lo que ahorras. La parte de tu cuota hipotecaria que abona a capital no cuenta como gasto sino como
          ahorro, porque esa parte se vuelve tuya. Esto es una herramienta educativa, no una asesoría financiera ni una oferta
          de inversión.{' '}
          {MODO_PRUEBA
            ? 'Versión de prueba: nada de lo que escribiste salió de este navegador.'
            : 'Tus datos los trata Elexa Real Estate S.A.S. para el fin que autorizaste; escríbenos y los eliminamos.'}{' '}
          {CFG.autoguardar &&
            'Mientras llenas, tus respuestas quedan guardadas solo en este navegador para que no las pierdas; «Volver a empezar» las borra.'}
        </p>
      </div>
    );

    function datosPDF() {
      return { nombre: demo ? 'Ejemplo' : contacto.nombre, edad: S.edad || 0, c, hipoPct, lvAhorro, lvMover };
    }

    function descargarPDF() {
      setOcupado('pdf');
      construirPDF(datosPDF())
        .then((doc) => {
          doc.save(nombreArchivo(contacto.nombre));
          avisar('PDF descargado');
        })
        .catch((e) => {
          console.warn('[radiografia] PDF:', e);
          avisar('Te abro la impresión para guardarlo');
          window.setTimeout(imprimir, 600);
        })
        .finally(() => setOcupado(null));
    }

    /* Compartir nativo: en el celular vale mucho más que copiar. Intenta ir
       con el PDF adjunto y, si el dispositivo no sabe compartir archivos,
       manda el resumen en texto. */
    function compartir() {
      const texto = () =>
        navigator.share({ title: 'Mi radiografía financiera', text: R.resumen(c) }).catch(() => undefined);
      setOcupado('compartir');
      construirPDF(datosPDF())
        .then((doc) => {
          let archivo: File;
          try {
            archivo = new File([doc.output('blob')], nombreArchivo(contacto.nombre), { type: 'application/pdf' });
          } catch {
            return texto();
          }
          if (!navigator.canShare?.({ files: [archivo] })) return texto();
          return navigator.share({ files: [archivo], title: 'Mi radiografía financiera' }).catch((err) => {
            if (err?.name !== 'AbortError') return texto();
          });
        })
        .catch(() => texto())
        .finally(() => setOcupado(null));
    }
  }

  function copiar(texto: string) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(texto).then(
        () => avisar('Resultado copiado'),
        () => window.prompt('Copia tu resultado:', texto),
      );
    } else {
      window.prompt('Copia tu resultado:', texto);
    }
  }
}

/* Si jsPDF no se puede bajar, queda imprimir: radiografia.css esconde el
   resto de la página mientras dura. */
function imprimir() {
  const html = document.documentElement;
  html.classList.add('rf-imprimiendo');
  const fin = () => {
    html.classList.remove('rf-imprimiendo');
    window.removeEventListener('afterprint', fin);
  };
  window.addEventListener('afterprint', fin);
  window.print();
}

/* La cifra grande: la primera vez cuenta desde cero; después (al mover las
   palancas) cambia sin animación. */
function Contador({ objetivo, texto }: { objetivo: number | null; texto: string }) {
  const [mostrado, setMostrado] = useState<number | null>(objetivo === null || menosMovimiento() ? objetivo : 0);
  const animado = useRef(false);

  useEffect(() => {
    if (objetivo === null) {
      setMostrado(null);
      return;
    }
    if (animado.current || menosMovimiento()) {
      setMostrado(objetivo);
      return;
    }
    animado.current = true;
    const t0 = performance.now();
    const dura = 1200;
    let raf = 0;
    const cuadro = (t: number) => {
      const k = Math.min(1, (t - t0) / dura);
      setMostrado(objetivo * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(cuadro);
    };
    raf = requestAnimationFrame(cuadro);
    return () => {
      cancelAnimationFrame(raf);
      setMostrado(objetivo);
    };
  }, [objetivo]);

  const largo = objetivo === null && texto.length > 4;
  return (
    <span className={`rf-placa__valor${largo ? ' rf-placa__valor--texto' : ''}`}>
      {mostrado === null ? texto : R.decimal(mostrado, 1)}
    </span>
  );
}

/* Barra de un indicador: se llena al aparecer. La línea es el objetivo. */
function Medidor({ lleno, marca }: { lleno: number; marca: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="rf-medidor" aria-hidden="true">
      <i style={{ width: `${visible ? Math.max(0, Math.min(100, lleno)) : 0}%` }} />
      <u style={{ left: `calc(${marca}% - 1px)` }} />
    </div>
  );
}
