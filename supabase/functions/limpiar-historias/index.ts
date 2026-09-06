// =============================================================================
// La limpieza: historias caducadas y archivos que ya no son de nadie.
//
// Antes esto lo hacía una función de SQL que solo borraba la fila. La foto se
// quedaba en el bucket para siempre: cada historia publicada dejaba su archivo
// aunque ya nadie pudiera verla, y el gigabyte del proyecto se llenaba de cosas
// invisibles.
//
// Tiene que vivir aquí y no en SQL porque borrar de verdad un archivo del
// almacenamiento se hace por la API de Storage, no quitando su fila del
// catálogo. Y lo mismo con el vídeo, que está en Cloudflare.
//
// El orden importa: primero los archivos, después las filas. Al revés se pierde
// la referencia y el archivo se queda huérfano sin que nadie sepa que existe.
// =============================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CF_CUENTA = Deno.env.get('CF_ACCOUNT_ID')
const CF_TOKEN = Deno.env.get('CF_STREAM_TOKEN')

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

/** De la URL pública del archivo a su ruta dentro del bucket. */
function rutaDe(url: string): string | null {
  const trozo = url.split('/feed-images/')[1]
  return trozo ? decodeURIComponent(trozo) : null
}

/**
 * Barre los archivos que ya no menciona ninguna fila.
 *
 * Borrar bien en cada sitio no basta: siempre queda alguna forma de dejar un
 * archivo suelto —una subida que sale bien y una publicación que falla justo
 * después, una fila borrada a mano—. Esto no intenta cubrir cada caso, sino
 * preguntar lo contrario una vez por hora: qué hay en los buckets que nadie
 * reclama. La consulta deja fuera lo subido hace menos de una hora para no
 * borrarle la foto a quien todavía está escribiendo el pie.
 */
async function barrerSueltos(): Promise<number> {
  const { data, error } = await supabase.rpc('archivos_huerfanos')
  if (error || !data?.length) return 0

  const porBucket = new Map<string, string[]>()
  for (const f of data as { bucket: string; ruta: string }[]) {
    porBucket.set(f.bucket, [...(porBucket.get(f.bucket) ?? []), f.ruta])
  }

  let borrados = 0
  for (const [bucket, rutas] of porBucket) {
    const { error: fallo } = await supabase.storage.from(bucket).remove(rutas)
    if (fallo) console.error('no se pudo barrer', bucket, fallo.message)
    else borrados += rutas.length
  }
  return borrados
}

Deno.serve(async () => {
  try {
    const { data: caducadas } = await supabase
      .from('stories')
      .select('id, imagen_url, video_uid')
      .lte('expira_at', new Date().toISOString())

    if (!caducadas?.length) {
      return Response.json({ borradas: 0, sueltos: await barrerSueltos() })
    }

    // ------------------------------------------------------------- las fotos
    const rutas = caducadas
      .map((h) => (h.imagen_url ? rutaDe(h.imagen_url) : null))
      .filter((r): r is string => r !== null)

    if (rutas.length) {
      const { error } = await supabase.storage.from('feed-images').remove(rutas)
      if (error) console.error('no se pudieron borrar fotos', error.message)
    }

    // ------------------------------------------------------------ los vídeos
    const videos = caducadas.map((h) => h.video_uid).filter(Boolean) as string[]

    if (videos.length && CF_CUENTA && CF_TOKEN) {
      await Promise.all(
        videos.map(async (uid) => {
          const r = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CF_CUENTA}/stream/${uid}`,
            { method: 'DELETE', headers: { Authorization: `Bearer ${CF_TOKEN}` } },
          )
          // 404 es que ya no estaba: el resultado para nosotros es el mismo
          if (!r.ok && r.status !== 404) {
            console.error('no se pudo borrar el vídeo', uid, r.status)
          }
        }),
      )
    }

    // ------------------------------------------------------------- las filas
    const { error } = await supabase
      .from('stories')
      .delete()
      .in('id', caducadas.map((h) => h.id))

    if (error) throw new Error(error.message)

    return Response.json({
      borradas: caducadas.length,
      fotos: rutas.length,
      videos: videos.length,
      sueltos: await barrerSueltos(),
    })
  } catch (error) {
    console.error('error limpiando historias', error)
    return new Response(String(error), { status: 500 })
  }
})
