import { supabase } from '@/lib/supabase'
import type {
  FeedPostRow,
  FollowEstado,
  LikeHistoriaRow,
  MatchRow,
} from '@/types/database'

export interface AutorResumen {
  id: string
  nombre: string
  foto_url: string | null
  cuenta_privada: boolean
}

export interface Publicacion extends FeedPostRow {
  autor: AutorResumen | null
  partido: Pick<MatchRow, 'id' | 'sets' | 'ganador' | 'pareja_a' | 'pareja_b' | 'match_type'> | null
  meGusta: number
  yaDiMeGusta: boolean
  comentarios: number
}

/*
 * Los me gusta y los comentarios se piden CONTADOS, no en filas.
 *
 * Antes se traía cada fila de me gusta con el nombre de quien lo dio, y cada
 * identificador de comentario, solo para pintar dos números. Con dos me gusta da
 * igual; con una publicación que se hace popular, esa sola fila baja cientos de
 * registros, y el feed trae ocho publicaciones a la vez.
 *
 * `mio` es el único que sigue trayendo filas, y como mucho una: la tuya, para
 * saber si el corazón va relleno.
 */
const SELECT_PUBLICACION = `
  *,
  autor:users!feed_posts_user_id_fkey (id, nombre, foto_url, cuenta_privada),
  partido:matches (id, sets, ganador, pareja_a, pareja_b, match_type),
  likes:post_likes (count),
  comentarios:comments (count),
  mio:post_likes (user_id)
`

type Conteo = Array<{ count: number }> | null

type FilaCruda = FeedPostRow & {
  autor: AutorResumen | null
  partido: Publicacion['partido']
  likes: Conteo
  comentarios: Conteo
  mio: Array<{ user_id: string }> | null
}

function cuantos(c: Conteo): number {
  return c?.[0]?.count ?? 0
}

function aPublicacion(fila: FilaCruda): Publicacion {
  return {
    ...fila,
    meGusta: cuantos(fila.likes),
    yaDiMeGusta: (fila.mio ?? []).length > 0,
    comentarios: cuantos(fila.comentarios),
  }
}

/** Cuántas publicaciones trae cada tanda. */
export const POR_PAGINA = 8

/**
 * El muro, por tandas.
 *
 * En "siguiendo" salen solo quienes el jugador sigue; en "descubrir", lo que las
 * políticas le dejan ver dentro de su ciudad. Filtrar por privacidad no es tarea
 * del cliente: eso ya lo hace la base.
 *
 * La ciudad se resuelve ANTES de pedir las publicaciones, no después. Filtrando
 * al final, una tanda de ocho podía quedarse en dos tras descartar las de fuera,
 * y el scroll infinito se llenaba de tandas medio vacías sin que se notara por
 * qué.
 */
export async function publicaciones(
  yo: string,
  pestana: 'siguiendo' | 'descubrir',
  ciudad?: string,
  desde = 0,
): Promise<Publicacion[]> {
  let deQuienes: string[] | null = null

  if (pestana === 'siguiendo') {
    const { data: seguidos } = await supabase
      .from('follows')
      .select('followed_id')
      .eq('follower_id', yo)
      .eq('estado', 'aceptado')

    deQuienes = [...(seguidos ?? []).map((s) => s.followed_id), yo]
  } else if (ciudad) {
    const { data: locales } = await supabase.from('users').select('id').eq('ciudad', ciudad)
    deQuienes = (locales ?? []).map((u) => u.id)
  }

  let consulta = supabase
    .from('feed_posts')
    .select(SELECT_PUBLICACION)
    // el me gusta propio: de todas las filas de la publicación, solo la tuya
    .eq('mio.user_id', yo)
    .order('created_at', { ascending: false })
    .range(desde, desde + POR_PAGINA - 1)

  if (deQuienes) consulta = consulta.in('user_id', deQuienes)

  const { data, error } = await consulta
  if (error) throw new Error(error.message)

  return ((data as unknown as FilaCruda[]) ?? []).map(aPublicacion)
}

/** Una publicación suelta, para su propia pantalla. */
export async function publicacionPorId(
  id: string,
  yo: string,
): Promise<Publicacion | null> {
  const { data, error } = await supabase
    .from('feed_posts')
    .select(SELECT_PUBLICACION)
    .eq('id', id)
    .eq('mio.user_id', yo)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return aPublicacion(data as unknown as FilaCruda)
}

