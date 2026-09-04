-- =============================================================================
-- Insignias.
--
-- Dos tablas: el catálogo y lo que cada jugador ha ganado. Una insignia se gana
-- una sola vez, y la fecha queda guardada.
--
-- El otorgamiento se parte en dos, por una razón práctica: unas condiciones se
-- pueden comprobar en el momento en que pasa algo (confirmar un partido), y
-- otras dependen del calendario —llevar un año registrado, jugar cuatro semanas
-- seguidas— y solo tienen sentido revisadas cada día. Esas segundas quedan
-- marcadas como periódicas y las evaluará el trabajo diario del paso 10.
-- =============================================================================

create table if not exists public.badges (
  id          text primary key,
  nombre      text not null,
  descripcion text not null,
  icono       text not null,
  categoria   text not null,
  -- true = depende del calendario, se revisa en el trabajo diario
  periodica   boolean not null default false,
  orden       smallint not null default 0
);

create table if not exists public.user_badges (
  user_id        uuid not null references public.users (id) on delete cascade,
  badge_id       text not null references public.badges (id) on delete cascade,
  fecha_obtenido timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create index if not exists user_badges_user_idx on public.user_badges (user_id);

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;

create policy badges_select on public.badges
  for select to anon, authenticated using (true);

create policy user_badges_select on public.user_badges
  for select to authenticated using (true);

-- Las insignias las otorga el sistema, nunca el cliente.
revoke insert, update, delete on public.badges from anon, authenticated;
revoke insert, update, delete on public.user_badges from anon, authenticated;

-- ---------------------------------------------------------------- el catálogo
insert into public.badges (id, nombre, descripcion, icono, categoria, periodica, orden)
values
  -- participación
  ('primer_partido', 'Primer partido', 'Jugaste tu primer partido confirmado.', '🎾', 'Participación', false, 1),
  ('10_partidos', '10 partidos', 'Llegaste a diez partidos jugados.', '🔟', 'Participación', false, 2),
  ('50_partidos', '50 partidos', 'Llegaste a cincuenta partidos jugados.', '🏓', 'Participación', false, 3),
  ('100_partidos', '100 partidos', 'Llegaste a cien partidos jugados.', '💯', 'Participación', false, 4),
  ('primer_torneo', 'Primer torneo', 'Te inscribiste a tu primer torneo.', '🎫', 'Participación', false, 5),

  -- racha y rendimiento
  ('racha_3', 'Racha de 3', 'Ganaste tres partidos seguidos.', '🔥', 'Racha', false, 10),
  ('racha_5', 'Racha de 5', 'Ganaste cinco partidos seguidos.', '🔥', 'Racha', false, 11),
  ('racha_10', 'Racha de 10', 'Ganaste diez partidos seguidos.', '🔥', 'Racha', false, 12),
  ('cazador', 'Cazador', 'Le ganaste a una pareja con 200 puntos más que la tuya.', '🎯', 'Racha', false, 13),
  ('invicto_torneo', 'Invicto', 'Ganaste un torneo sin perder un set.', '🛡️', 'Racha', false, 14),
  ('maraton_semanal', 'Maratón', 'Jugaste tres partidos en una misma semana.', '⚡', 'Racha', true, 15),
  ('mes_intenso', 'Mes intenso', 'Jugaste quince partidos en un mes.', '📅', 'Racha', true, 16),

  -- progresión
  ('subio_categoria_masc', 'Ascenso masculino', 'Subiste de categoría en el ranking masculino.', '📈', 'Progresión', false, 20),
  ('subio_categoria_fem', 'Ascenso femenino', 'Subiste de categoría en el ranking femenino.', '📈', 'Progresión', false, 21),
  ('subio_categoria_mixto', 'Ascenso mixto', 'Subiste de categoría en el ranking mixto.', '📈', 'Progresión', false, 22),
  ('top_10_masc', 'Top 10 masculino', 'Entraste al top 10 del ranking masculino de tu ciudad.', '🥇', 'Progresión', false, 23),
  ('top_10_fem', 'Top 10 femenino', 'Entraste al top 10 del ranking femenino de tu ciudad.', '🥇', 'Progresión', false, 24),
  ('top_10_mixto', 'Top 10 mixto', 'Entraste al top 10 del ranking mixto de tu ciudad.', '🥇', 'Progresión', false, 25),
  ('numero_1_categoria', 'Número 1', 'Eres el ELO más alto de tu categoría en tu ciudad.', '👑', 'Progresión', false, 26),

  -- social
  ('primer_post', 'Primera publicación', 'Publicaste por primera vez en el feed.', '💬', 'Social', false, 30),
  ('conecta_4', 'Conecta 4', 'Jugaste con cuatro compañeros de pareja distintos.', '🤝', 'Social', false, 31),
  ('casamentero', 'Casamentero', 'Jugaste con diez compañeros de pareja distintos.', '🫱', 'Social', false, 32),
  ('racha_semanal', 'Constante', 'Jugaste al menos una vez por semana, cuatro semanas seguidas.', '🗓️', 'Social', true, 33),
  ('comentarista', 'Comentarista', 'Dejaste diez comentarios en publicaciones de otros.', '✍️', 'Social', false, 34),
  ('anfitrion', 'Anfitrión', 'Creaste y organizaste un torneo.', '🎪', 'Social', false, 35),
  ('tablon_activo', 'Armador', 'Completaste el cupo de tres publicaciones del tablón.', '📌', 'Social', false, 36),

  -- especial
  ('todoterreno', 'Todoterreno', 'Tienes ELO establecido en los tres rankings.', '🌐', 'Especial', false, 40),
  ('fundador', 'Fundador', 'Estuviste entre los primeros cien jugadores de REBOTEAPP.', '⭐', 'Especial', false, 41),
  ('veterano', 'Veterano', 'Llevas un año en REBOTEAPP.', '🎖️', 'Especial', true, 42),
  ('rey_de_la_cancha', 'Rey de la cancha', 'Eres quien más ha jugado en una cancha.', '🏟️', 'Especial', false, 43)
on conflict (id) do update
  set nombre = excluded.nombre,
      descripcion = excluded.descripcion,
      icono = excluded.icono,
      categoria = excluded.categoria,
      periodica = excluded.periodica,
      orden = excluded.orden;

-- --------------------------------------------------------------------- otorgar
create or replace function public.otorgar_insignia(p_user_id uuid, p_badge_id text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.user_badges (user_id, badge_id)
  values (p_user_id, p_badge_id)
  on conflict do nothing;
$$;

-- Fundador: se decide en el momento del registro y no se reevalúa nunca.
create or replace function public.users_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.numero_registro <= 100 then
    perform public.otorgar_insignia(new.id, 'fundador');
  end if;
  return new;
end;
$$;

drop trigger if exists users_insignia_fundador on public.users;

create trigger users_insignia_fundador
  after insert on public.users
  for each row execute function public.users_after_insert();

-- Los que ya se registraron antes de que existieran las insignias.
insert into public.user_badges (user_id, badge_id)
select id, 'fundador' from public.users where numero_registro <= 100
on conflict do nothing;
-- =============================================================================
-- Insignias que se ganan al confirmarse un partido.
--
-- Se evalúan aquí y no en el cliente por lo mismo de siempre: el navegador no
-- puede decidir quién merece qué. La función corre dentro de confirm_match(),
-- justo después de mover el ELO, y para los cuatro jugadores.
--
-- Las que dependen del calendario (veterano, racha_semanal, maraton_semanal,
-- mes_intenso) no están aquí: las revisa el trabajo diario.
-- =============================================================================

-- El pico del jugador en un ranking, hermano de elo_del_ranking.
create or replace function public.peak_del_ranking(
  p_user public.users,
  p_ranking ranking_tipo
)
returns integer
language sql
immutable
as $$
  select case p_ranking
    when 'masculino' then p_user.peak_elo_masculino
    when 'femenino'  then p_user.peak_elo_femenino
    else p_user.peak_elo_mixto
  end;
$$;

-- Cuántos partidos seguidos lleva ganados un jugador, contando desde el último.
create or replace function public.racha_de_victorias(p_user_id uuid)
returns integer
language sql
stable
as $$
  with mis_partidos as (
    select ((m.ganador = 'a' and p_user_id = any (m.pareja_a))
         or (m.ganador = 'b' and p_user_id = any (m.pareja_b))) as gane,
           row_number() over (order by m.fecha desc) as puesto
      from public.matches m
     where m.estado = 'confirmado'
       and p_user_id = any (m.pareja_a || m.pareja_b)
  )
  select coalesce(
    (select min(puesto) - 1 from mis_partidos where not gane),
    (select count(*) from mis_partidos)
  )::integer;
$$;

-- Con cuántos compañeros distintos ha jugado.
create or replace function public.companeros_distintos(p_user_id uuid)
returns integer
language sql
stable
as $$
  select count(distinct companero)::integer
    from (
      select unnest(
               case when p_user_id = any (m.pareja_a) then m.pareja_a else m.pareja_b end
             ) as companero
        from public.matches m
       where m.estado = 'confirmado'
         and p_user_id = any (m.pareja_a || m.pareja_b)
    ) c
   where companero <> p_user_id;
$$;

-- ---------------------------------------------------------------------------
create or replace function public.award_badges_on_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match     public.matches;
  v_ranking   ranking_tipo;
  v_jugador   public.users;
  v_hist      public.elo_history;
  v_elo_a     numeric;
  v_elo_b     numeric;
  v_en_a      boolean;
  v_gano      boolean;
  v_racha     integer;
  v_companeros integer;
  v_mejores   integer;
  v_categoria text;
  v_mis_en_cancha integer;
  v_rival_max     integer;
begin
  select * into v_match from public.matches where id = p_match_id;
  if v_match.id is null or v_match.estado <> 'confirmado' then
    return;
  end if;

  v_ranking := v_match.match_type;

  -- ELO de cada pareja ANTES del partido, para la insignia de cazador
  select avg(h.elo_antes) into v_elo_a
    from public.elo_history h
   where h.match_id = p_match_id and h.user_id = any (v_match.pareja_a);

  select avg(h.elo_antes) into v_elo_b
    from public.elo_history h
   where h.match_id = p_match_id and h.user_id = any (v_match.pareja_b);

  for v_jugador in
    select * from public.users where id = any (v_match.pareja_a || v_match.pareja_b)
  loop
    v_en_a := v_jugador.id = any (v_match.pareja_a);
    v_gano := (v_en_a and v_match.ganador = 'a') or (not v_en_a and v_match.ganador = 'b');

    select * into v_hist
      from public.elo_history
     where match_id = p_match_id and user_id = v_jugador.id;

    -- ------------------------------------------------------------ participación
    if v_jugador.partidos_jugados >= 1 then
      perform public.otorgar_insignia(v_jugador.id, 'primer_partido');
    end if;
    if v_jugador.partidos_jugados >= 10 then
      perform public.otorgar_insignia(v_jugador.id, '10_partidos');
    end if;
    if v_jugador.partidos_jugados >= 50 then
      perform public.otorgar_insignia(v_jugador.id, '50_partidos');
    end if;
    if v_jugador.partidos_jugados >= 100 then
      perform public.otorgar_insignia(v_jugador.id, '100_partidos');
    end if;

    -- -------------------------------------------------------------------- racha
    v_racha := public.racha_de_victorias(v_jugador.id);
    if v_racha >= 3 then
      perform public.otorgar_insignia(v_jugador.id, 'racha_3');
    end if;
    if v_racha >= 5 then
      perform public.otorgar_insignia(v_jugador.id, 'racha_5');
    end if;
    if v_racha >= 10 then
      perform public.otorgar_insignia(v_jugador.id, 'racha_10');
    end if;

    -- ------------------------------------------------------------------ cazador
    -- ganarle a una pareja con 200 puntos o más por encima
    if v_gano and (
      (v_en_a and v_elo_b - v_elo_a >= 200) or (not v_en_a and v_elo_a - v_elo_b >= 200)
    ) then
      perform public.otorgar_insignia(v_jugador.id, 'cazador');
    end if;

    -- -------------------------------------------------------------- compañeros
    v_companeros := public.companeros_distintos(v_jugador.id);
    if v_companeros >= 4 then
      perform public.otorgar_insignia(v_jugador.id, 'conecta_4');
    end if;
    if v_companeros >= 10 then
      perform public.otorgar_insignia(v_jugador.id, 'casamentero');
    end if;

    -- --------------------------------------------------------- subió de categoría
    -- se sube sin colchón, así que basta comparar los índices planos
    if v_hist.id is not null
       and public.indice_categoria_plano(v_hist.elo_despues)
         > public.indice_categoria_plano(v_hist.elo_antes) then
      perform public.otorgar_insignia(
        v_jugador.id,
        case v_ranking
          when 'masculino' then 'subio_categoria_masc'
          when 'femenino'  then 'subio_categoria_fem'
          else 'subio_categoria_mixto'
        end
      );
    end if;

    -- ------------------------------------------------------------------- top 10
    select count(*) into v_mejores
      from public.users u2
     where u2.ciudad = v_jugador.ciudad
       and public.elo_del_ranking(u2, v_ranking) is not null
       and public.elo_del_ranking(u2, v_ranking)
         > public.elo_del_ranking(v_jugador, v_ranking);

    if v_mejores < 10 then
      perform public.otorgar_insignia(
        v_jugador.id,
        case v_ranking
          when 'masculino' then 'top_10_masc'
          when 'femenino'  then 'top_10_fem'
          else 'top_10_mixto'
        end
      );
    end if;

    -- --------------------------------------------------- número 1 de su categoría
    v_categoria := public.categoria_desde_elo(
      public.elo_del_ranking(v_jugador, v_ranking),
      v_ranking,
      public.peak_del_ranking(v_jugador, v_ranking)
    );

    if not exists (
      select 1
        from public.users u2
       where u2.ciudad = v_jugador.ciudad
         and u2.id <> v_jugador.id
         and public.elo_del_ranking(u2, v_ranking) is not null
         and public.categoria_desde_elo(
               public.elo_del_ranking(u2, v_ranking),
               v_ranking,
               public.peak_del_ranking(u2, v_ranking)
             ) = v_categoria
         and public.elo_del_ranking(u2, v_ranking)
           >= public.elo_del_ranking(v_jugador, v_ranking)
    ) then
      perform public.otorgar_insignia(v_jugador.id, 'numero_1_categoria');
    end if;

    -- -------------------------------------------------------------- todoterreno
    -- diez partidos en cada uno de los tres rankings
    if (select count(*) from public.elo_history h
         where h.user_id = v_jugador.id and h.ranking = 'masculino') >= 10
   and (select count(*) from public.elo_history h
         where h.user_id = v_jugador.id and h.ranking = 'femenino') >= 10
   and (select count(*) from public.elo_history h
         where h.user_id = v_jugador.id and h.ranking = 'mixto') >= 10 then
      perform public.otorgar_insignia(v_jugador.id, 'todoterreno');
    end if;

    -- --------------------------------------------------------- rey de la cancha
    if v_match.cancha_id is not null then
      select count(*) into v_mis_en_cancha
        from public.matches m
       where m.cancha_id = v_match.cancha_id
         and m.estado = 'confirmado'
         and v_jugador.id = any (m.pareja_a || m.pareja_b);

      select coalesce(max(conteo), 0) into v_rival_max
        from (
          select count(*) as conteo
            from public.matches m
            cross join lateral unnest(m.pareja_a || m.pareja_b) as jugador
           where m.cancha_id = v_match.cancha_id
             and m.estado = 'confirmado'
             and jugador <> v_jugador.id
           group by jugador
        ) otros;

      if v_mis_en_cancha > v_rival_max then
        perform public.otorgar_insignia(v_jugador.id, 'rey_de_la_cancha');
      end if;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- confirm_match vuelve a declararse igual que antes, con una línea más al
-- final: cuando el partido queda confirmado, se miran las insignias.
-- ---------------------------------------------------------------------------
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

  -- con el ELO ya movido, mirar qué insignias se ganaron
  perform public.award_badges_on_match(p_match_id);

  return v_match;
end;
$$;
