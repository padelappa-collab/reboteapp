import { Camera, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/features/auth/useAuth'
import { supabase } from '@/lib/supabase'

/** El bucket rechaza cualquier cosa más grande, mejor decirlo antes de subir. */
const MAXIMO = 2 * 1024 * 1024

function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/**
 * La foto de perfil se cambia tocando la foto.
 *
 * No hay botón aparte: el sitio donde uno busca cambiar su foto es la foto
 * misma. La cámara pequeña de la esquina está para que se note que se puede
 * tocar, porque un avatar sin más no parece un botón.
 */
export function AvatarUploader() {
  const { perfil, refrescarPerfil } = useAuth()
  const entrada = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)

  if (!perfil) return null

  async function elegida(archivo: File) {
    if (!archivo.type.startsWith('image/')) {
      toast.error('Tiene que ser una imagen')
      return
    }
    if (archivo.size > MAXIMO) {
      toast.error('La foto pesa más de 2 MB. Prueba con una más pequeña.')
      return
    }

    setSubiendo(true)
    const anterior = perfil!.foto_url

    try {
      const extension = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const ruta = `${perfil!.id}/${crypto.randomUUID()}.${extension}`

      const { error: fallo } = await supabase.storage
        .from('avatars')
        .upload(ruta, archivo, {
      // Un año. Los archivos llevan un nombre único e irrepetible, así que una
      // foto nunca cambia de contenido: volver a pedirla al servidor es tráfico
      // tirado. Con la hora que había por defecto, la misma persona se
      // descargaba el mismo feed varias veces al día.
      cacheControl: '31536000',
      upsert: false,
    })
      if (fallo) throw new Error(fallo.message)

      const url = supabase.storage.from('avatars').getPublicUrl(ruta).data.publicUrl

      const { error } = await supabase
        .from('users')
        .update({ foto_url: url })
        .eq('id', perfil!.id)
      if (error) throw new Error(error.message)

      // la foto vieja ya no la mira nadie; dejarla solo llena el almacenamiento
      if (anterior) {
        const parte = anterior.split('/avatars/')[1]
        if (parte) await supabase.storage.from('avatars').remove([parte])
      }

      await refrescarPerfil()
      toast.success('Foto actualizada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo subir la foto')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <button
      type="button"
      className="relative shrink-0 rounded-full"
      disabled={subiendo}
      aria-label={perfil.foto_url ? 'Cambiar tu foto' : 'Poner una foto'}
      onClick={() => entrada.current?.click()}
    >
      <Avatar className="size-16">
        {perfil.foto_url && <AvatarImage src={perfil.foto_url} alt="" />}
        <AvatarFallback>{iniciales(perfil.nombre)}</AvatarFallback>
      </Avatar>

      <span
        className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center
                   rounded-full border-2 border-background bg-primary text-primary-foreground"
      >
        {subiendo ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Camera className="size-3" />
        )}
      </span>

      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0]
          // se limpia para que elegir la misma foto otra vez vuelva a contar
          e.target.value = ''
          if (archivo) elegida(archivo)
        }}
      />
    </button>
  )
}
