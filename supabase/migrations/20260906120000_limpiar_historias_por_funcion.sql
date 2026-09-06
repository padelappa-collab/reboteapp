-- La limpieza de historias caducadas pasa a una función Edge.
--
-- Quitar la fila de storage.objects no borra el archivo del almacenamiento: eso
-- solo lo hace la API de Storage. Mientras esto vivió en SQL, cada historia
-- publicada dejaba su foto en el bucket para siempre.

drop function if exists public.limpiar_historias();

create function public.limpiar_historias()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://rflqogmivuwqqzpyrilm.supabase.co/functions/v1/limpiar-historias',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_F3Iv0GXE0QiNnZuiee-FZA_gI51a0el',
      'Authorization', 'Bearer sb_publishable_F3Iv0GXE0QiNnZuiee-FZA_gI51a0el'
    ),
    body := '{}'::jsonb);
end;
$$;

revoke execute on function public.limpiar_historias() from public, anon, authenticated;

do $CRON$
begin
  perform cron.unschedule('reboteapp-historias')
    where exists (select 1 from cron.job where jobname = 'reboteapp-historias');
  perform cron.schedule('reboteapp-historias', '7 * * * *',
                        'select public.limpiar_historias()');
end;
$CRON$;
