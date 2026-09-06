import { supabase } from "@/lib/supabase";

/**
 * Borra del almacenamiento el archivo al que apunta una URL pública.
 *
 * Quitar la fila de la base no borra la foto: el archivo se queda en el bucket
 * ocupando sitio para siempre, visible para quien conserve el enlace. Como el
 * gigabyte del plan es la primera pared con la que vamos a chocar, cada borrado
 * de la app tiene que llevarse también el archivo.
 *
 * No lanza si falla. El borrado que le importa a la persona es el de su
 * publicación; que además quede un archivo suelto es un problema nuestro, no
 * suyo, y no merece un mensaje de error encima de una acción que sí funcionó.
 */
export async function borrarArchivo(
  url: string | null | undefined,
  bucket = "feed-images",
) {
  if (!url) return;

  const trozo = url.split(`/${bucket}/`)[1];
  if (!trozo) return;

  const { error } = await supabase.storage
    .from(bucket)
    .remove([decodeURIComponent(trozo)]);
  if (error) console.error("no se pudo borrar el archivo", error.message);
}
