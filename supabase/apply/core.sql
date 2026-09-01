-- Núcleo del esquema, generado concatenando las migraciones en orden.
-- Pegar completo en el SQL Editor de Supabase si no se usa la CLI.
-- NO editar a mano: la fuente de verdad son los archivos de supabase/migrations/.

-- ==========================================================================
-- 20260901000100_init_schema.sql
-- ==========================================================================
-- =============================================================================
-- Esquema base: usuarios, canchas, partidos, historial de ELO y tablón.
--
-- Notas de diseño:
--  * Cada jugador tiene TRES ELO independientes (masculino / femenino / mixto).
--    Solo existen los que puede alimentar: un hombre nunca juega un partido
--    "femenino" (requiere 4 mujeres), así que esa columna queda NULL.
--  * La categoría visible NO se persiste: es una función del ELO actual y del
--    pico histórico (ver migración de categorías). Solo cacheamos el pico.
--  * numero_registro sale de una secuencia: congela el orden de registro para
--    la insignia "fundador" (primeros 100) sin reevaluarlo nunca.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enumeraciones
create type genero as enum ('masculino', 'femenino');
create type ranking_tipo as enum ('masculino', 'femenino', 'mixto');
create type match_estado as enum ('pendiente', 'confirmado', 'disputado');
create type board_tipo as enum ('busco_pareja', 'busco_cuarto');
create type board_estado as enum ('abierto', 'completo', 'cancelado');

-- ------------------------------------------------------------------- utilidades
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------- users
create sequence public.users_numero_registro_seq;

create table public.users (
  id                  uuid primary key references auth.users (id) on delete cascade,
  nombre              text not null check (char_length(btrim(nombre)) between 2 and 60),
  ciudad              text not null default 'Cartagena',
  -- obligatorio: sin género no se puede clasificar el tipo de partido
  genero              genero not null,
  categoria_inicial   text not null,
  foto_url            text,

  elo_masculino       integer,
  elo_femenino        integer,
  elo_mixto           integer not null,
  peak_elo_masculino  integer,
  peak_elo_femenino   integer,
  peak_elo_mixto      integer not null,

  partidos_jugados    integer not null default 0 check (partidos_jugados >= 0),
  numero_registro     integer not null default nextval('public.users_numero_registro_seq'),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- el ELO base existe solo para el género del jugador; el mixto siempre existe
  constraint elo_base_coherente check (
    case genero
      when 'masculino' then elo_masculino is not null and elo_femenino is null
      when 'femenino'  then elo_femenino  is not null and elo_masculino is null
    end
  ),
  constraint categoria_inicial_valida check (
    case genero
      when 'masculino' then categoria_inicial in ('7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra')
      when 'femenino'  then categoria_inicial in ('D', 'C', 'B', 'A')
    end
  ),
  -- el pico nunca puede quedar por debajo del ELO actual
  constraint peak_masculino_coherente check (
    elo_masculino is null or peak_elo_masculino >= elo_masculino
  ),
  constraint peak_femenino_coherente check (
    elo_femenino is null or peak_elo_femenino >= elo_femenino
  ),
  constraint peak_mixto_coherente check (peak_elo_mixto >= elo_mixto)
);

alter sequence public.users_numero_registro_seq owned by public.users.numero_registro;

create index users_ciudad_idx on public.users (ciudad);
create index users_elo_masculino_idx on public.users (elo_masculino desc nulls last);
create index users_elo_femenino_idx on public.users (elo_femenino desc nulls last);
create index users_elo_mixto_idx on public.users (elo_mixto desc nulls last);

create trigger users_touch_updated_at
  before update on public.users
  for each row execute function public.touch_updated_at();

comment on column public.users.numero_registro is
  'Orden de registro congelado. numero_registro <= 100 => insignia fundador.';
comment on column public.users.peak_elo_mixto is
  'Pico histórico. Solo se usa para la histéresis de categoría (colchón de 75).';

