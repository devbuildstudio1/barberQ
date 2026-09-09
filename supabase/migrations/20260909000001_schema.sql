-- =============================================================================
-- Barber Queue Platform — core schema
-- =============================================================================
-- Conventions
--  * All tables live in `public`; `auth.users` is Supabase-managed.
--  * Timestamps are timestamptz; "today" is computed in the platform timezone
--    (Asia/Kolkata) by app_today() so queues roll over at local midnight.
--  * Business-critical mutations (queue transitions) are ONLY performed through
--    SECURITY DEFINER functions in 0002_functions.sql. Clients have no direct
--    INSERT/UPDATE privileges on queue_entries (see 0003_rls.sql).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Enums ----------------------------------------------------------
create type public.user_role as enum ('customer', 'shop_owner', 'admin');
create type public.shop_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.barber_status as enum ('active', 'inactive');
create type public.barber_availability as enum ('available', 'on_break', 'off_duty');
create type public.service_status as enum ('active', 'inactive');
create type public.queue_status as enum ('active', 'paused', 'closed');
create type public.queue_entry_status as enum ('waiting', 'called', 'serving', 'completed', 'cancelled', 'no_show');
create type public.notification_type as enum (
  'queue_joined',
  'ahead_two',
  'ahead_one',
  'turn_approaching',
  'your_turn',
  'queue_cancelled',
  'no_show',
  'service_completed',
  'shop_approved',
  'shop_rejected',
  'shop_suspended',
  'system'
);

-- ---------- Helpers --------------------------------------------------------
create or replace function public.app_timezone() returns text
language sql immutable as $$ select 'Asia/Kolkata'::text $$;

create or replace function public.app_now() returns timestamptz
language sql stable as $$ select now() $$;

-- Local calendar date used for queue rollover.
create or replace function public.app_today() returns date
language sql stable as $$ select (now() at time zone public.app_timezone())::date $$;

create or replace function public.app_local_time() returns time
language sql stable as $$ select (now() at time zone public.app_timezone())::time $$;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- users ----------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  phone text unique,
  email text unique,
  profile_image text,
  role public.user_role not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_name_len check (name is null or char_length(name) between 1 and 80),
  constraint users_phone_fmt check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$')
);
comment on table public.users is 'Application profile for every auth user. Role drives authorization.';

create trigger users_set_updated_at before update on public.users
for each row execute function public.set_updated_at();

-- ---------- shops ----------------------------------------------------------
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete restrict,
  name text not null,
  description text,
  address text not null,
  city text,
  latitude double precision,
  longitude double precision,
  phone text,
  email text,
  image text,
  images text[] not null default '{}',
  rating numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  status public.shop_status not null default 'pending',
  is_open boolean not null default false,
  queue_paused boolean not null default false,
  opening_time time not null default '09:00',
  closing_time time not null default '21:00',
  rejection_reason text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shops_name_len check (char_length(name) between 2 and 100),
  constraint shops_description_len check (description is null or char_length(description) <= 1000),
  constraint shops_lat check (latitude is null or latitude between -90 and 90),
  constraint shops_lng check (longitude is null or longitude between -180 and 180),
  constraint shops_rating_range check (rating between 0 and 5),
  constraint shops_phone_fmt check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint shops_images_max check (cardinality(images) <= 10)
);
create index shops_status_idx on public.shops (status);
create index shops_owner_idx on public.shops (owner_id);
create index shops_geo_idx on public.shops (latitude, longitude) where status = 'approved';
create index shops_name_trgm_idx on public.shops (lower(name));

create trigger shops_set_updated_at before update on public.shops
for each row execute function public.set_updated_at();

-- ---------- barbers --------------------------------------------------------
create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  image text,
  experience_years integer not null default 0,
  specialization text,
  status public.barber_status not null default 'active',
  availability public.barber_availability not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint barbers_name_len check (char_length(name) between 2 and 80),
  constraint barbers_experience check (experience_years between 0 and 60),
  constraint barbers_specialization_len check (specialization is null or char_length(specialization) <= 120)
);
create index barbers_shop_idx on public.barbers (shop_id, status);
create index barbers_name_idx on public.barbers (lower(name));

create trigger barbers_set_updated_at before update on public.barbers
for each row execute function public.set_updated_at();

-- ---------- services -------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null,
  price numeric(10, 2) not null,
  duration_minutes integer not null,
  status public.service_status not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_name_len check (char_length(name) between 2 and 80),
  constraint services_price_nonneg check (price >= 0 and price <= 100000),
  constraint services_duration check (duration_minutes between 5 and 480)
);
create index services_shop_idx on public.services (shop_id, status);

create trigger services_set_updated_at before update on public.services
for each row execute function public.set_updated_at();

-- ---------- queues ---------------------------------------------------------
-- One queue per shop, per barber (NULL = "any barber"), per local day.
create table public.queues (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  barber_id uuid references public.barbers (id) on delete cascade,
  queue_date date not null default public.app_today(),
  token_prefix text not null default 'A',
  last_token_number integer not null default 0,
  current_token integer,
  waiting_count integer not null default 0,
  status public.queue_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint queues_prefix_fmt check (token_prefix ~ '^[A-Z]{1,2}$'),
  constraint queues_unique_per_day unique nulls not distinct (shop_id, barber_id, queue_date)
);
create index queues_shop_date_idx on public.queues (shop_id, queue_date);

