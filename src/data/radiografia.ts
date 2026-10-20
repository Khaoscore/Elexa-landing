/* Configuración de la radiografía financiera que vive dentro de la sección
   «¿Qué tan lejos estás de tu libertad financiera?» (Libertad.astro).

   Es la misma configuración de florentino.elexa.com.co/radiografia: los
   datos van al mismo Apps Script y caen en la misma hoja («Radiografías»).
   Para distinguir las que se hacen acá, cada envío lleva además `sitio` y
   `pagina` (ver src/lib/radiografia.ts). */

export const RADIOGRAFIA_CONFIG = {
  /* URL del Web App de Google Apps Script que recibe los datos (termina en
     /exec). El script está en «Radiografia Financiera/apps-script.gs», fuera
     de este repo. */
  endpoint:
    'https://script.google.com/macros/s/AKfycbzCXLShNh-wPmHv-nvtGTghHz150MuHXlnklcOFoE-iicO-mYvDH0I0rDErMrDgIHan/exec',

  /* true = también se envía desde `npm run dev`. Esas filas llegan a la hoja
     con «localhost» en la columna `sitio`, así que se distinguen de las
     reales y se pueden borrar. En false, en local no sale nada y la pantalla
     dice «versión de prueba». En el preview de Vercel y en producción se
     envía siempre. */
  enviarEnDesarrollo: true,

  /* Política de tratamiento de datos. Elexa todavía no tiene la suya
     publicada (ver `legalLinks` en site.ts), así que se usa la de
     Florentino, que es de la misma empresa. */
  politica: 'https://florentino.elexa.com.co/politica-de-privacidad',

  /* true = mientras la persona llena, sus respuestas quedan en su propio
     navegador (localStorage) para que no las pierda si se cierra la pestaña.
     No sale nada a la red. */
  autoguardar: true,
};
