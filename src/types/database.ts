/**
 * Tipos de la base de datos, escritos a mano a partir de las migraciones.
 *
 * Cuando haya acceso a la CLI conviene regenerarlos con:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 * Mientras tanto, este archivo tiene que seguir a las migraciones de
 * supabase/migrations/.
 */

export type Genero = 'masculino' | 'femenino'
export type RankingTipo = 'masculino' | 'femenino' | 'mixto'
export type MatchEstado = 'pendiente' | 'confirmado' | 'disputado' | 'cancelado'
export type BoardEstado = 'abierto' | 'completo' | 'cancelado'

// Todos los tipos de fila son `type` y no `interface` a propósito: postgrest-js
// exige una index signature implícita, y las interfaces no la tienen.

/** Un set del marcador: juegos de cada pareja. */
export type SetMarcador = {
  a: number
  b: number
}

export type UserRow = {
  id: string
  nombre: string
  /** Único y opcional. El nombre real no es único. */
  username: string | null
  ciudad: string
  genero: Genero
  categoria_inicial: string
  foto_url: string | null
  elo_masculino: number | null
  elo_femenino: number | null
  elo_mixto: number
  peak_elo_masculino: number | null
  peak_elo_femenino: number | null
  peak_elo_mixto: number
  partidos_jugados: number
  numero_registro: number
  /** Solo afecta al feed: el ranking y los partidos siguen siendo públicos. */
  cuenta_privada: boolean
  created_at: string
  updated_at: string
}

/** Lo que el cliente puede mandar: el resto lo derivan los triggers. */
export type UserInsert = {
  id: string
  nombre: string
  ciudad: string
  genero: Genero
  categoria_inicial: string
  foto_url?: string | null
}

export type UserUpdate = {
  nombre?: string
  username?: string | null
  ciudad?: string
  foto_url?: string | null
  cuenta_privada?: boolean
}

export type CourtRow = {
  id: string
  nombre: string
  ciudad: string
  direccion: string | null
  cantidad_canchas: number | null
  booking_url: string | null
  whatsapp: string | null
  telefono: string | null
  lat: number | null
  lng: number | null
  nota: string | null
  verificado: boolean
  created_at: string
  updated_at: string
}

export type MatchRow = {
  id: string
  fecha: string
  cancha_id: string | null
  creado_por: string
  pareja_a: [string, string]
  pareja_b: [string, string]
  sets: SetMarcador[]
  ganador: 'a' | 'b'
  match_type: RankingTipo
  resultado_confirmado_por: string[]
  estado: MatchEstado
  created_at: string
  updated_at: string
  confirmado_at: string | null
  cancelado_por: string | null
  cancelado_at: string | null
}

export type MatchInsert = {
  fecha: string
  cancha_id?: string | null
  creado_por: string
  pareja_a: [string, string]
  pareja_b: [string, string]
  sets: SetMarcador[]
}

export type EloHistoryRow = {
  id: string
  user_id: string
  match_id: string
  ranking: RankingTipo
  elo_antes: number
  elo_despues: number
  delta: number
  k_usado: number
  fecha: string
}

export type BoardPostRow = {
  id: string
  user_id: string
  /** Quienes ya van con el autor, sin contarlo a él. */
  acompanantes: string[]
  /** Derivada en la base: 3 menos los acompañantes. */
  faltan: 1 | 2 | 3
  /** El partido que salió de esta publicación, si ya se registró. */
  match_id: string | null
  fecha_partido: string
  nivel_buscado: string | null
  cancha_id: string | null
  nota: string | null
  estado: BoardEstado
  created_at: string
  updated_at: string
}

export type BoardPostInsert = {
  user_id: string
  acompanantes: string[]
  fecha_partido: string
  nivel_buscado?: string | null
  cancha_id?: string | null
  nota?: string | null
}

/** El estado lo cambia el autor: cerrar el cupo o cancelar. */
export type BoardPostUpdate = {
  estado?: BoardEstado
  acompanantes?: string[]
  nivel_buscado?: string | null
  nota?: string | null
  fecha_partido?: string
  cancha_id?: string | null
}

export type BoardPostSignupInsert = {
  post_id: string
  user_id: string
}

export type BoardPostSignupRow = {
  post_id: string
  user_id: string
  created_at: string
}

