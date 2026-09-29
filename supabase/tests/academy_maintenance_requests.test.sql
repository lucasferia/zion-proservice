begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values
 ('e1000000-0000-4000-8000-000000000001','request-owner-a@test.local','{"full_name":"Owner A"}','{"zion_account_type":"internal_owner","zion_organization_name":"Operacao A"}'),
 ('e1000000-0000-4000-8000-000000000002','request-tech-a@test.local','{"full_name":"Tecnica A"}','{"zion_account_type":"internal_member"}'),
 ('e2000000-0000-4000-8000-000000000001','request-owner-b@test.local','{"full_name":"Owner B"}','{"zion_account_type":"internal_owner","zion_organization_name":"Operacao B"}'),
 ('e3000000-0000-4000-8000-000000000001','request-academy-a@test.local','{"full_name":"Gestora A"}','{}'),
 ('e3000000-0000-4000-8000-000000000002','request-academy-b@test.local','{"full_name":"Gestora B"}','{}'),
 ('e3000000-0000-4000-8000-000000000003','request-pending@test.local','{"full_name":"Portal Pending"}','{}'),
 ('e3000000-0000-4000-8000-000000000004','request-suspended@test.local','{"full_name":"Portal Suspended"}','{}');

select set_config('test.req_org_a',(select id::text from public.organizations where created_by='e1000000-0000-4000-8000-000000000001'),true);
select set_config('test.req_org_b',(select id::text from public.organizations where created_by='e2000000-0000-4000-8000-000000000001'),true);

insert into public.organization_members(organization_id,user_id,role,status,created_by)
values(current_setting('test.req_org_a')::uuid,'e1000000-0000-4000-8000-000000000002','technician','active','e1000000-0000-4000-8000-000000000001');

insert into public.clients(id,organization_id,name,created_by,updated_by) values
 ('e1100000-0000-4000-8000-000000000001',current_setting('test.req_org_a')::uuid,'Academia A','e1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001'),
 ('e2100000-0000-4000-8000-000000000001',current_setting('test.req_org_b')::uuid,'Academia B','e2000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001');
insert into public.client_locations(id,organization_id,client_id,name,street,city,state,created_by,updated_by) values
 ('e1110000-0000-4000-8000-000000000001',current_setting('test.req_org_a')::uuid,'e1100000-0000-4000-8000-000000000001','Unidade A','Rua A','Sao Paulo','SP','e1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001'),
 ('e2110000-0000-4000-8000-000000000001',current_setting('test.req_org_b')::uuid,'e2100000-0000-4000-8000-000000000001','Unidade B','Rua B','Curitiba','PR','e2000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001');

select set_config('zion.academy_administration','allowed',true);
update public.academy_portal_users set organization_id=current_setting('test.req_org_a')::uuid,status='active',status_changed_at=now(),status_changed_by='e1000000-0000-4000-8000-000000000001',status_change_reason='Fixture solicitacoes',updated_by='e1000000-0000-4000-8000-000000000001' where user_id='e3000000-0000-4000-8000-000000000001';
update public.academy_portal_users set organization_id=current_setting('test.req_org_b')::uuid,status='active',status_changed_at=now(),status_changed_by='e2000000-0000-4000-8000-000000000001',status_change_reason='Fixture solicitacoes',updated_by='e2000000-0000-4000-8000-000000000001' where user_id='e3000000-0000-4000-8000-000000000002';
update public.academy_portal_users set organization_id=current_setting('test.req_org_a')::uuid,status='suspended',status_changed_at=now(),status_changed_by='e1000000-0000-4000-8000-000000000001',status_change_reason='Fixture suspensa',updated_by='e1000000-0000-4000-8000-000000000001' where user_id='e3000000-0000-4000-8000-000000000004';
insert into public.academy_portal_access(organization_id,client_id,status,status_changed_by,status_change_reason,created_by,updated_by) values
 (current_setting('test.req_org_a')::uuid,'e1100000-0000-4000-8000-000000000001','active','e1000000-0000-4000-8000-000000000001','Fixture ativa','e1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001'),
 (current_setting('test.req_org_b')::uuid,'e2100000-0000-4000-8000-000000000001','active','e2000000-0000-4000-8000-000000000001','Fixture ativa','e2000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001');
