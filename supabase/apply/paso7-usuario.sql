-- =============================================================================
-- Nombre de usuario.
--
-- El nombre real sirve para que te reconozcan en la cancha, pero no es único ni
-- tiene por qué serlo: en Cartagena hay varios Andrés. El usuario sí es único y
-- es lo que permite buscar a alguien y enlazar su perfil sin ambigüedad.
--
-- Queda opcional a propósito: exigirlo de golpe dejaría fuera a quien ya se
-- registró. La app lo pide, no lo impone.
-- =============================================================================

alter table public.users add column if not exists username text;

alter table public.users drop constraint if exists username_valido;

alter table public.users add constraint username_valido check (
  username is null
  or (username ~ '^[a-zA-Z0-9_.]+$' and char_length(username) between 3 and 20)
);

-- Único sin importar mayúsculas: nadie puede ser "Felipe" si existe "felipe".
create unique index if not exists users_username_unico
  on public.users (lower(username));

comment on column public.users.username is
  'Identificador único y opcional. El nombre real no es único.';

-- ---------------------------------------------------------------------------
-- Permisos de escritura del jugador sobre su propia fila.
--
-- Se vuelven a declarar enteros porque han ido creciendo: cuenta_privada se
-- añadió con el feed y nunca se concedió, así que el interruptor de privacidad
-- fallaba con "permission denied". Género, categoría y ELO siguen fuera: son lo
-- que sostiene el ranking.
-- ---------------------------------------------------------------------------
revoke update on public.users from authenticated;

grant update (nombre, ciudad, foto_url, cuenta_privada, username)
  on public.users to authenticated;
