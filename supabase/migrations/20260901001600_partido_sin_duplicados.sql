-- =============================================================================
-- Un partido solo se registra una vez.
--
-- Los cuatro jugadores pueden registrar el resultado, y eso está bien: no hay
-- que esperar a que lo haga quien organizó. Pero si dos lo hacen, aparecen dos
-- partidos iguales y el ELO se movería dos veces por un solo partido jugado.
--
-- No sirve una restricción de unicidad normal: los mismos cuatro juegan muchas
-- veces, así que el duplicado se reconoce por ser el mismo cuarteto a una hora
-- cercana. Eso hay que mirarlo fila por fila, con un trigger.
-- =============================================================================

-- Los cuatro jugadores en orden, para poder comparar cuartetos sin importar
-- cómo quedaron repartidos en las parejas.
create or replace function public.jugadores_ordenados(p_jugadores uuid[])
returns uuid[]
language sql
immutable
as $$
  select array_agg(j order by j) from unnest(p_jugadores) as j;
$$;

-- Cuánto margen se considera "el mismo partido". Tres horas cubre que cada
-- quien anote una hora distinta de un partido que sí fue el mismo.
create or replace function public.matches_sin_duplicado()
returns trigger
language plpgsql
as $$
declare
  v_jugadores uuid[] := public.jugadores_ordenados(new.pareja_a || new.pareja_b);
  v_existente uuid;
begin
  select m.id into v_existente
    from public.matches m
   where m.estado <> 'cancelado'
     and public.jugadores_ordenados(m.pareja_a || m.pareja_b) = v_jugadores
     and abs(extract(epoch from (m.fecha - new.fecha))) < 3 * 3600
   limit 1;

  if v_existente is not null then
    raise exception
      'Este partido ya está registrado. Si el marcador no es el correcto, ábrelo y marca que no estás de acuerdo.'
      using errcode = 'unique_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists matches_no_duplicar on public.matches;

create trigger matches_no_duplicar
  before insert on public.matches
  for each row execute function public.matches_sin_duplicado();

-- ---------------------------------------------------------------------------
-- Y una publicación tampoco puede quedar enlazada a dos partidos distintos.
-- ---------------------------------------------------------------------------
create or replace function public.vincular_partido(p_post_id uuid, p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post  public.board_posts;
  v_match public.matches;
  v_uid   uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión';
  end if;

  select * into v_post from public.board_posts where id = p_post_id for update;
  select * into v_match from public.matches where id = p_match_id;

  if v_post.id is null or v_match.id is null then
    raise exception 'La publicación o el partido no existen';
  end if;

  if v_post.match_id is not null and v_post.match_id <> p_match_id then
    raise exception 'Esta publicación ya tiene un partido registrado';
  end if;

  if not (v_uid = any (v_match.pareja_a || v_match.pareja_b)) then
    raise exception 'Solo los jugadores del partido pueden enlazarlo';
  end if;

  if not (
    v_uid = v_post.user_id
    or v_uid = any (v_post.acompanantes)
    or exists (
      select 1 from public.board_post_signups
       where post_id = p_post_id and user_id = v_uid
    )
  ) then
    raise exception 'No estás en esta publicación';
  end if;

  update public.board_posts
     set match_id = p_match_id,
         estado = 'completo'
   where id = p_post_id;
end;
$$;
