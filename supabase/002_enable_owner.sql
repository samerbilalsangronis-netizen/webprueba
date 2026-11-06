-- Después de crear la cuenta de la dueña en Authentication > Users.
-- Sustituir el correo siguiente por su correo real y ejecutar como postgres
-- desde el SQL Editor. Ninguna cuenta puede autoasignarse estos permisos.
do $$
declare
  owner_email text := 'CAMBIAR_POR_CORREO_DE_LA_DUENA';
  owner_id uuid;
begin
  select id into owner_id from auth.users where lower(email)=lower(owner_email);
  if owner_id is null then
    raise exception 'Primero crea la cuenta de la dueña en Authentication > Users y usa ese mismo correo.';
  end if;
  insert into aracnes_private.admins(user_id) values(owner_id) on conflict do nothing;
end $$;
