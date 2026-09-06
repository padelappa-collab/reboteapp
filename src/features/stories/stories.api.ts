import { borrarArchivo } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import type { HistoriaAutorRow, HistoriaRow, LikeHistoriaRow } from '@/types/database'

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
    .upload(ruta, archivo, {
      // Un año. Los archivos llevan un nombre único e irrepetible, así que una
      // foto nunca cambia de contenido: volver a pedirla al servidor es tráfico
      // tirado. Con la hora que había por defecto, la misma persona se
      // descargaba el mismo feed varias veces al día.
      cacheControl: '31536000',
      upsert: false,
    })
  if (fallo) throw new Error(fallo.message)

  const imagen_url = supabase.storage.from('feed-images').getPublicUrl(ruta).data.publicUrl

  const { error } = await supabase.from('stories').insert({ user_id: userId, imagen_url })
  if (error) throw new Error(error.message)
}

export async function borrarHistoria(id: string) {
  // Hay que leer antes de borrar: la fila es la única pista de dónde viven la
  // foto y el vídeo, y una vez borrada no hay forma de encontrarlos.
  const { data } = await supabase
    .from('stories')
    .select('imagen_url, video_uid')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('stories').delete().eq('id', id)
  if (error) throw new Error(error.message)

  await borrarArchivo(data?.imagen_url)
  if (data?.video_uid) {
    void supabase.functions.invoke('video', {
      body: { accion: 'borrar', uid: data.video_uid },
    })
  }
}

/** ¿Ya le di me gusta a esta historia? */
export async function yaDiMeGusta(storyId: string, yo: string): Promise<boolean> {
  const { count } = await supabase
    .from('story_likes')
    .select('story_id', { count: 'exact', head: true })
    .eq('story_id', storyId)
    .eq('user_id', yo)
  return (count ?? 0) > 0
}

export async function alternarLikeHistoria(storyId: string, yo: string, dar: boolean) {
  if (dar) {
    const { error } = await supabase
      .from('story_likes')
      .insert({ story_id: storyId, user_id: yo, created_at: new Date().toISOString() })
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase
    .from('story_likes')
    .delete()
    .eq('story_id', storyId)
    .eq('user_id', yo)
  if (error) throw new Error(error.message)
}

/** Quiénes le dieron me gusta. La base solo lo responde a quien la publicó. */
export async function likesDeHistoria(storyId: string): Promise<LikeHistoriaRow[]> {
  const { data, error } = await supabase.rpc('likes_de_historia', { p_story: storyId })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Cuánto puede durar el vídeo de una historia. Cloudflare aplica el mismo. */
export const SEGUNDOS_MAX = 30

/**
 * Sube un vídeo a Cloudflare Stream y publica la historia.
 *
 * El archivo va del teléfono a Cloudflare sin pasar por Supabase: en la base
 * solo entra el identificador. Por eso el vídeo no gasta ni el almacenamiento
 * ni la cuota de tráfico del proyecto, que es la misma que sirve el ranking.
 */
export async function publicarVideo(userId: string, archivo: File) {
  const { data, error } = await supabase.functions.invoke('video', {
    body: { accion: 'crear' },
  })
  if (error) throw new Error('No se pudo preparar la subida')

  const { subidaUrl, uid } = data as { subidaUrl: string; uid: string }

  const formulario = new FormData()
  formulario.append('file', archivo)

  const subida = await fetch(subidaUrl, { method: 'POST', body: formulario })
  if (!subida.ok) {
    // el rechazo más común es la duración: el tope lo aplica Cloudflare
    throw new Error('Cloudflare rechazó el vídeo. Comprueba que dure menos de 30 s.')
  }

  const { error: fallo } = await supabase
    .from('stories')
    .insert({ user_id: userId, video_uid: uid })
  if (fallo) throw new Error(fallo.message)
}

/** Cuánto dura un vídeo, leído del propio archivo antes de subirlo. */
export function duracionDe(archivo: File): Promise<number> {
  return new Promise((resolver, fallar) => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src)
      resolver(v.duration)
    }
    v.onerror = () => fallar(new Error('No se pudo leer el vídeo'))
    v.src = URL.createObjectURL(archivo)
  })
}
