-- Tabelas da operação: cada registo guarda o objeto da app em JSONB (mesmo formato do backup).
create or replace function public.set_audit_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['drivers','vehicles','services','allocations','shift_scales','day_offs','settlements']
  loop
    execute format($f$
      create table public.%I (
        id text primary key,
        data jsonb not null,
        updated_at timestamptz not null default now(),
        updated_by uuid default auth.uid()
      );
      alter table public.%I enable row level security;
      create policy "Equipa autenticada pode ler" on public.%I for select to authenticated using (true);
      create policy "Equipa autenticada pode inserir" on public.%I for insert to authenticated with check (true);
      create policy "Equipa autenticada pode alterar" on public.%I for update to authenticated using (true) with check (true);
      create policy "Equipa autenticada pode apagar" on public.%I for delete to authenticated using (true);
      create trigger set_audit_fields before insert or update on public.%I
        for each row execute function public.set_audit_fields();
      alter publication supabase_realtime add table public.%I;
    $f$, t, t, t, t, t, t, t, t);
  end loop;
end;
$$;