create trigger queues_set_updated_at before update on public.queues
for each row execute function public.set_updated_at();

-- ---------- queue_entries --------------------------------------------------
create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references public.queues (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  barber_id uuid references public.barbers (id) on delete set null,
  user_id uuid not null references public.users (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  queue_date date not null,
  token_number integer not null,
  status public.queue_entry_status not null default 'waiting',
  estimated_duration_minutes integer not null,
  last_ahead_notified integer,
  joined_at timestamptz not null default now(),
  called_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint queue_entries_token_positive check (token_number > 0),
  constraint queue_entries_token_unique unique (queue_id, token_number)
);
-- Business rule 4: a customer can hold at most one ACTIVE entry per shop per day.
create unique index queue_entries_one_active_per_user_shop_day
  on public.queue_entries (shop_id, user_id, queue_date)
  where status in ('waiting', 'called', 'serving');
create index queue_entries_queue_status_idx on public.queue_entries (queue_id, status, token_number);
create index queue_entries_user_idx on public.queue_entries (user_id, queue_date desc);
create index queue_entries_shop_date_idx on public.queue_entries (shop_id, queue_date);

create trigger queue_entries_set_updated_at before update on public.queue_entries
for each row execute function public.set_updated_at();

-- ---------- reviews --------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  barber_id uuid references public.barbers (id) on delete set null,
  queue_entry_id uuid unique references public.queue_entries (id) on delete set null,
  rating integer not null,
  review text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_text_len check (review is null or char_length(review) <= 1000)
);
create index reviews_shop_idx on public.reviews (shop_id, created_at desc);
create index reviews_user_idx on public.reviews (user_id);

-- ---------- notifications --------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  message text not null,
  type public.notification_type not null default 'system',
  read boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, read, created_at desc);

-- =============================================================================
-- Triggers: derived counters
-- =============================================================================

-- Keep queues.waiting_count in sync and bump updated_at so realtime listeners on
-- the public `queues` row are notified of any entry change without exposing
-- other customers' entries.
create or replace function public.queue_entries_after_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_queue_id uuid := coalesce(new.queue_id, old.queue_id);
begin
  update public.queues q
     set waiting_count = (select count(*) from public.queue_entries e where e.queue_id = q.id and e.status = 'waiting'),
         updated_at = now()
   where q.id = v_queue_id;
  return null;
end $$;

create trigger queue_entries_counters
after insert or update of status or delete on public.queue_entries
for each row execute function public.queue_entries_after_change();

-- Keep shops.rating / review_count in sync.
create or replace function public.reviews_after_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_shop_id uuid := coalesce(new.shop_id, old.shop_id);
begin
  -- Derived columns are guarded against client writes; mark this as internal.
  perform set_config('app.internal_write', 'on', true);
  update public.shops s
     set rating = coalesce((select round(avg(r.rating)::numeric, 2) from public.reviews r where r.shop_id = s.id and not r.is_hidden), 0),
         review_count = (select count(*) from public.reviews r where r.shop_id = s.id and not r.is_hidden)
   where s.id = v_shop_id;
  perform set_config('app.internal_write', 'off', true);
  return null;
end $$;

create trigger reviews_counters
after insert or update or delete on public.reviews
for each row execute function public.reviews_after_change();

-- =============================================================================
-- Auth integration
-- =============================================================================

-- Create the profile row when a user signs up. The requested role may only be
-- 'customer' or 'shop_owner' (admins are promoted by an existing admin).
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role public.user_role := 'customer';
  v_requested text := new.raw_user_meta_data ->> 'role';
begin
  if v_requested = 'shop_owner' then
    v_role := 'shop_owner';
  end if;

  insert into public.users (id, name, phone, email, role)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', '')), ''),
    case when new.phone is not null and new.phone <> '' then '+' || ltrim(new.phone, '+') else null end,
    nullif(lower(new.email), ''),
    v_role
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Keep phone/email in the profile in sync with auth (e.g. after OTP verification).
create or replace function public.handle_auth_user_updated() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.users
     set phone = case when new.phone is not null and new.phone <> '' then '+' || ltrim(new.phone, '+') else phone end,
         email = coalesce(nullif(lower(new.email), ''), email)
   where id = new.id;
  return new;
end $$;

create trigger on_auth_user_updated
after update of phone, email on auth.users
for each row execute function public.handle_auth_user_updated();

-- Mirror the role into the JWT (app_metadata.role) so edge/proxy code can do
-- coarse routing. RLS never trusts this claim; it reads public.users.role.
create or replace function public.sync_role_to_auth() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role::text)
   where id = new.id;
  return new;
end $$;

create trigger users_sync_role
after insert or update of role on public.users
for each row execute function public.sync_role_to_auth();
