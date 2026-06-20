-- Zameranie (jedno záznam na zákazku)
create table if not exists zamerania (
  id uuid primary key default gen_random_uuid(),
  zakazka_id uuid references zakazky(id) on delete cascade unique,
  datum date,
  kto text,
  poznamky text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Nedorobky / punch list (viac položiek na zákazku)
create table if not exists nedorobky (
  id uuid primary key default gen_random_uuid(),
  zakazka_id uuid references zakazky(id) on delete cascade,
  popis text not null,
  stav text default 'otvorena' check (stav in ('otvorena', 'vyriesena')),
  termin date,
  created_at timestamptz default now()
);

-- Protokoly – pridaj stĺpce ak neexistujú
alter table protokoly
  add column if not exists montaznik text,
  add column if not exists klaes_rtf_url text,
  add column if not exists stav text default 'rozpracovany';

-- Servis – pridaj zakaznik_nazov pre rýchly prehľad
alter table servis
  add column if not exists zakaznik_nazov text;

-- Supabase Storage bucket 'zakazky-docs' – spusti v Supabase Storage (UI alebo API):
-- insert into storage.buckets (id, name, public) values ('zakazky-docs', 'zakazky-docs', true) on conflict do nothing;
