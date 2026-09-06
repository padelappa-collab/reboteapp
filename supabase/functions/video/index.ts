// =============================================================================
// El puente con Cloudflare Stream.
//
// El teléfono no puede hablar con Cloudflare directamente: haría falta el token
// de la API dentro del JavaScript de la web, y eso es entregárselo a cualquiera.
// Esta función lo guarda y hace dos cosas por encargo:
//
//   · `crear`  pide una URL de subida de un solo uso y devuelve su identificador
//   · `borrar` elimina un vídeo cuando caduca la historia o se borra
//
// El vídeo viaja del teléfono a Cloudflare sin pasar por Supabase, así que no
// consume ni almacenamiento ni tráfico del proyecto.
// =============================================================================

const CUENTA = Deno.env.get('CF_ACCOUNT_ID')!
const TOKEN = Deno.env.get('CF_STREAM_TOKEN')!

/**
 * El tope de duración lo pone Cloudflare, no el cliente.
 *
 * Comprobarlo en el teléfono sirve para avisar rápido, pero se salta con
 * cualquier herramienta. Pidiéndolo aquí, un vídeo más largo lo rechaza el
 * servidor de Cloudflare y no hay forma de colarlo.
 */
const SEGUNDOS_MAX = 30

const API = `https://api.cloudflare.com/client/v4/accounts/${CUENTA}/stream`

function json(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (peticion) => {
  try {
    const { accion, uid } = await peticion.json()

    if (accion === 'crear') {
      const r = await fetch(`${API}/direct_upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: SEGUNDOS_MAX,
          // la URL caduca pronto: es para esta subida y ninguna más
          expiry: new Date(Date.now() + 30 * 60_000).toISOString(),
          requireSignedURLs: false,
        }),
      })

      const datos = await r.json()
      if (!datos.success) {
        // El motivo de Cloudflare viaja hasta aquí. Sin él, un token mal
        // pegado y una cuenta sin Stream dan el mismo mensaje vacío, y no
        // hay forma de distinguirlos sin entrar a los registros.
        const motivo = datos.errors?.[0]
        console.error('cloudflare rechazó la subida', datos.errors)
        return json(
          {
            error: 'No se pudo preparar la subida',
            codigo: motivo?.code,
            detalle: motivo?.message,
          },
          502,
        )
      }

      return json({
        subidaUrl: datos.result.uploadURL,
        uid: datos.result.uid,
      })
    }

    if (accion === 'borrar') {
      if (!uid) return json({ error: 'falta el uid' }, 400)

      const r = await fetch(`${API}/${uid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${TOKEN}` },
      })

      // un 404 es que ya no estaba: para el que llama, el resultado es el mismo
      if (!r.ok && r.status !== 404) {
        console.error('no se pudo borrar', uid, r.status)
        return json({ error: 'No se pudo borrar' }, 502)
      }

      return json({ borrado: true })
    }

    return json({ error: 'acción desconocida' }, 400)
  } catch (error) {
    console.error('error en video', error)
    return json({ error: String(error) }, 500)
  }
})
