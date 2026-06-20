-- ── 1. Pipeline míľniky na zákazke ─────────────────────────────────────────
alter table zakazky
  add column if not exists dat_dopyt            date,  -- 1. Prvý kontakt
  add column if not exists dat_ponuka           date,  -- 2. Cenová ponuka odoslaná
  add column if not exists dat_odsouhlasenie    date,  -- 3. Zákazník odsúhlasil
  add column if not exists dat_zameranie        date,  -- 4. Fyzické zameranie
  add column if not exists dat_zmluva           date,  -- 5. Zmluva podpísaná
  add column if not exists dat_zalona_prijata   date,  -- 6. Záloha prijatá
  -- dat_objednavka už existuje                        -- 7. Objednávka u výrobcu
  -- dat_prijem_sklad už existuje                      -- 8. Prijaté na sklad
  -- dat_montaz už existuje                            -- 9. Montáž
  add column if not exists dat_odovzdanie       date,  -- 10. Odovzdanie zákazníkovi
  add column if not exists dat_dofakturacia     date;  -- 11. Dofaktúrácia uhradená

-- ── 2. Reklamácie – dva smery ────────────────────────────────────────────────
create table if not exists reklamacie (
  id uuid primary key default gen_random_uuid(),
  zakazka_id uuid references zakazky(id) on delete set null,

  -- 'zakaznik' = zákazník reklamuje nám
  -- 'vyroba'   = my reklamujeme výrobcovi za poškodený/chybný tovar
  typ text not null check (typ in ('zakaznik', 'vyroba')),

  -- Spoločné polia
  popis text not null,
  stav text default 'nova'
    check (stav in ('nova', 'v_rieseni', 'vyriesena', 'zamietnuta')),
  termin_riesenia date,
  technik text,           -- kto to rieši u nás
  riesenie text,          -- ako sa vyriešilo

  -- Len pre typ = 'vyroba'
  dodavatel text,         -- KLAES, Isotra, Rollson, Vaša...
  cislo_objednavky text,  -- číslo objednávky / výrobná dávka

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 3. Rozšíriť zakazka_dokumenty o viac kategórií ──────────────────────────
-- (tabuľka už existuje z migrácie 003, typ stĺpec je tam)
-- Povolené typy: klaes_rtf | cenova_ponuka | zmluva | protokol | faktura | foto | ine
