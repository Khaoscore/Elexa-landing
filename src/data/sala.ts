/* Configuración de la sala del evento virtual de Karanis (/sala) y de su
   panel de control (/panel). Es el único archivo que hay que tocar: video,
   endpoint, fechas, destinos de los botones, el enlace que el presentador
   muestra y las preguntas de los ejercicios. Las dos páginas lo reciben en el
   build (`define:vars`), así que un cambio acá sale con el próximo despliegue.

   La sala viene de la de Florentino (misma lógica, mismo panel, mismo Apps
   Script); acá cambian los textos, los colores y los datos del evento.

   ⚠️ Antes de publicar el evento, completar lo que está marcado «POR
   CONFIRMAR»: fecha, video de YouTube, Calendly de Karanis y ENDPOINT. */

import { SITE_URL, WHATSAPP_URL } from './site';

/* Dirección pública de la sala. Va en el evento de Google Calendar («Entra a
   la sala…»). */
const SALA_URL = `${SITE_URL}/sala`;

/* Destinos de los botones y redes.

   POR CONFIRMAR: el Calendly de Karanis. Mientras no exista, «Quiero agendar
   mi cita» abre el WhatsApp de Elexa, igual que «Agenda tu cita» en el resto
   del sitio (AGENDA_URL en site.ts).

   La pasarela es la de inversionistas de Elexa que usaba Florentino:
   confirmar que es la misma para separar cupo en Karanis. */
const EVENT_URL = WHATSAPP_URL;
const CUPO_URL = 'https://micrositios.avalpaycenter.com/elexa-inversionistas-ma';
export const INSTAGRAM_URL = 'https://www.instagram.com/elexa_real_estate/';
export const KHAOS_URL = 'https://www.khaoscore.com/';

/* Avisos legales del pie y de la nota del formulario de entrada: los del
   propio sitio (src/data/legal/). */
export const PRIVACIDAD_URL = '/politica-de-privacidad';
export const legalPages = [
  { href: '/tratamiento-de-datos', label: 'Tratamiento de datos' },
  { href: PRIVACIDAD_URL, label: 'Política de privacidad' },
  { href: '/terminos-y-condiciones', label: 'Términos y condiciones' },
];

export const SALA_CONFIG = {
  /* POR CONFIRMAR. Video de YouTube: acepta la URL completa (watch, live,
     youtu.be) o sólo el ID. Para el evento real, el link del directo: video
     NO LISTADO y con «Permitir insertar» activado. Vacío, la sala muestra
     «Aún no hay video configurado». */
  YOUTUBE: '',

  /* URL del Web App de Google Apps Script (termina en /exec). Vacío = MODO
     LOCAL de prueba: el panel controla la sala dentro del mismo navegador y
     nada se envía a Google.

     POR CONFIRMAR. Karanis necesita su propia hoja: crearla con
     apps-script/Code.gs (los pasos están al principio de ese archivo) y pegar
     acá su URL. No usar la URL de la sala de Florentino: escribiría en su
     hoja y este panel prendería y apagaría cosas también en esa sala. */
  ENDPOINT: '',

  /* Nombre del webinar: el antetítulo de la sala (va en mayúsculas por CSS),
     el título de la pestaña y el del evento de Google Calendar. */
  EVENTO_NOMBRE: 'Lanzamiento virtual',

  /* POR CONFIRMAR. Fecha y hora de cada transmisión (hora Colombia, UTC-5).
     Si hay más de un día se agregan a la lista y la cuenta regresiva apunta a
     la próxima. FECHA_TEXTO tiene que decir lo mismo. */
  EVENTOS: ['2026-11-17T19:00:00-05:00'],
  DURACION_MIN: 90,
  FECHA_TEXTO: 'Martes 17 de noviembre · 7:00 p.m. (hora Colombia)',

  /* URL pública de la sala, la que va en el evento de Google Calendar.
     Google no avisa quién guarda el evento: lo que se registra es quién pulsa
     «Agregar a Google Calendar» (pestaña Calendario de la hoja). Por eso, en
     la pantalla de entrada el botón pide primero nombre, celular y correo. */
  SALA_URL,

  /* Destinos de los botones de cierre. */
  CALENDLY_URL: EVENT_URL,
  PAGO_URL: CUPO_URL,
  /* Vacío: «Quiero el dossier completo» abre un formulario de un solo campo
     (correo) dentro de la sala. */
  DOSSIER_URL: '',
  WHATSAPP_URL,

  /* Enlace que el presentador muestra u oculta desde el panel durante la
     transmisión (un grupo, un formulario, una descarga…). La dirección se
     define acá; el panel sólo decide cuándo se ve. Si `url` queda vacío, el
     panel avisa y en la sala no aparece nada.

     Apunta a la radiografía financiera, que vive en la portada del sitio
     (sección «Libertad», #radiografia). Para dejar la tarjeta apagada,
     `url: ''`. */
  ENLACE: {
    titulo: 'Completa tu radiografía financiera',
    descripcion:
      'Este artefacto te ayudará a entender mejor las implicaciones financieras de tus inversiones.',
    url: `${SITE_URL}/#radiografia`,
    boton: 'Abrir enlace',
  },

  /* Botones de cierre. Desde el panel se muestra u oculta cada uno por
     separado. El `id` es lo que queda en la hoja (accion_final / acciones_log):
     el Apps Script sólo acepta separo, agendo y dossier. */
  CTAS: [
    { id: 'separo', titulo: 'Separo mi cupo', destino: 'Pasarela de pago' },
    { id: 'agendo', titulo: 'Quiero agendar mi cita', destino: 'Calendly' },
    { id: 'dossier', titulo: 'Quiero el dossier completo', destino: 'Formulario de correo' },
  ],

  /* Frecuencias en segundos. PING: la señal de «sigo aquí». ESTADO: consulta
     del estado que fija el panel. Con más de 800 personas, subir ESTADO a 20. */
  PING_SEG: 60,
  ESTADO_SEG: 12,

  /* Ejercicios interactivos.

     `campo` es la columna en la hoja: si cambia, la columna nueva se crea sola
     (conviene sumarla también a COLUMNAS en apps-script/Code.gs). Sólo admite
     minúsculas sin tildes, números y guion bajo (e1_decision, no
     e1_decisión): el Apps Script rechaza cualquier otra cosa y esa respuesta no
     se guardaría. `tipo`: "opciones" (una sola respuesta) o "texto" (campo
     libre), siempre al nivel del ejercicio y nunca dentro de `opciones`, donde
     sólo van textos.

     `otro: true` agrega al final la opción «Otro», que abre un campo corto
     para precisar y se guarda como «Otro: lo que escribió». Se puede
     personalizar con `otro: 'Ninguna de estas'`, `otro_max` y
     `otro_placeholder`. */
  EJERCICIOS: [
    {
      id: 1,
      campo: 'e1_decision',
      titulo: '¿Hay algo que no explique bien o quieras profundizar?',
      tipo: 'opciones',
      otro: true,
      otro_max: 50,
      otro_placeholder: '¿Otro?',
      opciones: [
        'Nada, ya todo me quedó claro',
        'Los contratos con las marcas ancla',
        'Cómo funcionan las cuentas en participación',
        'Definir el monto y la forma de pago',
        'Quiero hablar con alguien del equipo',
      ],
    },
  ],
};
