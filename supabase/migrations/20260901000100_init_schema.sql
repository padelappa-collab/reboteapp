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
