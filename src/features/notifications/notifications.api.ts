import { supabase } from '@/lib/supabase'

export interface Novedad {
  id: string
  tipo: string
  titulo: string
  cuerpo: string | null
  enlace: string | null
  leida: boolean
  created_at: string
}

export async function novedadesDe(userId: string): Promise<Novedad[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, tipo, titulo, cuerpo, enlace, leida, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) throw new Error(error.message)
  return (data as unknown as Novedad[]) ?? []
}

export async function sinLeer(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('leida', false)

  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function marcarLeida(id: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ leida: true })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function marcarTodasLeidas(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ leida: true })
    .eq('user_id', userId)
    .eq('leida', false)
  if (error) throw new Error(error.message)
}

export async function borrarNovedad(id: string) {
  const { error } = await supabase.from('notifications').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Un icono por familia de aviso, para reconocerlos de un vistazo. */
export const ICONO_NOVEDAD: Record<string, string> = {
  insignia: '🏅',
  nuevo_seguidor: '👤',
  solicitud_seguimiento: '🔔',
  solicitud_aceptada: '✅',
  me_gusta: '❤️',
  comentario: '💬',
  partido_nuevo: '🎾',
  partido_confirmado: '📈',
  partido_cancelado: '🚪',
  partido_disputado: '⚠️',
  partido_pronto: '⏰',
  tablon_union: '🤝',
  torneo_inscripcion: '🎫',
  torneo_empezo: '🏆',
  torneo_cancelado: '🚫',
  torneo_finalizado: '🥇',
  inactividad: '👋',
  sin_usuario: '✍️',
}
