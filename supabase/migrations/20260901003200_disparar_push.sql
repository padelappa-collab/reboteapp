-- =============================================================================
-- Conectar las novedades con la función que envía los push.
--
-- Se puede hacer desde el panel, en Database > Webhooks, pero hacerlo con SQL
-- deja el enlace versionado en el repo: un ajuste hecho a mano en un panel es
-- justo lo que nadie recuerda haber tocado cuando algo deja de funcionar.
-- =============================================================================

create extension if not exists pg_net;

create or replace function public.disparar_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- La llamada no espera respuesta: si el push falla, la novedad ya quedó
  -- guardada y el jugador la verá igual al abrir la app. El aviso al teléfono
  -- es un extra, no puede tumbar la operación que lo originó.
  perform net.http_post(
    url := 'https://rflqogmivuwqqzpyrilm.supabase.co/functions/v1/enviar-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      -- La puerta de entrada de las Edge Functions solo acepta el formato nuevo
      -- de claves: la anon key de siempre, que sirve para la base y el login,
      -- aquí devuelve 401. Esta es pública por diseño.
      'apikey', 'sb_publishable_F3Iv0GXE0QiNnZuiee-FZA_gI51a0el',
      'Authorization', 'Bearer sb_publishable_F3Iv0GXE0QiNnZuiee-FZA_gI51a0el'
    ),
    body := jsonb_build_object('record', to_jsonb(new))
  );

  return new;
end;
$$;

drop trigger if exists notifications_push on public.notifications;

create trigger notifications_push
  after insert on public.notifications
  for each row execute function public.disparar_push();
