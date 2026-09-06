/**
 * Instalar REBOTEAPP en la pantalla de inicio.
 *
 * No es un adorno: en iPhone, las notificaciones solo llegan si la app está
 * instalada. Alguien que use REBOTEAPP desde el navegador de Safari nunca se
 * entera de que le falta confirmar un partido, y no tiene forma de saber por
 * qué.
 *
 * Los dos sistemas se comportan muy distinto:
 *
 *   · Android avisa al navegador con `beforeinstallprompt`. Se guarda ese
 *     evento y se dispara cuando la persona lo pide: un botón y ya.
 *   · iOS no expone nada. La única vía es que la persona toque compartir y
 *     elija "Añadir a pantalla de inicio", así que toca explicarlo con dibujos.
 *     Y solo funciona desde Safari: dentro del navegador de Instagram o de
 *     WhatsApp esa opción no existe, que es justo por donde va a llegar media
 *     Cartagena.
 */

/** Lo que Chrome entrega en `beforeinstallprompt`, que no está en los tipos. */
interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type Plataforma =
  | 'instalada'
  | 'android'
  | 'ios-safari'
  /** iPhone, pero dentro de Instagram, Chrome u otro: hay que salir a Safari. */
  | 'ios-navegador'
  | 'escritorio'

let guardado: EventoInstalacion | null = null
const suscriptores = new Set<() => void>()

function avisarCambio() {
  for (const f of suscriptores) f()
}

/**
 * Se engancha antes de pintar nada.
 *
 * El evento de Android se dispara una sola vez y muy temprano, normalmente
 * antes de que React haya montado nada. Si se espera a un efecto, ya pasó y no
 * vuelve: por eso esto se llama desde el arranque y no desde un componente.
 */
export function escucharInstalacion() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // sin esto Chrome muestra su propio aviso cuando le parece
    e.preventDefault()
    guardado = e as EventoInstalacion
    avisarCambio()
  })

  window.addEventListener('appinstalled', () => {
    guardado = null
    avisarCambio()
  })
}

export function suscribirse(f: () => void): () => void {
  suscriptores.add(f)
  return () => suscriptores.delete(f)
}

/** ¿Ya está instalada y abierta desde la pantalla de inicio? */
export function estaInstalada(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari tiene su propia bandera y no entiende display-mode
    (navigator as { standalone?: boolean }).standalone === true
  )
}

export function plataforma(): Plataforma {
  if (estaInstalada()) return 'instalada'

  const ua = navigator.userAgent

  if (/iPad|iPhone|iPod/.test(ua)) {
    // el navegador incrustado de otra app no tiene "añadir a pantalla de inicio"
    const dentroDeOtraApp = /Instagram|FBAN|FBAV|FB_IAB|Line|Twitter|WhatsApp/.test(ua)
    // ni Chrome, Firefox o Edge en iPhone lo ofrecen igual que Safari
    const otroNavegador = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
    return dentroDeOtraApp || otroNavegador ? 'ios-navegador' : 'ios-safari'
  }

  if (/Android/.test(ua)) return 'android'

  return 'escritorio'
}

/** ¿Android nos dejó el evento para instalar de un toque? */
export function hayInstalacionNativa(): boolean {
  return guardado !== null
}

/** Lanza el diálogo de Chrome. Devuelve si la persona aceptó. */
export async function instalar(): Promise<boolean> {
  if (!guardado) return false
  await guardado.prompt()
  const { outcome } = await guardado.userChoice
  // el evento no se puede reutilizar, lo diga quien lo diga
  guardado = null
  avisarCambio()
  return outcome === 'accepted'
}

