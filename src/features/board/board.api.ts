import { supabase } from '@/lib/supabase'
import type { BoardEstado, BoardPostRow, BoardTipo } from '@/types/database'

export interface PublicacionConDatos extends BoardPostRow {
  autor: { id: string; nombre: string; ciudad: string } | null
  cancha: { id: string; nombre: string } | null
  apuntados: Array<{ id: string; nombre: string }>
}

/**
 * Publicaciones abiertas, de la fecha de hoy en adelante.
 * Las pasadas dejan de tener sentido, así que no se listan.
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
    signups: Array<{ user: { id: string; nombre: string } | null }> | null
  }

  return (data as unknown as Fila[])
    .filter((p) => !ciudad || p.autor?.ciudad === ciudad)
    .map((p) => ({
      ...p,
      apuntados: (p.signups ?? [])
        .map((s) => s.user)
        .filter((u): u is { id: string; nombre: string } => u !== null),
    }))
}

export async function crearPublicacion(datos: {
  userId: string
  tipo: BoardTipo
  fechaPartido: string
  nivelBuscado: string | null
  canchaId: string | null
  nota: string | null
}) {
  const { error } = await supabase.from('board_posts').insert({
    user_id: datos.userId,
    tipo: datos.tipo,
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
