alter table zakazky
  add column if not exists cislo_obj_dodavatela text;  -- externé číslo objednávky od dodávateľa (KLAES, Isotra, Rollson...)
