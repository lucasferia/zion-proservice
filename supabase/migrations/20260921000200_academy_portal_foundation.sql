begin;

-- Todos os usuários anteriores a esta etapa pertencem ao ambiente interno.
-- A migration aborta em vez de inferir uma classificação para contas ambíguas.
do $$
begin
  if exists (
    select 1
    from auth.users
    left join public.profiles on profiles.id = users.id
    where profiles.id is null
  ) then
    raise exception using
      errcode = '55000',
      message = 'Portal da Academia: existe usuário anterior sem profile; classifique-o antes de aplicar a migration.';
  end if;

  if exists (
    select 1
    from auth.users
    where not exists (
      select 1 from public.organization_members
      where organization_members.user_id = users.id
    )
  ) then
    raise exception using
      errcode = '55000',
      message = 'Portal da Academia: existe usuário anterior sem membership; a classificação automática foi bloqueada.';
  end if;

  if exists (
    select organization_members.user_id
    from public.organization_members
    where organization_members.status = 'active'
    group by organization_members.user_id
    having count(*) > 1
  ) then
    raise exception using
      errcode = '55000',
      message = 'Portal da Academia: existe usuário com mais de um membership ativo; resolva a ambiguidade antes da migration.';
  end if;
end;
$$;

create table public.academy_portal_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete restrict,
  status text not null default 'pending',
  status_changed_at timestamptz,
  status_changed_by uuid references auth.users (id) on delete restrict,
  status_change_reason text,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users (id) on delete restrict,
  constraint academy_portal_users_user_organization_unique unique (user_id, organization_id),
  constraint academy_portal_users_status_check check (status in ('pending', 'active', 'suspended')),
  constraint academy_portal_users_organization_required_check check (
    status = 'pending' or organization_id is not null
  ),
  constraint academy_portal_users_status_reason_length check (
    status_change_reason is null
    or char_length(btrim(status_change_reason)) between 3 and 500
  ),
  constraint academy_portal_users_status_audit_check check (
    (status_changed_at is null and status_changed_by is null and status_change_reason is null)
    or
    (status_changed_at is not null and status_changed_by is not null and status_change_reason is not null)
  )
);

create index academy_portal_users_organization_status_idx
  on public.academy_portal_users (organization_id, status, user_id)
  where organization_id is not null;

create table public.academy_portal_access (
  organization_id uuid not null references public.organizations (id) on delete restrict,
  client_id uuid not null,
  status text not null default 'pending',
  status_changed_at timestamptz not null default now(),
  status_changed_by uuid not null references auth.users (id) on delete restrict,
  status_change_reason text not null,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id) on delete restrict,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references auth.users (id) on delete restrict,
  primary key (organization_id, client_id),
  constraint academy_portal_access_client_organization_fk
    foreign key (client_id, organization_id)
    references public.clients (id, organization_id)
    on delete restrict,
  constraint academy_portal_access_status_check check (
    status in ('pending', 'trialing', 'active', 'past_due', 'suspended', 'cancelled')
  ),
  constraint academy_portal_access_reason_length check (
    char_length(btrim(status_change_reason)) between 3 and 500
  )
);

create index academy_portal_access_organization_status_idx
  on public.academy_portal_access (organization_id, status, client_id);

