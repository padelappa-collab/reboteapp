-- =============================================================================
-- Siembra del ELO al crear el perfil.
--
-- El perfil lo inserta el propio jugador desde el cliente (RLS: solo su fila),
-- así que los ELO iniciales NO pueden venir del navegador: alguien podría
-- registrarse declarando 7ma y mandando 2800 puntos. El trigger los deriva
-- siempre de (categoria_inicial, genero) e ignora lo que llegue.
--
-- El ELO inicial en mixto es el mismo del ranking base; a partir de ahí
-- evoluciona por su cuenta.
-- =============================================================================

create or replace function public.users_before_insert()
returns trigger
language plpgsql
as $$
declare
  v_base integer;
begin
  v_base := public.elo_inicial(new.categoria_inicial, new.genero);

  new.elo_masculino := case when new.genero = 'masculino' then v_base end;
  new.elo_femenino  := case when new.genero = 'femenino'  then v_base end;
  new.elo_mixto     := v_base;

  new.peak_elo_masculino := new.elo_masculino;
  new.peak_elo_femenino  := new.elo_femenino;
  new.peak_elo_mixto     := v_base;

  new.partidos_jugados := 0;

  return new;
end;
$$;

create trigger users_sembrar_elo
  before insert on public.users
  for each row execute function public.users_before_insert();
