begin;

alter function public.guard_return_schedule_mutation()
  set timezone = 'America/Sao_Paulo';

alter function public.complete_maintenance_with_return(uuid, uuid, date)
  set timezone = 'America/Sao_Paulo';

alter function public.search_return_schedules(uuid, text, date, date, uuid, text, text, uuid)
  set timezone = 'America/Sao_Paulo';

alter function public.get_return_schedule_summary(uuid)
  set timezone = 'America/Sao_Paulo';

comment on function public.guard_return_schedule_mutation() is
  'Protege o histórico dos retornos e interpreta current_date em America/Sao_Paulo.';

comment on function public.search_return_schedules(uuid, text, date, date, uuid, text, text, uuid) is
  'Consulta segura da agenda com faixas diárias calculadas em America/Sao_Paulo.';

comment on function public.get_return_schedule_summary(uuid) is
  'Resumo operacional da agenda calculado pela data civil de America/Sao_Paulo.';

commit;