create table public.academy_user_locations (
  organization_id uuid not null references public.organizations (id) on delete restrict,
  user_id uuid not null,
  client_id uuid not null,
  client_location_id uuid not null,
  status text not null default 'active',
  granted_at timestamptz not null default now(),
  granted_by uuid not null references auth.users (id) on delete restrict,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete restrict,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id, client_location_id),
  constraint academy_user_locations_portal_user_fk
    foreign key (user_id, organization_id)
    references public.academy_portal_users (user_id, organization_id)
    on delete restrict,
  constraint academy_user_locations_location_client_organization_fk
    foreign key (client_location_id, client_id, organization_id)
    references public.client_locations (id, client_id, organization_id)
    on delete restrict,
  constraint academy_user_locations_granter_organization_fk
    foreign key (organization_id, granted_by)
    references public.organization_members (organization_id, user_id)
    on delete restrict,
  constraint academy_user_locations_revoker_organization_fk
    foreign key (organization_id, revoked_by)
    references public.organization_members (organization_id, user_id)
    on delete restrict,
  constraint academy_user_locations_user_location_unique unique (user_id, client_location_id),
  constraint academy_user_locations_status_check check (status in ('active', 'revoked')),
  constraint academy_user_locations_reason_length check (
    revocation_reason is null
    or char_length(btrim(revocation_reason)) between 3 and 500
  ),
  constraint academy_user_locations_revocation_audit_check check (
    (
      revoked_at is null and revoked_by is null and revocation_reason is null
    )
    or (
      revoked_at is not null and revoked_by is not null and revocation_reason is not null
    )
  ),
  constraint academy_user_locations_revoked_requires_audit_check check (
    status <> 'revoked'
    or (revoked_at is not null and revoked_by is not null and revocation_reason is not null)
  )
);

create index academy_user_locations_user_active_idx
  on public.academy_user_locations (user_id, organization_id, client_id, client_location_id)
  where status = 'active';

create index academy_user_locations_client_active_idx
  on public.academy_user_locations (organization_id, client_id, client_location_id)
  where status = 'active';

