begin;

create extension if not exists pgtap with schema extensions;
select plan(49);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('71000000-0000-4000-8000-000000000001', 'photo-owner-a@test.local', '{"full_name":"Owner Fotos A","organization_name":"Tenant Fotos A"}'::jsonb),
  ('72000000-0000-4000-8000-000000000002', 'photo-owner-b@test.local', '{"full_name":"Owner Fotos B","organization_name":"Tenant Fotos B"}'::jsonb),
  ('73000000-0000-4000-8000-000000000003', 'photo-technician@test.local', '{"full_name":"Técnico Fotos","organization_name":"Tenant Técnico Fotos"}'::jsonb);

select set_config('test.photo_org_a', (select id::text from public.organizations where created_by = '71000000-0000-4000-8000-000000000001'), true);
select set_config('test.photo_org_b', (select id::text from public.organizations where created_by = '72000000-0000-4000-8000-000000000002'), true);

insert into public.organization_members (organization_id, user_id, role, status, created_by)
values (current_setting('test.photo_org_a')::uuid, '73000000-0000-4000-8000-000000000003', 'technician', 'active', '71000000-0000-4000-8000-000000000001');

insert into public.clients (id, organization_id, name, created_by, updated_by)
values
  ('71100000-0000-4000-8000-000000000001', current_setting('test.photo_org_a')::uuid, 'Academia Foto A', '71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001'),
  ('72100000-0000-4000-8000-000000000001', current_setting('test.photo_org_b')::uuid, 'Academia Foto B', '72000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000002');

insert into public.equipment (id, organization_id, client_id, name, category, created_by, updated_by)
values
  ('71300000-0000-4000-8000-000000000001', current_setting('test.photo_org_a')::uuid, '71100000-0000-4000-8000-000000000001', 'Esteira Foto A', 'Cardio', '71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001'),
  ('72300000-0000-4000-8000-000000000001', current_setting('test.photo_org_b')::uuid, '72100000-0000-4000-8000-000000000001', 'Esteira Foto B', 'Cardio', '72000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000002');

insert into public.maintenances (
  id, organization_id, client_id, equipment_id, work_order_number, maintenance_type,
  status, scheduled_at, diagnosis, service_performed, responsible_technician_id,
  created_by, updated_by
)
values
  ('71500000-0000-4000-8000-000000000001', current_setting('test.photo_org_a')::uuid, '71100000-0000-4000-8000-000000000001', '71300000-0000-4000-8000-000000000001', 'OS-FOTO-001', 'corrective', 'in_progress', now(), 'Diagnóstico fotografado', 'Serviço fotografado', '71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001'),
  ('71500000-0000-4000-8000-000000000002', current_setting('test.photo_org_a')::uuid, '71100000-0000-4000-8000-000000000001', '71300000-0000-4000-8000-000000000001', 'OS-FOTO-002', 'preventive', 'draft', now(), null, null, '71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001'),
  ('72500000-0000-4000-8000-000000000001', current_setting('test.photo_org_b')::uuid, '72100000-0000-4000-8000-000000000001', '72300000-0000-4000-8000-000000000001', 'OS-FOTO-B01', 'preventive', 'draft', now(), null, null, '72000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000002');

select ok(exists(select 1 from storage.buckets where id = 'maintenance-photos'), 'bucket exclusivo foi criado');
select is((select public from storage.buckets where id = 'maintenance-photos'), false, 'bucket é privado');
select is((select file_size_limit from storage.buckets where id = 'maintenance-photos'), 1048576::bigint, 'bucket limita cada arquivo processado a 1 MB');
select is((select allowed_mime_types from storage.buckets where id = 'maintenance-photos'), array['image/webp']::text[], 'bucket recebe somente WebP processado');
select is((select relrowsecurity from pg_class where oid = 'public.maintenance_photos'::regclass), true, 'RLS está habilitada em maintenance_photos');

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);