insert into public.academy_user_locations(organization_id,user_id,client_id,client_location_id,status,granted_by) values
 (current_setting('test.req_org_a')::uuid,'e3000000-0000-4000-8000-000000000001','e1100000-0000-4000-8000-000000000001','e1110000-0000-4000-8000-000000000001','active','e1000000-0000-4000-8000-000000000001'),
 (current_setting('test.req_org_b')::uuid,'e3000000-0000-4000-8000-000000000002','e2100000-0000-4000-8000-000000000001','e2110000-0000-4000-8000-000000000001','active','e2000000-0000-4000-8000-000000000001');
select set_config('zion.academy_administration','',true);

insert into public.equipment(id,organization_id,client_id,client_location_id,name,category,status,created_by,updated_by) values
 ('e1200000-0000-4000-8000-000000000001',current_setting('test.req_org_a')::uuid,'e1100000-0000-4000-8000-000000000001','e1110000-0000-4000-8000-000000000001','Esteira A','Cardio','operational','e1000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001'),
 ('e2200000-0000-4000-8000-000000000001',current_setting('test.req_org_b')::uuid,'e2100000-0000-4000-8000-000000000001','e2110000-0000-4000-8000-000000000001','Esteira B','Cardio','operational','e2000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001');

select has_table('public','maintenance_requests','tabela de solicitacoes existe');
select has_table('public','maintenance_request_photos','metadados de fotos existem');
select has_table('public','maintenance_request_events','auditoria existe');
select ok((select not public from storage.buckets where id='maintenance-request-photos'),'bucket e privado');
select is((select file_size_limit from storage.buckets where id='maintenance-request-photos'),10485760::bigint,'bucket limita arquivo final a 10 MB');
select ok(not has_function_privilege('anon','public.portal_create_maintenance_request(uuid,uuid,text,text,text,uuid)','EXECUTE'),'anon nao cria solicitacao');
select ok(has_function_privilege('authenticated','public.portal_create_maintenance_request(uuid,uuid,text,text,text,uuid)','EXECUTE'),'autenticado usa RPC segura');
select ok(not has_table_privilege('authenticated','public.maintenance_requests','INSERT'),'insert direto e negado');
select ok(not has_table_privilege('authenticated','public.maintenance_requests','DELETE'),'delete direto e negado');
select ok(not has_table_privilege('service_role','public.maintenances','SELECT'),'Etapa 14 nao amplia SELECT de service_role sobre OS');
select ok((select prosecdef from pg_proc where oid='public.is_internal_maintenance_request_member(uuid)'::regprocedure),'separacao interna usa security definer');
select is((select provolatile::text from pg_proc where oid='public.can_delete_maintenance_request_photo_object(text)'::regprocedure),'v'::text,'compensacao e volatile para adquirir lock');
select ok((select lower(prosrc) like '%for update%' from pg_proc where oid='public.can_delete_maintenance_request_photo_object(text)'::regprocedure),'compensacao serializa com vinculacao da foto');
select ok((select bool_and(setting like 'search_path=%' and setting not like '%public%') from pg_proc cross join lateral unnest(proconfig) setting where oid in ('public.is_internal_maintenance_request_member(uuid)'::regprocedure,'public.can_delete_maintenance_request_photo_object(text)'::regprocedure)),'novos helpers usam search_path vazio');
select is((select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'maintenance_request_objects_%'),3::bigint,'storage possui select insert e delete protegidos');

