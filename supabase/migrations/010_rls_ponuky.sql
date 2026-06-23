-- RLS policies pre ponuky, reklamacie a aktivita_log
-- Spusti v Supabase SQL Editore

-- ── ponuky ────────────────────────────────────────────────────────────────────
alter table ponuky enable row level security;

drop policy if exists "ponuky_select" on ponuky;
drop policy if exists "ponuky_insert" on ponuky;
drop policy if exists "ponuky_update" on ponuky;
drop policy if exists "ponuky_delete" on ponuky;

create policy "ponuky_select" on ponuky
  for select to authenticated using (true);

create policy "ponuky_insert" on ponuky
  for insert to authenticated with check (true);

create policy "ponuky_update" on ponuky
  for update to authenticated using (true) with check (true);

create policy "ponuky_delete" on ponuky
  for delete to authenticated using (true);

-- ── reklamacie ────────────────────────────────────────────────────────────────
alter table reklamacie enable row level security;

drop policy if exists "reklamacie_select" on reklamacie;
drop policy if exists "reklamacie_insert" on reklamacie;
drop policy if exists "reklamacie_update" on reklamacie;

create policy "reklamacie_select" on reklamacie
  for select to authenticated using (true);

create policy "reklamacie_insert" on reklamacie
  for insert to authenticated with check (true);

create policy "reklamacie_update" on reklamacie
  for update to authenticated using (true) with check (true);

-- ── aktivita_log ──────────────────────────────────────────────────────────────
alter table aktivita_log enable row level security;

drop policy if exists "aktivita_log_select" on aktivita_log;
drop policy if exists "aktivita_log_insert" on aktivita_log;

create policy "aktivita_log_select" on aktivita_log
  for select to authenticated using (true);

create policy "aktivita_log_insert" on aktivita_log
  for insert to authenticated with check (true);
