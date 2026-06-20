-- Dokumenty zákazky (viacero súborov, napr. viacero KLAES RTF exportov)
create table if not exists zakazka_dokumenty (
  id uuid primary key default gen_random_uuid(),
  zakazka_id uuid references zakazky(id) on delete cascade,
  nazov text not null,          -- pôvodný názov súboru
  url text not null,            -- Supabase Storage public URL
  storage_path text not null,   -- cesta v buckete pre mazanie
  typ text default 'klaes_rtf', -- klaes_rtf | priloha | protokol ...
  created_at timestamptz default now()
);
