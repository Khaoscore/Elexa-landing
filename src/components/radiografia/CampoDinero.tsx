/* Un campo de plata de la radiografía: «$ 3.500.000» mientras se escribe,
   con la cifra leída en palabras debajo («3,5 millones») y, si la tiene, el
   aviso de ceros de menos.

   El formateo es el de la radiografía de Florentino, que ya resolvió los
   tropiezos de escribir plata en el celular:
   · el cursor no salta al final: se recoloca contando dígitos;
   · escribir «0» no borra el campo;
   · el value solo se reescribe si cambió, que es lo que evita que los
     teclados de Android se coman caracteres;
   · borrar hacia atrás sobre un punto de miles borra también el dígito de
     atrás (si no, el primer toque parecía no hacer nada).
   Por eso el <input> no es controlado por React: lo maneja este archivo y
   avisa el número con `onCambio`. Si el valor cambia desde afuera (retomar,
   ejemplo, volver a empezar), el efecto lo sincroniza.

   Enter salta al siguiente campo de plata visible de la radiografía. */
import { useEffect, useRef, type KeyboardEvent } from 'react';
import { aNumero, enPalabras, fmt, pesos, soloDigitos, MIN_INMUEBLE } from '../../lib/radiografia';

type Props = {
  id: string;
  valor: number;
  onCambio: (n: number) => void;
  /** Piso de cordura: por debajo, aviso de ceros de menos. */
  minimo?: number;
  /** Id del texto que nombra al campo cuando no hay <label for>. */
  etiquetadoPor?: string;
  enfocar?: boolean;
};

function formatearEnVivo(input: HTMLInputElement): number {
  const raw = soloDigitos(input.value);
  const n = raw === '' ? 0 : parseInt(raw, 10);
  const texto = raw === '' ? '' : fmt.format(n);
  if (texto !== input.value) {
    const pos = input.selectionStart;
    const digitosAntes = pos === null ? raw.length : soloDigitos(input.value.slice(0, pos)).length;
    input.value = texto;
    let i = 0;
    let vistos = 0;
    while (i < texto.length && vistos < digitosAntes) {
      const cc = texto.charCodeAt(i);
      if (cc >= 48 && cc <= 57) vistos++;
      i++;
    }
    try {
      input.setSelectionRange(i, i);
    } catch {
      /* algunos tipos de input no dejan */
    }
  }
  return n;
}

function siguienteConEnter(e: KeyboardEvent<HTMLInputElement>) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const raiz = e.currentTarget.closest('.rf');
  const campos = raiz ? Array.from(raiz.querySelectorAll<HTMLInputElement>('input[data-dinero]')) : [];
  const k = campos.indexOf(e.currentTarget);
  for (let j = k + 1; j < campos.length; j++) {
    if (campos[j].offsetParent !== null) {
      campos[j].focus();
      return;
    }
  }
  e.currentTarget.blur();
}

export default function CampoDinero({ id, valor, onCambio, minimo, etiquetadoPor, enfocar }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const avisar = useRef(onCambio);
  avisar.current = onCambio;

  useEffect(() => {
    const el = ref.current;
    if (el && aNumero(el.value) !== valor) el.value = valor ? fmt.format(valor) : '';
  }, [valor]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (enfocar) el.focus({ preventScroll: true });
    function antesDeEscribir(e: InputEvent) {
      if (!el || e.inputType !== 'deleteContentBackward') return;
      const st = el.selectionStart;
      if (st === null || st !== el.selectionEnd || st < 2) return;
      const prev = el.value.charCodeAt(st - 1);
      if (prev >= 48 && prev <= 57) return; // hay un dígito detrás: borrado normal
      e.preventDefault();
      el.value = el.value.slice(0, st - 2) + el.value.slice(st);
      try {
        el.setSelectionRange(st - 2, st - 2);
      } catch {
        /* nada */
      }
      avisar.current(formatearEnVivo(el));
    }
    el.addEventListener('beforeinput', antesDeEscribir);
    return () => el.removeEventListener('beforeinput', antesDeEscribir);
  }, []);

  const palabras = enPalabras(valor);
  const sospechoso = minimo !== undefined && valor > 0 && valor < minimo;
  const aviso = `${id}-aviso`;

  return (
    <div className="rf-dinero">
      <div className="rf-dinero__caja">
        <span className="rf-dinero__signo" aria-hidden="true">
          $
        </span>
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          placeholder="0"
          autoComplete="off"
          enterKeyHint="next"
          data-dinero=""
          aria-labelledby={etiquetadoPor}
          aria-describedby={sospechoso ? aviso : undefined}
          defaultValue={valor ? fmt.format(valor) : ''}
          onInput={(e) => onCambio(formatearEnVivo(e.currentTarget))}
          onKeyDown={siguienteConEnter}
        />
      </div>
      {sospechoso ? (
        <p className="rf-dinero__aviso" id={aviso}>
          {minimo === MIN_INMUEBLE ? (
            <>
              ¿Seguro? Un inmueble por menos de <b>{pesos(minimo)}</b> casi siempre es un error de ceros.
            </>
          ) : (
            <>
              ¿Seguro? Van pesos completos: un millón se escribe <b>1.000.000</b>.
            </>
          )}
        </p>
      ) : (
        <p className="rf-dinero__palabras" aria-hidden="true">
          {palabras}
        </p>
      )}
    </div>
  );
}
