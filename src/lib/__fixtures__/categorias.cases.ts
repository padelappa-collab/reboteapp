/**
 * Casos límite de categoría y estrellas, con su resultado esperado.
 *
 * Esta tabla es la fuente de verdad compartida por dos suites:
 *
 *   categories.test.ts      -> compara contra la implementación TypeScript
 *   categories.sql.test.ts  -> compara contra las funciones SQL por RPC
 *
 * El objetivo es que cambiar una constante (el salto de 350, el colchón de 75,
 * los tercios de estrella) en un solo lado rompa visiblemente al menos un test:
 * si se cambia solo el TS falla el primero, si se cambia solo el SQL falla el
 * segundo, y si se cambian TS y fixture pero no el SQL falla el segundo.
 */

import type { Categoria, Ranking } from '../categories'

export interface CasoCategoria {
  descripcion: string
  elo: number
  ranking: Ranking
  peak: number
  categoria: Categoria
  estrellas: 1 | 2 | 3
}

export const CASOS_CATEGORIA: CasoCategoria[] = [
  // ---------------------------------------------------------- cruces de umbral
  {
    descripcion: 'cruza justo el umbral de 3ra',
    elo: 2100, ranking: 'masculino', peak: 2100, categoria: '3ra', estrellas: 1,
  },
  {
    descripcion: 'un punto por debajo del umbral de 3ra',
    elo: 2099, ranking: 'masculino', peak: 2099, categoria: '4ta', estrellas: 3,
  },
  {
    descripcion: 'cruza justo el umbral de 4ta',
    elo: 1750, ranking: 'masculino', peak: 1750, categoria: '4ta', estrellas: 1,
  },
  {
    descripcion: 'un punto por debajo del umbral de 4ta',
    elo: 1749, ranking: 'masculino', peak: 1749, categoria: '5ta', estrellas: 3,
  },

  // ------------------------------------------------- histéresis (colchón de 75)
  {
    descripcion: 'entró a 3ra y cae 74 puntos: sigue en 3ra',
    elo: 2026, ranking: 'masculino', peak: 2100, categoria: '3ra', estrellas: 1,
  },
  {
    descripcion: 'entró a 3ra y cae exactamente 75: sigue en 3ra',
    elo: 2025, ranking: 'masculino', peak: 2100, categoria: '3ra', estrellas: 1,
  },
  {
    descripcion: 'entró a 3ra y cae 76 puntos: baja a 4ta',
    elo: 2024, ranking: 'masculino', peak: 2100, categoria: '4ta', estrellas: 3,
  },
  {
    descripcion: 'nunca pisó 3ra: el colchón no lo alcanza',
    elo: 2030, ranking: 'masculino', peak: 2030, categoria: '4ta', estrellas: 3,
  },
  {
    descripcion: 'venía de 2da y cae dos categorías completas',
    elo: 2030, ranking: 'masculino', peak: 2450, categoria: '3ra', estrellas: 1,
  },

  // ------------------------------------------------- bordes de tercio (estrellas)
  {
    descripcion: 'inicio de 7ma, primera estrella',
    elo: 700, ranking: 'masculino', peak: 700, categoria: '7ma', estrellas: 1,
  },
  {
    descripcion: 'último punto del primer tercio',
    elo: 816, ranking: 'masculino', peak: 816, categoria: '7ma', estrellas: 1,
  },
  {
    descripcion: 'primer punto del segundo tercio',
    elo: 817, ranking: 'masculino', peak: 817, categoria: '7ma', estrellas: 2,
  },
  {
    descripcion: 'último punto del segundo tercio',
    elo: 933, ranking: 'masculino', peak: 933, categoria: '7ma', estrellas: 2,
  },
  {
    descripcion: 'primer punto del tercer tercio',
    elo: 934, ranking: 'masculino', peak: 934, categoria: '7ma', estrellas: 3,
  },
  {
    descripcion: 'último punto de la categoría',
    elo: 1049, ranking: 'masculino', peak: 1049, categoria: '7ma', estrellas: 3,
  },
  {
    descripcion: 'la histéresis deja el ELO bajo el umbral: una estrella',
    elo: 2030, ranking: 'masculino', peak: 2100, categoria: '3ra', estrellas: 1,
  },

  // ------------------------------------------------------- bordes de la escala
  {
    descripcion: 'por debajo del ELO base no baja de la categoría más baja',
    elo: 400, ranking: 'masculino', peak: 700, categoria: '7ma', estrellas: 1,
  },
  {
    descripcion: 'por encima de 1ra no hay más categoría',
    elo: 3500, ranking: 'masculino', peak: 3500, categoria: '1ra', estrellas: 3,
  },
  {
    descripcion: 'el tope femenino es A',
    elo: 3000, ranking: 'femenino', peak: 3000, categoria: 'A', estrellas: 3,
  },

  // ------------------------------------------------------------ escala femenina
  {
    descripcion: 'inicio de la escala femenina',
    elo: 700, ranking: 'femenino', peak: 700, categoria: 'D', estrellas: 1,
  },
  {
    descripcion: 'categoría B femenina',
    elo: 1400, ranking: 'femenino', peak: 1400, categoria: 'B', estrellas: 1,
  },
  {
    descripcion: 'categoría A femenina',
    elo: 1750, ranking: 'femenino', peak: 1750, categoria: 'A', estrellas: 1,
  },

  // ------------------------------------- el mixto usa los cortes masculinos
  {
    descripcion: 'una jugadora B ve 5ta en el ranking mixto',
    elo: 1400, ranking: 'mixto', peak: 1400, categoria: '5ta', estrellas: 1,
  },
  {
    descripcion: 'el mixto llega hasta 1ra, no se corta en el tope femenino',
    elo: 2800, ranking: 'mixto', peak: 2800, categoria: '1ra', estrellas: 1,
  },
  {
    descripcion: 'el mixto también aplica histéresis',
    elo: 2025, ranking: 'mixto', peak: 2100, categoria: '3ra', estrellas: 1,
  },

  // ------------------------------------------------------- valores de control
  {
    descripcion: 'control 999',
    elo: 999, ranking: 'masculino', peak: 999, categoria: '7ma', estrellas: 3,
  },
  {
    descripcion: 'control 1234',
    elo: 1234, ranking: 'masculino', peak: 1234, categoria: '6ta', estrellas: 2,
  },
  {
    descripcion: 'control 1234 en femenino',
    elo: 1234, ranking: 'femenino', peak: 1234, categoria: 'C', estrellas: 2,
  },
  {
    descripcion: 'control 1876',
    elo: 1876, ranking: 'masculino', peak: 1876, categoria: '4ta', estrellas: 2,
  },
  {
    descripcion: 'control 1876 en mixto',
    elo: 1876, ranking: 'mixto', peak: 1876, categoria: '4ta', estrellas: 2,
  },
  {
    descripcion: 'control 2222',
    elo: 2222, ranking: 'masculino', peak: 2222, categoria: '3ra', estrellas: 2,
  },
  {
    descripcion: 'control 2456',
    elo: 2456, ranking: 'masculino', peak: 2456, categoria: '2da', estrellas: 1,
  },
]
