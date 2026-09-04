-- =============================================================================
-- Buscar jugadores sin que las cuentas privadas se puedan hojear.
--
-- Hasta ahora los buscadores consultaban `users` directamente desde el
-- navegador, así que abrirlos sin escribir nada listaba a todo el mundo,
-- privados incluidos. Para una cuenta privada eso es justo lo que no debería
-- pasar: la privacidad no vale de mucho si cualquiera puede recorrer la lista
-- entera hasta dar contigo.
--
-- La regla nueva:
--
--   · Cuenta pública: aparece siempre, y se encuentra por nombre o por usuario.
--   · Cuenta privada: aparece solo si escribes al menos dos letras y coinciden
--     con el PRINCIPIO de su nombre de usuario. Hay que saber a quién buscas;
--     no se llega por casualidad.
--
-- Va como función en la base y no como filtro en el cliente porque un filtro en
-- el navegador no protege nada: la clave pública está a la vista y cualquiera
-- puede consultar la tabla por su cuenta. Aquí la tabla deja de consultarse
-- directamente y solo se llega a ella por esta puerta.
--
-- Consecuencia que conviene tener presente: una cuenta privada SIN nombre de
-- usuario no aparece en ninguna búsqueda. Es coherente —sin usuario no hay por
-- dónde buscarla— y es una razón más para ponerse uno, que ya se avisa al
-- entrar y a los tres días.
-- =============================================================================

create or replace function public.buscar_jugadores(
  p_texto   text default '',
  p_excluir uuid[] default '{}'
)
returns table (
  id                 uuid,
  nombre             text,
  username           text,
  foto_url           text,
  cuenta_privada     boolean,
  ciudad             text,
  genero             genero,
  elo_masculino      integer,
  elo_femenino       integer,
  elo_mixto          integer,
  peak_elo_masculino integer,
  peak_elo_femenino  integer,
  peak_elo_mixto     integer,
  partidos_jugados   integer
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (select btrim(coalesce(p_texto, '')) as t)
  select u.id, u.nombre, u.username, u.foto_url, u.cuenta_privada,
         u.ciudad, u.genero,
         u.elo_masculino, u.elo_femenino, u.elo_mixto,
         u.peak_elo_masculino, u.peak_elo_femenino, u.peak_elo_mixto,
         u.partidos_jugados
    from public.users u, q
   where not (u.id = any (coalesce(p_excluir, '{}'::uuid[])))
     and case
           when u.cuenta_privada then
             length(q.t) >= 2 and u.username ilike q.t || '%'
           else
             q.t = ''
             or u.nombre   ilike '%' || q.t || '%'
             or u.username ilike '%' || q.t || '%'
         end
   -- quien tiene usuario primero: es con lo que se distingue a dos jugadores
   -- que se llaman igual, que es la razón de que exista el nombre de usuario
   order by (u.username is null), u.partidos_jugados desc, u.nombre
   limit 15;
$$;

revoke execute on function public.buscar_jugadores(text, uuid[]) from anon;
grant execute on function public.buscar_jugadores(text, uuid[]) to authenticated;
