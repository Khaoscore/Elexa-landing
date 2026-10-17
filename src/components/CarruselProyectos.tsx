/* La fila de tarjetas de «Proyectos abiertos». Recibe los proyectos ya leídos
   de Supabase (ProyectosAbiertos.astro) y arma la variante que corresponde:

   · 1 proyecto  → una tarjeta ancha que ocupa toda la fila;
   · 2 proyectos → dos tarjetas lado a lado, sin flechas;
   · 3 o más     → carrusel: las tarjetas siguen hacia la derecha hasta el
     borde del panel y dos botones redondos de 74 a los costados las corren
     de a una. La flecha que no tiene a dónde ir se pinta gris (neutral/300)
     y queda deshabilitada, como la de la izquierda en el diseño.

   El desplazamiento es el scroll nativo de la pista con scroll-snap, así que
   en el teléfono se arrastra con el dedo y sin JavaScript también funciona.
   Las flechas aparecen sólo si la pista de verdad desborda: en una pantalla
   angosta dos tarjetas ya no entran y también se vuelven carrusel. */
import { useEffect, useId, useRef, useState } from 'react';
import type { Proyecto } from '../lib/proyectos';
import TarjetaProyecto from './TarjetaProyecto';
import './proyectos.css';

type Props = { proyectos: Proyecto[] };

/* Margen para no quedar a un píxel del final por redondeo del scroll. */
const TOLERANCIA = 2;

export default function CarruselProyectos({ proyectos }: Props) {
  const pistaId = useId();
  const pista = useRef<HTMLUListElement>(null);
  const ancha = proyectos.length === 1;

  /* Antes de medir (en el HTML del servidor) se asume lo que muestra el
     diseño: con 3 o más se puede avanzar y no retroceder. */
  const [puede, setPuede] = useState({ atras: false, adelante: proyectos.length > 2 });

  useEffect(() => {
    const el = pista.current;
    if (!el || ancha) return;

    const medir = () => {
      const fin = el.scrollWidth - el.clientWidth;
      setPuede({ atras: el.scrollLeft > TOLERANCIA, adelante: el.scrollLeft < fin - TOLERANCIA });
    };

    medir();
    el.addEventListener('scroll', medir, { passive: true });
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    return () => {
      el.removeEventListener('scroll', medir);
      observador.disconnect();
    };
  }, [ancha]);

  /* Corre la pista exactamente una tarjeta (su ancho más el espacio entre
     tarjetas); el scroll-snap la deja alineada. */
  const mover = (sentido: 1 | -1) => {
    const el = pista.current;
    const tarjeta = el?.firstElementChild;
    if (!el || !tarjeta) return;
    const espacio = parseFloat(getComputedStyle(el).columnGap) || 0;
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: sentido * (tarjeta.getBoundingClientRect().width + espacio),
      behavior: quieto ? 'auto' : 'smooth',
    });
  };

  const conFlechas = puede.atras || puede.adelante;

  return (
    <div className={ancha ? 'carrusel carrusel--uno' : 'carrusel'}>
      <ul ref={pista} id={pistaId} className="carrusel__pista" role="list">
        {proyectos.map((proyecto) => (
          <li key={proyecto.id} className="carrusel__item">
            <TarjetaProyecto proyecto={proyecto} ancha={ancha} />
          </li>
        ))}
      </ul>

      {conFlechas && (
        <>
          <Flecha sentido="atras" activa={puede.atras} controla={pistaId} onClick={() => mover(-1)} />
          <Flecha sentido="adelante" activa={puede.adelante} controla={pistaId} onClick={() => mover(1)} />
        </>
      )}
    </div>
  );
}

type FlechaProps = {
  sentido: 'atras' | 'adelante';
  activa: boolean;
  controla: string;
  onClick: () => void;
};

/* «arrow_forward_ios» sobre un círculo de 74. El archivo trae dos íconos: el
   blanco para el botón morado (activo) y el gris claro para el gris
   (inactivo). La de atrás es la misma flecha girada. */
function Flecha({ sentido, activa, controla, onClick }: FlechaProps) {
  return (
    <button
      type="button"
      className={`carrusel__flecha carrusel__flecha--${sentido}`}
      aria-label={sentido === 'atras' ? 'Proyecto anterior' : 'Proyecto siguiente'}
      aria-controls={controla}
      disabled={!activa}
      onClick={onClick}
    >
      <img
        src={activa ? '/img/iconos/flecha-activa.svg' : '/img/iconos/flecha-inactiva.svg'}
        alt=""
        width="40"
        height="40"
      />
    </button>
  );
}
