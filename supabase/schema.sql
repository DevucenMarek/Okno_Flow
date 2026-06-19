-- =============================================
-- OKNO FLOW – Databázová schéma (Supabase)
-- =============================================

-- Zákazníci (CRM)
create table zakaznici (
  id uuid primary key default gen_random_uuid(),
  nazov text not null,
  adresa text,
  kontakt text,
  email text,
  poznamka text,
  created_at timestamptz default now()
);

-- Zákazky (jadro systému – vychádza z OP 2026)
create table zakazky (
  id uuid primary key default gen_random_uuid(),
  cislo_zod text unique,              -- napr. 26Z001, 25Z112
  zakaznik_id uuid references zakaznici(id),
  zakaznik_nazov text,                -- denorm. pre rýchlosť
  adresa_montaze text,
  kontakt text,
  obchodnik text,                     -- predajca / obchodník

  -- Stav zákazky
  stav text default 'nova'            -- nova | aktivna | caka | hotova | storno
    check (stav in ('nova','aktivna','caka','hotova','storno')),

  -- Produkty & práce
  rozsah_vyrobkov text,               -- napr. "1xDKR, 3xO"
  typ_prac text,                      -- D, M, MV, L – kombinácie
  popis_systemu text,                 -- SYNEGO biele, Štandard PVC...
  pocet_napilkov integer,
  poznamka text,

  -- Financie
  objem_spolu numeric(12,2),          -- celková suma zákazky
  objem_f numeric(12,2),              -- Fenestra
  objem_h numeric(12,2),              -- Hörmann / iný dodávateľ
  objem_ine numeric(12,2),            -- ostatné
  zalona numeric(12,2),               -- prijatá záloha
  doplatok numeric(12,2),             -- doplatok

  -- Termín
  termin_zod date,                    -- termín zo zmluvy

  -- Míľniky (dátumy z OP)
  dat_inventura date,
  dat_financna_inv date,
  dat_dokumentacia date,
  dat_objednavka date,
  dat_ace date,                       -- T. v ACE (KLAES)
  dat_potvrdenie date,                -- T. v potv.
  dat_lozny_plan date,
  dat_prijem_sklad date,              -- prijaté na sklad
  dat_montaz date,                    -- namontované

  -- KLAES prepojenie
  cislo_vyrobnej_davky text,          -- napr. PA5112A1

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Faktúry
create table faktury (
  id uuid primary key default gen_random_uuid(),
  zakazka_id uuid references zakazky(id) on delete cascade,
  typ text check (typ in ('zalohova','ostara','dobropis')),
  cislo text,
  suma numeric(12,2),
  datum date,
  splatnost date,
  uhradena boolean default false,
  datum_uhrady date,
  poznamka text,
  created_at timestamptz default now()
);

-- Dodávatelia
create table dodavatelia (
  id uuid primary key default gen_random_uuid(),
  nazov text not null,               -- FNS, Vaša, Isotra, Rollson...
  kontakt text,
  email text
);

-- Objednávky / dodacie faktúry od dodávateľov (DF)
create table objednavky_dodavatelia (
  id uuid primary key default gen_random_uuid(),
  zakazka_id uuid references zakazky(id) on delete cascade,
  dodavatel_id uuid references dodavatelia(id),
  cislo_df text,                     -- napr. DF293/25
  suma numeric(12,2),
  dat_objednania date,
  dat_prijatia date,
  poznamka text
);

-- Montáže
create table montaze (
  id uuid primary key default gen_random_uuid(),
  zakazka_id uuid references zakazky(id) on delete cascade,
  datum date not null,
  cas_od time,
  partia_hlavna text,               -- Tím A, Tím B...
  partia_pomocna text,
  murar text,
  stav text default 'naplanovana'
    check (stav in ('naplanovana','prebieha','dokoncena','zrusena')),
  fotky text[],                     -- URLs z Supabase Storage
  podpis_url text,                  -- URL podpisu zákazníka
  poznamka text,
  created_at timestamptz default now()
);

-- Preberací protokol
create table protokoly (
  id uuid primary key default gen_random_uuid(),
  zakazka_id uuid references zakazky(id) on delete cascade,
  montaz_id uuid references montaze(id),
  datum date,
  podpis_url text,
  fotky text[],
  pdf_url text,
  poznamka text,
  created_at timestamptz default now()
);

-- Servis / reklamácie
create table servis (
  id uuid primary key default gen_random_uuid(),
  zakazka_id uuid references zakazky(id),
  zakaznik_id uuid references zakaznici(id),
  popis text not null,
  stav text default 'nova'
    check (stav in ('nova','v_rieseni','vyriesena','zamietnuta')),
  termin date,
  technik text,
  riesenie text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sklad
create table sklad_pohyby (
  id uuid primary key default gen_random_uuid(),
  typ text check (typ in ('prijem','vydaj','rezervacia')),
  zakazka_id uuid references zakazky(id),
  popis text,
  mnozstvo numeric,
  jednotka text,
  datum date default current_date,
  poznamka text
);

-- Auto updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_zakazky_updated_at
  before update on zakazky
  for each row execute function update_updated_at();

create trigger trg_servis_updated_at
  before update on servis
  for each row execute function update_updated_at();

-- Indexy
create index on zakazky(stav);
create index on zakazky(termin_zod);
create index on zakazky(zakaznik_id);
create index on zakazky(cislo_zod);
create index on montaze(datum);
create index on faktury(zakazka_id);