set local role authenticated;
select set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000001',true);
select set_config('test.request_id',public.portal_create_maintenance_request('e1110000-0000-4000-8000-000000000001','e1200000-0000-4000-8000-000000000001','Ruido na esteira','Ruido continuo durante a corrida','high','e1300000-0000-4000-8000-000000000001')::text,true);
select is(public.portal_create_maintenance_request('e1110000-0000-4000-8000-000000000001','e1200000-0000-4000-8000-000000000001','Ruido na esteira','Ruido continuo durante a corrida','high','e1300000-0000-4000-8000-000000000001'),current_setting('test.request_id')::uuid,'submission key torna envio idempotente');
select throws_like($$select public.portal_create_maintenance_request('e1110000-0000-4000-8000-000000000001','e2200000-0000-4000-8000-000000000001','Fraude externa','Tentativa em outro tenant','high','e1300000-0000-4000-8000-000000000002')$$,'%indisponivel%','equipamento cross-tenant e bloqueado');
select is((select count(*) from public.portal_list_maintenance_requests('e1110000-0000-4000-8000-000000000001',null,null,null,1,12)),1::bigint,'externo ativo mantem permissao legitima no Portal');
select throws_like($$select count(*) from public.maintenance_requests$$,'%permission denied%','tabela nao e exposta diretamente');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000002',true);
select set_config('test.request_b_id',public.portal_create_maintenance_request('e2110000-0000-4000-8000-000000000001','e2200000-0000-4000-8000-000000000001','Ruido na bicicleta','Ruido continuo identificado na unidade B.','medium','e2300000-0000-4000-8000-000000000001')::text,true);
select is((select count(*) from public.portal_get_maintenance_request('e2110000-0000-4000-8000-000000000001',current_setting('test.request_id')::uuid)),0::bigint,'cross-tenant nao revela detalhe');
reset role;

