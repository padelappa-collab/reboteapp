/**
 * Notificaciones push.
 *
 * En iOS solo funcionan si la app está instalada en la pantalla de inicio, y el
 * permiso hay que pedirlo desde un toque del usuario: si se pide al entrar, el
 * navegador lo ignora o la persona dice que no por reflejo. Y un "no" en iOS es
 * casi definitivo, así que solo se pide cuando alguien lo pulsa a propósito.
 */

import { supabase } from './supabase'

const CLAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY

/** La clave viaja en base64 url-safe y el navegador la quiere en bytes. */
function aBytes(base64: string): ArrayBuffer {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4)
  const normal = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const crudo = atob(normal)
  const bytes = new Uint8Array(crudo.length)
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i)
  return bytes.buffer
}

export function soportaPush(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    Boolean(CLAVE_PUBLICA)
  )
}

/** iOS solo entrega push a la app instalada en la pantalla de inicio. */
export function esIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

export function estaInstalada(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari usa su propia bandera
    (navigator as { standalone?: boolean }).standalone === true
  )
}

export function permisoActual(): NotificationPermission | 'no-soportado' {
  return soportaPush() ? Notification.permission : 'no-soportado'
}

async function registrarWorker(): Promise<ServiceWorkerRegistration> {
  const registro = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  return registro
}

/** ¿Este dispositivo ya está suscrito? */
export async function estaSuscrito(): Promise<boolean> {
  if (!soportaPush() || Notification.permission !== 'granted') return false
  const registro = await navigator.serviceWorker.getRegistration()
  return Boolean(await registro?.pushManager.getSubscription())
}

/**
 * Pide el permiso y guarda la suscripción de este dispositivo.
 * Devuelve el motivo del fallo, o null si salió bien.
 */
export async function activarPush(userId: string): Promise<string | null> {
  if (!soportaPush()) {
    return esIOS() && !estaInstalada()
      ? 'En iPhone hay que agregar REBOTEAPP a la pantalla de inicio para recibir notificaciones.'
      : 'Este navegador no admite notificaciones.'
  }

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') {
    return 'No diste permiso. Puedes activarlo desde los ajustes del navegador.'
  }

  const registro = await registrarWorker()

  const suscripcion =
    (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({
      // obligatorio: cada push tiene que mostrar algo visible
      userVisibleOnly: true,
      applicationServerKey: aBytes(CLAVE_PUBLICA!),
    }))

  const datos = suscripcion.toJSON()
  if (!datos.endpoint || !datos.keys?.p256dh || !datos.keys?.auth) {
    return 'El navegador devolvió una suscripción incompleta.'
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: datos.endpoint,
      p256dh: datos.keys.p256dh,
      auth: datos.keys.auth,
      agente: navigator.userAgent.slice(0, 200),
    },
    { onConflict: 'endpoint' },
  )

  if (error) return error.message

  // el interruptor propio: activarlo aquí evita que quede apagado de antes
  await supabase.from('users').update({ push_activo: true }).eq('id', userId)

  return null
}

/** Deja de recibir en este dispositivo. */
export async function desactivarPush(userId: string) {
  const registro = await navigator.serviceWorker.getRegistration()
  const suscripcion = await registro?.pushManager.getSubscription()

  if (suscripcion) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', suscripcion.endpoint)
    await suscripcion.unsubscribe()
  }

  await supabase.from('users').update({ push_activo: false }).eq('id', userId)
}
