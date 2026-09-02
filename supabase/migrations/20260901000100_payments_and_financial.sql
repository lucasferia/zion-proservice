begin;

alter table public.maintenances
  add constraint maintenances_id_client_organization_unique
  unique (id, client_id, organization_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  client_id uuid not null,
  maintenance_id uuid not null,
  amount numeric(14, 2) not null,
  method text not null,
  status text not null default 'pending',
  paid_at timestamptz,
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete restrict,
  cancellation_reason text,
  constraint payments_id_organization_unique unique (id, organization_id),
  constraint payments_maintenance_client_organization_fk
    foreign key (maintenance_id, client_id, organization_id)
    references public.maintenances (id, client_id, organization_id)
    on delete restrict,
  constraint payments_creator_organization_fk
    foreign key (organization_id, created_by)
    references public.organization_members (organization_id, user_id)
    on delete restrict,
  constraint payments_amount_check check (
    amount > 0 and amount <= 999999999999.99
  ),
  constraint payments_method_check check (
    method in (
      'pix', 'cash', 'credit_card', 'debit_card',
      'bank_transfer', 'boleto', 'other'
    )
  ),
  constraint payments_status_check check (
    status in ('pending', 'received', 'cancelled')
  ),
  constraint payments_notes_length check (
    notes is null or char_length(notes) <= 2000
  ),
  constraint payments_cancellation_reason_length check (
    cancellation_reason is null
    or char_length(btrim(cancellation_reason)) between 3 and 500
  ),
  constraint payments_status_audit_check check (
    (
      status = 'pending'
      and paid_at is null
      and cancelled_at is null
      and cancelled_by is null
      and cancellation_reason is null
    )
    or (
      status = 'received'
      and paid_at is not null
      and cancelled_at is null
      and cancelled_by is null
      and cancellation_reason is null
    )
    or (
      status = 'cancelled'
      and cancelled_at is not null
      and cancelled_by is not null
      and cancellation_reason is not null
    )
  )
);

create index payments_organization_created_idx
  on public.payments (organization_id, created_at desc);

create index payments_organization_due_idx
  on public.payments (organization_id, due_date)
  where status = 'pending' and due_date is not null;

create index payments_maintenance_created_idx
  on public.payments (maintenance_id, created_at desc);

create index payments_client_created_idx
  on public.payments (client_id, created_at desc);

create index payments_received_revenue_idx
  on public.payments (organization_id, paid_at desc)
  where status = 'received';

