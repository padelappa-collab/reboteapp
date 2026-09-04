-- =============================================================================
-- Suscripciones de push.
--
-- Cada dispositivo que acepta recibir notificaciones genera un "endpoint": una
-- dirección propia del servicio de push del navegador. Un jugador con teléfono
-- y computador tiene dos filas, y las dos deben recibir.
--
-- Las claves p256dh y auth son las que cifran el contenido para que solo ese
-- dispositivo pueda leerlo: ni Apple ni Google ven el texto del aviso.
-- =============================================================================

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  -- para saber desde dónde se suscribió, útil al depurar
  agente     text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy push_select on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

create policy push_insert on public.push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy push_delete on public.push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

-- El interruptor del jugador. Apagarlo es la salida sana cuando alguien se
-- cansa: no hace falta que revoque el permiso del navegador, que en iOS es
-- difícil de recuperar.
alter table public.users
  add column if not exists push_activo boolean not null default true;

revoke update on public.users from authenticated;

grant update (nombre, ciudad, foto_url, cuenta_privada, username, push_activo)
  on public.users to authenticated;
