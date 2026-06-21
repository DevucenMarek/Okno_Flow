create table if not exists ponuky (
  id uuid primary key default gen_random_uuid(),
  cislo_ponuky text unique not null,          -- napr. 26P001

  -- Zákazník
  zakaznik_id uuid references zakaznici(id) on delete set null,
  zakaznik_nazov text not null,
  adresa_montaze text,
  kontakt text,
  email text,
  obchodnik text,

  -- Produkty & práce
  popis_systemu text,
  typ_prac text,
  rozsah_vyrobkov text,
  pocet_napilkov integer,
  poznamka text,

  -- Financie
  objem_spolu numeric(12,2),
  zalona numeric(12,2),
  termin_platnosti date,                      -- platnosť ponuky

  -- Stav
  stav text default 'rozpracovana'
    check (stav in ('rozpracovana','odoslana','odsouhlasena','zamietnuta','prevzata')),

  -- Po konverzii na zákazku
  zakazka_id uuid references zakazky(id) on delete set null,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
