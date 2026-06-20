-- Profily užívateľov (rozšírenie Supabase Auth)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  meno text,
  rola text default 'obchodnik'
    check (rola in ('admin', 'obchodnik', 'montaznik', 'skladnik')),
  created_at timestamptz default now()
);

-- Automaticky vytvoriť profil pri registrácii
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS pre profiles
alter table profiles enable row level security;

create policy "Užívateľ vidí vlastný profil"
  on profiles for select
  using (auth.uid() = id);

create policy "Admin vidí všetky profily"
  on profiles for all
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.rola = 'admin'
    )
  );

-- RLS pre zakazky (všetci prihlásení môžu čítať)
alter table zakazky enable row level security;
create policy "Prihlásení môžu čítať zákazky"
  on zakazky for select using (auth.role() = 'authenticated');
create policy "Prihlásení môžu zapisovať zákazky"
  on zakazky for all using (auth.role() = 'authenticated');

-- RLS pre zakaznici
alter table zakaznici enable row level security;
create policy "Prihlásení môžu čítať zákazníkov"
  on zakaznici for select using (auth.role() = 'authenticated');
create policy "Prihlásení môžu zapisovať zákazníkov"
  on zakaznici for all using (auth.role() = 'authenticated');
