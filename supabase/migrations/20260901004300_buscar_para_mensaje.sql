-- =============================================================================
-- Buscar a quién escribirle.
--
-- Devuelve solo a quien de verdad se le puede escribir, con la misma regla que
-- aplica `conversacion_con`: a quien sigues, o a cualquier cuenta pública. Sería
-- fácil reutilizar el buscador general y dejar que la base rechace al pulsar,
-- pero entonces la lista ofrece nombres que fallan al tocarlos, y eso se siente
-- como un error de la app y no como una regla.
--
-- Sin texto se muestran primero los que sigues: son con quienes se habla, y
-- ahorra escribir en el caso más común.
-- =============================================================================

create or replace function public.buscar_para_mensaje(p_texto text default '')
returns table (
  user_id  uuid,
  nombre   text,
  username text,
  foto_url text,
  lo_sigo  boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with yo as (select auth.uid() as id),
  q as (select btrim(coalesce(p_texto, '')) as t),
  sigo as (
    select followed_id as id from public.follows, yo
     where follower_id = yo.id and estado = 'aceptado'
  )
  select u.id, u.nombre, u.username, u.foto_url,
         u.id in (select id from sigo)
    from public.users u, yo, q
   where u.id <> yo.id
     -- la regla de quién puede recibir tu mensaje
     and (not u.cuenta_privada or u.id in (select id from sigo))
     and (
       q.t = ''
       or u.nombre   ilike '%' || q.t || '%'
       or u.username ilike '%' || q.t || '%'
     )
   -- primero con quien ya hablas, después el resto por nombre
   order by (u.id in (select id from sigo)) desc, u.nombre
   limit 20;
$$;

revoke execute on function public.buscar_para_mensaje(text) from anon;
grant execute on function public.buscar_para_mensaje(text) to authenticated;
