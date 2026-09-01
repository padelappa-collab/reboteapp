/**
 * Casos de cambio de ELO con su resultado esperado.
 *
 * Igual que con las categorías, esta tabla la consumen dos suites:
 *
 *   elo.test.ts      -> contra la implementación TypeScript
 *   elo.sql.test.ts  -> contra la función SQL `delta_elo` por RPC
 *
 * Así, cambiar un K o el redondeo en un solo lado rompe al menos un test.
 */

export interface CasoElo {
  descripcion: string
  /** Promedio de ELO de la pareja del jugador. */
  eloPareja: number
  /** Promedio de ELO de la pareja rival. */
  eloRival: number
  gano: boolean
  /** Partidos jugados por ESE jugador, que determinan su K. */
  partidos: number
  delta: number
}

export const CASOS_ELO: CasoElo[] = [
  // ------------------------------------------------------------ partido parejo
  { descripcion: 'parejo, gana', eloPareja: 1400, eloRival: 1400, gano: true, partidos: 20, delta: 15 },
  { descripcion: 'parejo, pierde', eloPareja: 1400, eloRival: 1400, gano: false, partidos: 20, delta: -15 },

  // -------------------------------------------------- favorito y no favorito
  { descripcion: 'favorito claro gana: casi nada', eloPareja: 2100, eloRival: 1400, gano: true, partidos: 20, delta: 1 },
  { descripcion: 'favorito claro pierde: castigo grande', eloPareja: 2100, eloRival: 1400, gano: false, partidos: 20, delta: -29 },
  { descripcion: 'no favorito gana: premio grande', eloPareja: 1400, eloRival: 2100, gano: true, partidos: 5, delta: 44 },
  { descripcion: 'no favorito pierde: casi nada', eloPareja: 1400, eloRival: 2100, gano: false, partidos: 5, delta: -1 },

  // ------------------------------------------------------- extremos de escala
  { descripcion: '7ma gana a 1ra en calibración', eloPareja: 700, eloRival: 2800, gano: true, partidos: 0, delta: 45 },
  { descripcion: '7ma pierde con 1ra: no pierde nada', eloPareja: 700, eloRival: 2800, gano: false, partidos: 0, delta: 0 },
  { descripcion: '1ra gana a 7ma: no gana nada', eloPareja: 2800, eloRival: 700, gano: true, partidos: 100, delta: 0 },
  { descripcion: '1ra pierde con 7ma: castigo completo', eloPareja: 2800, eloRival: 700, gano: false, partidos: 100, delta: -20 },

  // --------------------------------------------------- media categoría arriba
  { descripcion: 'media categoría de favorito, gana', eloPareja: 1750, eloRival: 1400, gano: true, partidos: 40, delta: 2 },
  { descripcion: 'media categoría de favorito, pierde', eloPareja: 1750, eloRival: 1400, gano: false, partidos: 40, delta: -18 },
  { descripcion: 'una categoría por debajo, gana', eloPareja: 1400, eloRival: 1750, gano: true, partidos: 10, delta: 26 },
  { descripcion: 'ligeramente por debajo, pierde', eloPareja: 1225, eloRival: 1400, gano: false, partidos: 9, delta: -12 },
  { descripcion: 'ligera ventaja, gana', eloPareja: 1575, eloRival: 1400, gano: true, partidos: 25, delta: 8 },
  { descripcion: 'dos categorías por debajo, pierde', eloPareja: 1050, eloRival: 1750, gano: false, partidos: 3, delta: -1 },

  // ------------------------------------------------------- bordes del K-factor
  { descripcion: 'último partido con K de calibración', eloPareja: 1400, eloRival: 1400, gano: true, partidos: 9, delta: 23 },
  { descripcion: 'primer partido con K intermedio', eloPareja: 1400, eloRival: 1400, gano: true, partidos: 10, delta: 15 },
  { descripcion: 'último partido con K intermedio', eloPareja: 1400, eloRival: 1400, gano: true, partidos: 39, delta: 15 },
  { descripcion: 'primer partido con K estable', eloPareja: 1400, eloRival: 1400, gano: true, partidos: 40, delta: 10 },
]
