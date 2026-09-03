-- =============================================================================
-- PENDIENTE POR APLICAR: cancelar partido + tablon sin jugadores repetidos.
-- Generado concatenando las migraciones. Ejecutar completo, una sola vez.
-- =============================================================================

-- =============================================================================
-- Salirse de un partido.
--
-- Un partido necesita exactamente cuatro jugadores, así que "me salgo" no puede
-- significar quitarme y dejarlo con tres: significa que ese partido no va. Por
-- eso salirse lo cancela para todos, y queda constancia de quién lo hizo.
--
-- Es distinto de "disputado": disputar es no estar de acuerdo con el marcador
-- de un partido que sí se jugó; cancelar es que el partido no cuenta.
-- =============================================================================

alter type match_estado add value if not exists 'cancelado';

alter table public.matches
  add column if not exists cancelado_por uuid references public.users (id) on delete set null,
  add column if not exists cancelado_at timestamptz;

create or replace function public.cancel_match(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.matches;
  v_uid   uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;

  if v_match.id is null then
    raise exception 'El partido no existe';
  end if;

  if not (v_uid = any (v_match.pareja_a || v_match.pareja_b)) then
    raise exception 'Solo los jugadores del partido pueden cancelarlo';
  end if;

  -- una vez confirmado el ELO ya se movió; deshacerlo es otra operación
  if v_match.estado = 'confirmado' then
    raise exception 'El partido ya está confirmado y no se puede cancelar';
  end if;

  update public.matches
     set estado = 'cancelado',
         cancelado_por = v_uid,
         cancelado_at = now()
   where id = p_match_id
   returning * into v_match;

  return v_match;
end;
$$;

revoke execute on function public.cancel_match(uuid) from anon;

-- =============================================================================
-- Nadie puede ocupar dos veces el mismo cupo.
--
-- La llave primaria ya impedía apuntarse dos veces, pero no que se apuntara
-- quien ya iba: el autor de la publicación o alguno de sus acompañantes. Si eso
-- pasaba, la publicación mostraba a la misma persona dos veces y el partido que
-- salía de ahí llegaba con jugadores repetidos.
-- =============================================================================

create or replace function public.board_signup_valido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post public.board_posts;
begin
  select * into v_post from public.board_posts where id = new.post_id;

  if v_post.id is null then
    raise exception 'La publicación no existe';
  end if;

  if new.user_id = v_post.user_id then
    raise exception 'Quien publica ya está en el partido';
  end if;

  if new.user_id = any (v_post.acompanantes) then
    raise exception 'Ese jugador ya iba en el partido';
  end if;

  return new;
end;
$$;

drop trigger if exists board_signups_validar on public.board_post_signups;

create trigger board_signups_validar
  before insert on public.board_post_signups
  for each row execute function public.board_signup_valido();
