import { perfilesDe, type JugadorResumen } from '@/features/matches/matches.api'
import { supabase } from '@/lib/supabase'
import type { RankingTipo, SetMarcador } from '@/types/database'

export type TorneoFormato = 'americano' | 'cuadrangular' | 'grupos'
export type TorneoEstado = 'inscripciones' | 'en_curso' | 'finalizado' | 'cancelado'
export type ParejaEstado = 'pendiente' | 'aceptada'
export type TorneoModalidad = 'categoria' | 'suma'

export interface Torneo {
  id: string
  nombre: string
  ciudad: string
  formato: TorneoFormato
  ranking: RankingTipo
  modalidad: TorneoModalidad
  categoria: string | null
  suma: number | null
  fecha_inicio: string
  cancha_id: string | null
  descripcion: string | null
  max_parejas: number
  estado: TorneoEstado
  creado_por: string
  created_at: string
}

export interface Pareja {
  id: string
  tournament_id: string
  jugador_a: string
  jugador_b: string
  estado: ParejaEstado
  acepto_a: boolean
  acepto_b: boolean
  grupo: number | null
  jugadores: [JugadorResumen | undefined, JugadorResumen | undefined]
}

export interface Cruce {
  id: string
  fase: 'grupos' | 'final'
  grupo: number | null
  ronda: number
  orden: number
  pareja_a_id: string | null
  pareja_b_id: string | null
  match_id: string | null
  ganador_id: string | null
  sets: SetMarcador[] | null
}

export const ETIQUETA_FORMATO: Record<TorneoFormato, string> = {
  americano: 'Americano',
  cuadrangular: 'Cuadrangular',
  grupos: 'Fase de grupos',
}

export const EXPLICACION_FORMATO: Record<TorneoFormato, string> = {
  americano: 'Todas las parejas juegan contra todas. Gana quien más partidos gane.',
  cuadrangular: 'Cuadros de cuatro parejas, todas contra todas dentro de su cuadro.',
  grupos: 'Cuadrangulares en paralelo y después una final entre los ganadores.',
}

/** Cuántas parejas admite cada formato. */
export function parejasValidas(formato: TorneoFormato, cuantas: number): string | null {
  if (formato === 'cuadrangular' && ![4, 8, 16, 32].includes(cuantas)) {
    return `Un cuadrangular admite 4, 8, 16 o 32 parejas. Hay ${cuantas}.`
  }
  if (formato === 'grupos' && (cuantas < 8 || cuantas % 4 !== 0)) {
    return `La fase de grupos necesita 8, 12, 16... parejas. Hay ${cuantas}.`
  }
  if (formato === 'americano' && cuantas < 2) {
    return `Un americano necesita al menos 2 parejas. Hay ${cuantas}.`
  }
  return null
}

/** Cómo se describe el límite de nivel de un torneo. */
export function limiteDeNivel(t: Pick<Torneo, 'modalidad' | 'categoria' | 'suma'>) {
  return t.modalidad === 'suma' ? `Suma ${t.suma} o más` : `Categoría ${t.categoria}`
}

/**
 * Con qué número cuenta cada categoría para las sumas: la 7ma vale 7 y la 1ra
 * vale 1, así que sumar más significa ser una pareja más floja.
 */
export function numeroDeCategoria(categoria: string, ranking: RankingTipo): number {
  const escala =
    ranking === 'femenino'
      ? ['D', 'C', 'B', 'A']
      : ['7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra']
  const idx = escala.indexOf(categoria)
  return idx === -1 ? 0 : escala.length - idx
}

/** Las sumas que tienen sentido en cada escala. */
export function sumasPosibles(ranking: RankingTipo): number[] {
  const tope = ranking === 'femenino' ? 8 : 14
  return Array.from({ length: tope - 1 }, (_, i) => i + 2)
}

export const ETIQUETA_ESTADO: Record<TorneoEstado, string> = {
  inscripciones: 'Inscripciones abiertas',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

export async function torneosDe(ciudad: string): Promise<Torneo[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('ciudad', ciudad)
    .order('fecha_inicio', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as unknown as Torneo[]) ?? []
}

export async function crearTorneo(datos: {
  nombre: string
  ciudad: string
  formato: TorneoFormato
  ranking: RankingTipo
  modalidad: TorneoModalidad
  categoria: string | null
  suma: number | null
  fechaInicio: string
  canchaId: string | null
  descripcion: string | null
  maxParejas: number
  creadoPor: string
}): Promise<Torneo> {
  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      nombre: datos.nombre.trim(),
      ciudad: datos.ciudad,
      formato: datos.formato,
      ranking: datos.ranking,
      modalidad: datos.modalidad,
      categoria: datos.categoria,
      suma: datos.suma,
      fecha_inicio: datos.fechaInicio,
      cancha_id: datos.canchaId,
      descripcion: datos.descripcion,
      max_parejas: datos.maxParejas,
      creado_por: datos.creadoPor,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as unknown as Torneo
}

export async function obtenerTorneo(id: string): Promise<Torneo | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as unknown as Torneo) ?? null
}

