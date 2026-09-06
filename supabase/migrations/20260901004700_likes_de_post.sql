-- =============================================================================
-- Quiénes le dieron me gusta a una publicación. Solo para quien la publicó.
--
-- El feed pasa a mostrar únicamente el número. La lista de nombres es cosa del
-- autor y vive en su propia pantalla, igual que en los me gusta de historias.
--
-- Una nota sobre hasta dónde llega esto: la política de `post_likes` deja leer
-- las filas a cualquiera que pueda ver la publicación, y así tiene que ser para
-- que el conteo público funcione —un conteo respeta las mismas reglas que una
-- lectura—. Esta función pone la regla donde la app la aplica, pero no esconde
-- las filas del API. Para eso habría que cerrar la política y servir también el
-- contador desde aquí.
-- =============================================================================

create or replace function public.likes_de_post(p_post uuid)
returns table (user_id uuid, nombre text, username text, foto_url text, cuando timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.nombre, u.username, u.foto_url, l.created_at
    from public.post_likes l
    join public.users u on u.id = l.user_id
   where l.post_id = p_post
     and exists (
       select 1 from public.feed_posts f
        where f.id = p_post and f.user_id = auth.uid()
     )
   order by l.created_at desc;
$$;

revoke execute on function public.likes_de_post(uuid) from public, anon;
grant execute on function public.likes_de_post(uuid) to authenticated;