create or replace function public.guard_payment_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  maintenance_record record;
  active_total numeric(14, 2);
  receiving_allowed boolean := coalesce(
    current_setting('zion.payment_receiving', true), ''
  ) = 'allowed';
  cancellation_allowed boolean := coalesce(
    current_setting('zion.payment_cancellation', true), ''
  ) = 'allowed';
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '42501',
      message = 'Pagamentos fazem parte do histórico financeiro e não podem ser excluídos.';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.organization_id is distinct from old.organization_id
      or new.client_id is distinct from old.client_id
      or new.maintenance_id is distinct from old.maintenance_id
      or new.created_at is distinct from old.created_at
      or new.created_by is distinct from old.created_by
    then
      raise exception using errcode = '42501', message = 'Os vínculos e a auditoria do pagamento são imutáveis.';
    end if;

    if old.status in ('received', 'cancelled') then
      if not (
        cancellation_allowed
        and old.status = 'received'
        and new.status = 'cancelled'
        and new.amount is not distinct from old.amount
        and new.method is not distinct from old.method
        and new.paid_at is not distinct from old.paid_at
        and new.due_date is not distinct from old.due_date
        and new.notes is not distinct from old.notes
      ) then
        raise exception using
          errcode = '42501',
          message = 'Pagamentos recebidos ou cancelados são imutáveis.';
      end if;
    elsif old.status = 'pending' and new.status is distinct from old.status then
      if not (
        (receiving_allowed and new.status = 'received')
        or (cancellation_allowed and new.status = 'cancelled')
      ) then
        raise exception using
          errcode = '42501',
          message = 'Altere o status do pagamento pela operação financeira rastreável.';
      end if;
    end if;

    if not receiving_allowed and new.paid_at is distinct from old.paid_at then
      raise exception using errcode = '42501', message = 'A data de recebimento é protegida.';
    end if;

    if not cancellation_allowed and (
      new.cancelled_at is distinct from old.cancelled_at
      or new.cancelled_by is distinct from old.cancelled_by
      or new.cancellation_reason is distinct from old.cancellation_reason
    ) then
      raise exception using errcode = '42501', message = 'A auditoria de cancelamento é protegida.';
    end if;
  elsif new.status = 'cancelled' then
    raise exception using errcode = '23514', message = 'Um pagamento não pode ser criado já cancelado.';
  end if;

  select
    maintenances.total_amount,
    maintenances.status,
    maintenances.client_id
  into maintenance_record
  from public.maintenances
  where maintenances.id = new.maintenance_id
    and maintenances.organization_id = new.organization_id
  for update;

  if not found or maintenance_record.client_id <> new.client_id then
    raise exception using errcode = '23503', message = 'Manutenção e cliente não encontrados nesta organização.';
  end if;

  if tg_op = 'INSERT' and maintenance_record.status = 'cancelled' then
    raise exception using errcode = '55000', message = 'Não é possível registrar pagamento em uma manutenção cancelada.';
  end if;

  if new.status in ('pending', 'received') then
    select coalesce(sum(payments.amount), 0)
    into active_total
    from public.payments
    where payments.organization_id = new.organization_id
      and payments.maintenance_id = new.maintenance_id
      and payments.status in ('pending', 'received')
      and payments.id <> new.id;

    if active_total + new.amount > maintenance_record.total_amount then
      raise exception using
        errcode = '23514',
        message = 'A soma dos pagamentos ativos não pode ultrapassar o valor da OS.';
    end if;
  end if;

  return new;
end;
$$;

create trigger payments_guard_mutation
before insert or update or delete on public.payments
for each row execute function public.guard_payment_mutation();

create or replace function public.guard_maintenance_payment_ceiling()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_total numeric(14, 2);
begin
  if new.total_amount is distinct from old.total_amount then
    select coalesce(sum(payments.amount), 0)
    into active_total
    from public.payments
    where payments.organization_id = new.organization_id
      and payments.maintenance_id = new.id
      and payments.status in ('pending', 'received');

    if active_total > new.total_amount then
      raise exception using
        errcode = '23514',
        message = 'O valor da OS não pode ficar abaixo dos pagamentos ativos.';
    end if;
  end if;
  return new;
end;
$$;

create trigger maintenances_guard_payment_ceiling
before update of total_amount on public.maintenances
for each row execute function public.guard_maintenance_payment_ceiling();

alter table public.payments enable row level security;

create policy "payments_select_member"
on public.payments
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "payments_insert_member"
on public.payments
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
  and created_by = (select auth.uid())
  and exists (
    select 1
    from public.maintenances
    where maintenances.id = payments.maintenance_id
      and maintenances.client_id = payments.client_id
      and maintenances.organization_id = payments.organization_id
      and maintenances.status <> 'cancelled'
  )
);

create policy "payments_update_member"
on public.payments
for update
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

revoke all on table public.payments from anon, authenticated;
grant select on table public.payments to authenticated;
grant insert (
  organization_id,
  client_id,
  maintenance_id,
  amount,
  method,
  status,
  paid_at,
  due_date,
  notes
) on table public.payments to authenticated;
grant update (
  amount,
  method,
  due_date,
  notes
) on table public.payments to authenticated;

