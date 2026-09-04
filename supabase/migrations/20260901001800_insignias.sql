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
