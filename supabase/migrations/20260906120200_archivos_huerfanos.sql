-- Los archivos que ya no son de nadie.
--
-- Aunque la app borre bien de aquí en adelante, siempre habrá formas de dejar un
-- archivo suelto: una subida que sale bien y una publicación que falla justo
-- después, una fila borrada a mano, un camino que no previmos. En vez de
-- confiar en cubrir todos los casos, esto pregunta lo contrario: qué archivos
-- hay en los buckets que ninguna fila menciona.
--
-- El margen de una hora es la red de seguridad. Mientras alguien recorta una
-- foto y escribe el pie, el archivo ya está subido pero su fila todavía no
-- existe: sin ese margen la limpieza le borraría la foto por debajo.

create or replace function public.archivos_huerfanos()
returns table (bucket text, ruta text)
language sql
security definer
set search_path = public, storage
as $$
  select o.bucket_id::text, o.name::text
  from storage.objects o
  where o.created_at < now() - interval '1 hour'
    and (
      (o.bucket_id = 'feed-images'
        and not exists (select 1 from public.feed_posts p where p.imagen_url like '%/' || o.name)
        and not exists (select 1 from public.stories    s where s.imagen_url like '%/' || o.name))
      or
      (o.bucket_id = 'avatars'
        and not exists (select 1 from public.users u where u.foto_url like '%/' || o.name))
    );
$$;

revoke execute on function public.archivos_huerfanos() from public, anon, authenticated;
grant execute on function public.archivos_huerfanos() to service_role;
