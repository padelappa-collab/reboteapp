/**
 * Banderas de producto.
 *
 * Sign in with Apple queda implementado pero apagado: encenderlo exige una
 * cuenta de Apple Developer de pago y configurar el proveedor en Supabase, y
 * eso viene despues de validar el piloto en web. Para activarlo basta poner
 * VITE_APPLE_SIGN_IN=true en el entorno.
 */
export const APPLE_SIGN_IN_HABILITADO = import.meta.env.VITE_APPLE_SIGN_IN === 'true'
