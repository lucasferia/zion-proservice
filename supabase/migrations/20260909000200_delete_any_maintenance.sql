begin;

revoke all on function public.delete_open_maintenance(uuid, uuid) from authenticated;
drop function public.delete_open_maintenance(uuid, uuid);

commit;
