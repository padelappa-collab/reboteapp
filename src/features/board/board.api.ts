import { perfilesDe } from '@/features/matches/matches.api'
import { supabase } from '@/lib/supabase'
import type { BoardEstado, BoardPostRow } from '@/types/database'

export interface Jugador {
  id: string
  nombre: string
}

export interface PublicacionConDatos extends BoardPostRow {
  autor: { id: string; nombre: string; ciudad: string } | null
  cancha: { id: string; nombre: string } | null
  /** Quienes ya iban con el autor, con nombre. */
  acompanantesJugadores: Jugador[]
  /** Quienes se apuntaron desde el tablón. */
  apuntados: Jugador[]
}

/**
 * Publicaciones vigentes, con seis horas de gracia.
 *
 * El corte estaba en la hora exacta del partido, y eso hacía que una
 * publicación desapareciera del tablón justo cuando la gente estaba llegando a
 * la cancha. Desde fuera se veía como si se hubiera borrado sola: nadie la
 * había tocado y ya no estaba.
 *
 * Nunca se borró nada —siguen todas en la base—, solo dejaban de mostrarse. Con
 * seis horas de margen, un partido de las siete de la tarde sigue a la vista
 * toda la noche, que es cuando todavía tiene sentido mirarlo: para saber quién
 * fue, o para volver a la ficha y registrar el resultado.
 *
 * Los acompañantes se guardan como un arreglo de ids, no como una relación, así
 * que sus nombres se traen en una segunda consulta.
 */
const GRACIA_HORAS = 6
export async function publicacionesAbiertas(
  ciudad?: string,
): Promise<PublicacionConDatos[]> {
  const { data, error } = await supabase
    .from('board_posts')
    .select(
      `*,
       autor:users!board_posts_user_id_fkey (id, nombre, ciudad),
       cancha:courts (id, nombre),
       signups:board_post_signups (user:users (id, nombre))`,
    )
    .gte(
      'fecha_partido',
      new Date(Date.now() - GRACIA_HORAS * 3600_000).toISOString(),
    )
    .order('fecha_partido')

  if (error) throw new Error(error.message)

  type Fila = BoardPostRow & {
    autor: { id: string; nombre: string; ciudad: string } | null
    cancha: { id: string; nombre: string } | null
    signups: Array<{ user: Jugador | null }> | null
  }

  const filas = (data as unknown as Fila[]).filter(
    (p) => !ciudad || p.autor?.ciudad === ciudad,
  )

  const idsAcompanantes = [...new Set(filas.flatMap((p) => p.acompanantes ?? []))]
  const perfiles = await perfilesDe(idsAcompanantes)

  return filas.map((p) => ({
    ...p,
    acompanantesJugadores: (p.acompanantes ?? [])
      .map((id) => perfiles.get(id))
      .filter((j): j is NonNullable<typeof j> => Boolean(j))
      .map((j) => ({ id: j.id, nombre: j.nombre })),
    apuntados: (p.signups ?? [])
      .map((s) => s.user)
      .filter((u): u is Jugador => u !== null),
  }))
}

export async function crearPublicacion(datos: {
  userId: string
  acompanantes: string[]
  fechaPartido: string
  nivelBuscado: string | null
  canchaId: string | null
  nota: string | null
}) {
  const { error } = await supabase.from('board_posts').insert({
    user_id: datos.userId,
    acompanantes: datos.acompanantes,
    fecha_partido: datos.fechaPartido,
    nivel_buscado: datos.nivelBuscado,
    cancha_id: datos.canchaId,
    nota: datos.nota,
  })
  if (error) throw new Error(error.message)
}

export async function apuntarse(postId: string, userId: string) {
  const { error } = await supabase
    .from('board_post_signups')
    .insert({ post_id: postId, user_id: userId })
  if (error) throw new Error(error.message)
}

/**
 * Salirse de una publicación, sea uno el autor, un acompañante o alguien
 * apuntado. La publicación sigue en pie para los demás con un cupo más libre.
 */
export async function salirPublicacion(postId: string) {
  const { error } = await supabase.rpc('salir_publicacion', { p_post_id: postId })
  if (error) throw new Error(error.message)
}

export async function cambiarEstado(postId: string, estado: BoardEstado) {
  const { error } = await supabase.from('board_posts').update({ estado }).eq('id', postId)
  if (error) throw new Error(error.message)
}

/** Deja constancia de que este partido salió de esta publicación. */
export async function vincularPartido(postId: string, matchId: string) {
  const { error } = await supabase.rpc('vincular_partido', {
    p_post_id: postId,
    p_match_id: matchId,
  })
  if (error) throw new Error(error.message)
}

/** Los cuatro jugadores del partido, si la publicación ya está completa. */
export function cuartetoDe(p: PublicacionConDatos): string[] {
  // sin repetidos: una publicación vieja puede traer a alguien dos veces, y un
  // partido con jugadores repetidos lo rechaza la base
  return [
    ...new Set([
      p.user_id,
      ...p.acompanantesJugadores.map((j) => j.id),
      ...p.apuntados.map((j) => j.id),
    ]),
  ].slice(0, 4)
}

/** Una publicación suelta, para su ficha. */
export async function obtenerPublicacion(
  id: string,
): Promise<PublicacionConDatos | null> {
  const { data, error } = await supabase
    .from('board_posts')
    .select(
      `*,
       autor:users!board_posts_user_id_fkey (id, nombre, ciudad),
       cancha:courts (id, nombre),
       signups:board_post_signups (user:users (id, nombre))`,
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const fila = data as unknown as BoardPostRow & {
    autor: { id: string; nombre: string; ciudad: string } | null
    cancha: { id: string; nombre: string } | null
    signups: Array<{ user: Jugador | null }> | null
  }

  const perfiles = await perfilesDe(fila.acompanantes ?? [])

  return {
    ...fila,
    acompanantesJugadores: (fila.acompanantes ?? [])
      .map((uid) => perfiles.get(uid))
      .filter((j): j is NonNullable<typeof j> => Boolean(j))
      .map((j) => ({ id: j.id, nombre: j.nombre })),
    apuntados: (fila.signups ?? [])
      .map((s) => s.user)
      .filter((u): u is Jugador => u !== null),
  }
}
