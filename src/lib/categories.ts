/**
 * Categorías, histéresis y sub-niveles (estrellas).
 *
 * Espejo exacto de las funciones SQL de `20260901000200_categorias_fn.sql`.
 * Si cambia una de las dos, tiene que cambiar la otra.
 *
 * Reglas:
 *  - Salto fijo de 350 puntos entre categorías, empezando en 700.
 *  - Masculino y mixto usan la escala FECOLPA (7ma..1ra, 700..2800).
 *    Femenino usa D..A (700..1750). El mixto usa los cortes masculinos para
 *    todo el mundo, sin importar el género del jugador.
 *  - Se sube en cuanto el ELO cruza el umbral. Se baja solo si el ELO cae más
 *    de 75 puntos por debajo del umbral de entrada de esa categoría.
 *  - Nada de esto se guarda: es una función pura de (elo, pico, ranking).
 */

export type Genero = 'masculino' | 'femenino'
export type Ranking = 'masculino' | 'femenino' | 'mixto'

export const ELO_BASE = 700
export const SALTO_CATEGORIA = 350
export const COLCHON_HISTERESIS = 75
export const ESTRELLAS_POR_CATEGORIA = 3

export const CATEGORIAS_MASCULINO = ['7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra'] as const
export const CATEGORIAS_FEMENINO = ['D', 'C', 'B', 'A'] as const

export type CategoriaMasculina = (typeof CATEGORIAS_MASCULINO)[number]
export type CategoriaFemenina = (typeof CATEGORIAS_FEMENINO)[number]
export type Categoria = CategoriaMasculina | CategoriaFemenina

/** Etiquetas ordenadas de menor a mayor para el ranking dado. */
export function categoriasDe(ranking: Ranking): readonly Categoria[] {
  return ranking === 'femenino' ? CATEGORIAS_FEMENINO : CATEGORIAS_MASCULINO
}

/** Umbral de entrada de la categoría en la posición `indice` (1 = la más baja). */
export function umbralCategoria(indice: number): number {
  return ELO_BASE + (indice - 1) * SALTO_CATEGORIA
}

/** Índice de categoría sin histéresis: el mayor i tal que elo >= umbral(i). */
function indiceCategoriaPlano(elo: number): number {
  return Math.max(1, Math.floor((elo - ELO_BASE) / SALTO_CATEGORIA) + 1)
}

/** ELO con el que arranca un jugador según la categoría que declara al registrarse. */
export function eloInicial(categoria: Categoria, genero: Genero): number {
  const cats = categoriasDe(genero)
  const idx = cats.indexOf(categoria as never)
  if (idx === -1) {
    throw new Error(`Categoría "${categoria}" no válida para el género ${genero}`)
  }
  return umbralCategoria(idx + 1)
}

/**
 * Categoría visible.
 *
 * `peakElo` es el ELO más alto alcanzado en ese ranking, y sirve para dos cosas:
 * define cuál es la categoría más alta que el jugador llegó a pisar, y el
 * colchón de histéresis solo aplica a categorías que efectivamente pisó (si
 * nunca entró a 3ra, estar a 70 puntos de 2100 no lo hace de 3ra).
 */
export function categoriaDesdeElo(elo: number, ranking: Ranking, peakElo: number): Categoria {
  const cats = categoriasDe(ranking)
  const tope = cats.length
  const indicePico = Math.min(indiceCategoriaPlano(Math.max(peakElo, elo)), tope)
  // sumar el colchón al ELO equivale a comparar contra (umbral - colchón)
  const indiceActual = Math.min(indiceCategoriaPlano(elo + COLCHON_HISTERESIS), tope)
  return cats[Math.min(indiceActual, indicePico) - 1]
}

/**
 * Sub-nivel visual dentro de la categoría: 3 tercios de 350/3 puntos.
 * Si el ELO quedó por debajo del umbral gracias a la histéresis, devuelve 1.
 */
export function nivelEstrella(elo: number, ranking: Ranking, peakElo: number): 1 | 2 | 3 {
  const cats = categoriasDe(ranking)
  const categoria = categoriaDesdeElo(elo, ranking, peakElo)
  const inicio = umbralCategoria(cats.indexOf(categoria as never) + 1)
  const tercio = SALTO_CATEGORIA / ESTRELLAS_POR_CATEGORIA
  const nivel = Math.floor((elo - inicio) / tercio) + 1
  return Math.min(3, Math.max(1, nivel)) as 1 | 2 | 3
}

export interface ResumenCategoria {
  categoria: Categoria
  estrellas: 1 | 2 | 3
  elo: number
  /** Avance dentro de la categoría, 0..1. Sirve para la barra de progreso. */
  progreso: number
  /** Puntos que faltan para la siguiente categoría, o null si ya es la más alta. */
  faltaParaSubir: number | null
}

/** Todo lo que la UI necesita para pintar una fila de ranking o el perfil. */
export function resumenCategoria(
  elo: number,
  ranking: Ranking,
  peakElo: number,
): ResumenCategoria {
  const cats = categoriasDe(ranking)
  const categoria = categoriaDesdeElo(elo, ranking, peakElo)
  const indice = cats.indexOf(categoria as never) + 1
  const inicio = umbralCategoria(indice)
  const esUltima = indice === cats.length
  const siguiente = umbralCategoria(indice + 1)

  return {
    categoria,
    estrellas: nivelEstrella(elo, ranking, peakElo),
    elo,
    // El avance se mide desde el suelo real de la categoría, no desde su
    // umbral de entrada. La histéresis te mantiene en tu categoría hasta 75
    // puntos por debajo de ese umbral, así que quien está en esa franja —muy
    // común justo después de perder un par de partidos— daba un avance
    // negativo que se recortaba a cero y dejaba la barra plana. Midiendo desde
    // el suelo, la barra se mueve en todo el rango en el que de verdad puedes
    // estar sin cambiar de categoría.
    progreso: esUltima
      ? Math.min(1, Math.max(0, (elo - inicio) / SALTO_CATEGORIA))
      : (() => {
          const suelo = inicio - COLCHON_HISTERESIS
          return Math.min(1, Math.max(0, (elo - suelo) / (siguiente - suelo)))
        })(),
    faltaParaSubir: esUltima ? null : Math.max(0, siguiente - elo),
  }
}
