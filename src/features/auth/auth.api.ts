import { supabase } from '@/lib/supabase'
import type { Genero, UserInsert, UserRow } from '@/types/database'

export type Proveedor = 'google' | 'apple'

export async function entrarConEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(traducirError(error.message))
}

export async function registrarConEmail(email: string, password: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/perfil/nuevo` },
  })
  if (error) throw new Error(traducirError(error.message))
}

export async function entrarConProveedor(proveedor: Proveedor) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: proveedor,
    options: { redirectTo: `${window.location.origin}/` },
  })
  if (error) throw new Error(traducirError(error.message))
}

/**
 * Crea el perfil del jugador. Los ELO no se mandan: los siembra el trigger
 * `users_sembrar_elo` a partir de (categoria_inicial, genero).
 */
export async function crearPerfil(datos: {
  id: string
  nombre: string
  username: string
  ciudad: string
  genero: Genero
  categoriaInicial: string
}): Promise<UserRow> {
  const fila: UserInsert = {
    id: datos.id,
    nombre: datos.nombre.trim(),
    username: datos.username.trim(),
    ciudad: datos.ciudad,
    genero: datos.genero,
    categoria_inicial: datos.categoriaInicial,
  }

  const { data, error } = await supabase.from('users').insert(fila).select().single()
  if (error) {
    // 23503 es la clave foránea contra auth.users: hay sesión en el teléfono
    // pero la cuenta ya no existe. Pasa si la borraste desde otro sitio. El
    // mensaje de Postgres no le dice nada a nadie; esto sí.
    if (error.code === '23503') {
      await supabase.auth.signOut()
      throw new Error(
        'Tu sesión ya no es válida porque la cuenta no existe. Vuelve a entrar.',
      )
    }

    // el índice único del usuario devuelve un error que no dice nada
    throw new Error(
      error.code === '23505'
        ? 'Ese nombre de usuario ya está tomado'
        : traducirError(error.message),
    )
  }
  return data
}

/** ¿Está libre este nombre de usuario? La comparación no distingue mayúsculas. */
export async function usuarioLibre(username: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .ilike('username', username)
  if (error) throw new Error(error.message)
  return (count ?? 0) === 0
}

export async function actualizarPerfil(
  id: string,
  cambios: { nombre?: string; ciudad?: string; foto_url?: string | null },
) {
  const { error } = await supabase.from('users').update(cambios).eq('id', id)
  if (error) throw new Error(traducirError(error.message))
}

/** Los mensajes de Supabase llegan en inglés; los más comunes valen la pena. */
function traducirError(mensaje: string): string {
  const mapa: Record<string, string> = {
    'Invalid login credentials': 'Correo o contraseña incorrectos.',
    'User already registered': 'Ese correo ya tiene una cuenta.',
    'Email not confirmed': 'Todavía no confirmaste tu correo. Revisa la bandeja.',
    'Password should be at least 6 characters.':
      'La contraseña necesita al menos 6 caracteres.',
  }
  return mapa[mensaje] ?? mensaje
}
