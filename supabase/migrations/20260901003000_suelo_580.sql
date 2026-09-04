-- =============================================================================
-- El suelo del ELO sube de 100 a 580.
--
-- 100 era un número técnico, puesto solo para que una mala racha en calibración
-- no llevara a un novato a cifras negativas. Pero un jugador de 7ma arranca en
-- 700, y dejarlo caer a 100 lo pondría a 600 puntos de su propia categoría: un
-- número que ya no dice nada de su nivel y que tardaría decenas de partidos en
-- recuperar.
--
-- 580 son 120 puntos por debajo del punto de partida: espacio suficiente para
-- que perder tenga consecuencias, sin que nadie caiga a un pozo del que no se
-- sale.
-- =============================================================================

create or replace function public.elo_minimo()
returns integer
language sql
immutable
as $$
  select 580;
$$;

-- Nadie debería estar por debajo, pero si alguien quedó ahí, se sube.
update public.users
   set elo_masculino = greatest(elo_masculino, 580),
       elo_femenino  = greatest(elo_femenino, 580),
       elo_mixto     = greatest(elo_mixto, 580)
 where elo_masculino < 580 or elo_femenino < 580 or elo_mixto < 580;
