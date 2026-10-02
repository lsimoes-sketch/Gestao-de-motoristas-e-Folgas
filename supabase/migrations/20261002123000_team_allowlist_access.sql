-- Lista de acesso da equipa: só estes emails veem ou alteram dados.
create table public.team_members (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now(),
  added_by text
);
alter table public.team_members enable row level security;

create or replace function public.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Usado no ecrã de login para avisar se o email não tem acesso (não revela outros dados).
create or replace function public.is_email_allowed(check_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.team_members tm where tm.email = lower(trim(check_email)));
$$;

revoke all on function public.is_team_member() from public, anon;
grant execute on function public.is_team_member() to authenticated;
revoke all on function public.is_email_allowed(text) from public;
grant execute on function public.is_email_allowed(text) to anon, authenticated;

create policy "Membros veem a equipa" on public.team_members for select to authenticated using (public.is_team_member());
create policy "Membros adicionam colegas" on public.team_members for insert to authenticated with check (public.is_team_member());
create policy "Membros removem colegas" on public.team_members for delete to authenticated using (public.is_team_member());

-- Restringir as políticas existentes das tabelas da operação a membros da equipa.
do $$
declare
  t text;
begin
  foreach t in array array['drivers','vehicles','services','allocations','shift_scales','day_offs','settlements']
  loop
    execute format('alter policy "Equipa autenticada pode ler" on public.%I using (public.is_team_member())', t);
    execute format('alter policy "Equipa autenticada pode inserir" on public.%I with check (public.is_team_member())', t);
    execute format('alter policy "Equipa autenticada pode alterar" on public.%I using (public.is_team_member()) with check (public.is_team_member())', t);
    execute format('alter policy "Equipa autenticada pode apagar" on public.%I using (public.is_team_member())', t);
  end loop;
end;
$$;

alter publication supabase_realtime add table public.team_members;

-- Primeiro membro (o resto da equipa é adicionado na app, em "Equipa")
insert into public.team_members (email, added_by) values ('lsimoes@gmail.com', 'configuração inicial');
