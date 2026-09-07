-- Los partidos cancelados se borran a los cinco minutos.
--
-- Un cancelado no sirve para nada: no cuenta para el ranking, no se puede
-- reactivar, y lo unico que hace es ocupar sitio en la lista de partidos de
-- cuatro personas. Los cinco minutos son el margen para que quien lo cancelo
-- vea que se cancelo de verdad antes de que desaparezca.
--
-- Es seguro borrarlos porque `cancel_match` se niega a cancelar un partido ya
-- confirmado: un cancelado nunca movio el ELO y por tanto no tiene historial
-- que perder. Lo que lo referencia --tablon, publicaciones del feed-- lo hace
-- con SET NULL, asi que esas filas sobreviven sin su enlace.
--
-- Dos cosas que no son obvias:
--
--   . Los avisos apuntan al partido con un uuid suelto, sin clave foranea, asi
--     que no se irian solos: quedarian avisos de "te agregaron a un partido"
--     llevando a una pantalla vacia. Se anade `matches` al disparador que ya
--     limpia ese rastro para publicaciones, historias, tablon y torneos.
--
--   . Los partidos de torneo se quedan fuera. Su fila en `tournament_matches`
--     los referencia con SET NULL, asi que borrarlos dejaria la ronda sin su
--     enlace al partido de ranking, en silencio. Un torneo se cancela desde el
--     torneo, no partido a partido.

drop trigger if exists rastro_partido on public.matches;
create trigger rastro_partido
  after delete on public.matches
  for each row execute function public.borrar_rastro();

create or replace function public.limpiar_partidos_cancelados()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_borrados integer;
begin
  delete from public.matches
   where estado = 'cancelado'
     and tournament_id is null
     and cancelado_at is not null
     and cancelado_at < now() - interval '5 minutes';

  get diagnostics v_borrados = row_count;
  return v_borrados;
end;
$$;

revoke execute on function public.limpiar_partidos_cancelados()
  from public, anon, authenticated;

do $CRON$
begin
  perform cron.unschedule('reboteapp-cancelados')
    where exists (select 1 from cron.job where jobname = 'reboteapp-cancelados');
  perform cron.schedule('reboteapp-cancelados', '*/5 * * * *',
                        'select public.limpiar_partidos_cancelados()');
end;
$CRON$;
