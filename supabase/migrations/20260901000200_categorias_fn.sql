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
