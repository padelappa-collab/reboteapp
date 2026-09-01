/**
 * Paridad entre la implementación TypeScript de categorías y la SQL.
 *
 * Hay dos copias de las mismas reglas —`src/lib/categories.ts` y la migración
 * `20260901000200_categorias_fn.sql`— porque la UI necesita calcularlas sin ida
 * y vuelta a la base, y la base las necesita para otorgar insignias. El riesgo
 * real es que alguien cambie el salto de 350, el colchón de 75 o los tercios de
 * estrella en un solo lado. Este test recorre la misma tabla de casos que
 * `categories.test.ts`, llama a las funciones SQL por RPC y compara.
 *
 * Necesita conexión a la base. Sin credenciales el bloque se salta, así que la
 * suite sigue corriendo en un entorno sin acceso (y el test puro de TypeScript
 * sigue protegiendo el fixture).
 */

import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { CASOS_CATEGORIA } from './__fixtures__/categorias.cases'
import { categoriaDesdeElo, eloInicial, nivelEstrella, type Categoria } from './categories'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const hayBase = Boolean(url) && Boolean(anonKey)

describe.skipIf(!hayBase)('paridad SQL <-> TypeScript', () => {
  const supabase = createClient(url, anonKey)

  it.each(CASOS_CATEGORIA)(
    '$descripcion (elo $elo, $ranking, pico $peak)',
    async ({ elo, ranking, peak }) => {
      const [categoriaSql, estrellasSql] = await Promise.all([
        supabase.rpc('categoria_desde_elo', {
          p_elo: elo,
          p_ranking: ranking,
          p_peak: peak,
        }),
        supabase.rpc('nivel_estrella', {
          p_elo: elo,
          p_ranking: ranking,
          p_peak: peak,
        }),
      ])

      expect(categoriaSql.error).toBeNull()
      expect(estrellasSql.error).toBeNull()

      expect(categoriaSql.data).toBe(categoriaDesdeElo(elo, ranking, peak))
      expect(estrellasSql.data).toBe(nivelEstrella(elo, ranking, peak))
    },
  )

  it('elo_inicial coincide en las dos escalas completas', async () => {
    const casos: Array<[Categoria, 'masculino' | 'femenino']> = [
      ['7ma', 'masculino'], ['6ta', 'masculino'], ['5ta', 'masculino'],
      ['4ta', 'masculino'], ['3ra', 'masculino'], ['2da', 'masculino'],
      ['1ra', 'masculino'], ['D', 'femenino'], ['C', 'femenino'],
      ['B', 'femenino'], ['A', 'femenino'],
    ]

    for (const [categoria, genero] of casos) {
      const { data, error } = await supabase.rpc('elo_inicial', {
        p_categoria: categoria,
        p_genero: genero,
      })
      expect(error).toBeNull()
      expect(data).toBe(eloInicial(categoria, genero))
    }
  })
})
