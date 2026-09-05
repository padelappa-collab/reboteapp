import { supabase } from '@/lib/supabase'
import type { HistoriaAutorRow, HistoriaRow } from '@/types/database'

export type AutorConHistorias = HistoriaAutorRow
export type Historia = HistoriaRow

/**
 * La barra de historias: una entrada por persona, no por historia.
 *
 * El orden lo decide la base —tú primero, después quien tiene algo sin ver, y
 * dentro de cada grupo lo más reciente— porque es el mismo criterio que decide
 * qué se ve, y tenerlo en dos sitios es pedir que acaben discrepando.
 */
export async function historiasActivas(): Promise<AutorConHistorias[]> {
  const { data, error } = await supabase.rpc('historias_activas')
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Las historias de una persona, en orden, diciendo cuáles ya viste. */
export async function historiasDe(usuarioId: string): Promise<Historia[]> {
  const { data, error } = await supabase.rpc('historias_de', { p_usuario: usuarioId })
  if (error) throw new Error(error.message)
  return data ?? []
}

/**
 * Marcar una historia como vista.
 *
 * No devuelve nada ni se espera: que el registro de la vista falle no puede
 * frenar la reproducción de lo que la persona está mirando.
 */
export function verHistoria(storyId: string) {
  void supabase.rpc('ver_historia', { p_story: storyId })
}

/** Sube la imagen al bucket del feed y publica la historia. */
export async function publicarHistoria(userId: string, archivo: File) {
  const extension = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const ruta = `${userId}/historia-${crypto.randomUUID()}.${extension}`

  const { error: fallo } = await supabase.storage
    .from('feed-images')
    .upload(ruta, archivo, { cacheControl: '3600', upsert: false })
  if (fallo) throw new Error(fallo.message)

  const imagen_url = supabase.storage.from('feed-images').getPublicUrl(ruta).data.publicUrl

  const { error } = await supabase.from('stories').insert({ user_id: userId, imagen_url })
  if (error) throw new Error(error.message)
}

export async function borrarHistoria(id: string) {
  const { error } = await supabase.from('stories').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