select lives_ok(
  format(
    'insert into storage.objects (bucket_id, name, owner_id, metadata) values (%L, %L, %L, %L::jsonb)',
    'maintenance-photos',
    current_setting('test.photo_org_a') || '/71500000-0000-4000-8000-000000000001/before/primeira.webp',
    '71000000-0000-4000-8000-000000000001',
    '{"mimetype":"image/webp","size":1024}'
  ),
  'owner envia objeto para manutenção aberta do próprio tenant'
);
select lives_ok(
  format(
    'insert into public.maintenance_photos (organization_id, maintenance_id, kind, storage_path, mime_type, file_size, sort_order) values (%L, %L, %L, %L, %L, 1024, 0)',
    current_setting('test.photo_org_a'), '71500000-0000-4000-8000-000000000001', 'before',
    current_setting('test.photo_org_a') || '/71500000-0000-4000-8000-000000000001/before/primeira.webp', 'image/webp'
  ),
  'owner registra metadados da foto no próprio tenant'
);
select is((select count(*) from public.maintenance_photos), 1::bigint, 'owner lista somente metadados visíveis');
select throws_like(
  format(
    'insert into public.maintenance_photos (organization_id, maintenance_id, kind, storage_path, mime_type, file_size) values (%L, %L, %L, %L, %L, 100)',
    current_setting('test.photo_org_a'), '71500000-0000-4000-8000-000000000001', 'before',
    current_setting('test.photo_org_a') || '/71500000-0000-4000-8000-000000000001/before/invalida.gif', 'image/gif'
  ), '%WebP otimizado de até 1 MB%', 'tabela rejeita novo MIME diferente de WebP'
);
select throws_like(
  format(
    'insert into public.maintenance_photos (organization_id, maintenance_id, kind, storage_path, mime_type, file_size) values (%L, %L, %L, %L, %L, 1048577)',
    current_setting('test.photo_org_a'), '71500000-0000-4000-8000-000000000001', 'before',
    current_setting('test.photo_org_a') || '/71500000-0000-4000-8000-000000000001/before/grande.webp', 'image/webp'
  ), '%WebP otimizado de até 1 MB%', 'tabela rejeita novo arquivo processado maior que 1 MB'
);
select throws_like(
  format(
    'insert into public.maintenance_photos (organization_id, maintenance_id, kind, storage_path, mime_type, file_size) values (%L, %L, %L, %L, %L, 100)',
    current_setting('test.photo_org_a'), '71500000-0000-4000-8000-000000000001', 'before',
    current_setting('test.photo_org_a') || '/71500000-0000-4000-8000-000000000001/after/caminho.webp', 'image/webp'
  ), '%maintenance_photos_path_check%', 'tabela exige kind idêntico no path e no metadado'
);
select throws_like(
  format(
    'insert into public.maintenance_photos (organization_id, maintenance_id, kind, storage_path, mime_type, file_size) values (%L, %L, %L, %L, %L, 100)',
    current_setting('test.photo_org_b'), '72500000-0000-4000-8000-000000000001', 'before',
    current_setting('test.photo_org_b') || '/72500000-0000-4000-8000-000000000001/before/invasora.webp', 'image/webp'
  ), '%row-level security%', 'RLS bloqueia metadado cross-tenant'
);
select throws_like(
  format(
    'insert into storage.objects (bucket_id, name, owner_id) values (%L, %L, %L)',
    'maintenance-photos', current_setting('test.photo_org_b') || '/72500000-0000-4000-8000-000000000001/before/invasora.webp', '71000000-0000-4000-8000-000000000001'
  ), '%row-level security%', 'Storage bloqueia upload cross-tenant mesmo com path manual'
);
select throws_like(
  format(
    'insert into storage.objects (bucket_id, name, owner_id) values (%L, %L, %L)',
    'maintenance-photos', current_setting('test.photo_org_a') || '/71500000-0000-4000-8000-000000000001/before/pasta/extra.webp', '71000000-0000-4000-8000-000000000001'
  ), '%row-level security%', 'Storage rejeita path com segmentos extras'
);
select is((select count(*) from storage.objects where bucket_id = 'maintenance-photos'), 1::bigint, 'owner lista somente objeto autorizado');