create or replace function public.prevent_mixed_account_classification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'organization_members' then
    if exists (
      select 1 from public.academy_portal_users
      where academy_portal_users.user_id = new.user_id
    ) then
      raise exception using
        errcode = '23514',
        message = 'Usuário externo não pode receber membership operacional.';
    end if;
  elsif exists (
    select 1 from public.organization_members
    where organization_members.user_id = new.user_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Usuário interno não pode ser classificado como usuário externo.';
  end if;
  return new;
end;
$$;

create trigger organization_members_prevent_external_user
before insert or update of user_id on public.organization_members
for each row execute function public.prevent_mixed_account_classification();

create trigger academy_portal_users_prevent_internal_user
before insert or update of user_id on public.academy_portal_users
for each row execute function public.prevent_mixed_account_classification();

create or replace function public.guard_academy_portal_user_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  onboarding_allowed boolean := coalesce(current_setting('zion.academy_onboarding', true), '') = 'allowed';
  administration_allowed boolean := coalesce(current_setting('zion.academy_administration', true), '') = 'allowed';
  internal_provisioning_allowed boolean := coalesce(current_setting('zion.internal_account_provisioning', true), '') = 'allowed';
begin
  if tg_op = 'DELETE' then
    if internal_provisioning_allowed then return old; end if;
    raise exception using errcode = '42501', message = 'Usuários do portal não podem ser excluídos diretamente.';
  end if;
  if tg_op = 'INSERT' then
    if not onboarding_allowed then
      raise exception using errcode = '42501', message = 'Crie usuários externos somente pelo onboarding seguro.';
    end if;
    if new.status <> 'pending' or new.organization_id is not null then
      raise exception using errcode = '23514', message = 'Cadastro externo deve iniciar pendente e sem organização.';
    end if;
    return new;
  end if;
  if not administration_allowed then
    raise exception using errcode = '42501', message = 'Altere usuários externos somente pela operação administrativa rastreável.';
  end if;
  if new.user_id is distinct from old.user_id
    or new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by
  then
    raise exception using errcode = '42501', message = 'A identidade e a auditoria de criação são imutáveis.';
  end if;
  return new;
end;
$$;

create or replace function public.provision_internal_owner(
  target_user_id uuid,
  target_organization_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text := btrim(coalesce(target_organization_name, ''));
  new_organization_id uuid := gen_random_uuid();
  portal_record record;
begin
  if char_length(normalized_name) < 2 or char_length(normalized_name) > 120 then
    raise exception using errcode = '22023', message = 'Informe uma organização entre 2 e 120 caracteres.';
  end if;

  perform 1 from auth.users where id = target_user_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'Usuário não encontrado.'; end if;
  if exists (select 1 from public.organization_members where user_id = target_user_id) then
    raise exception using errcode = '23514', message = 'Usuário já possui classificação interna.';
  end if;

  select status, organization_id into portal_record
  from public.academy_portal_users
  where user_id = target_user_id
  for update;
  if not found
    or portal_record.status <> 'pending'
    or portal_record.organization_id is not null
  then
    raise exception using errcode = '23514', message = 'Somente cadastro externo pendente e ainda não vinculado pode ser provisionado.';
  end if;

  perform set_config('zion.internal_account_provisioning', 'allowed', true);
  delete from public.academy_portal_users where user_id = target_user_id;
  perform set_config('zion.internal_account_provisioning', '', true);

  insert into public.organizations (id, name, created_by)
  values (new_organization_id, normalized_name, target_user_id);
  insert into public.organization_members (organization_id, user_id, role, status, created_by)
  values (new_organization_id, target_user_id, 'owner', 'active', target_user_id);

  return new_organization_id;
end;
$$;

create or replace function public.guard_academy_portal_access_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean := coalesce(current_setting('zion.academy_administration', true), '') = 'allowed';
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '42501', message = 'A liberação comercial não pode ser excluída diretamente.';
  end if;
  if not allowed then
    raise exception using errcode = '42501', message = 'Altere a liberação comercial somente pela operação administrativa rastreável.';
  end if;
  if tg_op = 'UPDATE' and (
    new.organization_id is distinct from old.organization_id
    or new.client_id is distinct from old.client_id
    or new.created_at is distinct from old.created_at
    or new.created_by is distinct from old.created_by
  ) then
    raise exception using errcode = '42501', message = 'A identidade e a auditoria de criação da liberação são imutáveis.';
  end if;
  return new;
end;
$$;

create or replace function public.guard_academy_location_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed boolean := coalesce(current_setting('zion.academy_administration', true), '') = 'allowed';
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '42501', message = 'Vínculos do portal não podem ser excluídos diretamente.';
  end if;
  if not allowed then
    raise exception using errcode = '42501', message = 'Altere vínculos do portal somente pela operação administrativa rastreável.';
  end if;
  if tg_op = 'UPDATE' and (
    new.organization_id is distinct from old.organization_id
    or new.user_id is distinct from old.user_id
    or new.client_id is distinct from old.client_id
    or new.client_location_id is distinct from old.client_location_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using errcode = '42501', message = 'A identidade do vínculo é imutável.';
  end if;
  return new;
end;
$$;

create trigger academy_portal_users_guard
before insert or update or delete on public.academy_portal_users
for each row execute function public.guard_academy_portal_user_mutation();

create trigger academy_portal_access_guard
before insert or update or delete on public.academy_portal_access
for each row execute function public.guard_academy_portal_access_mutation();

create trigger academy_user_locations_guard
before insert or update or delete on public.academy_user_locations
for each row execute function public.guard_academy_location_mutation();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  trusted_account_type text := nullif(btrim(coalesce(new.raw_app_meta_data ->> 'zion_account_type', '')), '');
  user_full_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  trusted_organization_name text := nullif(btrim(coalesce(new.raw_app_meta_data ->> 'zion_organization_name', '')), '');
  new_organization_id uuid;
begin
  insert into public.profiles (id, full_name)
  values (new.id, user_full_name)
  on conflict (id) do nothing;

  if trusted_account_type = 'internal_owner' then
    new_organization_id := gen_random_uuid();
    insert into public.organizations (id, name, created_by)
    values (
      new_organization_id,
      coalesce(trusted_organization_name, user_full_name, 'Minha organização'),
      new.id
    );
    insert into public.organization_members (
      organization_id, user_id, role, status, created_by
    ) values (
      new_organization_id, new.id, 'owner', 'active', new.id
    );
  elsif trusted_account_type is distinct from 'internal_member' then
    perform set_config('zion.academy_onboarding', 'allowed', true);
    insert into public.academy_portal_users (
      user_id, status, created_by, updated_by
    ) values (
      new.id, 'pending', new.id, new.id
    );
    perform set_config('zion.academy_onboarding', '', true);
  end if;

  return new;
end;
$$;

alter table public.academy_portal_users enable row level security;
alter table public.academy_portal_access enable row level security;
alter table public.academy_user_locations enable row level security;

create policy "academy_portal_users_select_owner"
on public.academy_portal_users
for select to authenticated
using (
  organization_id is not null
  and public.is_organization_owner(organization_id)
);

create policy "academy_portal_access_select_owner"
on public.academy_portal_access
for select to authenticated
using (public.is_organization_owner(organization_id));

create policy "academy_user_locations_select_owner"
on public.academy_user_locations
for select to authenticated
using (public.is_organization_owner(organization_id));

revoke all on table public.academy_portal_users from anon, authenticated;
revoke all on table public.academy_portal_access from anon, authenticated;
revoke all on table public.academy_user_locations from anon, authenticated;
grant select on table public.academy_portal_users to authenticated;
grant select on table public.academy_portal_access to authenticated;
grant select on table public.academy_user_locations to authenticated;

create or replace function public.is_academy_portal_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1 from public.academy_portal_users
      where academy_portal_users.user_id = (select auth.uid())
    )
    and not exists (
      select 1 from public.organization_members
      where organization_members.user_id = (select auth.uid())
    );
$$;

create or replace function public.has_active_academy_portal_access(
  target_organization_id uuid,
  target_client_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.academy_portal_users as portal_user
      join public.organizations
        on organizations.id = portal_user.organization_id
        and organizations.status = 'active'
      join public.academy_portal_access as portal_access
        on portal_access.organization_id = portal_user.organization_id
        and portal_access.client_id = target_client_id
        and portal_access.status in ('trialing', 'active')
      join public.clients
        on clients.id = portal_access.client_id
        and clients.organization_id = portal_access.organization_id
        and clients.deleted_at is null
      where portal_user.user_id = (select auth.uid())
        and portal_user.organization_id = target_organization_id
        and portal_user.status = 'active'
    );
$$;

create or replace function public.has_academy_location_access(
  target_organization_id uuid,
  target_client_id uuid,
  target_client_location_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_active_academy_portal_access(target_organization_id, target_client_id)
    and exists (
      select 1
      from public.academy_user_locations as user_location
      join public.client_locations
        on client_locations.id = user_location.client_location_id
        and client_locations.client_id = user_location.client_id
        and client_locations.organization_id = user_location.organization_id
        and client_locations.deleted_at is null
      where user_location.organization_id = target_organization_id
        and user_location.user_id = (select auth.uid())
        and user_location.client_id = target_client_id
        and user_location.client_location_id = target_client_location_id
        and user_location.status = 'active'
    );
$$;

create or replace function public.set_academy_portal_user_status(
  target_organization_id uuid,
  target_user_id uuid,
  target_status text,
  change_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_reason text := btrim(coalesce(change_reason, ''));
  current_organization_id uuid;
begin
  if actor_id is null or not public.is_organization_owner(target_organization_id) then
    raise exception using errcode = '42501', message = 'Somente o owner pode administrar usuários do portal.';
  end if;
  if target_status not in ('pending', 'active', 'suspended') then
    raise exception using errcode = '22023', message = 'Status de usuário externo inválido.';
  end if;
  if char_length(normalized_reason) < 3 or char_length(normalized_reason) > 500 then
    raise exception using errcode = '22023', message = 'Informe um motivo entre 3 e 500 caracteres.';
  end if;
  if exists (select 1 from public.organization_members where user_id = target_user_id) then
    raise exception using errcode = '23514', message = 'Usuário interno não pode ser classificado como usuário externo.';
  end if;

  select organization_id into current_organization_id
  from public.academy_portal_users
  where user_id = target_user_id
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'Usuário externo não encontrado.'; end if;
  if current_organization_id is not null and current_organization_id <> target_organization_id then
    raise exception using errcode = '42501', message = 'Usuário externo pertence a outra organização.';
  end if;

  perform set_config('zion.academy_administration', 'allowed', true);
  update public.academy_portal_users
  set organization_id = target_organization_id,
      status = target_status,
      status_changed_at = now(),
      status_changed_by = actor_id,
      status_change_reason = normalized_reason,
      updated_at = now(),
      updated_by = actor_id
  where user_id = target_user_id;
  perform set_config('zion.academy_administration', '', true);
end;
$$;

create or replace function public.set_academy_portal_access(
  target_organization_id uuid,
  target_client_id uuid,
  target_status text,
  change_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_reason text := btrim(coalesce(change_reason, ''));
  portal_access_exists boolean;
begin
  if actor_id is null or not public.is_organization_owner(target_organization_id) then
    raise exception using errcode = '42501', message = 'Somente o owner pode administrar a liberação comercial.';
  end if;
  if target_status not in ('pending', 'trialing', 'active', 'past_due', 'suspended', 'cancelled') then
    raise exception using errcode = '22023', message = 'Status comercial inválido.';
  end if;
  if char_length(normalized_reason) < 3 or char_length(normalized_reason) > 500 then
    raise exception using errcode = '22023', message = 'Informe um motivo entre 3 e 500 caracteres.';
  end if;
  if not exists (
    select 1 from public.clients
    where clients.id = target_client_id
      and clients.organization_id = target_organization_id
      and (clients.deleted_at is null or target_status not in ('trialing', 'active'))
  ) then
    raise exception using errcode = '55000', message = 'Cliente não encontrado, pertence a outro tenant ou está arquivado.';
  end if;

  perform 1
  from public.academy_portal_access
  where organization_id = target_organization_id and client_id = target_client_id
  for update;
  portal_access_exists := found;

  perform set_config('zion.academy_administration', 'allowed', true);
  if not portal_access_exists then
    if target_status <> 'pending' then
      raise exception using errcode = '55000', message = 'A liberação comercial deve iniciar como pendente.';
    end if;
    insert into public.academy_portal_access (
      organization_id, client_id, status, status_changed_at, status_changed_by,
      status_change_reason, created_by, updated_by
    ) values (
      target_organization_id, target_client_id, target_status, now(), actor_id,
      normalized_reason, actor_id, actor_id
    );
  else
    update public.academy_portal_access
    set status = target_status,
        status_changed_at = now(),
        status_changed_by = actor_id,
        status_change_reason = normalized_reason,
        updated_at = now(),
        updated_by = actor_id
    where organization_id = target_organization_id and client_id = target_client_id;
  end if;
  perform set_config('zion.academy_administration', '', true);
end;
$$;

create or replace function public.grant_academy_location_access(
  target_organization_id uuid,
  target_user_id uuid,
  target_client_id uuid,
  target_client_location_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null or not public.is_organization_owner(target_organization_id) then
    raise exception using errcode = '42501', message = 'Somente o owner pode conceder unidades do portal.';
  end if;
  if not exists (
    select 1 from public.academy_portal_users
    where user_id = target_user_id and organization_id = target_organization_id
  ) then
    raise exception using errcode = '23503', message = 'Usuário externo não pertence a esta organização.';
  end if;
  if not exists (
    select 1
    from public.client_locations
    join public.clients
      on clients.id = client_locations.client_id
      and clients.organization_id = client_locations.organization_id
    where client_locations.id = target_client_location_id
      and client_locations.client_id = target_client_id
      and client_locations.organization_id = target_organization_id
      and client_locations.deleted_at is null
      and clients.deleted_at is null
  ) then
    raise exception using errcode = '23503', message = 'Cliente ou unidade inválidos para esta organização.';
  end if;
  if exists (
    select 1 from public.academy_user_locations
    where user_id = target_user_id
      and status = 'active'
      and client_id <> target_client_id
  ) then
    raise exception using errcode = '23514', message = 'Um usuário externo só pode possuir unidades ativas do mesmo cliente.';
  end if;

  perform set_config('zion.academy_administration', 'allowed', true);
  insert into public.academy_user_locations (
    organization_id, user_id, client_id, client_location_id,
    status, granted_at, granted_by
  ) values (
    target_organization_id, target_user_id, target_client_id, target_client_location_id,
    'active', now(), actor_id
  )
  on conflict (organization_id, user_id, client_location_id)
  do update set
    status = 'active',
    granted_at = now(),
    granted_by = actor_id,
    updated_at = now();
  perform set_config('zion.academy_administration', '', true);
end;
$$;

create or replace function public.revoke_academy_location_access(
  target_organization_id uuid,
  target_user_id uuid,
  target_client_location_id uuid,
  revocation_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_reason text := btrim(coalesce(revocation_reason, ''));
begin
  if actor_id is null or not public.is_organization_owner(target_organization_id) then
    raise exception using errcode = '42501', message = 'Somente o owner pode revogar unidades do portal.';
  end if;
  if char_length(normalized_reason) < 3 or char_length(normalized_reason) > 500 then
    raise exception using errcode = '22023', message = 'Informe um motivo entre 3 e 500 caracteres.';
  end if;

  perform 1 from public.academy_user_locations
  where organization_id = target_organization_id
    and user_id = target_user_id
    and client_location_id = target_client_location_id
    and status = 'active'
  for update;
  if not found then raise exception using errcode = 'P0002', message = 'Vínculo ativo não encontrado.'; end if;

  perform set_config('zion.academy_administration', 'allowed', true);
  update public.academy_user_locations
  set status = 'revoked',
      revoked_at = now(),
      revoked_by = actor_id,
      revocation_reason = normalized_reason,
      updated_at = now()
  where organization_id = target_organization_id
    and user_id = target_user_id
    and client_location_id = target_client_location_id;
  perform set_config('zion.academy_administration', '', true);
end;
$$;

create or replace function public.resolve_access_context()
returns table (access_context text, blocking_reason text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  internal_count integer;
  internal_role text;
  portal_record record;
begin
  if actor_id is null then
    return query select 'invalid_account'::text, 'authentication_required'::text;
    return;
  end if;

  select count(*), min(role)
  into internal_count, internal_role
  from public.organization_members
  where user_id = actor_id and status = 'active';

  if internal_count = 1 then
    return query select
      case internal_role when 'owner' then 'internal_owner' else 'internal_technician' end,
      null::text;
    return;
  elsif internal_count > 1 then
    return query select 'invalid_account'::text, 'ambiguous_internal_membership'::text;
    return;
  end if;

  select user_id, organization_id, status
  into portal_record
  from public.academy_portal_users
  where user_id = actor_id;

  if not found then
    return query select 'invalid_account'::text, 'account_not_classified'::text;
    return;
  end if;
  if portal_record.status = 'pending' then
    return query select 'academy_pending'::text, 'registration_pending'::text;
    return;
  end if;
  if portal_record.status = 'suspended' then
    return query select 'academy_suspended'::text, 'account_suspended'::text;
    return;
  end if;
  if portal_record.organization_id is null then
    return query select 'academy_pending'::text, 'organization_pending'::text;
    return;
  end if;
  if not exists (
    select 1 from public.organizations
    where id = portal_record.organization_id and status = 'active'
  ) then
    return query select 'academy_suspended'::text, 'organization_suspended'::text;
    return;
  end if;
  if not exists (
    select 1
    from public.academy_user_locations as links
    join public.clients
      on clients.id = links.client_id
      and clients.organization_id = links.organization_id
      and clients.deleted_at is null
    join public.client_locations as locations
      on locations.id = links.client_location_id
      and locations.client_id = links.client_id
      and locations.organization_id = links.organization_id
      and locations.deleted_at is null
    where links.user_id = actor_id
      and links.organization_id = portal_record.organization_id
      and links.status = 'active'
  ) then
    return query select 'academy_pending'::text, 'no_active_location'::text;
    return;
  end if;
  if exists (
    select 1
    from public.academy_user_locations as links
    where links.user_id = actor_id
      and links.organization_id = portal_record.organization_id
      and links.status = 'active'
      and public.has_academy_location_access(
        links.organization_id, links.client_id, links.client_location_id
      )
  ) then
    return query select 'academy_active'::text, null::text;
    return;
  end if;
  if exists (
    select 1
    from public.academy_user_locations as links
    join public.academy_portal_access as portal_access
      on portal_access.organization_id = links.organization_id
      and portal_access.client_id = links.client_id
    where links.user_id = actor_id
      and links.organization_id = portal_record.organization_id
      and links.status = 'active'
      and portal_access.status in ('past_due', 'suspended', 'cancelled')
  ) then
    return query select 'academy_suspended'::text, 'commercial_access_blocked'::text;
    return;
  end if;

  return query select 'academy_pending'::text, 'commercial_access_pending'::text;
end;
$$;

revoke all on function public.prevent_mixed_account_classification() from public, anon, authenticated;
revoke all on function public.guard_academy_portal_user_mutation() from public, anon, authenticated;
revoke all on function public.guard_academy_portal_access_mutation() from public, anon, authenticated;
revoke all on function public.guard_academy_location_mutation() from public, anon, authenticated;
revoke all on function public.is_academy_portal_user() from public, anon;
revoke all on function public.has_active_academy_portal_access(uuid, uuid) from public, anon;
revoke all on function public.has_academy_location_access(uuid, uuid, uuid) from public, anon;
revoke all on function public.set_academy_portal_user_status(uuid, uuid, text, text) from public, anon;
revoke all on function public.set_academy_portal_access(uuid, uuid, text, text) from public, anon;
revoke all on function public.grant_academy_location_access(uuid, uuid, uuid, uuid) from public, anon;
revoke all on function public.revoke_academy_location_access(uuid, uuid, uuid, text) from public, anon;
revoke all on function public.resolve_access_context() from public, anon;
revoke all on function public.provision_internal_owner(uuid, text) from public, anon, authenticated;

grant execute on function public.is_academy_portal_user() to authenticated;
grant execute on function public.has_active_academy_portal_access(uuid, uuid) to authenticated;
grant execute on function public.has_academy_location_access(uuid, uuid, uuid) to authenticated;
grant execute on function public.set_academy_portal_user_status(uuid, uuid, text, text) to authenticated;
grant execute on function public.set_academy_portal_access(uuid, uuid, text, text) to authenticated;
grant execute on function public.grant_academy_location_access(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.revoke_academy_location_access(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.resolve_access_context() to authenticated;
grant execute on function public.provision_internal_owner(uuid, text) to service_role;

comment on table public.academy_portal_users is
  'Classificação externa independente de organization_members. Signup público inicia pendente e sem tenant atribuído.';
comment on table public.academy_user_locations is
  'Vínculos N:N revogáveis entre usuário externo e unidades de um único cliente por vez.';
comment on table public.academy_portal_access is
  'Controle comercial por cliente; somente trialing e active liberam o Portal da Academia.';
comment on function public.handle_new_user() is
  'Signup público cria profile e academy_portal_user pendente. Contas internas exigem raw_app_meta_data zion_account_type=internal_owner ou internal_member definido exclusivamente por procedimento administrativo confiável.';
comment on function public.provision_internal_owner(uuid, text) is
  'Provisionamento pós-Admin API exclusivo de service_role. Converte somente cadastro externo pendente e não vinculado em owner de uma nova organização.';

commit;
