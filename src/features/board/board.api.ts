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
 * Publicaciones de hoy en adelante. Las pasadas dejan de tener sentido.
 *
 * Los acompañantes se guardan como un arreglo de ids, no como una relación, así
 * que sus nombres se traen en una segunda consulta.
 */
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
    .gte('fecha_partido', new Date().toISOString())
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

export async function desapuntarse(postId: string, userId: string) {
  const { error } = await supabase
    .from('board_post_signups')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)
  if (error) throw new Error(error.message)
}

export async function cambiarEstado(postId: string, estado: BoardEstado) {
  const { error } = await supabase.from('board_posts').update({ estado }).eq('id', postId)
  if (error) throw new Error(error.message)
}

/** Los cuatro jugadores del partido, si la publicación ya está completa. */
export function cuartetoDe(p: PublicacionConDatos): string[] {
  return [
    p.user_id,
    ...p.acompanantesJugadores.map((j) => j.id),
    ...p.apuntados.map((j) => j.id),
  ].slice(0, 4)
}