insert into storage.buckets(id,name,public) values('request-test-wrong-bucket','request-test-wrong-bucket',false);
insert into storage.objects(bucket_id,name,owner_id,metadata) values
 ('maintenance-request-photos',current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/tombstone.webp','e3000000-0000-4000-8000-000000000001','{"mimetype":"image/webp","size":1024}'),
 ('maintenance-request-photos',current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/preserved.webp','e3000000-0000-4000-8000-000000000001','{"mimetype":"image/webp","size":1024}'),
 ('maintenance-request-photos',current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/orphan-before.webp','e3000000-0000-4000-8000-000000000001','{"mimetype":"image/webp","size":1024}'),
 ('maintenance-request-photos',current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/orphan-after.webp','e3000000-0000-4000-8000-000000000001','{"mimetype":"image/webp","size":1024}'),
 ('maintenance-request-photos',current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/foreign-owner.webp','e3000000-0000-4000-8000-000000000002','{"mimetype":"image/webp","size":1024}'),
 ('maintenance-request-photos',current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/missing-owner.webp',null,'{"mimetype":"image/webp","size":1024}'),
 ('maintenance-request-photos',current_setting('test.req_org_a')||'/00000000-0000-4000-8000-000000000099/e3000000-0000-4000-8000-000000000001/missing-request.webp','e3000000-0000-4000-8000-000000000001','{"mimetype":"image/webp","size":1024}'),
 ('maintenance-request-photos',current_setting('test.req_org_b')||'/'||current_setting('test.request_b_id')||'/e3000000-0000-4000-8000-000000000001/foreign-request.webp','e3000000-0000-4000-8000-000000000001','{"mimetype":"image/webp","size":1024}'),
 ('maintenance-request-photos','malformed/e3000000-0000-4000-8000-000000000001.webp','e3000000-0000-4000-8000-000000000001','{"mimetype":"image/webp","size":1024}'),
 ('request-test-wrong-bucket',current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/wrong-bucket.webp','e3000000-0000-4000-8000-000000000001','{"mimetype":"image/webp","size":1024}');

set local role authenticated;
select set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000001',true);
select set_config('test.tombstone_photo_id',public.portal_register_maintenance_request_photo('e1110000-0000-4000-8000-000000000001',current_setting('test.request_id')::uuid,current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/tombstone.webp','image/webp',1024,0)::text,true);
select set_config('test.preserved_photo_id',public.portal_register_maintenance_request_photo('e1110000-0000-4000-8000-000000000001',current_setting('test.request_id')::uuid,current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/preserved.webp','image/webp',1024,1)::text,true);
select ok(not public.can_delete_maintenance_request_photo_object(current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/preserved.webp'),'foto vinculada nao usa excecao de compensacao');
select ok(not public.can_delete_maintenance_request_photo_object(current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/foreign-owner.webp'),'owner_id diferente e rejeitado');
select ok(not public.can_delete_maintenance_request_photo_object(current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/missing-owner.webp'),'owner_id ausente e rejeitado');
select ok(not public.can_delete_maintenance_request_photo_object(current_setting('test.req_org_a')||'/00000000-0000-4000-8000-000000000099/e3000000-0000-4000-8000-000000000001/missing-request.webp'),'solicitacao inexistente e rejeitada');
select ok(not public.can_delete_maintenance_request_photo_object(current_setting('test.req_org_b')||'/'||current_setting('test.request_b_id')||'/e3000000-0000-4000-8000-000000000001/foreign-request.webp'),'organizacao ou solicitacao alheia e rejeitada mesmo com UID proprio');
select ok(not public.can_delete_maintenance_request_photo_object('malformed/e3000000-0000-4000-8000-000000000001.webp'),'path malformado e rejeitado');
select ok(not public.can_delete_maintenance_request_photo_object(current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/wrong-bucket.webp'),'bucket incorreto e rejeitado');
select ok(public.can_delete_maintenance_request_photo_object(current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/orphan-before.webp'),'compensacao legitima autoriza upload proprio antes da revogacao');
select is(public.portal_remove_maintenance_request_photo('e1110000-0000-4000-8000-000000000001',current_setting('test.request_id')::uuid,current_setting('test.tombstone_photo_id')::uuid),current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/tombstone.webp','remocao cria tombstone rastreavel');
select ok(public.can_delete_maintenance_request_photo_object(current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/tombstone.webp'),'tombstone proprio autoriza somente seu objeto');
select ok(not public.can_delete_maintenance_request_photo_object(current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/preserved.webp'),'tombstone nao autoriza exclusao de outra foto vinculada');
select lives_ok($$select public.portal_cancel_maintenance_request('e1110000-0000-4000-8000-000000000001',current_setting('test.request_id')::uuid,'Problema resolvido localmente')$$,'requester cancela pendente');
select ok(not public.can_delete_maintenance_request_photo_object(current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/preserved.webp'),'foto preservada apos cancelamento nao pode ser compensada');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.internal_list_maintenance_requests(current_setting('test.req_org_a')::uuid,null,null,null,1,20)),1::bigint,'owner interno legitimo continua autorizado');
select is((select count(*) from public.internal_list_maintenance_request_photos(current_setting('test.req_org_a')::uuid,current_setting('test.request_id')::uuid)),1::bigint,'owner interno le foto preservada');
select is((select count(*) from storage.objects where bucket_id='maintenance-request-photos' and name like current_setting('test.req_org_a')||'/%/preserved.webp'),1::bigint,'owner assina ou le objeto do proprio tenant');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000002',true);
select is((select count(*) from public.internal_list_maintenance_requests(current_setting('test.req_org_a')::uuid,null,null,null,1,20)),1::bigint,'technician mantem leitura interna anterior');
select is((select count(*) from public.internal_list_maintenance_request_photos(current_setting('test.req_org_a')::uuid,current_setting('test.request_id')::uuid)),1::bigint,'technician mantem leitura de fotos anterior');
select is((select count(*) from storage.objects where bucket_id='maintenance-request-photos' and name like current_setting('test.req_org_a')||'/%/preserved.webp'),1::bigint,'technician mantem leitura Storage anterior');
reset role;

select set_config('zion.academy_administration','allowed',true);
update public.academy_user_locations set status='revoked',revoked_at=now(),revoked_by='e1000000-0000-4000-8000-000000000001',revocation_reason='Teste de revogacao' where user_id='e3000000-0000-4000-8000-000000000001';
select set_config('zion.academy_administration','',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000001',true);
select throws_like($$select * from public.portal_get_maintenance_request('e1110000-0000-4000-8000-000000000001',current_setting('test.request_id')::uuid)$$,'%Portal%','revogacao fecha detalhe imediatamente');
select ok(public.can_delete_maintenance_request_photo_object(current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/orphan-after.webp'),'compensacao de upload proprio permanece autorizada depois da revogacao');
select is((select count(*) from storage.objects where bucket_id='maintenance-request-photos' and name like current_setting('test.req_org_a')||'/%/preserved.webp'),0::bigint,'revogacao bloqueia leitura Storage sem apagar foto preservada');
reset role;
select is((select count(*) from storage.objects where bucket_id='maintenance-request-photos' and name like current_setting('test.req_org_a')||'/%/preserved.webp'),1::bigint,'foto preservada continua fisicamente no bucket privado');

-- Simula corrupcao historica que os triggers canonicos impedem em operacao normal.
set local session_replication_role = replica;
insert into public.organization_members(organization_id,user_id,role,status,created_by) values
 (current_setting('test.req_org_a')::uuid,'e3000000-0000-4000-8000-000000000001','technician','active','e1000000-0000-4000-8000-000000000001'),
 (current_setting('test.req_org_a')::uuid,'e3000000-0000-4000-8000-000000000003','owner','active','e1000000-0000-4000-8000-000000000001'),
 (current_setting('test.req_org_a')::uuid,'e3000000-0000-4000-8000-000000000004','technician','active','e1000000-0000-4000-8000-000000000001');
set local session_replication_role = origin;

set local role authenticated;
select set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000001',true);
select ok(not public.is_internal_maintenance_request_member(current_setting('test.req_org_a')::uuid),'externo active com membership nao vira identidade interna');
select throws_like($$select * from public.internal_list_maintenance_requests(current_setting('test.req_org_a')::uuid,null,null,null,1,20)$$,'%Acesso negado%','externo active nao acessa RPC interna');
select ok(not public.can_access_maintenance_request_photo_object(current_setting('test.req_org_a')||'/'||current_setting('test.request_id')||'/e3000000-0000-4000-8000-000000000001/preserved.webp',false),'dupla classificacao nao herda leitura interna de foto');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000003',true);
select ok(not public.is_internal_maintenance_request_member(current_setting('test.req_org_a')::uuid),'externo pending com membership nao vira identidade interna');
select throws_like($$select * from public.internal_list_maintenance_requests(current_setting('test.req_org_a')::uuid,null,null,null,1,20)$$,'%Acesso negado%','externo pending nao acessa RPC interna');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000004',true);
select ok(not public.is_internal_maintenance_request_member(current_setting('test.req_org_a')::uuid),'externo suspended com membership nao vira identidade interna');
select throws_like($$select * from public.internal_list_maintenance_requests(current_setting('test.req_org_a')::uuid,null,null,null,1,20)$$,'%Acesso negado%','externo suspended nao acessa RPC interna');
reset role;

grant select on public.maintenance_requests,public.maintenance_request_photos,public.maintenance_request_events to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','e3000000-0000-4000-8000-000000000001',true);
select is((select count(*) from public.maintenance_requests),0::bigint,'RLS efetiva nao concede leitura interna ao externo com membership');
select is((select count(*) from public.maintenance_request_photos),0::bigint,'RLS efetiva nao concede fotos internas ao externo com membership');
select is((select count(*) from public.maintenance_request_events),0::bigint,'RLS efetiva nao concede auditoria interna ao externo com membership');
select is((select count(*) from storage.objects where bucket_id='maintenance-request-photos' and name like current_setting('test.req_org_a')||'/%/preserved.webp'),0::bigint,'politica efetiva Storage nao concede foto por membership corrompido');
reset role;

select is((select count(*) from public.maintenances),0::bigint,'solicitacoes nao criam OS');
select is((select count(*) from public.maintenance_request_events where maintenance_request_id=current_setting('test.request_id')::uuid and action='request_cancelled'),1::bigint,'cancelamento audita uma vez');
select * from finish();
rollback;
