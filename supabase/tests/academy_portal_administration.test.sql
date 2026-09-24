begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values
  ('d1000000-0000-4000-8000-000000000001', 'admin-owner-a@test.local', '{"full_name":"Owner A"}'::jsonb, '{"zion_account_type":"internal_owner","zion_organization_name":"Organização A"}'::jsonb),
  ('d1000000-0000-4000-8000-000000000002', 'admin-owner-a2@test.local', '{"full_name":"Owner A Dois"}'::jsonb, '{"zion_account_type":"internal_member"}'::jsonb),
  ('d1000000-0000-4000-8000-000000000003', 'admin-tech-a@test.local', '{"full_name":"Técnico A"}'::jsonb, '{"zion_account_type":"internal_member"}'::jsonb),
  ('d2000000-0000-4000-8000-000000000001', 'admin-owner-b@test.local', '{"full_name":"Owner B"}'::jsonb, '{"zion_account_type":"internal_owner","zion_organization_name":"Organização B"}'::jsonb),
  ('d3000000-0000-4000-8000-000000000001', 'portal-ana@test.local', '{"full_name":"Ana Academia"}'::jsonb, '{}'::jsonb),
  ('d3000000-0000-4000-8000-000000000002', 'portal-bruno@test.local', '{"full_name":"Bruno Academia"}'::jsonb, '{}'::jsonb),
  ('d3000000-0000-4000-8000-000000000003', 'portal-carla@test.local', '{"full_name":"Carla Academia"}'::jsonb, '{}'::jsonb),
  ('d3000000-0000-4000-8000-000000000004', 'portal-diego@test.local', '{"full_name":"Diego Academia"}'::jsonb, '{}'::jsonb);

select set_config('test.admin_org_a', (select id::text from public.organizations where created_by = 'd1000000-0000-4000-8000-000000000001'), true);
select set_config('test.admin_org_b', (select id::text from public.organizations where created_by = 'd2000000-0000-4000-8000-000000000001'), true);

insert into public.organization_members (organization_id, user_id, role, status, created_by)
values
  (current_setting('test.admin_org_a')::uuid, 'd1000000-0000-4000-8000-000000000002', 'owner', 'active', 'd1000000-0000-4000-8000-000000000001'),
  (current_setting('test.admin_org_a')::uuid, 'd1000000-0000-4000-8000-000000000003', 'technician', 'active', 'd1000000-0000-4000-8000-000000000001');