export async function publicacionesDe(userId: string, yo: string): Promise<Publicacion[]> {
  const { data, error } = await supabase
    .from('feed_posts')
    .select(SELECT_PUBLICACION)
    .eq('user_id', userId)
    .eq('mio.user_id', yo)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return ((data as unknown as FilaCruda[]) ?? []).map(aPublicacion)
}

export async function crearPublicacion(datos: {
  userId: string
  contenido: string | null
  matchId: string | null
  imagenUrl: string | null
}) {
  const { error } = await supabase.from('feed_posts').insert({
    user_id: datos.userId,
    contenido: datos.contenido,
    match_id: datos.matchId,
    imagen_url: datos.imagenUrl,
  })
  if (error) throw new Error(error.message)
}

/** Solo cambia el texto: la foto y el partido de una publicación no se editan. */
export async function editarPublicacion(id: string, contenido: string | null) {
  const { error } = await supabase
    .from('feed_posts')
    .update({ contenido })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function borrarPublicacion(id: string) {
  const { error } = await supabase.from('feed_posts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Sube la foto a la carpeta del jugador y devuelve su URL pública. */
export async function subirImagen(userId: string, archivo: File): Promise<string> {
  const extension = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const ruta = `${userId}/${crypto.randomUUID()}.${extension}`

  const { error } = await supabase.storage
    .from('feed-images')
    .upload(ruta, archivo, { cacheControl: '3600', upsert: false })

  if (error) throw new Error(error.message)

  return supabase.storage.from('feed-images').getPublicUrl(ruta).data.publicUrl
}

export async function alternarMeGusta(postId: string, userId: string, dar: boolean) {
  if (dar) {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }
}

export interface Comentario {
  id: string
  contenido: string
  created_at: string
  autor: { id: string; nombre: string } | null
}

export async function comentariosDe(postId: string): Promise<Comentario[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('id, contenido, created_at, autor:users!comments_user_id_fkey (id, nombre)')
    .eq('post_id', postId)
    .order('created_at')

  if (error) throw new Error(error.message)
  return (data as unknown as Comentario[]) ?? []
}

export async function comentar(postId: string, userId: string, contenido: string) {
  const { error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: userId, contenido: contenido.trim() })
  if (error) throw new Error(error.message)
}

export interface JugadorBuscado {
  id: string
  nombre: string
  username: string | null
  foto_url: string | null
  cuenta_privada: boolean
  /** Mi relación con él: null si no lo sigo. */
  estado: FollowEstado | null
}

/**
 * Busca jugadores por nombre o por usuario.
 *
 * Con el buscador vacío devuelve a quienes más partidos han jugado: al empezar,
 * lo útil es ver quién está activo, no una lista alfabética.
 */
export async function buscarJugadores(
  texto: string,
  yo: string,
): Promise<JugadorBuscado[]> {
  // la busqueda la resuelve la base: las cuentas privadas solo salen si
  // escribes dos letras del principio de su nombre de usuario
  const { data, error } = await supabase.rpc('buscar_jugadores', {
    p_texto: texto,
    p_excluir: [yo],
  })
  if (error) throw new Error(error.message)

  const encontrados = data ?? []
  if (encontrados.length === 0) return []

  const { data: relaciones } = await supabase
    .from('follows')
    .select('followed_id, estado')
    .eq('follower_id', yo)
    .in(
      'followed_id',
      encontrados.map((u) => u.id),
    )

  const porId = new Map((relaciones ?? []).map((r) => [r.followed_id, r.estado]))

  return encontrados.map((u) => ({ ...u, estado: porId.get(u.id) ?? null }))
}

// ----------------------------------------------------------------- seguidores

export async function seguir(usuarioId: string): Promise<FollowEstado> {
  const { data, error } = await supabase.rpc('seguir', { p_usuario: usuarioId })
  if (error) throw new Error(error.message)
  return data as FollowEstado
}

export async function dejarDeSeguir(usuarioId: string, yo: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', yo)
    .eq('followed_id', usuarioId)
  if (error) throw new Error(error.message)
}

export async function aceptarSeguidor(seguidorId: string, yo: string) {
  const { error } = await supabase
    .from('follows')
    .update({ estado: 'aceptado' })
    .eq('follower_id', seguidorId)
    .eq('followed_id', yo)
  if (error) throw new Error(error.message)
}

export async function rechazarSeguidor(seguidorId: string, yo: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', seguidorId)
    .eq('followed_id', yo)
  if (error) throw new Error(error.message)
}

export interface RelacionSeguimiento {
  estado: FollowEstado | null
  seguidores: number
  siguiendo: number
  /** Si pediste que te avisen cuando esta persona publique. */
  avisos: boolean
}

/**
 * Avisos de las publicaciones de alguien en concreto.
 *
 * Arranca apagado y se prende persona por persona. Avisar de todo lo que
 * publica todo el que sigues es lo que hace que la gente apague las
 * notificaciones enteras, y con ellas las que sí importan.
 */
export async function alternarAvisosDe(usuarioId: string, activo: boolean) {
  const { error } = await supabase.rpc('alternar_avisos_de', {
    p_usuario: usuarioId,
    p_activo: activo,
  })
  if (error) throw new Error(error.message)
}

export async function relacionCon(usuarioId: string, yo: string): Promise<RelacionSeguimiento> {
  const [mia, seguidores, siguiendo] = await Promise.all([
    supabase
      .from('follows')
      .select('estado, avisar_publicaciones')
      .eq('follower_id', yo)
      .eq('followed_id', usuarioId)
      .maybeSingle(),
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('followed_id', usuarioId)
      .eq('estado', 'aceptado'),
    supabase
      .from('follows')
      .select('followed_id', { count: 'exact', head: true })
      .eq('follower_id', usuarioId)
      .eq('estado', 'aceptado'),
  ])

  return {
    estado: mia.data?.estado ?? null,
    avisos: mia.data?.avisar_publicaciones ?? false,
    seguidores: seguidores.count ?? 0,
    siguiendo: siguiendo.count ?? 0,
  }
}

/** Lo justo para pintar a alguien en una lista y poder abrir su perfil. */
export interface JugadorBreve {
  id: string
  nombre: string
  username: string | null
  foto_url: string | null
}

const CAMPOS_BREVE = 'id, nombre, username, foto_url'

/** Quiénes lo siguen. Solo los aceptados: una solicitud pendiente no es seguir. */
export async function seguidoresDe(usuarioId: string): Promise<JugadorBreve[]> {
  const { data, error } = await supabase
    .from('follows')
    .select(`seguidor:users!follows_follower_id_fkey (${CAMPOS_BREVE})`)
    .eq('followed_id', usuarioId)
    .eq('estado', 'aceptado')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as unknown as Array<{ seguidor: JugadorBreve | null }>)
    .map((f) => f.seguidor)
    .filter((u): u is JugadorBreve => u !== null)
}

/** A quiénes sigue. */
export async function siguiendoDe(usuarioId: string): Promise<JugadorBreve[]> {
  const { data, error } = await supabase
    .from('follows')
    .select(`seguido:users!follows_followed_id_fkey (${CAMPOS_BREVE})`)
    .eq('follower_id', usuarioId)
    .eq('estado', 'aceptado')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data as unknown as Array<{ seguido: JugadorBreve | null }>)
    .map((f) => f.seguido)
    .filter((u): u is JugadorBreve => u !== null)
}

/** Solicitudes que esperan mi respuesta. */
export async function solicitudesPendientes(yo: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id, created_at, solicitante:users!follows_follower_id_fkey (id, nombre)')
    .eq('followed_id', yo)
    .eq('estado', 'pendiente')
    .order('created_at')

  if (error) throw new Error(error.message)
  return (data as unknown as Array<{
    follower_id: string
    solicitante: { id: string; nombre: string } | null
  }>) ?? []
}

/**
 * Quiénes le dieron me gusta a una publicación.
 *
 * La base solo se lo responde a quien publicó. En el feed nadie ve la lista: se
 * ve el número, y punto.
 */
export async function likesDePost(postId: string): Promise<LikeHistoriaRow[]> {
  const { data, error } = await supabase.rpc('likes_de_post', { p_post: postId })
  if (error) throw new Error(error.message)
  return data ?? []
}
