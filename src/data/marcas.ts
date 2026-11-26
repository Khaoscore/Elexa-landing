/* Los proyectos con marca propia: en el mapa de /proyectos su pin y su
   tarjeta llevan sus colores y su símbolo en lugar de los de Elexa (ver
   MapaProyectos.tsx).

   Cada uno se reconoce por el nombre en la hoja «Propiedades Elexa», con la
   misma regla que «Proyecto abierto»: igual sin contar mayúsculas ni
   tildes, o igual y algo más después («Florentino II» también es
   Florentino).

   · pin    el del mapa, con la forma del de Elexa (85 × 110.6): anillo,
            círculo de color y el símbolo encima.
   · sello  el mismo pin sin la punta (85 × 85): va sobre la foto de la
            tarjeta.
   · colores, de su landing:
     principal  el nombre, el botón y la etiqueta «Proyecto abierto»;
     hover      el botón con el mouse encima;
     oscuro     el fondo de la tarjeta del proyecto elegido;
     sobre      el texto encima de `principal`.

   Karanis no tiene marca propia (su sala usa los colores de Elexa): para
   sumarla, o la de otro proyecto, se agrega acá con su pin y su sello en
   public/img/mapa/marcas/. */

export type Marca = {
  pin: string;
  sello: string;
  principal: string;
  hover: string;
  oscuro: string;
  sobre: string;
};

export const marcas: { nombre: string; marca: Marca }[] = [
  /* Proyecto e (repo Proyectoe-main): el pin es el de su landing, tal
     cual. brand/300, brand/400, brand/500 y blanco. */
  {
    nombre: 'Proyecto E',
    marca: {
      pin: '/img/mapa/marcas/proyecto-e-pin.svg',
      sello: '/img/mapa/marcas/proyecto-e-sello.svg',
      principal: '#115e67',
      hover: '#0e4b52',
      oscuro: '#0a383e',
      sobre: '#ffffff',
    },
  },
  /* Florentino (repo Floren-main): su landing no tiene pin; éste repite la
     forma del de Proyecto e con «Identidad hecha un día a la vez/3»
     (#330400) en el anillo, «Atardecer envolvente/3» (#f70065) en el
     círculo y el isotipo (Capa_1.svg) en «Brisa que acaricia/1». */
  {
    nombre: 'Florentino',
    marca: {
      pin: '/img/mapa/marcas/florentino-pin.svg',
      sello: '/img/mapa/marcas/florentino-sello.svg',
      principal: '#f70065',
      hover: '#9d0040',
      oscuro: '#330400',
      sobre: '#fffaf9',
    },
  },
];
