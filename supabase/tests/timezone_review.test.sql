begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

select ok(
  (select 'TimeZone=America/Sao_Paulo' = any(coalesce(proconfig, array[]::text[]))
   from pg_proc where oid = 'public.guard_return_schedule_mutation()'::regprocedure),
  'validação de data do retorno usa timezone de São Paulo'
);
select ok(
  (select 'TimeZone=America/Sao_Paulo' = any(coalesce(proconfig, array[]::text[]))
   from pg_proc where oid = 'public.complete_maintenance_with_return(uuid,uuid,date)'::regprocedure),
  'conclusão com retorno usa timezone de São Paulo'
);
select ok(
  (select 'TimeZone=America/Sao_Paulo' = any(coalesce(proconfig, array[]::text[]))
   from pg_proc where oid = 'public.search_return_schedules(uuid,text,date,date,uuid,text,text,uuid)'::regprocedure),
  'busca de retornos usa timezone de São Paulo'
);
select ok(
  (select 'TimeZone=America/Sao_Paulo' = any(coalesce(proconfig, array[]::text[]))
   from pg_proc where oid = 'public.get_return_schedule_summary(uuid)'::regprocedure),
  'resumo de retornos usa timezone de São Paulo'
);
select is(
  (select count(*) from pg_proc
   where oid in (
     'public.guard_return_schedule_mutation()'::regprocedure,
     'public.complete_maintenance_with_return(uuid,uuid,date)'::regprocedure,
     'public.search_return_schedules(uuid,text,date,date,uuid,text,text,uuid)'::regprocedure,
     'public.get_return_schedule_summary(uuid)'::regprocedure
   )
   and prosecdef),
  4::bigint,
  'correção preserva funções security definer'
);
select ok(
  has_function_privilege('authenticated', 'public.search_return_schedules(uuid,text,date,date,uuid,text,text,uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.get_return_schedule_summary(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.search_return_schedules(uuid,text,date,date,uuid,text,text,uuid)', 'EXECUTE'),
  'correção preserva privilégios mínimos'
);

select * from finish();
rollback;
