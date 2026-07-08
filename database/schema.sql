create extension if not exists pgcrypto;

do $$
begin
  create type feed_type as enum ('breastfeeding', 'expressed', 'formula', 'food');
exception
  when duplicate_object then null;
end $$;

alter type feed_type add value if not exists 'food';

do $$
begin
  create type feed_unit as enum ('ml', 'oz');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type nappy_type as enum ('wee', 'poop');
exception
  when duplicate_object then null;
end $$;

create table if not exists baby_profiles (
  id uuid primary key default gen_random_uuid(),
  share_code text not null default lpad((floor(random() * 900000)::int + 100000)::text, 6, '0'),
  name text,
  date_of_birth date,
  age_weeks integer check (age_weeks >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table baby_profiles add column if not exists share_code text;
alter table baby_profiles add column if not exists date_of_birth date;
update baby_profiles
set share_code = lpad((floor(random() * 900000)::int + 100000)::text, 6, '0')
where share_code is null;
alter table baby_profiles alter column share_code set not null;

create table if not exists feeding_records (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references baby_profiles(id) on delete cascade,
  feed_type feed_type not null,
  duration_minutes integer check (duration_minutes > 0),
  quantity numeric(8, 2) check (quantity > 0),
  unit feed_unit,
  food_name text,
  quantity_ml numeric(10, 2) generated always as (
    case
      when unit = 'oz' then quantity * 29.5735
      when unit = 'ml' then quantity
      else null
    end
  ) stored,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint feeding_measurement_required check (
    (feed_type = 'breastfeeding' and duration_minutes is not null and quantity is null and unit is null and food_name is null)
    or
    (feed_type in ('expressed', 'formula') and quantity is not null and unit is not null and duration_minutes is null and food_name is null)
    or
    (feed_type::text = 'food' and food_name is not null and length(trim(food_name)) > 0 and duration_minutes is null and quantity is null and unit is null)
  )
);

alter table feeding_records add column if not exists food_name text;
alter table feeding_records drop constraint if exists feeding_measurement_required;
alter table feeding_records add constraint feeding_measurement_required check (
  (feed_type = 'breastfeeding' and duration_minutes is not null and quantity is null and unit is null and food_name is null)
  or
  (feed_type in ('expressed', 'formula') and quantity is not null and unit is not null and duration_minutes is null and food_name is null)
  or
  (feed_type::text = 'food' and food_name is not null and length(trim(food_name)) > 0 and duration_minutes is null and quantity is null and unit is null)
);

create table if not exists nappy_records (
  id uuid primary key default gen_random_uuid(),
  baby_id uuid not null references baby_profiles(id) on delete cascade,
  nappy_type nappy_type not null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists feeding_records_baby_recorded_at_idx on feeding_records (baby_id, recorded_at desc);
create index if not exists nappy_records_baby_recorded_at_idx on nappy_records (baby_id, recorded_at desc);
create unique index if not exists baby_profiles_share_code_idx on baby_profiles (share_code);
