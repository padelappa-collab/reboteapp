import {
  ArrowDown,
  ArrowUp,
  AtSign,
  Ban,
  Bell,
  CalendarDays,
  Check,
  CircleCheck,
  ClipboardList,
  Clock,
  DoorOpen,
  Flag,
  Hand,
  Handshake,
  Heart,
  Hourglass,
  Image,
  LogOut,
  Medal,
  MessageCircle,
  Pencil,
  PartyPopper,
  Send,
  Shuffle,
  Swords,
  Ticket,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Undo2,
  UserCheck,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react'
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
/**
 * El icono de cada tipo de aviso.
 *
 * Iconos de línea de Lucide, no emoji: los emoji los dibuja cada sistema a su
 * manera, cambian de forma entre un iPhone y un Android y no comparten grosor
 * de trazo con el resto de la app. Los de las insignias son otra cosa —esos
 * vienen del contenido, no de la interfaz— y se quedan como están.
 */
export const ICONO_NOVEDAD: Record<string, LucideIcon> = {
  insignia: Medal,
  nuevo_seguidor: UserPlus,
  solicitud_seguimiento: UserPlus,
  solicitud_aceptada: UserCheck,
  me_gusta: Heart,
  like_historia: Heart,
  comentario: MessageCircle,
  comentario_respuesta: MessageCircle,
  mensaje: Send,
  publicacion_nueva: Image,
  partido_nuevo: Swords,
  partido_confirmado: TrendingUp,
  partido_confirmacion: Check,
  partido_falta_confirmar: Hourglass,
  partido_corregido: Pencil,
  partido_cancelado: DoorOpen,
  partido_disputado: TriangleAlert,
  partido_pronto: Clock,
  tablon_union: Handshake,
  tablon_salida: LogOut,
  tablon_completo: CircleCheck,
  torneo_inscripcion: Ticket,
  torneo_empezo: Trophy,
  torneo_sorteo: Shuffle,
  torneo_cancelado: Ban,
  torneo_finalizado: Flag,
  torneo_campeon: Trophy,
  torneo_retiro: Undo2,
  torneo_resultado: ClipboardList,
  torneo_cruce: Swords,
  torneo_lleno: Users,
  torneo_manana: CalendarDays,
  ascenso: ArrowUp,
  descenso: ArrowDown,
  inactividad: Hand,
  sin_usuario: AtSign,
  bienvenida: PartyPopper,
}

/** El que se usa cuando llega un tipo que esta versión no conoce. */
export const ICONO_POR_DEFECTO = Bell
