-- Kto vytvoril / naposledy upravil zákazku
alter table zakazky
  add column if not exists created_by text,
  add column if not exists updated_by text;

-- Kto vytvoril / naposledy upravil ponuku
alter table ponuky
  add column if not exists created_by text,
  add column if not exists updated_by text;

-- Aktivitný log – kľúčové udalosti
create table if not exists aktivita_log (
  id uuid primary key default gen_random_uuid(),
  entita_typ text not null,   -- 'zakazka' | 'ponuka'
  entita_id uuid not null,
  akcia text not null,        -- 'vytvoril' | 'upravil' | 'krok' | 'dokument' | 'reklamacia' | 'prevod' | 'stav'
  popis text,                 -- ľudsky čitateľný popis udalosti
  user_meno text,             -- meno alebo email prihláseného používateľa
  created_at timestamptz default now()
);

create index if not exists aktivita_log_entita_idx on aktivita_log(entita_typ, entita_id);
