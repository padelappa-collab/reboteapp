// =============================================================================
// Envía al teléfono los avisos que se insertan en `notifications`.
//
// La dispara un webhook de la base: cada vez que nace una novedad, esta función
// busca los dispositivos de ese jugador y les manda el push.
//
// Que el disparo venga de la base y no del cliente importa: el aviso llega
// aunque quien lo provocó haya cerrado la app en ese instante.
// =============================================================================

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:padelappa@gmail.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  // la service role salta las políticas: esta función necesita leer las
  // suscripciones de cualquier jugador, no solo las de quien llama
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

interface Novedad {
  user_id: string
  tipo: string
  titulo: string
  cuerpo: string | null
  enlace: string | null
}

Deno.serve(async (peticion) => {
  try {
    const cuerpo = await peticion.json()
    const novedad: Novedad | undefined = cuerpo.record

    if (!novedad?.user_id) {
      return new Response('sin novedad en la petición', { status: 400 })
    }

    // el jugador puede haber apagado los push sin revocar el permiso
    const { data: jugador } = await supabase
      .from('users')
      .select('push_activo')
      .eq('id', novedad.user_id)
      .maybeSingle()

    if (!jugador?.push_activo) {
      return new Response(JSON.stringify({ enviados: 0, motivo: 'push apagado' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: suscripciones } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', novedad.user_id)

    if (!suscripciones?.length) {
      return new Response(JSON.stringify({ enviados: 0, motivo: 'sin dispositivos' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const carga = JSON.stringify({
      titulo: novedad.titulo,
      cuerpo: novedad.cuerpo ?? '',
      enlace: novedad.enlace ?? '/novedades',
      tipo: novedad.tipo,
    })

    let enviados = 0
    const caducadas: string[] = []

    await Promise.all(
      suscripciones.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            carga,
          )
          enviados++
        } catch (error) {
          // 404 y 410 significan que ese dispositivo ya no existe: desinstaló la
          // app o limpió los datos. Guardarlo solo haría fallar los envíos
          // siguientes, así que se borra.
          const codigo = (error as { statusCode?: number }).statusCode
          if (codigo === 404 || codigo === 410) {
            caducadas.push(s.id)
          } else {
            console.error('fallo al enviar push', codigo, error)
          }
        }
      }),
    )

    if (caducadas.length) {
      await supabase.from('push_subscriptions').delete().in('id', caducadas)
    }

    return new Response(
      JSON.stringify({ enviados, caducadas: caducadas.length }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('error en enviar-push', error)
    return new Response(String(error), { status: 500 })
  }
})