-- ---------------------------------------------------------------------- courts
-- Directorio informativo. No hay reservas propias: los clubes ya usan Playtomic,
-- así que solo guardamos el enlace externo.
create table public.courts (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  ciudad           text not null default 'Cartagena',
  direccion        text,
  cantidad_canchas smallint check (cantidad_canchas > 0),
  booking_url      text,
  telefono         text,
  lat              double precision,
  lng              double precision,
  verificado       boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index courts_ciudad_idx on public.courts (ciudad);

create trigger courts_touch_updated_at
  before update on public.courts
  for each row execute function public.touch_updated_at();

comment on column public.courts.booking_url is
  'Enlace externo de reserva (Playtomic, web o WhatsApp del club).';
comment on column public.courts.verificado is
  'false = dato provisional pendiente de confirmar con el club.';

-- --------------------------------------------------------------------- matches
create table public.matches (
  id                        uuid primary key default gen_random_uuid(),
  fecha                     timestamptz not null,
  cancha_id                 uuid references public.courts (id) on delete set null,
  creado_por                uuid not null references public.users (id) on delete cascade,

  pareja_a                  uuid[] not null,
  pareja_b                  uuid[] not null,
  -- [{"a": 6, "b": 4}, {"a": 3, "b": 6}, ...]
  sets                      jsonb not null,
  -- 'a' | 'b', derivado de los sets al crear el partido
  ganador                   char(1) not null check (ganador in ('a', 'b')),

  -- lo fija un trigger a partir del género de los 4 jugadores
  match_type                ranking_tipo not null,
  resultado_confirmado_por  uuid[] not null default '{}',
  estado                    match_estado not null default 'pendiente',

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  confirmado_at             timestamptz,

  constraint pareja_a_de_dos check (cardinality(pareja_a) = 2),
  constraint pareja_b_de_dos check (cardinality(pareja_b) = 2),
  -- comparaciones directas: un CHECK no admite subconsultas ni unnest()
  constraint cuatro_jugadores_distintos check (
    pareja_a[1] <> pareja_a[2]
    and pareja_b[1] <> pareja_b[2]
    and pareja_a[1] <> pareja_b[1] and pareja_a[1] <> pareja_b[2]
    and pareja_a[2] <> pareja_b[1] and pareja_a[2] <> pareja_b[2]
  )
);

create index matches_fecha_idx on public.matches (fecha desc);
create index matches_estado_idx on public.matches (estado);
create index matches_cancha_idx on public.matches (cancha_id);
create index matches_pareja_a_idx on public.matches using gin (pareja_a);
create index matches_pareja_b_idx on public.matches using gin (pareja_b);

create trigger matches_touch_updated_at
  before update on public.matches
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------- elo_history
create table public.elo_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  match_id    uuid not null references public.matches (id) on delete cascade,
  ranking     ranking_tipo not null,
  elo_antes   integer not null,
  elo_despues integer not null,
  delta       integer not null,
  k_usado     smallint not null,
  fecha       timestamptz not null default now(),

  -- un partido solo puede mover el ELO de un jugador una vez
  constraint elo_history_unico_por_partido unique (user_id, match_id)
);

create index elo_history_user_fecha_idx on public.elo_history (user_id, fecha desc);
create index elo_history_ranking_idx on public.elo_history (ranking);

-- ----------------------------------------------------------------- board_posts
create table public.board_posts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  tipo          board_tipo not null,
  fecha_partido timestamptz not null,
  nivel_buscado text,
  cancha_id     uuid references public.courts (id) on delete set null,
  nota          text,
  estado        board_estado not null default 'abierto',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index board_posts_estado_fecha_idx on public.board_posts (estado, fecha_partido);
create index board_posts_user_idx on public.board_posts (user_id);

create trigger board_posts_touch_updated_at
  before update on public.board_posts
  for each row execute function public.touch_updated_at();