export type FollowEstado = 'pendiente' | 'aceptado'

export type FollowRow = {
  follower_id: string
  followed_id: string
  estado: FollowEstado
  created_at: string
}

export type FeedPostRow = {
  id: string
  user_id: string
  contenido: string | null
  match_id: string | null
  imagen_url: string | null
  created_at: string
}

export type FeedPostInsert = {
  user_id: string
  contenido?: string | null
  match_id?: string | null
  imagen_url?: string | null
}

export type CommentRow = {
  id: string
  post_id: string
  user_id: string
  contenido: string
  created_at: string
}

export type CommentInsert = {
  post_id: string
  user_id: string
  contenido: string
}

export type PostLikeRow = {
  post_id: string
  user_id: string
  created_at: string
}

export type PostLikeInsert = {
  post_id: string
  user_id: string
}

export type BadgeRow = {
  id: string
  nombre: string
  descripcion: string
  icono: string
  categoria: string
  periodica: boolean
  orden: number
}

export type UserBadgeRow = {
  user_id: string
  badge_id: string
  fecha_obtenido: string
}

type Tabla<Row, Insert = Row, Update = Partial<Insert>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

/**
 * Tablas que el cliente no puede escribir por RLS. No se puede usar `never`
 * aquí: postgrest-js exige `Record<string, unknown>` y con `never` todo el
 * esquema deja de tipar.
 */
type NoEscribible = Record<string, never>

export type Database = {
  public: {
    Tables: {
      users: Tabla<UserRow, UserInsert, UserUpdate>
      courts: Tabla<CourtRow, NoEscribible, NoEscribible>
      matches: Tabla<MatchRow, MatchInsert, NoEscribible>
      elo_history: Tabla<EloHistoryRow, NoEscribible, NoEscribible>
      board_posts: Tabla<BoardPostRow, BoardPostInsert, BoardPostUpdate>
      board_post_signups: Tabla<BoardPostSignupRow, BoardPostSignupInsert, NoEscribible>
      follows: Tabla<FollowRow, FollowRow, Partial<FollowRow>>
      feed_posts: Tabla<FeedPostRow, FeedPostInsert>
      comments: Tabla<CommentRow, CommentInsert, NoEscribible>
      post_likes: Tabla<PostLikeRow, PostLikeInsert, NoEscribible>
      badges: Tabla<BadgeRow, NoEscribible, NoEscribible>
      user_badges: Tabla<UserBadgeRow, NoEscribible, NoEscribible>
    }
    Views: Record<never, never>
    Functions: {
      categoria_desde_elo: {
        Args: { p_elo: number; p_ranking: RankingTipo; p_peak: number }
        Returns: string
      }
      nivel_estrella: {
        Args: { p_elo: number; p_ranking: RankingTipo; p_peak: number }
        Returns: number
      }
      elo_inicial: {
        Args: { p_categoria: string; p_genero: Genero }
        Returns: number
      }
      k_factor: {
        Args: { p_partidos: number }
        Returns: number
      }
      puntaje_esperado: {
        Args: { p_propio: number; p_rival: number }
        Returns: number
      }
      delta_elo: {
        Args: {
          p_elo_pareja: number
          p_elo_rival: number
          p_gano: boolean
          p_partidos: number
        }
        Returns: number
      }
      confirm_match: {
        Args: { p_match_id: string }
        Returns: MatchRow
      }
      dispute_match: {
        Args: { p_match_id: string }
        Returns: MatchRow
      }
      cancel_match: {
        Args: { p_match_id: string }
        Returns: MatchRow
      }
      salir_publicacion: {
        Args: { p_post_id: string }
        Returns: undefined
      }
      corregir_marcador: {
        Args: { p_match_id: string; p_sets: SetMarcador[] }
        Returns: MatchRow
      }
      seguir: {
        Args: { p_usuario: string }
        Returns: FollowEstado
      }
      puede_ver_feed_de: {
        Args: { p_autor: string }
        Returns: boolean
      }
      vincular_partido: {
        Args: { p_post_id: string; p_match_id: string }
        Returns: undefined
      }
    }
    Enums: {
      genero: Genero
      ranking_tipo: RankingTipo
      match_estado: MatchEstado
      board_estado: BoardEstado
      follow_estado: FollowEstado
    }
    CompositeTypes: Record<never, never>
  }
}
