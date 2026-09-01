-- =============================================================================
-- Confirmación de resultado y movimiento de ELO.
--
-- Todo el cálculo vive aquí, no en el cliente: es la única forma de que nadie
-- pueda inventarse puntos. El navegador solo llama a confirm_match().
--
-- Las funciones de cálculo son espejo exacto de `src/lib/elo.ts`, y hay un test
-- de paridad que las compara caso por caso (`src/lib/elo.sql.test.ts`).
-- =============================================================================

-- ------------------------------------------------------------------ constantes
-- K por etapa de calibración, según el total de partidos del jugador.
create or replace function public.k_factor(p_partidos integer)
returns integer
language sql
immutable
as $$
  select case
    when p_partidos < 10 then 45
    when p_partidos < 40 then 30
    else 20
  end;
$$;

-- Probabilidad esperada de victoria de la pareja. Fórmula ELO estándar.
create or replace function public.puntaje_esperado(p_propio numeric, p_rival numeric)
returns numeric
language sql
immutable
as $$
  select 1 / (1 + power(10, (p_rival - p_propio) / 400));
$$;

-- Cambio de ELO de UN jugador.
--
-- Los dos compañeros comparten el mismo (real - esperado), que se calcula con el
-- promedio de cada pareja. Lo único que los puede diferenciar es su propio K.
-- No hay reparto por nivel relativo dentro de la pareja: con solo el marcador
-- no hay forma de medir aporte individual.
--
-- El redondeo es floor(x + 0.5) y no round(), para que coincida exactamente con
-- Math.round() de JavaScript: round() en Postgres redondea el .5 alejándose del
-- cero, y en negativos daría un punto de diferencia.
create or replace function public.delta_elo(
  p_elo_pareja numeric,
  p_elo_rival  numeric,
  p_gano       boolean,
  p_partidos   integer
)
returns integer
language sql
immutable
as $$
  select floor(
    public.k_factor(p_partidos)
      * ((case when p_gano then 1 else 0 end) - public.puntaje_esperado(p_elo_pareja, p_elo_rival))
      + 0.5
  )::integer;
$$;

-- Suelo del ELO: por debajo de esto el número deja de significar algo.
create or replace function public.elo_minimo()
returns integer
language sql
immutable
as $$
  select 100;
$$;

-- El ELO que le toca a este jugador según el tipo de partido.
create or replace function public.elo_del_ranking(
  p_user public.users,
  p_ranking ranking_tipo
)
returns integer
language sql
immutable
as $$
  select case p_ranking
    when 'masculino' then p_user.elo_masculino
    when 'femenino'  then p_user.elo_femenino
    else p_user.elo_mixto
  end;
$$;

-- --------------------------------------------------------------- confirm_match
-- Registra la confirmación del jugador que llama. Cuando los 4 confirmaron,
-- mueve el ELO del ranking que corresponde al tipo de partido y deja el resto
-- intacto.
create or replace function public.confirm_match(p_match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match      public.matches;
  v_uid        uuid := auth.uid();
  v_jugadores  uuid[];
  v_elo_a      numeric;
  v_elo_b      numeric;
  v_jugador    record;
  v_elo_antes  integer;
  v_delta      integer;
  v_elo_nuevo  integer;
  v_gano       boolean;
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión para confirmar un partido';
  end if;

  -- el lock evita que dos confirmaciones simultáneas se pisen y que el ELO se
  -- calcule dos veces
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

  -- confirmar dos veces no hace nada, pero tampoco falla
  if v_match.estado = 'confirmado' or v_uid = any (v_match.resultado_confirmado_por) then
    return v_match;
  end if;

  update public.matches
     set resultado_confirmado_por = resultado_confirmado_por || v_uid
   where id = p_match_id
   returning * into v_match;

  -- todavía faltan confirmaciones
  if cardinality(v_match.resultado_confirmado_por) < 4 then
    return v_match;
  end if;

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

  return v_match;
end;
$$;

-- -------------------------------------------------------------- dispute_match
-- Un jugador que no está de acuerdo con el marcador marca el partido en disputa.
-- A partir de ahí nadie puede confirmarlo: hay que borrarlo y registrarlo bien.
create or replace function public.dispute_match(p_match_id uuid)
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
    raise exception 'Solo los jugadores del partido pueden disputarlo';
  end if;

  if v_match.estado = 'confirmado' then
    raise exception 'El partido ya está confirmado y el ELO ya se movió';
  end if;

  update public.matches
     set estado = 'disputado'
   where id = p_match_id
   returning * into v_match;

  return v_match;
end;
$$;

revoke execute on function public.confirm_match(uuid) from anon;
revoke execute on function public.dispute_match(uuid) from anon;

-- Un partido en disputa hay que poder borrarlo para volver a registrarlo bien.
-- La política original solo dejaba borrar los pendientes.
drop policy if exists matches_delete_creador on public.matches;

create policy matches_delete_creador on public.matches
  for delete to authenticated
  using (
    creado_por = (select auth.uid())
    and estado <> 'confirmado'
  );
