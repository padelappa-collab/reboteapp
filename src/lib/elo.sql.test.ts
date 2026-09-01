/**
 * Paridad entre el cálculo de ELO en TypeScript y el de SQL.
 *
 * El ELO real lo mueve `confirm_match()` dentro de la base; el TypeScript existe
 * para que la UI pueda anticipar el cambio sin ida y vuelta. Si las dos versiones
 * se separan, un jugador vería un número y la base guardaría otro. Este test
 * recorre la misma tabla de casos que `elo.test.ts` contra `delta_elo()`.
 *
 * Necesita conexión a la base; sin credenciales el bloque se salta.
 */

import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { CASOS_ELO } from './__fixtures__/elo.cases'
import { deltaJugador, kFactor, puntajeEsperado } from './elo'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const hayBase = Boolean(url) && Boolean(anonKey)

describe.skipIf(!hayBase)('paridad de ELO SQL <-> TypeScript', () => {
  const supabase = createClient(url, anonKey)

  it.each(CASOS_ELO)(
    '$descripcion (pareja $eloPareja vs $eloRival, $partidos partidos)',
    async ({ eloPareja, eloRival, gano, partidos }) => {
      const { data, error } = await supabase.rpc('delta_elo', {
        p_elo_pareja: eloPareja,
        p_elo_rival: eloRival,
        p_gano: gano,
        p_partidos: partidos,
      })

      expect(error).toBeNull()
      expect(data).toBe(deltaJugador(eloPareja, eloRival, gano, partidos))
    },
  )

  it('k_factor coincide en los bordes de cada etapa', async () => {
    for (const partidos of [0, 9, 10, 39, 40, 200]) {
      const { data, error } = await supabase.rpc('k_factor', { p_partidos: partidos })
      expect(error).toBeNull()
      expect(data).toBe(kFactor(partidos))
    }
  })

  it('puntaje_esperado coincide con la fórmula de JavaScript', async () => {
    for (const [propio, rival] of [
      [1400, 1400],
      [2100, 1400],
      [700, 2800],
      [1575, 1400],
    ]) {
      const { data, error } = await supabase.rpc('puntaje_esperado', {
        p_propio: propio,
        p_rival: rival,
      })
      expect(error).toBeNull()
      expect(Number(data)).toBeCloseTo(puntajeEsperado(propio, rival), 6)
    }
  })
})
