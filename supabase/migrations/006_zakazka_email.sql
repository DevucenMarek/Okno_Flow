alter table zakazky
  add column if not exists email text;  -- email zákazníka (synced zo zakaznici)
