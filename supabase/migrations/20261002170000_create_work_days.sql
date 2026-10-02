-- Registo diário por motorista (início de jornada manual e outras exceções)
create table public.work_days (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
alter table public.work_days enable row level security;
create policy "Membros podem ler" on public.work_days for select to authenticated using (public.is_team_member());
create policy "Membros podem inserir" on public.work_days for insert to authenticated with check (public.is_team_member());
create policy "Membros podem alterar" on public.work_days for update to authenticated using (public.is_team_member()) with check (public.is_team_member());
create policy "Membros podem apagar" on public.work_days for delete to authenticated using (public.is_team_member());
create trigger set_audit_fields before insert or update on public.work_days
  for each row execute function public.set_audit_fields();
alter publication supabase_realtime add table public.work_days;
