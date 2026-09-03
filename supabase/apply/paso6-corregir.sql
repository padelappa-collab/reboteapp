-- =============================================================================
-- Corregir el marcador de un partido en disputa.
--
-- Antes, disputar un partido lo dejaba muerto: no se puede borrar, y volver a
-- registrarlo choca con la regla de no duplicados. O sea que "no estoy de
-- acuerdo" acababa funcionando como "cancelado", que no es lo que significa.
--
-- Lo que corresponde es arreglar el marcador y volver a pedir las
-- confirmaciones. Quien corrige queda confirmado de entrada, como cuando se
-- registra el partido, y los otros tres tienen que volver a confirmar: si el
-- resultado cambió, el visto bueno anterior ya no vale.
-- =============================================================================

create or replace function public.corregir_marcador(p_match_id uuid, p_sets jsonb)
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
    raise exception 'Solo los jugadores del partido pueden corregirlo';
  end if;

  if v_match.estado = 'confirmado' then
    raise exception 'El partido ya está confirmado: el ELO ya se movió';
  end if;

  if v_match.estado = 'cancelado' then
    raise exception 'Este partido está cancelado';
  end if;

  update public.matches
     set sets = p_sets,
         -- ganador_de_sets valida el marcador y falla si no cuadra
         ganador = public.ganador_de_sets(p_sets),
         estado = 'pendiente',
         resultado_confirmado_por = array[v_uid],
         confirmado_at = null
   where id = p_match_id
   returning * into v_match;

  return v_match;
end;
$$;

revoke execute on function public.corregir_marcador(uuid, jsonb) from anon;