-- quiénes se apuntaron a una publicación del tablón
create table public.board_post_signups (
  post_id    uuid not null references public.board_posts (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- ==========================================================================
-- 20260901000200_categorias_fn.sql
-- ==========================================================================
-- =============================================================================
-- Categorías, histéresis y sub-niveles (estrellas).
--
-- Reglas:
--  * Salto fijo de 350 puntos entre categorías, empezando en 700.
--  * Masculino y MIXTO usan la escala FECOLPA 7ma..1ra (700..2800).
--    Femenino usa D..A (700..1750). El mixto usa los cortes masculinos para
--    todo el mundo, sin importar el género del jugador.
--  * Se SUBE en cuanto el ELO cruza el umbral; se BAJA solo si cae más de 75
--    puntos por debajo del umbral de entrada (colchón de histéresis).
--  * La categoría no se guarda: es una función pura de (elo, pico, ranking).
-- =============================================================================

-- Etiquetas ordenadas de menor a mayor para cada ranking.
create or replace function public.categorias_de(p_ranking ranking_tipo)
returns text[]
language sql
immutable
as $$
  select case p_ranking
    when 'femenino' then array['D', 'C', 'B', 'A']
    else array['7ma', '6ta', '5ta', '4ta', '3ra', '2da', '1ra']
  end;
$$;

-- Umbral de entrada de la categoría en la posición p_indice (1 = la más baja).
create or replace function public.umbral_categoria(p_indice integer)
returns integer
language sql
immutable
as $$
  select 700 + (p_indice - 1) * 350;
$$;

-- Índice de categoría sin histéresis: el mayor i tal que elo >= umbral(i).
create or replace function public.indice_categoria_plano(p_elo integer)
returns integer
language sql
immutable
as $$
  select greatest(1, floor((p_elo - 700)::numeric / 350)::integer + 1);
$$;

-- ELO con el que arranca un jugador según la categoría que declara.
create or replace function public.elo_inicial(p_categoria text, p_genero genero)
returns integer
language plpgsql
immutable
as $$
declare
  v_cats  text[] := public.categorias_de(p_genero::text::ranking_tipo);
  v_idx   integer := array_position(v_cats, p_categoria);
begin
  if v_idx is null then
    raise exception 'Categoría % no válida para el género %', p_categoria, p_genero;
  end if;
  return public.umbral_categoria(v_idx);
end;
$$;

-- Categoría visible: aplica el colchón de 75 y nunca supera la más alta alcanzada.
create or replace function public.categoria_desde_elo(
  p_elo     integer,
  p_ranking ranking_tipo,
  p_peak    integer
)
returns text
language plpgsql
immutable
as $$
declare
  v_cats   text[] := public.categorias_de(p_ranking);
  v_n      integer := cardinality(v_cats);
  -- la más alta que llegó a pisar (sin colchón)
  v_peak_i integer := least(public.indice_categoria_plano(greatest(p_peak, p_elo)), v_n);
  -- sumar 75 al ELO equivale a comparar contra umbral - 75
  v_cur_i  integer := least(public.indice_categoria_plano(p_elo + 75), v_n);
begin
  return v_cats[least(v_cur_i, v_peak_i)];
end;
$$;

-- Sub-nivel visual dentro de la categoría: 3 tercios de 350/3 puntos, tope 3.
-- Si el ELO quedó por debajo del umbral gracias a la histéresis, devuelve 1.
create or replace function public.nivel_estrella(
  p_elo     integer,
  p_ranking ranking_tipo,
  p_peak    integer
)
returns integer
language plpgsql
immutable
as $$
declare
  v_cats  text[] := public.categorias_de(p_ranking);
  v_cat   text := public.categoria_desde_elo(p_elo, p_ranking, p_peak);
  v_inicio integer := public.umbral_categoria(array_position(v_cats, v_cat));
begin
  return least(3, greatest(1, floor((p_elo - v_inicio)::numeric / (350.0 / 3))::integer + 1));
end;
$$;

-- ==========================================================================
-- 20260901000300_match_type_fn.sql
-- ==========================================================================
-- =============================================================================
-- Clasificación del partido y validación del marcador.
--
-- Regla de match_type:
--   4 hombres            -> masculino
--   4 mujeres            -> femenino
--   cualquier otra mezcla-> mixto   (1H+3M, 2H+2M, 3H+1M)
-- Único motivo de rechazo: falta el género de alguno de los 4 jugadores
-- (dato incompleto), nunca la proporción de géneros.
-- =============================================================================

create or replace function public.infer_match_type(p_jugadores uuid[])
returns ranking_tipo
language plpgsql
stable
as $$
declare
  v_total     integer;
  v_hombres   integer;
  v_mujeres   integer;
begin
  if cardinality(p_jugadores) <> 4 then
    raise exception 'Un partido necesita exactamente 4 jugadores, llegaron %',
      cardinality(p_jugadores);
  end if;

  select count(*),
         count(*) filter (where u.genero = 'masculino'),
         count(*) filter (where u.genero = 'femenino')
    into v_total, v_hombres, v_mujeres
    from public.users u
   where u.id = any (p_jugadores);

  -- users.genero es NOT NULL, así que el único hueco posible es un jugador
  -- que todavía no tiene perfil creado
  if v_total <> 4 then
    raise exception 'No se puede clasificar el partido: falta el género de % jugador(es)',
      4 - v_total;
  end if;

  if v_hombres = 4 then
    return 'masculino';
  elsif v_mujeres = 4 then
    return 'femenino';
  else
    return 'mixto';
  end if;
end;
$$;

-- Valida el marcador y devuelve el ganador ('a' o 'b') contando sets.
create or replace function public.ganador_de_sets(p_sets jsonb)
returns char(1)
language plpgsql
immutable
as $$
declare
  v_set    jsonb;
  v_a      integer;
  v_b      integer;
  v_sets_a integer := 0;
  v_sets_b integer := 0;
  v_n      integer;
begin
  if jsonb_typeof(p_sets) <> 'array' then
    raise exception 'El marcador debe ser un arreglo de sets';
  end if;

  v_n := jsonb_array_length(p_sets);
  if v_n < 1 or v_n > 5 then
    raise exception 'Un partido tiene entre 1 y 5 sets, llegaron %', v_n;
  end if;

  for v_set in select * from jsonb_array_elements(p_sets) loop
    if jsonb_typeof(v_set -> 'a') <> 'number' or jsonb_typeof(v_set -> 'b') <> 'number' then
      raise exception 'Cada set necesita los juegos de ambas parejas: %', v_set;
    end if;

    v_a := (v_set ->> 'a')::integer;
    v_b := (v_set ->> 'b')::integer;

    if v_a < 0 or v_b < 0 or v_a > 20 or v_b > 20 then
      raise exception 'Juegos fuera de rango en el set %', v_set;
    end if;
    if v_a = v_b then
      raise exception 'Un set no puede quedar empatado: %', v_set;
    end if;

    if v_a > v_b then
      v_sets_a := v_sets_a + 1;
    else
      v_sets_b := v_sets_b + 1;
    end if;
  end loop;

  if v_sets_a = v_sets_b then
    raise exception 'El partido no puede quedar empatado en sets';
  end if;

  return case when v_sets_a > v_sets_b then 'a' else 'b' end;
end;
$$;

-- Al crear el partido: clasificar, derivar el ganador y dejarlo pendiente.
-- Todos estos campos son derivados, así que ignoramos lo que mande el cliente.
-- Quien registra el marcador lo está confirmando de entrada; faltan los otros 3.
create or replace function public.matches_before_insert()
returns trigger
language plpgsql
as $$
begin
  new.match_type := public.infer_match_type(new.pareja_a || new.pareja_b);
  new.ganador := public.ganador_de_sets(new.sets);
  new.estado := 'pendiente';
  new.confirmado_at := null;
  new.resultado_confirmado_por := array[new.creado_por];
  return new;
end;
$$;

create trigger matches_clasificar
  before insert on public.matches
  for each row execute function public.matches_before_insert();

-- ==========================================================================
-- 20260901000400_core_rls.sql
-- ==========================================================================
-- =============================================================================
-- Row Level Security del núcleo.
--
-- Criterio general:
--  * Todo lo que alimenta el ranking (ELO, partidos confirmados, historial) es
--    de lectura para cualquier jugador autenticado: es un ranking público.
--  * Nada que afecte al ranking se puede escribir desde el cliente. El ELO solo
--    se mueve dentro de confirm_match(), que corre como SECURITY DEFINER.
--  * El directorio de canchas es de lectura incluso sin sesión (pantalla
--    informativa), y solo se administra con la service role.
-- =============================================================================

alter table public.users             enable row level security;
alter table public.courts            enable row level security;
alter table public.matches           enable row level security;
alter table public.elo_history       enable row level security;
alter table public.board_posts       enable row level security;
alter table public.board_post_signups enable row level security;

-- ----------------------------------------------------------------------- users
create policy users_select on public.users
  for select to authenticated
  using (true);

create policy users_insert_propio on public.users
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy users_update_propio on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- El jugador solo puede tocar sus datos de presentación. Género y categoría
-- inicial quedan fijos tras el registro (cambiarlos manipularía el ranking), y
-- los ELO solo los mueve confirm_match().
revoke update on public.users from authenticated;
grant update (nombre, ciudad, foto_url) on public.users to authenticated;

-- ---------------------------------------------------------------------- courts
create policy courts_select on public.courts
  for select to anon, authenticated
  using (true);

revoke insert, update, delete on public.courts from anon, authenticated;

-- --------------------------------------------------------------------- matches
create policy matches_select on public.matches
  for select to authenticated
  using (true);

-- Solo se puede registrar un partido propio: quien lo crea tiene que estar en
-- la cancha. Los campos derivados los fija el trigger, no el cliente.
create policy matches_insert_participante on public.matches
  for insert to authenticated
  with check (
    creado_por = (select auth.uid())
    and (select auth.uid()) = any (pareja_a || pareja_b)
  );

-- Corregir un partido mal registrado: solo quien lo creó y solo mientras nadie
-- más haya confirmado.
create policy matches_delete_creador on public.matches
  for delete to authenticated
  using (
    creado_por = (select auth.uid())
    and estado = 'pendiente'
    and cardinality(resultado_confirmado_por) <= 1
  );

-- Confirmar un resultado pasa por confirm_match(), nunca por un UPDATE directo.
revoke update on public.matches from anon, authenticated;

-- ----------------------------------------------------------------- elo_history
create policy elo_history_select on public.elo_history
  for select to authenticated
  using (true);

revoke insert, update, delete on public.elo_history from anon, authenticated;

-- ----------------------------------------------------------------- board_posts
create policy board_posts_select on public.board_posts
  for select to authenticated
  using (true);

create policy board_posts_insert_propio on public.board_posts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy board_posts_update_propio on public.board_posts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy board_posts_delete_propio on public.board_posts
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------- board_post_signups
create policy board_signups_select on public.board_post_signups
  for select to authenticated
  using (true);

create policy board_signups_insert_propio on public.board_post_signups
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- apuntarse y desapuntarse; el dueño del post también puede sacar a alguien
create policy board_signups_delete on public.board_post_signups
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.board_posts p
       where p.id = post_id and p.user_id = (select auth.uid())
    )
  );

