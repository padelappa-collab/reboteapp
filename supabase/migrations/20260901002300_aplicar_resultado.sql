-- =============================================================================
-- Aplicar un resultado sin pasar por las cuatro confirmaciones.
--
-- El cálculo del ELO estaba dentro de confirm_match, que es el camino normal:
-- los cuatro jugadores confirman y ahí se mueve. Los torneos necesitan el mismo
-- cálculo por otra puerta, porque quien organiza registra el resultado y cuenta
-- de inmediato.
--
-- En vez de copiar la fórmula en dos sitios —que es como se terminan
-- desincronizando— se extrae a aplicar_resultado() y confirm_match la llama.
-- =============================================================================

create or replace function public.aplicar_resultado(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match     public.matches;
  v_jugadores uuid[];
  v_elo_a     numeric;
  v_elo_b     numeric;
  v_jugador   record;
  v_elo_antes integer;
  v_delta     integer;
  v_elo_nuevo integer;
  v_gano      boolean;
begin
  select * into v_match from public.matches where id = p_match_id for update;

  if v_match.id is null then
    raise exception 'El partido no existe';
  end if;

  -- ya estaba aplicado: no se mueve el ELO dos veces por el mismo partido
  if v_match.estado = 'confirmado' then
    return v_match;
  end if;

  v_jugadores := v_match.pareja_a || v_match.pareja_b;

  -- ------------------------------------------------ los 4 confirmaron: mover ELO
  select avg(public.elo_del_ranking(u, v_match.match_type))
    into v_elo_a
    from public.users u
   where u.id = any (v_match.pareja_a);

  select avg(public.elo_del_ranking(u, v_match.match_type))
    into v_elo_b
    from public.users u
   where u.id = any (v_match.pareja_b);

  for v_jugador in
    select u.id,
           u.partidos_jugados,
           public.elo_del_ranking(u, v_match.match_type) as elo,
           (u.id = any (v_match.pareja_a)) as es_pareja_a
      from public.users u
     where u.id = any (v_jugadores)
  loop
    v_gano := (v_jugador.es_pareja_a and v_match.ganador = 'a')
           or (not v_jugador.es_pareja_a and v_match.ganador = 'b');

    v_elo_antes := v_jugador.elo;
    v_delta := public.delta_elo(
      case when v_jugador.es_pareja_a then v_elo_a else v_elo_b end,
      case when v_jugador.es_pareja_a then v_elo_b else v_elo_a end,
      v_gano,
      v_jugador.partidos_jugados
    );
    v_elo_nuevo := greatest(public.elo_minimo(), v_elo_antes + v_delta);

    insert into public.elo_history
      (user_id, match_id, ranking, elo_antes, elo_despues, delta, k_usado)
    values
      (v_jugador.id, v_match.id, v_match.match_type, v_elo_antes, v_elo_nuevo,
       v_elo_nuevo - v_elo_antes, public.k_factor(v_jugador.partidos_jugados));

    -- solo se toca la columna del ranking del partido; las otras dos no se mueven
    update public.users u
       set elo_masculino = case when v_match.match_type = 'masculino'
                                then v_elo_nuevo else u.elo_masculino end,
           elo_femenino  = case when v_match.match_type = 'femenino'
                                then v_elo_nuevo else u.elo_femenino end,
           elo_mixto     = case when v_match.match_type = 'mixto'
                                then v_elo_nuevo else u.elo_mixto end,
           peak_elo_masculino = case when v_match.match_type = 'masculino'
                                then greatest(coalesce(u.peak_elo_masculino, v_elo_nuevo), v_elo_nuevo)
                                else u.peak_elo_masculino end,
           peak_elo_femenino  = case when v_match.match_type = 'femenino'
                                then greatest(coalesce(u.peak_elo_femenino, v_elo_nuevo), v_elo_nuevo)
                                else u.peak_elo_femenino end,
           peak_elo_mixto     = case when v_match.match_type = 'mixto'
                                then greatest(u.peak_elo_mixto, v_elo_nuevo)
                                else u.peak_elo_mixto end,
           partidos_jugados = u.partidos_jugados + 1
     where u.id = v_jugador.id;
  end loop;

  update public.matches
     set estado = 'confirmado',
         confirmado_at = now()
   where id = p_match_id
   returning * into v_match;

  perform public.award_badges_on_match(p_match_id);

  return v_match;
end;
$$;

-- ---------------------------------------------------------------------------
-- confirm_match se queda solo con lo suyo: acumular confirmaciones y, cuando
-- llegan las cuatro, pedir que se aplique el resultado.
-- ---------------------------------------------------------------------------
create or replace function public.confirm_match(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match     public.matches;
  v_uid       uuid := auth.uid();
  v_jugadores uuid[];
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión para confirmar un partido';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;

  if v_match.id is null then
    raise exception 'El partido no existe';
  end if;

  v_jugadores := v_match.pareja_a || v_match.pareja_b;

  if not (v_uid = any (v_jugadores)) then
    raise exception 'Solo los jugadores del partido pueden confirmarlo';
  end if;

  if v_match.estado = 'disputado' then
    raise exception 'El partido está en disputa: hay que corregirlo antes de confirmarlo';
  end if;

  if v_match.estado = 'cancelado' then
    raise exception 'Este partido está cancelado';
  end if;

  -- confirmar dos veces no hace nada, pero tampoco falla
  if v_match.estado = 'confirmado' or v_uid = any (v_match.resultado_confirmado_por) then
    return v_match;
  end if;

  update public.matches
     set resultado_confirmado_por = resultado_confirmado_por || v_uid
   where id = p_match_id
   returning * into v_match;

  if cardinality(v_match.resultado_confirmado_por) < 4 then
    return v_match;
  end if;

  return public.aplicar_resultado(p_match_id);
end;
$$;