select set_config('request.jwt.claim.sub', '73000000-0000-4000-8000-000000000003', true);
select is((select count(*) from public.maintenance_photos), 1::bigint, 'technician ativo lista fotos da organização');
select is((select count(*) from storage.objects where bucket_id = 'maintenance-photos'), 1::bigint, 'technician ativo visualiza objetos da organização');
select lives_ok(
  format(
    'insert into storage.objects (bucket_id, name, owner_id, metadata) values (%L, %L, %L, %L::jsonb)',
    'maintenance-photos', current_setting('test.photo_org_a') || '/71500000-0000-4000-8000-000000000001/before/segunda.webp',
    '73000000-0000-4000-8000-000000000003', '{"mimetype":"image/webp","size":2048}'
  ), 'technician envia objeto no tenant em que é membro'
);
select lives_ok(
  format(
    'insert into public.maintenance_photos (organization_id, maintenance_id, kind, storage_path, mime_type, file_size, sort_order) values (%L, %L, %L, %L, %L, 2048, 1)',
    current_setting('test.photo_org_a'), '71500000-0000-4000-8000-000000000001', 'before',
    current_setting('test.photo_org_a') || '/71500000-0000-4000-8000-000000000001/before/segunda.webp', 'image/webp'
  ), 'technician registra metadado no tenant em que é membro'
);
select lives_ok(
  $$ select public.reorder_maintenance_photos(
    current_setting('test.photo_org_a')::uuid,
    '71500000-0000-4000-8000-000000000001',
    'before',
    array(
      select id from public.maintenance_photos
      where maintenance_id = '71500000-0000-4000-8000-000000000001'
      order by storage_path desc
    )
  ) $$,
  'RPC reordena fotos de manutenção aberta'
);
select is(
  (select sort_order from public.maintenance_photos where storage_path like '%/segunda.webp'),
  0,
  'RPC persiste a nova primeira posição'
);
select throws_like(
  $$ select public.reorder_maintenance_photos(
    current_setting('test.photo_org_b')::uuid,
    '72500000-0000-4000-8000-000000000001', 'before', '{}'::uuid[]
  ) $$,
  '%permissão%', 'RPC de ordenação bloqueia tenant externo'
);
select throws_like(
  $$ select public.reorder_maintenance_photos(
    current_setting('test.photo_org_a')::uuid,
    '71500000-0000-4000-8000-000000000001', 'before',
    array[(select id from public.maintenance_photos limit 1), (select id from public.maintenance_photos limit 1)]
  ) $$,
  '%duplicados%', 'RPC rejeita ids duplicados na ordenação'
);

select set_config('request.jwt.claim.sub', '72000000-0000-4000-8000-000000000002', true);
select is((select count(*) from public.maintenance_photos), 0::bigint, 'outro tenant não lista metadados da organização A');
select is((select count(*) from storage.objects where bucket_id = 'maintenance-photos'), 0::bigint, 'outro tenant não lista objetos da organização A');
select ok(
  not public.can_access_maintenance_photo_object(current_setting('test.photo_org_a') || '/71500000-0000-4000-8000-000000000001/before/primeira.webp', false),
  'helper de Storage nega acesso cross-tenant'
);
select throws_like(
  format(
    'delete from storage.objects where bucket_id = %L and name = %L',
    'maintenance-photos', current_setting('test.photo_org_a') || '/71500000-0000-4000-8000-000000000001/before/primeira.webp'
  ), '%Storage API%', 'delete SQL cross-tenant também é bloqueado pela proteção nativa do Storage'
);

