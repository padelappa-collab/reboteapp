import { supabase } from '@/lib/supabase'
import type {
  CandidatoRow,
  ConversacionRow,
  MessageRow,
} from '@/types/database'

export type Conversacion = ConversacionRow
export type Candidato = CandidatoRow

/** Un mensaje con la publicación resuelta, cuando el mensaje es una. */
export interface Mensaje extends MessageRow {
  post: {
    id: string
    imagen_url: string | null
    contenido: string | null
    autor: { id: string; nombre: string; foto_url: string | null } | null
  } | null
}

const SELECT_MENSAJE = `
  *,
  post:feed_posts (
    id, imagen_url, contenido,
    autor:users!feed_posts_user_id_fkey (id, nombre, foto_url)
  )
`

/** La bandeja: una fila por conversación, ordenada por lo más reciente. */
export async function misConversaciones(): Promise<Conversacion[]> {
  const { data, error } = await supabase.rpc('mis_conversaciones')
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Cuántos mensajes sin leer hay en total, para el punto de la barra. */
export async function mensajesSinLeer(): Promise<number> {
  const conversaciones = await misConversaciones()
  return conversaciones.reduce((n, c) => n + c.sin_leer, 0)
}

export async function mensajesDe(conversacionId: string): Promise<Mensaje[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(SELECT_MENSAJE)
    .eq('conversation_id', conversacionId)
    .order('created_at')
    .limit(200)

  if (error) throw new Error(error.message)
  return (data as unknown as Mensaje[]) ?? []
}

/** Trae un mensaje suelto con su publicación, para lo que llega por realtime. */
export async function mensajePorId(id: string): Promise<Mensaje | null> {
  const { data } = await supabase
    .from('messages')
    .select(SELECT_MENSAJE)
    .eq('id', id)
    .maybeSingle()

  return (data as unknown as Mensaje) ?? null
}

export async function enviarMensaje(
  conversacionId: string,
  emisorId: string,
  contenido: string,
) {
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversacionId,
    sender_id: emisorId,
    contenido: contenido.trim(),
  })
  if (error) throw new Error(error.message)
}

/**
 * Abre la conversación con alguien, creándola si no existía.
 *
 * Quién puede escribirle a quién lo decide la base: hace falta que alguno de
 * los dos siga al otro. Sin esa regla el buzón sería la puerta por la que entra
 * cualquiera.
 */
export async function conversacionCon(usuarioId: string): Promise<string> {
  const { data, error } = await supabase.rpc('conversacion_con', {
    p_usuario: usuarioId,
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function marcarLeida(conversacionId: string) {
  await supabase.rpc('marcar_conversacion_leida', { p_conv: conversacionId })
}

/** A quién se le puede compartir. Los mutuos primero: es con quien se habla. */
export async function genteParaCompartir(): Promise<Candidato[]> {
  const { data, error } = await supabase.rpc('gente_para_compartir')
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Manda la publicación a cada persona. Devuelve a cuántas llegó. */
export async function compartirPost(
  postId: string,
  usuarios: string[],
): Promise<number> {
  const { data, error } = await supabase.rpc('compartir_post', {
    p_post: postId,
    p_usuarios: usuarios,
  })
  if (error) throw new Error(error.message)
  return (data as number) ?? 0
}
