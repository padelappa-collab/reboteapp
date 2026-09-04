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
-- =============================================================================
-- Torneos.
--
-- Tres formatos, todos con parejas fijas:
--   * americano    -> todas las parejas se enfrentan entre sí, una vez
--   * cuadrangular -> cuatro parejas, todas contra todas
--   * grupos       -> varios cuadrangulares y después una fase final entre los
--                     ganadores de cada grupo
--
-- El sorteo es aleatorio: la app reparte las parejas. No se siembra por ELO a
-- propósito, para que un torneo de barrio no quede decidido por el ranking
-- antes de empezar.
--
-- Los partidos de torneo cuentan para el ranking igual que cualquier otro, así
-- que se guardan en `matches` como todos los demás. La diferencia está en cómo
-- se confirman: en un torneo el organizador está presente y ve los partidos,
-- así que registra el resultado y cuenta de inmediato. Pedir cuatro
-- confirmaciones por partido frenaría el avance de las rondas el día del
-- evento.
-- =============================================================================

create type torneo_formato as enum ('americano', 'cuadrangular', 'grupos');
create type torneo_estado as enum ('inscripciones', 'en_curso', 'finalizado', 'cancelado');
create type pareja_estado as enum ('pendiente', 'aceptada');

create table if not exists public.tournaments (
  id           uuid primary key default gen_random_uuid(),
  nombre       text not null check (char_length(btrim(nombre)) between 3 and 80),
  ciudad       text not null default 'Cartagena',
  formato      torneo_formato not null,
  fecha_inicio timestamptz not null,
  cancha_id    uuid references public.courts (id) on delete set null,
  descripcion  text,
  max_parejas  smallint not null default 8 check (max_parejas between 3 and 32),
  estado       torneo_estado not null default 'inscripciones',
  creado_por   uuid not null references public.users (id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists tournaments_ciudad_fecha_idx
  on public.tournaments (ciudad, fecha_inicio desc);

-- Una pareja inscrita. Quien inscribe elige compañero, y el compañero acepta:
-- nadie amanece inscrito en un torneo sin saberlo.
create table if not exists public.tournament_pairs (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  jugador_a     uuid not null references public.users (id) on delete cascade,
  jugador_b     uuid not null references public.users (id) on delete cascade,
  estado        pareja_estado not null default 'pendiente',
  -- lo asigna el sorteo al empezar el torneo
  grupo         smallint,
  created_at    timestamptz not null default now(),
  constraint pareja_de_dos_distintos check (jugador_a <> jugador_b)
);

-- Nadie puede estar en dos parejas del mismo torneo.
create unique index if not exists pares_jugador_a_unico
  on public.tournament_pairs (tournament_id, jugador_a);
create unique index if not exists pares_jugador_b_unico
  on public.tournament_pairs (tournament_id, jugador_b);

-- Los cruces del torneo. `match_id` apunta al partido real cuando ya se jugó.
create table if not exists public.tournament_matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  -- 'grupos' o 'final'
  fase          text not null default 'grupos',
  grupo         smallint,
  ronda         smallint not null default 1,
  orden         smallint not null default 0,
  pareja_a_id   uuid references public.tournament_pairs (id) on delete cascade,
  pareja_b_id   uuid references public.tournament_pairs (id) on delete cascade,
  match_id      uuid references public.matches (id) on delete set null,
  ganador_id    uuid references public.tournament_pairs (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists tournament_matches_torneo_idx
  on public.tournament_matches (tournament_id, ronda, orden);

-- Traza del partido a su torneo, para no contar dos veces ni confundirlo con
-- un duplicado casual.
alter table public.matches
  add column if not exists tournament_id uuid
    references public.tournaments (id) on delete set null;

-- ------------------------------------------------------------------------ RLS
alter table public.tournaments enable row level security;
alter table public.tournament_pairs enable row level security;
alter table public.tournament_matches enable row level security;

create policy tournaments_select on public.tournaments
  for select to authenticated using (true);

create policy tournaments_insert on public.tournaments
  for insert to authenticated with check (creado_por = (select auth.uid()));

create policy tournaments_update_organizador on public.tournaments
  for update to authenticated
  using (creado_por = (select auth.uid()))
  with check (creado_por = (select auth.uid()));

create policy pairs_select on public.tournament_pairs
  for select to authenticated using (true);

-- inscribirse y salirse pasan por funciones; aquí solo se lee
revoke insert, update, delete on public.tournament_pairs from anon, authenticated;

create policy tmatches_select on public.tournament_matches
  for select to authenticated using (true);

revoke insert, update, delete on public.tournament_matches from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Inscripción
-- ---------------------------------------------------------------------------
create or replace function public.inscribir_pareja(
  p_torneo uuid,
  p_companero uuid
)
returns public.tournament_pairs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_torneo  public.tournaments;
  v_cuantas integer;
  v_pareja  public.tournament_pairs;
begin
  if v_uid is null then
    raise exception 'Hay que iniciar sesión';
  end if;
  if v_uid = p_companero then
    raise exception 'Necesitas un compañero para inscribirte';
  end if;

  select * into v_torneo from public.tournaments where id = p_torneo for update;

  if v_torneo.id is null then
    raise exception 'El torneo no existe';
  end if;
  if v_torneo.estado <> 'inscripciones' then
    raise exception 'Las inscripciones de este torneo están cerradas';
  end if;

  select count(*) into v_cuantas
    from public.tournament_pairs
   where tournament_id = p_torneo and estado = 'aceptada';

  if v_cuantas >= v_torneo.max_parejas then
    raise exception 'El torneo ya está lleno';
  end if;

  insert into public.tournament_pairs (tournament_id, jugador_a, jugador_b)
  values (p_torneo, v_uid, p_companero)
  returning * into v_pareja;

  return v_pareja;
end;
$$;

-- El compañero acepta, y ahí la pareja queda dentro.
create or replace function public.aceptar_inscripcion(p_pareja uuid)
returns public.tournament_pairs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_pareja public.tournament_pairs;
begin
  select * into v_pareja from public.tournament_pairs where id = p_pareja for update;

  if v_pareja.id is null then
    raise exception 'Esa inscripción no existe';
  end if;
  if v_pareja.jugador_b <> v_uid then
    raise exception 'Solo tu compañero puede aceptar por ti';
  end if;

  update public.tournament_pairs
     set estado = 'aceptada'
   where id = p_pareja
   returning * into v_pareja;

  perform public.otorgar_insignia(v_pareja.jugador_a, 'primer_torneo');
  perform public.otorgar_insignia(v_pareja.jugador_b, 'primer_torneo');

  return v_pareja;
end;
$$;

-- Retirarse: cualquiera de los dos, mientras el torneo no haya empezado.
create or replace function public.retirar_pareja(p_pareja uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_pareja public.tournament_pairs;
  v_estado torneo_estado;
begin
  select * into v_pareja from public.tournament_pairs where id = p_pareja;
  if v_pareja.id is null then
    raise exception 'Esa inscripción no existe';
  end if;

  select estado into v_estado from public.tournaments where id = v_pareja.tournament_id;
  if v_estado <> 'inscripciones' then
    raise exception 'El torneo ya empezó';
  end if;

  if v_uid not in (v_pareja.jugador_a, v_pareja.jugador_b) then
    raise exception 'No estás en esa pareja';
  end if;

  delete from public.tournament_pairs where id = p_pareja;
end;
$$;

-- ---------------------------------------------------------------------------
-- Arrancar el torneo: generar los cruces.
-- ---------------------------------------------------------------------------
create or replace function public.iniciar_torneo(p_torneo uuid)
returns void
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_torneo  public.tournaments;
  v_parejas uuid[];
  v_n       integer;
  v_grupos  integer;
  v_tam     integer;
  v_grupo   integer;
  v_desde   integer;
  i         integer;
  j         integer;
  v_orden   smallint;
begin
  select * into v_torneo from public.tournaments where id = p_torneo for update;

  if v_torneo.id is null then
    raise exception 'El torneo no existe';
  end if;
  if v_torneo.creado_por <> auth.uid() then
    raise exception 'Solo quien organiza puede empezar el torneo';
  end if;
  if v_torneo.estado <> 'inscripciones' then
    raise exception 'El torneo ya empezo';
  end if;

  -- SORTEO: el orden es al azar, no por nivel
  select array_agg(p.id order by random())
    into v_parejas
    from public.tournament_pairs p
   where p.tournament_id = p_torneo and p.estado = 'aceptada';

  v_n := coalesce(cardinality(v_parejas), 0);

  if v_torneo.formato = 'cuadrangular' and v_n <> 4 then
    raise exception 'Un cuadrangular necesita exactamente 4 parejas, hay %', v_n;
  end if;

  if v_torneo.formato = 'grupos' and (v_n < 8 or v_n % 4 <> 0) then
    raise exception 'Para fase de grupos hacen falta 8, 12, 16... parejas. Hay %', v_n;
  end if;

  if v_torneo.formato = 'americano' and v_n < 3 then
    raise exception 'Un americano necesita al menos 3 parejas, hay %', v_n;
  end if;

  v_grupos := case when v_torneo.formato = 'grupos' then v_n / 4 else 1 end;
  v_tam := v_n / v_grupos;

  for v_grupo in 1 .. v_grupos loop
    v_desde := (v_grupo - 1) * v_tam;
    v_orden := 0;

    -- todas contra todas dentro del grupo
    for i in 1 .. v_tam - 1 loop
      for j in i + 1 .. v_tam loop
        insert into public.tournament_matches
          (tournament_id, fase, grupo, ronda, orden, pareja_a_id, pareja_b_id)
        values
          (p_torneo, 'grupos', v_grupo, 1, v_orden,
           v_parejas[v_desde + i], v_parejas[v_desde + j]);
        v_orden := v_orden + 1;
      end loop;
    end loop;

    for i in 1 .. v_tam loop
      update public.tournament_pairs
         set grupo = v_grupo
       where id = v_parejas[v_desde + i];
    end loop;
  end loop;

  update public.tournaments set estado = 'en_curso' where id = p_torneo;
end;
$FN$;

-- ---------------------------------------------------------------------------
-- Fase final: se cruzan los ganadores de cada grupo.
--
-- Solo aplica al formato de grupos. Se genera cuando ya no quedan partidos
-- pendientes, y se vuelve a llamar hasta que quede una sola pareja en pie.
-- ---------------------------------------------------------------------------
create or replace function public.generar_fase_final(p_torneo uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $FN$
declare
  v_torneo       public.tournaments;
  v_pendientes   integer;
  v_ronda        smallint;
  v_clasificados uuid[];
  v_n            integer;
  i              integer;
  j              integer;
  v_orden        smallint := 0;
begin
  select * into v_torneo from public.tournaments where id = p_torneo for update;

  if v_torneo.creado_por <> auth.uid() then
    raise exception 'Solo quien organiza puede avanzar el torneo';
  end if;
  if v_torneo.formato <> 'grupos' then
    raise exception 'Solo la fase de grupos tiene fase final';
  end if;

  select count(*) into v_pendientes
    from public.tournament_matches
   where tournament_id = p_torneo and ganador_id is null;

  if v_pendientes > 0 then
    raise exception 'Faltan % partidos por registrar', v_pendientes;
  end if;

  select coalesce(max(ronda), 0) into v_ronda
    from public.tournament_matches
   where tournament_id = p_torneo and fase = 'final';

  if v_ronda = 0 then
    -- primera vez: pasa el mejor de cada grupo
    select array_agg(ganadora order by grupo)
      into v_clasificados
      from (
        select p.grupo,
               (array_agg(p.id order by
                  (select count(*) from public.tournament_matches m
                    where m.ganador_id = p.id) desc))[1] as ganadora
          from public.tournament_pairs p
         where p.tournament_id = p_torneo and p.grupo is not null
         group by p.grupo
      ) g;
  else
    select array_agg(ganador_id order by orden)
      into v_clasificados
      from public.tournament_matches
     where tournament_id = p_torneo and fase = 'final' and ronda = v_ronda
       and ganador_id is not null;
  end if;

  v_n := coalesce(cardinality(v_clasificados), 0);

  if v_n <= 1 then
    update public.tournaments set estado = 'finalizado' where id = p_torneo;
    return 0;
  end if;

  i := 1;
  j := v_n;
  while i < j loop
    insert into public.tournament_matches
      (tournament_id, fase, ronda, orden, pareja_a_id, pareja_b_id)
    values (p_torneo, 'final', v_ronda + 1, v_orden, v_clasificados[i], v_clasificados[j]);
    v_orden := v_orden + 1;
    i := i + 1;
    j := j - 1;
  end loop;

  if i = j then
    insert into public.tournament_matches
      (tournament_id, fase, ronda, orden, pareja_a_id, pareja_b_id, ganador_id)
    values (p_torneo, 'final', v_ronda + 1, v_orden, v_clasificados[i], null,
            v_clasificados[i]);
  end if;

  return v_orden;
end;
$FN$;

-- ---------------------------------------------------------------------------
-- Registrar el resultado de un cruce.
--
-- Crea el partido real —para que cuente en el ranking— y lo deja confirmado sin
-- pedir las cuatro aprobaciones, porque quien organiza vio el partido.
-- ---------------------------------------------------------------------------
create or replace function public.registrar_resultado_torneo(
  p_cruce uuid,
  p_sets jsonb
)
returns public.tournament_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cruce   public.tournament_matches;
  v_torneo  public.tournaments;
  v_pa      public.tournament_pairs;
  v_pb      public.tournament_pairs;
  v_ganador char(1);
  v_match   public.matches;
  v_jugadores uuid[];
begin
  select * into v_cruce from public.tournament_matches where id = p_cruce for update;
  if v_cruce.id is null then
    raise exception 'Ese cruce no existe';
  end if;

  select * into v_torneo from public.tournaments where id = v_cruce.tournament_id;
  if v_torneo.creado_por <> auth.uid() then
    raise exception 'Solo quien organiza registra los resultados';
  end if;
  if v_cruce.match_id is not null then
    raise exception 'Ese cruce ya tiene resultado';
  end if;
  if v_cruce.pareja_b_id is null then
    raise exception 'Esa pareja pasó sin jugar';
  end if;

  select * into v_pa from public.tournament_pairs where id = v_cruce.pareja_a_id;
  select * into v_pb from public.tournament_pairs where id = v_cruce.pareja_b_id;

  v_ganador := public.ganador_de_sets(p_sets);
  v_jugadores := array[v_pa.jugador_a, v_pa.jugador_b, v_pb.jugador_a, v_pb.jugador_b];

  insert into public.matches
    (fecha, cancha_id, creado_por, pareja_a, pareja_b, sets, tournament_id,
     resultado_confirmado_por)
  values
    (now(), v_torneo.cancha_id, v_pa.jugador_a,
     array[v_pa.jugador_a, v_pa.jugador_b], array[v_pb.jugador_a, v_pb.jugador_b],
     p_sets, v_torneo.id, v_jugadores)
  returning * into v_match;

  -- el trigger de inserción lo deja pendiente; aquí se aplica de una vez
  perform public.aplicar_resultado(v_match.id);

  update public.tournament_matches
     set match_id = v_match.id,
         ganador_id = case when v_ganador = 'a' then v_cruce.pareja_a_id
                           else v_cruce.pareja_b_id end
   where id = p_cruce
   returning * into v_cruce;

  return v_cruce;
end;
$$;

-- Los partidos de torneo no chocan con la regla de duplicados: en un torneo los
-- mismos cuatro pueden cruzarse el mismo día en rondas distintas.
create or replace function public.matches_sin_duplicado()
returns trigger
language plpgsql
as $$
declare
  v_jugadores uuid[] := public.jugadores_ordenados(new.pareja_a || new.pareja_b);
  v_existente uuid;
begin
  if new.tournament_id is not null then
    return new;
  end if;

  select m.id into v_existente
    from public.matches m
   where m.estado <> 'cancelado'
     and m.tournament_id is null
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

-- Insignia de quien organiza.
create or replace function public.badges_al_crear_torneo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.otorgar_insignia(new.creado_por, 'anfitrion');
  return new;
end;
$$;

drop trigger if exists tournaments_insignia on public.tournaments;

create trigger tournaments_insignia
  after insert on public.tournaments
  for each row execute function public.badges_al_crear_torneo();
