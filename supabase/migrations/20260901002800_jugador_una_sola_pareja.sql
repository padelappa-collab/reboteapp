-- =============================================================================
-- Un jugador, una sola pareja por torneo.
--
-- Había dos índices únicos, uno por jugador_a y otro por jugador_b, y cada uno
-- vigilaba su columna sin mirar la otra: alguien podía ser el jugador A de una
-- pareja y el jugador B de otra, y quedar inscrito dos veces en el mismo torneo.
-- =============================================================================

create or replace function public.pareja_sin_repetir_jugador()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.tournament_pairs p
     where p.tournament_id = new.tournament_id
       and p.id <> new.id
       and (
         p.jugador_a in (new.jugador_a, new.jugador_b) or
         p.jugador_b in (new.jugador_a, new.jugador_b)
       )
  ) then
    raise exception 'Uno de los dos ya está inscrito en este torneo';
  end if;

  return new;
end;
$$;

drop trigger if exists pairs_sin_repetir on public.tournament_pairs;

create trigger pairs_sin_repetir
  before insert or update on public.tournament_pairs
  for each row execute function public.pareja_sin_repetir_jugador();
