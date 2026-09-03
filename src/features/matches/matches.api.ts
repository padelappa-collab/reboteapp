import { supabase } from '@/lib/supabase'
import type { MatchRow, SetMarcador, UserRow } from '@/types/database'

/** Lo mínimo de un jugador para pintarlo en una tarjeta de partido. */
export type JugadorResumen = Pick<
  UserRow,
  | 'id'
  | 'nombre'
  | 'ciudad'
  | 'genero'
  | 'elo_masculino'
  | 'elo_femenino'
  | 'elo_mixto'
  | 'peak_elo_masculino'
  | 'peak_elo_femenino'
  | 'peak_elo_mixto'
  | 'partidos_jugados'
>

const CAMPOS_JUGADOR =
  'id, nombre, ciudad, genero, elo_masculino, elo_femenino, elo_mixto, peak_elo_masculino, peak_elo_femenino, peak_elo_mixto, partidos_jugados'

export async function buscarJugadores(
  texto: string,
  excluir: string[] = [],
): Promise<JugadorResumen[]> {
  let consulta = supabase
    .from('users')
    .select(CAMPOS_JUGADOR)
    .order('nombre')
    .limit(12)

  if (texto.trim()) {
    consulta = consulta.ilike('nombre', `%${texto.trim()}%`)
  }

  const { data, error } = await consulta
  if (error) throw new Error(error.message)

  return (data ?? []).filter((j) => !excluir.includes(j.id))
}

export async function perfilesDe(ids: string[]): Promise<Map<string, JugadorResumen>> {
  if (ids.length === 0) return new Map()

  const { data, error } = await supabase.from('users').select(CAMPOS_JUGADOR).in('id', ids)
  if (error) throw new Error(error.message)

  return new Map((data ?? []).map((j) => [j.id, j]))
}

export async function crearPartido(datos: {
  fecha: string
  canchaId: string | null
  creadoPor: string
  parejaA: [string, string]
  parejaB: [string, string]
  sets: SetMarcador[]
}): Promise<MatchRow> {
  const { data, error } = await supabase
    .from('matches')
    .insert({
      fecha: datos.fecha,
      cancha_id: datos.canchaId,
      creado_por: datos.creadoPor,
      pareja_a: datos.parejaA,
      pareja_b: datos.parejaB,
      sets: datos.sets,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

/** Partidos donde el jugador está en cualquiera de las dos parejas. */
export async function partidosDe(userId: string): Promise<MatchRow[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .or(`pareja_a.cs.{${userId}},pareja_b.cs.{${userId}}`)
    .order('fecha', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function obtenerPartido(id: string): Promise<MatchRow | null> {
  const { data, error } = await supabase.from('matches').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

/**
 * Confirma el resultado. Cuando los 4 confirmaron, la propia función mueve el
 * ELO del ranking que corresponde y devuelve el partido ya confirmado.
 */
export async function confirmarPartido(id: string): Promise<MatchRow> {
  const { data, error } = await supabase.rpc('confirm_match', { p_match_id: id })
  if (error) throw new Error(error.message)
  return data as MatchRow
}

export async function disputarPartido(id: string): Promise<MatchRow> {
  const { data, error } = await supabase.rpc('dispute_match', { p_match_id: id })
  if (error) throw new Error(error.message)
  return data as MatchRow
}

/**
 * Cancela el partido para los cuatro.
 *
 * No existe "quitarme yo": un partido necesita cuatro jugadores, así que si
 * alguien se sale, ese partido no va.
 */
export async function cancelarPartido(id: string): Promise<MatchRow> {
  const { data, error } = await supabase.rpc('cancel_match', { p_match_id: id })
  if (error) throw new Error(error.message)
  return data as MatchRow
}

export async function borrarPartido(id: string): Promise<void> {
  const { error } = await supabase.from('matches').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