create or replace function public.receive_payment(
  target_organization_id uuid,
  target_payment_id uuid,
  received_at timestamptz default now()
)
returns table (
  payment_id uuid,
  status text,
  paid_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  payment_status text;
  effective_paid_at timestamptz := coalesce(received_at, now());
begin
  if actor_id is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para confirmar este recebimento.';
  end if;

  select payments.status
  into payment_status
  from public.payments
  where payments.id = target_payment_id
    and payments.organization_id = target_organization_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Pagamento não encontrado.';
  end if;

  if payment_status <> 'pending' then
    raise exception using errcode = '55000', message = 'Somente pagamentos pendentes podem ser recebidos.';
  end if;

  perform set_config('zion.payment_receiving', 'allowed', true);
  update public.payments
  set status = 'received', paid_at = effective_paid_at
  where id = target_payment_id
    and organization_id = target_organization_id;
  perform set_config('zion.payment_receiving', '', true);

  return query select target_payment_id, 'received'::text, effective_paid_at;
end;
$$;

create or replace function public.cancel_payment(
  target_organization_id uuid,
  target_payment_id uuid,
  cancellation_reason text
)
returns table (
  payment_id uuid,
  status text,
  cancelled_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_reason text := btrim(coalesce(cancellation_reason, ''));
  payment_status text;
  cancellation_time timestamptz := now();
begin
  if actor_id is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para cancelar este pagamento.';
  end if;

  if char_length(normalized_reason) < 3 or char_length(normalized_reason) > 500 then
    raise exception using errcode = '22023', message = 'Informe um motivo entre 3 e 500 caracteres.';
  end if;

  select payments.status
  into payment_status
  from public.payments
  where payments.id = target_payment_id
    and payments.organization_id = target_organization_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Pagamento não encontrado.';
  end if;

  if payment_status not in ('pending', 'received') then
    raise exception using errcode = '55000', message = 'Este pagamento já está cancelado.';
  end if;

  perform set_config('zion.payment_cancellation', 'allowed', true);
  update public.payments
  set
    status = 'cancelled',
    cancelled_at = cancellation_time,
    cancelled_by = actor_id,
    cancellation_reason = normalized_reason
  where id = target_payment_id
    and organization_id = target_organization_id;
  perform set_config('zion.payment_cancellation', '', true);

  return query select target_payment_id, 'cancelled'::text, cancellation_time;
end;
$$;

create or replace function public.search_payments(
  target_organization_id uuid,
  search_term text default null,
  period_start timestamptz default null,
  period_end timestamptz default null,
  filter_client_id uuid default null,
  filter_method text default null,
  filter_status text default null
)
returns table (
  id uuid,
  organization_id uuid,
  client_id uuid,
  client_name text,
  maintenance_id uuid,
  work_order_number text,
  equipment_name text,
  maintenance_total numeric,
  amount numeric,
  method text,
  status text,
  paid_at timestamptz,
  due_date date,
  notes text,
  created_at timestamptz,
  created_by uuid,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancellation_reason text,
  reference_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para consultar estes pagamentos.';
  end if;

  if nullif(btrim(filter_method), '') is not null
    and btrim(filter_method) not in ('pix', 'cash', 'credit_card', 'debit_card', 'bank_transfer', 'boleto', 'other')
  then
    raise exception using errcode = '22023', message = 'Método de pagamento inválido.';
  end if;

  if nullif(btrim(filter_status), '') is not null
    and btrim(filter_status) not in ('pending', 'received', 'cancelled')
  then
    raise exception using errcode = '22023', message = 'Status de pagamento inválido.';
  end if;

  return query
  select
    payments.id,
    payments.organization_id,
    payments.client_id,
    clients.name,
    payments.maintenance_id,
    maintenances.work_order_number,
    equipment.name,
    maintenances.total_amount,
    payments.amount,
    payments.method,
    payments.status,
    payments.paid_at,
    payments.due_date,
    payments.notes,
    payments.created_at,
    payments.created_by,
    payments.cancelled_at,
    payments.cancelled_by,
    payments.cancellation_reason,
    coalesce(payments.paid_at, payments.due_date::timestamptz, payments.created_at)
  from public.payments
  join public.maintenances
    on maintenances.id = payments.maintenance_id
    and maintenances.organization_id = payments.organization_id
  join public.clients
    on clients.id = payments.client_id
    and clients.organization_id = payments.organization_id
  join public.equipment
    on equipment.id = maintenances.equipment_id
    and equipment.organization_id = maintenances.organization_id
  where payments.organization_id = target_organization_id
    and (
      nullif(btrim(search_term), '') is null
      or maintenances.work_order_number ilike '%' || btrim(search_term) || '%'
      or clients.name ilike '%' || btrim(search_term) || '%'
      or equipment.name ilike '%' || btrim(search_term) || '%'
      or coalesce(payments.notes, '') ilike '%' || btrim(search_term) || '%'
    )
    and (
      period_start is null
      or coalesce(payments.paid_at, payments.due_date::timestamptz, payments.created_at) >= period_start
    )
    and (
      period_end is null
      or coalesce(payments.paid_at, payments.due_date::timestamptz, payments.created_at) < period_end
    )
    and (filter_client_id is null or payments.client_id = filter_client_id)
    and (nullif(btrim(filter_method), '') is null or payments.method = btrim(filter_method))
    and (nullif(btrim(filter_status), '') is null or payments.status = btrim(filter_status))
  order by reference_at desc, payments.id desc;
end;
$$;

create or replace function public.get_received_revenue(
  target_organization_id uuid,
  period_start timestamptz default null,
  period_end timestamptz default null
)
returns table (
  total_received numeric,
  payment_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para consultar o faturamento.';
  end if;

  return query
  select
    coalesce(sum(payments.amount), 0)::numeric,
    count(*)::bigint
  from public.payments
  where payments.organization_id = target_organization_id
    and payments.status = 'received'
    and (period_start is null or payments.paid_at >= period_start)
    and (period_end is null or payments.paid_at < period_end);
end;
$$;

create or replace function public.get_maintenance_payment_summary(
  target_organization_id uuid,
  target_maintenance_id uuid
)
returns table (
  maintenance_total numeric,
  active_total numeric,
  received_total numeric,
  pending_total numeric,
  balance_amount numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_organization_member(target_organization_id) then
    raise exception using errcode = '42501', message = 'Você não tem permissão para consultar este resumo financeiro.';
  end if;

  if not exists (
    select 1 from public.maintenances
    where maintenances.id = target_maintenance_id
      and maintenances.organization_id = target_organization_id
  ) then
    raise exception using errcode = 'P0002', message = 'Manutenção não encontrada.';
  end if;

  return query
  select
    maintenances.total_amount,
    coalesce(sum(payments.amount) filter (where payments.status in ('pending', 'received')), 0)::numeric,
    coalesce(sum(payments.amount) filter (where payments.status = 'received'), 0)::numeric,
    coalesce(sum(payments.amount) filter (where payments.status = 'pending'), 0)::numeric,
    greatest(
      maintenances.total_amount
      - coalesce(sum(payments.amount) filter (where payments.status = 'received'), 0),
      0
    )::numeric
  from public.maintenances
  left join public.payments
    on payments.maintenance_id = maintenances.id
    and payments.organization_id = maintenances.organization_id
  where maintenances.id = target_maintenance_id
    and maintenances.organization_id = target_organization_id
  group by maintenances.id;
end;
$$;

revoke all on function public.guard_payment_mutation() from public, anon, authenticated;
revoke all on function public.guard_maintenance_payment_ceiling() from public, anon, authenticated;

revoke all on function public.receive_payment(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.receive_payment(uuid, uuid, timestamptz) to authenticated;

revoke all on function public.cancel_payment(uuid, uuid, text) from public, anon;
grant execute on function public.cancel_payment(uuid, uuid, text) to authenticated;

revoke all on function public.search_payments(uuid, text, timestamptz, timestamptz, uuid, text, text)
  from public, anon;
grant execute on function public.search_payments(uuid, text, timestamptz, timestamptz, uuid, text, text)
  to authenticated;

revoke all on function public.get_received_revenue(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.get_received_revenue(uuid, timestamptz, timestamptz)
  to authenticated;

revoke all on function public.get_maintenance_payment_summary(uuid, uuid)
  from public, anon;
grant execute on function public.get_maintenance_payment_summary(uuid, uuid)
  to authenticated;

comment on table public.payments is
  'Recebimentos parciais por OS, com histórico imutável e faturamento reconhecido somente no status received.';
comment on function public.get_received_revenue(uuid, timestamptz, timestamptz) is
  'Calcula faturamento confirmado pelo paid_at, excluindo pendências e cancelamentos.';
comment on function public.get_maintenance_payment_summary(uuid, uuid) is
  'Separa valor informado, pagamentos ativos, total recebido, pendências registradas e saldo a receber.';

commit;
