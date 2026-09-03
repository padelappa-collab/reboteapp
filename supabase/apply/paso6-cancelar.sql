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