insert into public.clients (id, organization_id, name, created_by, updated_by)
values
  ('d1100000-0000-4000-8000-000000000001', current_setting('test.admin_org_a')::uuid, 'Academia Alfa', 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001'),
  ('d1100000-0000-4000-8000-000000000002', current_setting('test.admin_org_a')::uuid, 'Academia Beta', 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001'),
  ('d1100000-0000-4000-8000-000000000003', current_setting('test.admin_org_a')::uuid, 'Academia Arquivada', 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001'),
  ('d2100000-0000-4000-8000-000000000001', current_setting('test.admin_org_b')::uuid, 'Academia Outro Tenant', 'd2000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001');

insert into public.client_locations (id, organization_id, client_id, name, street, city, state, created_by, updated_by)
values
  ('d1110000-0000-4000-8000-000000000001', current_setting('test.admin_org_a')::uuid, 'd1100000-0000-4000-8000-000000000001', 'Alfa Centro', 'Rua A', 'São Paulo', 'SP', 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001'),
  ('d1110000-0000-4000-8000-000000000002', current_setting('test.admin_org_a')::uuid, 'd1100000-0000-4000-8000-000000000001', 'Alfa Sul', 'Rua B', 'São Paulo', 'SP', 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001'),
  ('d1110000-0000-4000-8000-000000000003', current_setting('test.admin_org_a')::uuid, 'd1100000-0000-4000-8000-000000000001', 'Alfa Arquivada', 'Rua C', 'São Paulo', 'SP', 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001'),
  ('d1120000-0000-4000-8000-000000000001', current_setting('test.admin_org_a')::uuid, 'd1100000-0000-4000-8000-000000000002', 'Beta Centro', 'Rua D', 'Campinas', 'SP', 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001'),
  ('d1130000-0000-4000-8000-000000000001', current_setting('test.admin_org_a')::uuid, 'd1100000-0000-4000-8000-000000000003', 'Arquivada Centro', 'Rua E', 'Santos', 'SP', 'd1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001'),
  ('d2110000-0000-4000-8000-000000000001', current_setting('test.admin_org_b')::uuid, 'd2100000-0000-4000-8000-000000000001', 'Outro Tenant Centro', 'Rua F', 'Curitiba', 'PR', 'd2000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000001');

update public.clients set deleted_at = now(), deleted_by = 'd1000000-0000-4000-8000-000000000001' where id = 'd1100000-0000-4000-8000-000000000003';
update public.client_locations set deleted_at = now(), deleted_by = 'd1000000-0000-4000-8000-000000000001' where id = 'd1110000-0000-4000-8000-000000000003';

select ok((select relrowsecurity from pg_class where oid = 'public.academy_portal_audit_events'::regclass), 'RLS ativa na auditoria administrativa');
select ok(not has_table_privilege('authenticated', 'public.academy_portal_audit_events', 'INSERT,UPDATE,DELETE'), 'authenticated não altera auditoria diretamente');
select ok(has_function_privilege('authenticated', 'public.get_academy_portal_admin_summary()', 'EXECUTE'), 'consulta administrativa nova está disponível ao papel autenticado com validação owner interna');
select ok(has_function_privilege('authenticated', 'public.configure_academy_portal_user(uuid,uuid,uuid[],text,text,timestamptz)', 'EXECUTE'), 'configuração transacional está disponível com validação owner interna');
select ok(not has_function_privilege('authenticated', 'public.set_academy_portal_user_status(uuid,uuid,text,text)', 'EXECUTE'), 'RPC legada sem auditoria não pode ser chamada pelo frontend');
select ok(not has_function_privilege('authenticated', 'public.set_academy_portal_access(uuid,uuid,text,text)', 'EXECUTE'), 'RPC comercial legada sem auditoria não pode ser chamada pelo frontend');
select ok(not has_function_privilege('authenticated', 'public.grant_academy_location_access(uuid,uuid,uuid,uuid)', 'EXECUTE'), 'concessão legada sem auditoria não pode ser chamada pelo frontend');
select ok(not has_function_privilege('authenticated', 'public.revoke_academy_location_access(uuid,uuid,uuid,text)', 'EXECUTE'), 'revogação legada sem auditoria não pode ser chamada pelo frontend');

-- Vincula Carla exclusivamente ao tenant B para validar isolamento.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'd2000000-0000-4000-8000-000000000001', true);
select lives_ok($$
  select public.configure_academy_portal_user(
    'd3000000-0000-4000-8000-000000000003',
    'd2100000-0000-4000-8000-000000000001',
    array['d2110000-0000-4000-8000-000000000001']::uuid[],
    'active', 'Liberação do tenant B',
    (select updated_at from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000003')
  )
$$, 'owner B configura seu usuário');

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select ok((select count(*) from public.list_academy_portal_admin_users(null, null, null, 25, 0)) >= 3, 'owner lista usuários próprios e fila pendente');
select is((select count(*) from public.list_academy_portal_admin_users('Carla', null, null, 25, 0)), 0::bigint, 'owner não lista usuário vinculado a outro tenant');
select is((select count(*) from public.list_academy_portal_admin_users('Ana', 'pending', null, 25, 0)), 1::bigint, 'busca por nome e filtro de status funcionam');
select is((select count(*) from public.list_academy_portal_admin_users('portal-ana@', null, null, 25, 0)), 1::bigint, 'busca por e-mail funciona');
select is((select count(*) from public.list_academy_portal_admin_locations()), 3::bigint, 'opções administrativas omitem cliente e unidade arquivados e outro tenant');

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000003', true);
select throws_like($$ select * from public.list_academy_portal_admin_users(null, null, null, 25, 0) $$, '%exatamente um vínculo owner ativo%', 'technician não lista usuários');
select throws_like($$ select public.configure_academy_portal_user('d3000000-0000-4000-8000-000000000001', 'd1100000-0000-4000-8000-000000000001', array['d1110000-0000-4000-8000-000000000001']::uuid[], 'active', 'Tentativa técnica', null) $$, '%exatamente um vínculo owner ativo%', 'technician não administra usuários');

select set_config('request.jwt.claim.sub', 'd3000000-0000-4000-8000-000000000003', true);
select throws_like($$ select * from public.list_academy_portal_admin_users(null, null, null, 25, 0) $$, '%exatamente um vínculo owner ativo%', 'academy_user não lista administração');
select throws_like($$ select public.change_academy_portal_commercial_access('d2100000-0000-4000-8000-000000000001', 'suspended', 'Tentativa externa', null) $$, '%exatamente um vínculo owner ativo%', 'academy_user não administra situação comercial');

-- Tentativas inválidas permanecem atômicas para Diego.
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select throws_like($$
  select public.configure_academy_portal_user('d3000000-0000-4000-8000-000000000004', 'd1100000-0000-4000-8000-000000000001', '{}'::uuid[], 'active', 'Sem unidade', null)
$$, '%Selecione ao menos uma unidade%', 'ativação inicial sem unidade é rejeitada');
select throws_like($$
  select public.configure_academy_portal_user('d3000000-0000-4000-8000-000000000004', 'd1100000-0000-4000-8000-000000000001', array['d1110000-0000-4000-8000-000000000001','d1120000-0000-4000-8000-000000000001']::uuid[], 'active', 'Clientes misturados', null)
$$, '%inválidas, arquivadas ou pertencem a outra academia%', 'unidades de clientes diferentes são rejeitadas');
select throws_like($$
  select public.configure_academy_portal_user('d3000000-0000-4000-8000-000000000004', 'd1100000-0000-4000-8000-000000000001', array['d2110000-0000-4000-8000-000000000001']::uuid[], 'active', 'Outro tenant', null)
$$, '%inválidas, arquivadas ou pertencem a outra academia%', 'unidade de outro tenant é rejeitada');
select throws_like($$
  select public.configure_academy_portal_user('d3000000-0000-4000-8000-000000000004', 'd1100000-0000-4000-8000-000000000003', array['d1130000-0000-4000-8000-000000000001']::uuid[], 'active', 'Cliente arquivado', null)
$$, '%academia não foi encontrada ou está arquivada%', 'cliente arquivado é rejeitado');
select throws_like($$
  select public.configure_academy_portal_user('d3000000-0000-4000-8000-000000000004', 'd1100000-0000-4000-8000-000000000001', array['d1110000-0000-4000-8000-000000000003']::uuid[], 'active', 'Unidade arquivada', null)
$$, '%inválidas, arquivadas ou pertencem a outra academia%', 'unidade arquivada é rejeitada');
select throws_like($$
  select public.configure_academy_portal_user('d3000000-0000-4000-8000-000000000004', 'd1100000-0000-4000-8000-000000000001', array['d1110000-0000-4000-8000-000000000001','d1110000-0000-4000-8000-000000000001']::uuid[], 'active', 'Duplicação de unidade', null)
$$, '%mesma unidade%', 'vínculo duplicado é impedido');
select is((select organization_id from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000004'), null::uuid, 'falhas parciais não atribuem organização');
select is((select count(*) from public.academy_user_locations where user_id = 'd3000000-0000-4000-8000-000000000004'), 0::bigint, 'falhas parciais não criam vínculos');

-- Configuração completa de Ana com duas unidades do mesmo cliente.
select lives_ok($$
  select public.configure_academy_portal_user(
    'd3000000-0000-4000-8000-000000000001',
    'd1100000-0000-4000-8000-000000000001',
    array['d1110000-0000-4000-8000-000000000001','d1110000-0000-4000-8000-000000000002']::uuid[],
    'active', 'Configuração inicial completa',
    (select updated_at from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000001')
  )
$$, 'configuração inicial aceita múltiplas unidades do mesmo cliente');
select is((select status from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000001'), 'active', 'configuração comercial ativa ativa o usuário');
select is((select count(*) from public.academy_user_locations where user_id = 'd3000000-0000-4000-8000-000000000001' and status = 'active'), 2::bigint, 'duas unidades válidas foram concedidas');
select ok((select count(*) from public.academy_portal_audit_events where user_id = 'd3000000-0000-4000-8000-000000000001' and action = 'initial_configuration_completed') = 1, 'configuração inicial cria auditoria');

-- Bruno compartilha a academia para validar impacto coletivo e isolamento individual.
select lives_ok($$
  select public.configure_academy_portal_user(
    'd3000000-0000-4000-8000-000000000002',
    'd1100000-0000-4000-8000-000000000001',
    array['d1110000-0000-4000-8000-000000000001']::uuid[],
    'active', 'Segundo usuário válido',
    (select updated_at from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000002')
  )
$$, 'segundo usuário pode acessar a mesma academia');

select set_config('request.jwt.claim.sub', 'd3000000-0000-4000-8000-000000000001', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_active'::text], 'active comercial libera o Portal');

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select is(public.change_academy_portal_commercial_access('d1100000-0000-4000-8000-000000000001', 'trialing', 'Período de avaliação', (select updated_at from public.academy_portal_access where client_id = 'd1100000-0000-4000-8000-000000000001')), 2::bigint, 'trialing informa dois usuários afetados');
select set_config('request.jwt.claim.sub', 'd3000000-0000-4000-8000-000000000001', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_active'::text], 'trialing libera acesso');

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.change_academy_portal_commercial_access('d1100000-0000-4000-8000-000000000001', 'pending', 'Aguardando aprovação', (select updated_at from public.academy_portal_access where client_id = 'd1100000-0000-4000-8000-000000000001')) $$, 'pending comercial é aceito');
select set_config('request.jwt.claim.sub', 'd3000000-0000-4000-8000-000000000001', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_pending'::text], 'pending comercial bloqueia entrada efetiva');

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.change_academy_portal_commercial_access('d1100000-0000-4000-8000-000000000001', 'past_due', 'Pagamento vencido', (select updated_at from public.academy_portal_access where client_id = 'd1100000-0000-4000-8000-000000000001')) $$, 'past_due comercial é aceito');
select set_config('request.jwt.claim.sub', 'd3000000-0000-4000-8000-000000000001', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_suspended'::text], 'past_due bloqueia acesso');

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.change_academy_portal_commercial_access('d1100000-0000-4000-8000-000000000001', 'suspended', 'Suspensão comercial', (select updated_at from public.academy_portal_access where client_id = 'd1100000-0000-4000-8000-000000000001')) $$, 'suspended comercial é aceito');
select set_config('request.jwt.claim.sub', 'd3000000-0000-4000-8000-000000000002', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_suspended'::text], 'suspensão comercial afeta outro usuário do cliente');

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.change_academy_portal_commercial_access('d1100000-0000-4000-8000-000000000001', 'cancelled', 'Contrato cancelado', (select updated_at from public.academy_portal_access where client_id = 'd1100000-0000-4000-8000-000000000001')) $$, 'cancelled comercial é aceito');
select set_config('request.jwt.claim.sub', 'd3000000-0000-4000-8000-000000000001', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_suspended'::text], 'cancelled bloqueia acesso');

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.change_academy_portal_commercial_access('d1100000-0000-4000-8000-000000000001', 'active', 'Contrato reativado', (select updated_at from public.academy_portal_access where client_id = 'd1100000-0000-4000-8000-000000000001')) $$, 'active comercial pode ser restaurado');

-- Suspensão individual exige motivo e não afeta Bruno nem o comercial.
select throws_like($$ select public.change_academy_portal_user_status('d3000000-0000-4000-8000-000000000001', 'suspended', '', null) $$, '%motivo entre 3 e 500%', 'suspensão sem motivo é rejeitada');
select lives_ok($$ select public.change_academy_portal_user_status('d3000000-0000-4000-8000-000000000001', 'suspended', 'Solicitação individual', (select updated_at from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000001')) $$, 'suspensão individual com motivo funciona');
select is((select status from public.academy_portal_access where client_id = 'd1100000-0000-4000-8000-000000000001'), 'active', 'suspensão individual não altera comercial');
select set_config('request.jwt.claim.sub', 'd3000000-0000-4000-8000-000000000002', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_active'::text], 'suspensão individual não afeta outro usuário');

-- Concorrência otimista entre dois owners preserva estado consistente.
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select lives_ok($$ select public.replace_academy_portal_user_locations('d3000000-0000-4000-8000-000000000001', 'd1100000-0000-4000-8000-000000000001', array['d1110000-0000-4000-8000-000000000001']::uuid[], 'Alteração concorrente do owner principal', (select updated_at from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000001')) $$, 'primeiro owner altera o registro após a leitura concorrente');
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000002', true);
select throws_like($$ select public.change_academy_portal_user_status('d3000000-0000-4000-8000-000000000001', 'active', 'Versão concorrente', (select updated_at - interval '1 second' from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000001')) $$, '%alterado por outro owner%', 'owner concorrente com versão antiga é rejeitado');
select is((select status from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000001'), 'suspended', 'falha concorrente preserva estado anterior');
select lives_ok($$ select public.change_academy_portal_user_status('d3000000-0000-4000-8000-000000000001', 'active', 'Reativação pelo segundo owner', (select updated_at from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000001')) $$, 'segundo owner reativa com versão atual');

select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select throws_like($$ select public.replace_academy_portal_user_locations('d3000000-0000-4000-8000-000000000001', 'd1100000-0000-4000-8000-000000000001', '{}'::uuid[], '', null) $$, '%motivo entre 3 e 500%', 'revogação sem motivo é rejeitada');
select lives_ok($$ select public.replace_academy_portal_user_locations('d3000000-0000-4000-8000-000000000001', 'd1100000-0000-4000-8000-000000000001', '{}'::uuid[], 'Revogação de todas as unidades', (select updated_at from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000001')) $$, 'última unidade pode ser revogada com motivo');
select is((select status from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000001'), 'pending', 'última unidade revogada rebaixa usuário para pending');
select is((select count(*) from public.academy_user_locations where user_id = 'd3000000-0000-4000-8000-000000000001' and status = 'active'), 0::bigint, 'revogação tem efeito imediato');
select throws_like($$ select public.change_academy_portal_user_status('d3000000-0000-4000-8000-000000000001', 'active', 'Sem unidade ativa', (select updated_at from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000001')) $$, '%ao menos uma unidade válida%', 'reativação sem unidade é rejeitada');
select lives_ok($$ select public.replace_academy_portal_user_locations('d3000000-0000-4000-8000-000000000001', 'd1100000-0000-4000-8000-000000000001', array['d1110000-0000-4000-8000-000000000002']::uuid[], 'Reativação da unidade Sul', (select updated_at from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000001')) $$, 'vínculo revogado pode ser reativado');
select lives_ok($$ select public.change_academy_portal_user_status('d3000000-0000-4000-8000-000000000001', 'active', 'Reativação após unidade válida', (select updated_at from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000001')) $$, 'reativação válida funciona');
select ok((select count(*) from public.academy_portal_audit_events where user_id = 'd3000000-0000-4000-8000-000000000001' and action = 'location_reactivated') >= 1, 'reativação de vínculo é auditada');
select ok((select count(*) from public.academy_portal_audit_events where user_id = 'd3000000-0000-4000-8000-000000000001' and action = 'user_downgraded_no_locations') = 1, 'rebaixamento por última unidade é auditado');

-- Pending comercial prepara os vínculos de Diego sem entrada efetiva.
select lives_ok($$ select public.configure_academy_portal_user('d3000000-0000-4000-8000-000000000004', 'd1100000-0000-4000-8000-000000000002', array['d1120000-0000-4000-8000-000000000001']::uuid[], 'pending', 'Preparação sem liberação', (select updated_at from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000004')) $$, 'configuração pode manter comercial pendente');
select is((select status from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000004'), 'pending', 'comercial pending mantém usuário pending');
select set_config('request.jwt.claim.sub', 'd3000000-0000-4000-8000-000000000004', true);
select results_eq($$ select access_context from public.resolve_access_context() $$, array['academy_pending'::text], 'usuário preparado e pending continua isolado');

-- IDs forjados, histórico imutável e DELETE direto.
select set_config('request.jwt.claim.sub', 'd1000000-0000-4000-8000-000000000001', true);
select throws_like($$ select public.get_academy_portal_admin_user('00000000-0000-4000-8000-000000000000') $$, '%não encontrado%', 'ID de usuário forjado falha');
select throws_like($$ select public.change_academy_portal_commercial_access('00000000-0000-4000-8000-000000000000', 'active', 'ID forjado', null) $$, '%não foi encontrada%', 'ID de cliente forjado falha');
select is((select count(*) from public.academy_portal_audit_events where organization_id = current_setting('test.admin_org_a')::uuid and action = 'commercial_access_changed') > 0, true, 'alterações comerciais criam auditoria');

reset role;
select throws_like($$ update public.academy_portal_audit_events set reason = 'Tentativa de edição' where id = (select min(id) from public.academy_portal_audit_events) $$, '%histórico administrativo é imutável%', 'auditoria não aceita UPDATE');
select throws_like($$ delete from public.academy_portal_audit_events where id = (select min(id) from public.academy_portal_audit_events) $$, '%histórico administrativo é imutável%', 'auditoria não aceita DELETE');
select throws_like($$ delete from public.academy_portal_users where user_id = 'd3000000-0000-4000-8000-000000000001' $$, '%não podem ser excluídos%', 'DELETE direto de usuário permanece bloqueado');
select throws_like($$ delete from public.academy_user_locations where user_id = 'd3000000-0000-4000-8000-000000000001' $$, '%não podem ser excluídos%', 'DELETE direto de vínculo permanece bloqueado');
select throws_like($$ delete from public.academy_portal_access where client_id = 'd1100000-0000-4000-8000-000000000001' $$, '%não pode ser excluída%', 'DELETE direto comercial permanece bloqueado');

select * from finish();
rollback;