/** Las parejas del torneo, con el perfil de cada jugador ya resuelto. */
export async function parejasDe(torneoId: string): Promise<Pareja[]> {
  const { data, error } = await supabase
    .from('tournament_pairs')
    .select('*')
    .eq('tournament_id', torneoId)
    .order('created_at')

  if (error) throw new Error(error.message)

  const filas = (data as unknown as Omit<Pareja, 'jugadores'>[]) ?? []
  const perfiles = await perfilesDe([
    ...new Set(filas.flatMap((p) => [p.jugador_a, p.jugador_b])),
  ])

  return filas.map((p) => ({
    ...p,
    jugadores: [perfiles.get(p.jugador_a), perfiles.get(p.jugador_b)],
  }))
}

export async function crucesDe(torneoId: string): Promise<Cruce[]> {
  const { data, error } = await supabase
    .from('tournament_matches')
    .select('*, partido:matches (sets)')
    .eq('tournament_id', torneoId)
    .order('ronda')
    .order('orden')

  if (error) throw new Error(error.message)

  type Fila = Omit<Cruce, 'sets'> & { partido: { sets: SetMarcador[] } | null }

  return ((data as unknown as Fila[]) ?? []).map((c) => ({
    ...c,
    sets: c.partido?.sets ?? null,
  }))
}

/** Si un jugador puede inscribirse en este torneo, según su nivel. */
export async function esElegible(
  userId: string,
  ranking: RankingTipo,
  categoria: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('elegible_en_torneo', {
    p_user: userId,
    p_ranking: ranking,
    p_categoria: categoria,
  })
  if (error) throw new Error(error.message)
  return Boolean(data)
}

/**
 * Inscribe una pareja. Si `jugadorA` va vacío se inscribe quien llama; si viene,
 * es el organizador armando una pareja de la que puede no formar parte.
 */
export async function inscribirPareja(
  torneoId: string,
  companeroId: string,
  jugadorA: string,
) {
  // los tres siempre: omitir el último dejaba la llamada ambigua entre dos
  // versiones de la función y la base no sabía cuál elegir
  const { error } = await supabase.rpc('inscribir_pareja', {
    p_torneo: torneoId,
    p_companero: companeroId,
    p_jugador_a: jugadorA,
  })
  if (error) throw new Error(error.message)
}

export async function aceptarInscripcion(parejaId: string) {
  const { error } = await supabase.rpc('aceptar_inscripcion', { p_pareja: parejaId })
  if (error) throw new Error(error.message)
}

export async function retirarPareja(parejaId: string) {
  const { error } = await supabase.rpc('retirar_pareja', { p_pareja: parejaId })
  if (error) throw new Error(error.message)
}

export async function iniciarTorneo(torneoId: string) {
  const { error } = await supabase.rpc('iniciar_torneo', { p_torneo: torneoId })
  if (error) throw new Error(error.message)
}

export async function registrarResultado(cruceId: string, sets: SetMarcador[]) {
  const { error } = await supabase.rpc('registrar_resultado_torneo', {
    p_cruce: cruceId,
    p_sets: sets,
  })
  if (error) throw new Error(error.message)
}

export async function generarFaseFinal(torneoId: string) {
  const { error } = await supabase.rpc('generar_fase_final', { p_torneo: torneoId })
  if (error) throw new Error(error.message)
}

/**
 * Cancelar un torneo no lo borra: los inscritos reciben el aviso y el torneo
 * queda a la vista como cancelado. Borrarlo dejaría a la gente esperando en una
 * cancha por algo que desapareció sin explicación.
 */
export async function cancelarTorneo(torneoId: string) {
  const { error } = await supabase
    .from('tournaments')
    .update({ estado: 'cancelado' })
    .eq('id', torneoId)
  if (error) throw new Error(error.message)
}

export async function finalizarTorneo(torneoId: string) {
  const { error } = await supabase
    .from('tournaments')
    .update({ estado: 'finalizado' })
    .eq('id', torneoId)
  if (error) throw new Error(error.message)
}

/** Tabla de posiciones del americano: partidos y sets ganados por pareja. */
export interface FilaTabla {
  pareja: Pareja
  jugados: number
  ganados: number
  setsAFavor: number
  setsEnContra: number
}

export function tablaDePosiciones(
  parejas: Pareja[],
  cruces: Cruce[],
  grupo?: number | null,
): FilaTabla[] {
  const filas = new Map<string, FilaTabla>(
    parejas
      .filter((p) => p.estado === 'aceptada')
      .filter((p) => grupo === undefined || p.grupo === grupo)
      .map((p) => [
        p.id,
        { pareja: p, jugados: 0, ganados: 0, setsAFavor: 0, setsEnContra: 0 },
      ]),
  )

  for (const c of cruces) {
    if (!c.match_id || !c.sets || !c.pareja_a_id || !c.pareja_b_id) continue

    const a = filas.get(c.pareja_a_id)
    const b = filas.get(c.pareja_b_id)
    if (!a || !b) continue

    const setsA = c.sets.filter((s) => s.a > s.b).length
    const setsB = c.sets.length - setsA

    a.jugados += 1
    b.jugados += 1
    a.setsAFavor += setsA
    a.setsEnContra += setsB
    b.setsAFavor += setsB
    b.setsEnContra += setsA

    if (c.ganador_id === a.pareja.id) a.ganados += 1
    else b.ganados += 1
  }

  return [...filas.values()].sort(
    (x, y) =>
      y.ganados - x.ganados ||
      y.setsAFavor - y.setsEnContra - (x.setsAFavor - x.setsEnContra),
  )
}