-- ==========================================================================
-- 20260901000500_seed_courts.sql
-- ==========================================================================
-- =============================================================================
-- Semilla del directorio de canchas (Cartagena).
--
-- OJO: estas filas son PROVISIONALES y van con verificado = false. No son datos
-- confirmados con los clubes: sirven para que las pantallas tengan contenido
-- mientras llega la lista real (nombre, dirección, número de canchas y enlace
-- de reserva de Playtomic o WhatsApp del club).
--
-- Para cargar la lista definitiva, usa esta plantilla:
--
--   insert into public.courts
--     (nombre, ciudad, direccion, cantidad_canchas, booking_url, telefono, lat, lng, verificado)
--   values
--     ('Nombre del club', 'Cartagena', 'Dirección', 4,
--      'https://playtomic.io/...', '+57 300 000 0000', 10.3997, -75.5544, true);
-- =============================================================================

insert into public.courts
  (nombre, ciudad, direccion, cantidad_canchas, booking_url, telefono, lat, lng, verificado)
values
  ('[POR VERIFICAR] Club de pádel Bocagrande', 'Cartagena',
   'Bocagrande', 3, null, null, 10.3997, -75.5544, false),
  ('[POR VERIFICAR] Club de pádel Manga', 'Cartagena',
   'Manga', 2, null, null, 10.4092, -75.5325, false),
  ('[POR VERIFICAR] Club de pádel Crespo', 'Cartagena',
   'Crespo', 4, null, null, 10.4470, -75.5140, false);
