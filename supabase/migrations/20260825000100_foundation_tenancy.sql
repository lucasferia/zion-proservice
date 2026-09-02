begin;

create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (
    full_name is null or char_length(full_name) between 2 and 120
  )
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length check (char_length(name) between 2 and 120),
  constraint organizations_status_check check (status in ('active', 'suspended'))
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  status text not null default 'active',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint organization_members_role_check check (role in ('owner', 'technician')),
  constraint organization_members_status_check check (status in ('active', 'inactive'))
);

create index organization_members_user_id_idx
  on public.organization_members (user_id)
  where status = 'active';

create index organization_members_organization_id_idx
  on public.organization_members (organization_id)
  where status = 'active';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger organization_members_set_updated_at
before update on public.organization_members
for each row execute function public.set_updated_at();

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

create or replace function public.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = (select auth.uid())
      and role = 'owner'
      and status = 'active'
  );
$$;

create or replace function public.prevent_last_owner_deactivation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.role = 'owner'
    and old.status = 'active'
    and (new.role <> 'owner' or new.status <> 'active')
    and not exists (
      select 1
      from public.organization_members
      where organization_id = old.organization_id
        and user_id <> old.user_id
        and role = 'owner'
        and status = 'active'
    )
  then
    raise exception 'A organização deve manter ao menos um owner ativo.';
  end if;

  return new;
end;
$$;

create trigger organization_members_keep_active_owner
before update on public.organization_members
for each row execute function public.prevent_last_owner_deactivation();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_organization_id uuid := gen_random_uuid();
  user_full_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  organization_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'organization_name', '')), '');
begin
  if organization_name is null then
    organization_name := coalesce(user_full_name, 'Minha organização');
  end if;

  insert into public.profiles (id, full_name)
  values (new.id, user_full_name)
  on conflict (id) do nothing;

  insert into public.organizations (id, name, created_by)
  values (new_organization_id, organization_name, new.id);

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    created_by
  )
  values (
    new_organization_id,
    new.id,
    'owner',
    'active',
    new.id
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Garante a mesma fundação para usuários criados antes desta migration.
do $$
declare
  existing_user record;
  new_organization_id uuid;
  user_full_name text;
  organization_name text;
begin
  for existing_user in
    select users.id, users.raw_user_meta_data
    from auth.users as users
    where not exists (
      select 1
      from public.organization_members as members
      where members.user_id = users.id
    )
  loop
    user_full_name := nullif(
      btrim(coalesce(existing_user.raw_user_meta_data ->> 'full_name', '')),
      ''
    );
    organization_name := nullif(
      btrim(coalesce(existing_user.raw_user_meta_data ->> 'organization_name', '')),
      ''
    );
    organization_name := coalesce(organization_name, user_full_name, 'Minha organização');
    new_organization_id := gen_random_uuid();

    insert into public.profiles (id, full_name)
    values (existing_user.id, user_full_name)
    on conflict (id) do nothing;

    insert into public.organizations (id, name, created_by)
    values (new_organization_id, organization_name, existing_user.id);

    insert into public.organization_members (
      organization_id,
      user_id,
      role,
      status,
      created_by
    )
    values (
      new_organization_id,
      existing_user.id,
      'owner',
      'active',
      existing_user.id
    );
  end loop;
end;
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "organizations_select_member"
on public.organizations
for select
to authenticated
using (public.is_organization_member(id));

create policy "organizations_update_owner"
on public.organizations
for update
to authenticated
using (public.is_organization_owner(id))
with check (public.is_organization_owner(id));

create policy "organization_members_select_member"
on public.organization_members
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "organization_members_insert_owner"
on public.organization_members
for insert
to authenticated
with check (public.is_organization_owner(organization_id));

create policy "organization_members_update_owner"
on public.organization_members
for update
to authenticated
using (public.is_organization_owner(organization_id))
with check (public.is_organization_owner(organization_id));

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.organizations from anon, authenticated;
revoke all on table public.organization_members from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;

grant select on table public.organizations to authenticated;
grant update (name) on table public.organizations to authenticated;

grant select on table public.organization_members to authenticated;
grant insert (
  organization_id,
  user_id,
  role,
  status
) on table public.organization_members to authenticated;
grant update (role, status) on table public.organization_members to authenticated;

revoke all on function public.is_organization_member(uuid) from public, anon;
revoke all on function public.is_organization_owner(uuid) from public, anon;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_owner(uuid) to authenticated;

comment on table public.organizations is
  'Tenant raiz do ZION ProService. Cada usuário novo recebe uma organização própria.';
comment on table public.organization_members is
  'Associação entre usuários e organizações, limitada aos papéis owner e technician.';

commit;