reset role;
select is((select count(*) from storage.objects where bucket_id = 'maintenance-photos'), 2::bigint, 'objetos permanecem após tentativa cross-tenant');

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$ select * from public.complete_maintenance(current_setting('test.photo_org_a')::uuid, '71500000-0000-4000-8000-000000000001') $$,
  'manutenção com fotos pode ser concluída'
);
select is((select status from public.maintenances where id = '71500000-0000-4000-8000-000000000001'), 'completed', 'manutenção foi concluída');
select lives_ok($$ delete from public.maintenance_photos where maintenance_id = '71500000-0000-4000-8000-000000000001' $$, 'RLS ignora delete de metadados após conclusão');
select throws_like($$ delete from storage.objects where bucket_id = 'maintenance-photos' $$, '%Storage API%', 'delete SQL de objeto concluído é bloqueado pela proteção nativa do Storage');
select is((select count(*) from public.maintenance_photos where maintenance_id = '71500000-0000-4000-8000-000000000001'), 2::bigint, 'metadados concluídos permanecem no histórico');
select is((select count(*) from storage.objects where bucket_id = 'maintenance-photos'), 2::bigint, 'objetos concluídos permanecem privados e somente leitura');
select throws_like(
  format(
    'insert into public.maintenance_photos (organization_id, maintenance_id, kind, storage_path, mime_type, file_size) values (%L, %L, %L, %L, %L, 100)',
    current_setting('test.photo_org_a'), '71500000-0000-4000-8000-000000000001', 'after',
    current_setting('test.photo_org_a') || '/71500000-0000-4000-8000-000000000001/after/tardia.webp', 'image/webp'
  ), '%somente leitura%', 'trigger bloqueia novo metadado após conclusão'
);
select throws_like(
  format(
    'insert into storage.objects (bucket_id, name, owner_id) values (%L, %L, %L)',
    'maintenance-photos', current_setting('test.photo_org_a') || '/71500000-0000-4000-8000-000000000001/after/tardia.webp', '71000000-0000-4000-8000-000000000001'
  ), '%row-level security%', 'Storage bloqueia upload após conclusão'
);

select lives_ok(
  format(
    'insert into storage.objects (bucket_id, name, owner_id) values (%L, %L, %L)',
    'maintenance-photos', current_setting('test.photo_org_a') || '/71500000-0000-4000-8000-000000000002/before/cancelada.webp', '71000000-0000-4000-8000-000000000001'
  ), 'owner envia foto antes do cancelamento'
);
select lives_ok(
  format(
    'insert into public.maintenance_photos (organization_id, maintenance_id, kind, storage_path, mime_type, file_size) values (%L, %L, %L, %L, %L, 500)',
    current_setting('test.photo_org_a'), '71500000-0000-4000-8000-000000000002', 'before',
    current_setting('test.photo_org_a') || '/71500000-0000-4000-8000-000000000002/before/cancelada.webp', 'image/webp'
  ), 'owner registra foto antes do cancelamento'
);
select lives_ok(
  $$ select * from public.cancel_maintenance(current_setting('test.photo_org_a')::uuid, '71500000-0000-4000-8000-000000000002', 'Atendimento cancelado pelo cliente') $$,
  'manutenção com foto pode ser cancelada com motivo'
);
select lives_ok($$ delete from public.maintenance_photos where maintenance_id = '71500000-0000-4000-8000-000000000002' $$, 'RLS ignora delete de metadado após cancelamento');
select is((select count(*) from public.maintenance_photos where maintenance_id = '71500000-0000-4000-8000-000000000002'), 1::bigint, 'foto cancelada permanece no histórico');

reset role;
select throws_like(
  $$ update public.maintenance_photos set sort_order = 9 where maintenance_id = '71500000-0000-4000-8000-000000000001' $$,
  '%somente leitura%', 'trigger protege foto concluída até contra alteração administrativa'
);
select throws_like(
  $$ delete from public.maintenance_photos where maintenance_id = '71500000-0000-4000-8000-000000000002' $$,
  '%somente leitura%', 'trigger protege foto cancelada até contra delete administrativo'
);
select ok(not has_table_privilege('anon', 'public.maintenance_photos', 'SELECT'), 'anon não lê metadados de fotos');
select ok(not has_column_privilege('authenticated', 'public.maintenance_photos', 'storage_path', 'UPDATE'), 'frontend não altera path de objeto');
select ok(not has_function_privilege('authenticated', 'public.guard_maintenance_photo_mutation()', 'EXECUTE'), 'frontend não executa trigger de proteção');
select ok(not has_function_privilege('anon', 'public.can_access_maintenance_photo_object(text, boolean)', 'EXECUTE'), 'anon não executa helper do Storage');
select is((select count(*) from pg_policies where schemaname = 'public' and tablename = 'maintenance_photos'), 4::bigint, 'maintenance_photos possui políticas completas e mínimas');
select is((select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'maintenance_photo_objects_%'), 3::bigint, 'Storage possui políticas separadas para leitura, envio e remoção');

select * from finish();
rollback;
