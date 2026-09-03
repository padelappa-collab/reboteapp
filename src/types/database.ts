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
  ciudad?: string
  foto_url?: string | null
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
    }
    Enums: {
      genero: Genero
      ranking_tipo: RankingTipo
      match_estado: MatchEstado
      board_estado: BoardEstado
    }
    CompositeTypes: Record<never, never>
  }
}
