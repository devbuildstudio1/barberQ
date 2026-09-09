-- =============================================================================
-- Authorization helpers (used by RLS policies and functions)
-- =============================================================================

create or replace function public.current_user_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' and is_active from public.users where id = auth.uid()), false)
$$;

create or replace function public.owns_shop(p_shop_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select true from public.shops s where s.id = p_shop_id and s.owner_id = auth.uid()),
    false
  )
$$;

-- Owner of shop OR admin.
create or replace function public.can_manage_shop(p_shop_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.owns_shop(p_shop_id)
$$;

-- =============================================================================
-- Guard triggers: keep privileged columns out of reach of ordinary updates
-- =============================================================================

create or replace function public.users_protect_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for migrations/seed and the service-role key (server only).
  if auth.uid() is not null
     and (new.role is distinct from old.role or new.is_active is distinct from old.is_active)
     and not public.is_admin() then
    raise exception 'FORBIDDEN: only admins can change role or account status';
  end if;
  return new;
end $$;

create trigger users_protect_columns before update on public.users
for each row execute function public.users_protect_columns();

create or replace function public.shops_protect_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or current_setting('app.internal_write', true) = 'on' then
    return new; -- migrations / seed / service role / internal trigger maintenance
  end if;

  if tg_op = 'INSERT' then
    -- New shops always start pending (admins may create pre-approved shops).
    if not public.is_admin() then
      new.status := 'pending';
      new.approved_at := null;
      new.rejection_reason := null;
      new.rating := 0;
      new.review_count := 0;
      new.owner_id := auth.uid();
    end if;
    return new;
  end if;

  if not public.is_admin() then
    if new.status is distinct from old.status
       or new.owner_id is distinct from old.owner_id
       or new.approved_at is distinct from old.approved_at
       or new.rejection_reason is distinct from old.rejection_reason
       or new.rating is distinct from old.rating
       or new.review_count is distinct from old.review_count then
      raise exception 'FORBIDDEN: cannot change moderated fields';
    end if;
  end if;
  return new;
end $$;

create trigger shops_protect_columns before insert or update on public.shops
for each row execute function public.shops_protect_columns();

-- =============================================================================
-- Shop state helpers
-- =============================================================================

-- Is the shop accepting walk-ins right now? Manual switch AND within hours.
create or replace function public.shop_is_open_now(p_shop public.shops) returns boolean
language sql stable as $$
  select p_shop.status = 'approved'
     and p_shop.is_open
     and (
       case
         when p_shop.opening_time <= p_shop.closing_time
           then public.app_local_time() between p_shop.opening_time and p_shop.closing_time
         else public.app_local_time() >= p_shop.opening_time or public.app_local_time() <= p_shop.closing_time
       end
     )
$$;

-- Haversine distance in km.
create or replace function public.distance_km(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select case
    when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null
    else 2 * 6371 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
    ))
  end
$$;

-- =============================================================================
-- Wait-time estimation (MVP formula; isolated so it can evolve)
-- =============================================================================
-- estimated_wait = remaining time of the entry currently being served
--                + sum(duration of waiting/called entries ahead)
--                / parallelism (number of available barbers for "any barber" queues)
create or replace function public.estimate_wait_minutes(p_queue_id uuid, p_before_token integer default null)
returns integer language plpgsql stable security definer set search_path = public as $$
declare
  v_queue public.queues;
  v_total numeric := 0;
  v_parallel integer := 1;
begin
  select * into v_queue from public.queues where id = p_queue_id;
  if not found then return 0; end if;

  select coalesce(sum(
    case
      when e.status = 'serving' then
        greatest(1, e.estimated_duration_minutes - extract(epoch from (now() - coalesce(e.started_at, now()))) / 60.0)
      else e.estimated_duration_minutes
    end), 0)
  into v_total
  from public.queue_entries e
  where e.queue_id = p_queue_id
    and e.status in ('waiting', 'called', 'serving')
    and (p_before_token is null or e.token_number < p_before_token);

  if v_queue.barber_id is null then
    select greatest(1, count(*)) into v_parallel
    from public.barbers b
    where b.shop_id = v_queue.shop_id and b.status = 'active' and b.availability = 'available';
  end if;

  return ceil(v_total / v_parallel)::integer;
end $$;

-- =============================================================================
-- Notifications
-- =============================================================================

create or replace function public.create_notification(
  p_user_id uuid, p_type public.notification_type, p_title text, p_message text, p_data jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.notifications (user_id, type, title, message, data)
  values (p_user_id, p_type, p_title, p_message, coalesce(p_data, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

-- After the queue advances, tell waiting customers how close they are.
-- Each threshold (2 ahead, 1 ahead, next) is sent at most once per entry.
create or replace function public.notify_queue_positions(p_queue_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_shop_name text;
  v_prefix text;
begin
  select s.name, q.token_prefix into v_shop_name, v_prefix
  from public.queues q join public.shops s on s.id = q.shop_id
  where q.id = p_queue_id;

  for r in
    select e.id, e.user_id, e.token_number,
           (select count(*) from public.queue_entries a
             where a.queue_id = e.queue_id and a.status = 'waiting' and a.token_number < e.token_number) as ahead,
           e.last_ahead_notified
    from public.queue_entries e
    where e.queue_id = p_queue_id and e.status = 'waiting'
  loop
    if r.ahead <= 2 and (r.last_ahead_notified is null or r.ahead < r.last_ahead_notified) then
      if r.ahead = 2 then
        perform public.create_notification(r.user_id, 'ahead_two', 'Two people ahead of you',
          format('Token %s-%s at %s: two customers ahead. Start heading over.', v_prefix, r.token_number, v_shop_name),
          jsonb_build_object('queue_entry_id', r.id, 'queue_id', p_queue_id));
      elsif r.ahead = 1 then
        perform public.create_notification(r.user_id, 'ahead_one', 'One person ahead of you',
          format('Token %s-%s at %s: just one customer ahead.', v_prefix, r.token_number, v_shop_name),
          jsonb_build_object('queue_entry_id', r.id, 'queue_id', p_queue_id));
      else
        perform public.create_notification(r.user_id, 'turn_approaching', 'You are next',
          format('Token %s-%s at %s: you are next in line. Please be at the shop.', v_prefix, r.token_number, v_shop_name),
          jsonb_build_object('queue_entry_id', r.id, 'queue_id', p_queue_id));
      end if;
      update public.queue_entries set last_ahead_notified = r.ahead where id = r.id;
    end if;
  end loop;
end $$;

-- =============================================================================
-- Queue engine
-- =============================================================================

-- Letter prefix for a barber's queue: A for "any barber", then B, C... by creation order.
create or replace function public.queue_prefix_for(p_shop_id uuid, p_barber_id uuid) returns text
language sql stable as $$
  select case
    when p_barber_id is null then 'A'
    else chr(65 + least(25, (
      select count(*)::int from public.barbers b
      where b.shop_id = p_shop_id and b.created_at < (select created_at from public.barbers where id = p_barber_id)
    ) + 1))
  end
$$;

-- Get today's queue for shop/barber, creating it if needed, and lock it.
create or replace function public.lock_or_create_queue(p_shop_id uuid, p_barber_id uuid)
returns public.queues language plpgsql security definer set search_path = public as $$
declare
  v_queue public.queues;
  v_paused boolean;
begin
  select queue_paused into v_paused from public.shops where id = p_shop_id;

  insert into public.queues (shop_id, barber_id, queue_date, token_prefix, status)
  values (p_shop_id, p_barber_id, public.app_today(), public.queue_prefix_for(p_shop_id, p_barber_id),
          (case when v_paused then 'paused' else 'active' end)::public.queue_status)
  on conflict (shop_id, barber_id, queue_date) do nothing;

  select * into v_queue from public.queues
  where shop_id = p_shop_id and barber_id is not distinct from p_barber_id and queue_date = public.app_today()
  for update;
  return v_queue;
end $$;

-- ---------------------------------------------------------------------------
-- join_queue: customer joins today's queue for a shop (optionally a barber).
-- Concurrency: the queue row is locked FOR UPDATE, so token numbers are
-- allocated serially; the partial unique index is the last line of defence
-- against duplicate active entries.
-- ---------------------------------------------------------------------------
create or replace function public.join_queue(p_shop_id uuid, p_service_id uuid, p_barber_id uuid default null)
returns public.queue_entries language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_user public.users;
  v_shop public.shops;
  v_service public.services;
  v_barber public.barbers;
  v_queue public.queues;
  v_entry public.queue_entries;
  v_token integer;
begin
  if v_user_id is null then raise exception 'UNAUTHORIZED'; end if;
  select * into v_user from public.users where id = v_user_id;
  if not found or not v_user.is_active then raise exception 'FORBIDDEN'; end if;

  select * into v_shop from public.shops where id = p_shop_id;
  if not found then raise exception 'NOT_FOUND: shop'; end if;
  if v_shop.status <> 'approved' then raise exception 'SHOP_NOT_APPROVED'; end if;
  if not public.shop_is_open_now(v_shop) then raise exception 'SHOP_CLOSED'; end if;
  if v_shop.queue_paused then raise exception 'QUEUE_PAUSED'; end if;

  select * into v_service from public.services where id = p_service_id and shop_id = p_shop_id;
  if not found then raise exception 'NOT_FOUND: service'; end if;
  if v_service.status <> 'active' then raise exception 'SERVICE_UNAVAILABLE'; end if;

  if p_barber_id is not null then
    select * into v_barber from public.barbers where id = p_barber_id and shop_id = p_shop_id;
    if not found then raise exception 'NOT_FOUND: barber'; end if;
    if v_barber.status <> 'active' or v_barber.availability <> 'available' then
      raise exception 'BARBER_UNAVAILABLE';
    end if;
  end if;

  -- Serialize joins per queue.
  v_queue := public.lock_or_create_queue(p_shop_id, p_barber_id);
  if v_queue.status = 'paused' then raise exception 'QUEUE_PAUSED'; end if;
  if v_queue.status = 'closed' then raise exception 'QUEUE_CLOSED'; end if;

  -- Business rule 4 (explicit check; the partial unique index also enforces it).
  if exists (
    select 1 from public.queue_entries e
    where e.shop_id = p_shop_id and e.user_id = v_user_id and e.queue_date = public.app_today()
      and e.status in ('waiting', 'called', 'serving')
  ) then
    raise exception 'ALREADY_IN_QUEUE';
  end if;

  v_token := v_queue.last_token_number + 1;
  update public.queues set last_token_number = v_token where id = v_queue.id;

  begin
    insert into public.queue_entries (queue_id, shop_id, barber_id, user_id, service_id, queue_date, token_number, estimated_duration_minutes)
    values (v_queue.id, p_shop_id, p_barber_id, v_user_id, p_service_id, v_queue.queue_date, v_token, v_service.duration_minutes)
    returning * into v_entry;
  exception
    when unique_violation then
      raise exception 'ALREADY_IN_QUEUE';
  end;

  perform public.create_notification(
    v_user_id, 'queue_joined', 'You''re in the queue',
    format('Token %s-%s at %s. We''ll notify you as your turn approaches.', v_queue.token_prefix, v_token, v_shop.name),
    jsonb_build_object('queue_entry_id', v_entry.id, 'queue_id', v_queue.id, 'shop_id', p_shop_id)
  );
  perform public.notify_queue_positions(v_queue.id);

  return v_entry;
end $$;

-- ---------------------------------------------------------------------------
-- call_next: staff calls the next WAITING customer (WAITING -> CALLED).
-- Only one customer can be in CALLED/SERVING per queue at a time.
-- ---------------------------------------------------------------------------
create or replace function public.call_next(p_queue_id uuid)
returns public.queue_entries language plpgsql security definer set search_path = public as $$
declare
  v_queue public.queues;
  v_entry public.queue_entries;
  v_shop_name text;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;

  select * into v_queue from public.queues where id = p_queue_id for update;
  if not found then raise exception 'NOT_FOUND: queue'; end if;
  if not public.can_manage_shop(v_queue.shop_id) then raise exception 'FORBIDDEN'; end if;

  if exists (select 1 from public.queue_entries where queue_id = p_queue_id and status in ('called', 'serving')) then
    raise exception 'INVALID_QUEUE_STATE: finish the current customer first';
  end if;

  select * into v_entry from public.queue_entries
  where queue_id = p_queue_id and status = 'waiting'
  order by token_number
  limit 1
  for update skip locked;

  if not found then raise exception 'NOT_FOUND: no waiting customers'; end if;

  update public.queue_entries
     set status = 'called', called_at = now()
   where id = v_entry.id
  returning * into v_entry;

  update public.queues set current_token = v_entry.token_number where id = p_queue_id;

  select name into v_shop_name from public.shops where id = v_queue.shop_id;
  perform public.create_notification(
    v_entry.user_id, 'your_turn', 'It''s your turn!',
    format('Token %s-%s: please come to the chair at %s now.', v_queue.token_prefix, v_entry.token_number, v_shop_name),
    jsonb_build_object('queue_entry_id', v_entry.id, 'queue_id', p_queue_id)
  );
  perform public.notify_queue_positions(p_queue_id);

  return v_entry;
end $$;

-- Internal: lock an entry and verify the caller can manage its shop.
create or replace function public.lock_entry_for_staff(p_entry_id uuid)
returns public.queue_entries language plpgsql security definer set search_path = public as $$
declare v_entry public.queue_entries;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  select * into v_entry from public.queue_entries where id = p_entry_id for update;
  if not found then raise exception 'NOT_FOUND: queue entry'; end if;
  if not public.can_manage_shop(v_entry.shop_id) then raise exception 'FORBIDDEN'; end if;
  return v_entry;
end $$;

-- CALLED -> SERVING
create or replace function public.start_service(p_entry_id uuid)
returns public.queue_entries language plpgsql security definer set search_path = public as $$
declare v_entry public.queue_entries;
begin
  v_entry := public.lock_entry_for_staff(p_entry_id);
  if v_entry.status <> 'called' then
    raise exception 'INVALID_QUEUE_STATE: % -> serving', v_entry.status;
  end if;
  update public.queue_entries set status = 'serving', started_at = now()
   where id = p_entry_id returning * into v_entry;
  return v_entry;
end $$;

-- SERVING -> COMPLETED
create or replace function public.complete_service(p_entry_id uuid)
returns public.queue_entries language plpgsql security definer set search_path = public as $$
declare
  v_entry public.queue_entries;
  v_shop_name text;
begin
  v_entry := public.lock_entry_for_staff(p_entry_id);
  if v_entry.status <> 'serving' then
    raise exception 'INVALID_QUEUE_STATE: % -> completed', v_entry.status;
  end if;
  update public.queue_entries set status = 'completed', completed_at = now()
   where id = p_entry_id returning * into v_entry;

  select name into v_shop_name from public.shops where id = v_entry.shop_id;
  perform public.create_notification(
    v_entry.user_id, 'service_completed', 'Thanks for visiting!',
    format('Your service at %s is complete. How was it? Leave a quick rating.', v_shop_name),
    jsonb_build_object('queue_entry_id', v_entry.id, 'shop_id', v_entry.shop_id)
  );
  perform public.notify_queue_positions(v_entry.queue_id);
  return v_entry;
end $$;

-- WAITING -> CANCELLED (customer: own entry; staff: any waiting entry of their shop)
create or replace function public.cancel_queue_entry(p_entry_id uuid)
returns public.queue_entries language plpgsql security definer set search_path = public as $$
declare
  v_entry public.queue_entries;
  v_uid uuid := auth.uid();
  v_shop_name text;
  v_prefix text;
begin
  if v_uid is null then raise exception 'UNAUTHORIZED'; end if;
  select * into v_entry from public.queue_entries where id = p_entry_id for update;
  if not found then raise exception 'NOT_FOUND: queue entry'; end if;
  if v_entry.user_id <> v_uid and not public.can_manage_shop(v_entry.shop_id) then
    raise exception 'FORBIDDEN';
  end if;
  if v_entry.status <> 'waiting' then
    raise exception 'INVALID_QUEUE_STATE: % -> cancelled', v_entry.status;
  end if;

  update public.queue_entries set status = 'cancelled', cancelled_at = now(), cancelled_by = v_uid
   where id = p_entry_id returning * into v_entry;

  select s.name, q.token_prefix into v_shop_name, v_prefix
  from public.queues q join public.shops s on s.id = q.shop_id where q.id = v_entry.queue_id;
  perform public.create_notification(
    v_entry.user_id, 'queue_cancelled', 'Queue entry cancelled',
    case when v_entry.user_id = v_uid
      then format('You left the queue at %s (token %s-%s).', v_shop_name, v_prefix, v_entry.token_number)
      else format('%s removed your token %s-%s from the queue.', v_shop_name, v_prefix, v_entry.token_number) end,
    jsonb_build_object('queue_entry_id', v_entry.id, 'shop_id', v_entry.shop_id)
  );
  perform public.notify_queue_positions(v_entry.queue_id);
  return v_entry;
end $$;

-- WAITING/CALLED -> NO_SHOW (staff)
create or replace function public.mark_no_show(p_entry_id uuid)
returns public.queue_entries language plpgsql security definer set search_path = public as $$
declare
  v_entry public.queue_entries;
  v_shop_name text;
  v_prefix text;
begin
  v_entry := public.lock_entry_for_staff(p_entry_id);
  if v_entry.status not in ('waiting', 'called') then
    raise exception 'INVALID_QUEUE_STATE: % -> no_show', v_entry.status;
  end if;
  update public.queue_entries set status = 'no_show', cancelled_at = now(), cancelled_by = auth.uid()
   where id = p_entry_id returning * into v_entry;

  select s.name, q.token_prefix into v_shop_name, v_prefix
  from public.queues q join public.shops s on s.id = q.shop_id where q.id = v_entry.queue_id;
  perform public.create_notification(
    v_entry.user_id, 'no_show', 'Marked as no-show',
    format('Token %s-%s at %s was marked as no-show. You can join the queue again.', v_prefix, v_entry.token_number, v_shop_name),
    jsonb_build_object('queue_entry_id', v_entry.id, 'shop_id', v_entry.shop_id)
  );
  perform public.notify_queue_positions(v_entry.queue_id);
  return v_entry;
end $$;

-- Pause/resume all of today's queues for a shop (staff).
create or replace function public.set_shop_queue_paused(p_shop_id uuid, p_paused boolean)
returns public.shops language plpgsql security definer set search_path = public as $$
declare v_shop public.shops;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  if not public.can_manage_shop(p_shop_id) then raise exception 'FORBIDDEN'; end if;
  update public.shops set queue_paused = p_paused where id = p_shop_id returning * into v_shop;
  update public.queues set status = (case when p_paused then 'paused' else 'active' end)::public.queue_status
   where shop_id = p_shop_id and queue_date = public.app_today() and status <> 'closed';
  return v_shop;
end $$;

-- Open/close the shop for the day (staff).
create or replace function public.set_shop_open(p_shop_id uuid, p_open boolean)
returns public.shops language plpgsql security definer set search_path = public as $$
declare v_shop public.shops;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  if not public.can_manage_shop(p_shop_id) then raise exception 'FORBIDDEN'; end if;
  update public.shops set is_open = p_open where id = p_shop_id returning * into v_shop;
  if not p_open then
    -- Ensure the day's queues exist so realtime listeners are notified via the queue row bump.
    update public.queues set updated_at = now() where shop_id = p_shop_id and queue_date = public.app_today();
  end if;
  return v_shop;
end $$;

-- =============================================================================
-- Read models (SECURITY DEFINER so customers never read other customers' rows)
-- =============================================================================

-- Public snapshot of a queue (no personal data).
create or replace function public.get_queue_snapshot(p_queue_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_queue public.queues;
  v_shop public.shops;
begin
  select * into v_queue from public.queues where id = p_queue_id;
  if not found then raise exception 'NOT_FOUND: queue'; end if;
  select * into v_shop from public.shops where id = v_queue.shop_id;

  return jsonb_build_object(
    'queue_id', v_queue.id,
    'shop_id', v_queue.shop_id,
    'barber_id', v_queue.barber_id,
    'queue_date', v_queue.queue_date,
    'token_prefix', v_queue.token_prefix,
    'status', v_queue.status,
    'shop_open', public.shop_is_open_now(v_shop),
    'queue_paused', v_shop.queue_paused,
    'current_token', v_queue.current_token,
    'last_token_number', v_queue.last_token_number,
    'waiting_count', v_queue.waiting_count,
    'serving_token', (select token_number from public.queue_entries where queue_id = p_queue_id and status in ('serving', 'called') order by token_number limit 1),
    'estimated_wait_minutes', public.estimate_wait_minutes(p_queue_id),
    'tokens', coalesce((
      select jsonb_agg(jsonb_build_object('token_number', e.token_number, 'status', e.status, 'estimated_duration_minutes', e.estimated_duration_minutes) order by e.token_number)
      from public.queue_entries e where e.queue_id = p_queue_id and e.status in ('waiting', 'called', 'serving')
    ), '[]'::jsonb),
    'updated_at', v_queue.updated_at
  );
end $$;

-- Shop-level live status used by discovery pages.
create or replace function public.get_shop_live_status(p_shop_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_shop public.shops;
  v_waiting integer;
  v_wait integer;
begin
  select * into v_shop from public.shops where id = p_shop_id;
  if not found then raise exception 'NOT_FOUND: shop'; end if;

  select coalesce(sum(waiting_count), 0), coalesce(max(public.estimate_wait_minutes(id)), 0)
    into v_waiting, v_wait
  from public.queues where shop_id = p_shop_id and queue_date = public.app_today();

  return jsonb_build_object(
    'shop_id', v_shop.id,
    'is_open', public.shop_is_open_now(v_shop),
    'queue_paused', v_shop.queue_paused,
    'waiting_count', v_waiting,
    'estimated_wait_minutes', v_wait
  );
end $$;

-- The caller's active entry (if any) enriched with live position data.
create or replace function public.get_my_active_queue_entry()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_entry public.queue_entries;
  v_queue public.queues;
  v_shop public.shops;
  v_ahead integer;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;

  select * into v_entry from public.queue_entries
  where user_id = auth.uid() and status in ('waiting', 'called', 'serving')
  order by joined_at desc limit 1;
  if not found then return null; end if;

  select * into v_queue from public.queues where id = v_entry.queue_id;
  select * into v_shop from public.shops where id = v_entry.shop_id;

  select count(*) into v_ahead from public.queue_entries
  where queue_id = v_entry.queue_id and status in ('waiting', 'called', 'serving') and token_number < v_entry.token_number;

  return jsonb_build_object(
    'entry', to_jsonb(v_entry),
    'queue', jsonb_build_object(
      'id', v_queue.id, 'token_prefix', v_queue.token_prefix, 'status', v_queue.status,
      'current_token', v_queue.current_token, 'waiting_count', v_queue.waiting_count, 'updated_at', v_queue.updated_at
    ),
    'shop', jsonb_build_object(
      'id', v_shop.id, 'name', v_shop.name, 'address', v_shop.address, 'image', v_shop.image,
      'latitude', v_shop.latitude, 'longitude', v_shop.longitude, 'phone', v_shop.phone,
      'is_open', public.shop_is_open_now(v_shop), 'queue_paused', v_shop.queue_paused
    ),
    'service', (select jsonb_build_object('id', s.id, 'name', s.name, 'price', s.price, 'duration_minutes', s.duration_minutes) from public.services s where s.id = v_entry.service_id),
    'barber', (select jsonb_build_object('id', b.id, 'name', b.name, 'image', b.image) from public.barbers b where b.id = v_entry.barber_id),
    'people_ahead', v_ahead,
    'estimated_wait_minutes', case when v_entry.status = 'waiting' then public.estimate_wait_minutes(v_entry.queue_id, v_entry.token_number) else 0 end
  );
end $$;

-- Staff view of today's queue for a shop (includes customer names).
create or replace function public.get_shop_queue_board(p_shop_id uuid, p_date date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_date date := coalesce(p_date, public.app_today());
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  if not public.can_manage_shop(p_shop_id) then raise exception 'FORBIDDEN'; end if;

  return jsonb_build_object(
    'date', v_date,
    'queues', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'barber_id', q.barber_id, 'barber_name', b.name, 'token_prefix', q.token_prefix,
        'status', q.status, 'current_token', q.current_token, 'waiting_count', q.waiting_count,
        'last_token_number', q.last_token_number, 'estimated_wait_minutes', public.estimate_wait_minutes(q.id),
        'updated_at', q.updated_at
      ) order by q.token_prefix)
      from public.queues q left join public.barbers b on b.id = q.barber_id
      where q.shop_id = p_shop_id and q.queue_date = v_date
    ), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'queue_id', e.queue_id, 'token_prefix', q.token_prefix, 'token_number', e.token_number,
        'status', e.status, 'customer_name', coalesce(u.name, 'Customer'), 'customer_phone', u.phone,
        'service_name', s.name, 'service_price', s.price, 'estimated_duration_minutes', e.estimated_duration_minutes,
        'barber_id', e.barber_id, 'joined_at', e.joined_at, 'called_at', e.called_at, 'started_at', e.started_at,
        'completed_at', e.completed_at
      ) order by q.token_prefix, e.token_number)
      from public.queue_entries e
      join public.queues q on q.id = e.queue_id
      join public.users u on u.id = e.user_id
      join public.services s on s.id = e.service_id
      where e.shop_id = p_shop_id and e.queue_date = v_date
    ), '[]'::jsonb),
    'completed_today', (select count(*) from public.queue_entries where shop_id = p_shop_id and queue_date = v_date and status = 'completed')
  );
end $$;

-- Ensure today's queues exist for a shop (called when the dashboard opens).
create or replace function public.ensure_today_queues(p_shop_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  if not public.can_manage_shop(p_shop_id) then raise exception 'FORBIDDEN'; end if;
  perform public.lock_or_create_queue(p_shop_id, null);
  for r in select id from public.barbers where shop_id = p_shop_id and status = 'active' loop
    perform public.lock_or_create_queue(p_shop_id, r.id);
  end loop;
end $$;

-- =============================================================================
-- Discovery: approved shops with live stats and distance (public)
-- =============================================================================
create or replace function public.list_public_shops(
  p_lat double precision default null,
  p_lng double precision default null,
  p_query text default null,
  p_limit integer default 100
)
returns table (
  id uuid, name text, description text, address text, city text,
  latitude double precision, longitude double precision, image text, images text[],
  rating numeric, review_count integer, opening_time time, closing_time time,
  is_open boolean, queue_paused boolean, distance_km double precision,
  waiting_count integer, estimated_wait_minutes integer, min_price numeric,
  barber_count integer, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  with today_q as (
    select q.shop_id, sum(q.waiting_count)::int as waiting_count,
           max(public.estimate_wait_minutes(q.id))::int as estimated_wait_minutes
    from public.queues q where q.queue_date = public.app_today()
    group by q.shop_id
  )
  select s.id, s.name, s.description, s.address, s.city, s.latitude, s.longitude, s.image, s.images,
         s.rating, s.review_count, s.opening_time, s.closing_time,
         public.shop_is_open_now(s) as is_open, s.queue_paused,
         public.distance_km(p_lat, p_lng, s.latitude, s.longitude) as distance_km,
         coalesce(t.waiting_count, 0) as waiting_count,
         coalesce(t.estimated_wait_minutes, 0) as estimated_wait_minutes,
         (select min(price) from public.services sv where sv.shop_id = s.id and sv.status = 'active') as min_price,
         (select count(*)::int from public.barbers b where b.shop_id = s.id and b.status = 'active') as barber_count,
         s.created_at
  from public.shops s
  left join today_q t on t.shop_id = s.id
  where s.status = 'approved'
    and (
      p_query is null or p_query = ''
      or s.name ilike '%' || p_query || '%'
      or s.address ilike '%' || p_query || '%'
      or coalesce(s.city, '') ilike '%' || p_query || '%'
      or exists (select 1 from public.barbers b where b.shop_id = s.id and b.status = 'active' and b.name ilike '%' || p_query || '%')
    )
  order by s.rating desc, s.review_count desc
  limit greatest(1, least(p_limit, 200))
$$;

-- =============================================================================
-- Reviews
-- =============================================================================
create or replace function public.can_review_entry(p_entry_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.queue_entries e
    where e.id = p_entry_id and e.user_id = auth.uid() and e.status = 'completed'
      and not exists (select 1 from public.reviews r where r.queue_entry_id = e.id)
  )
$$;

-- Completed visits the caller has not reviewed yet.
create or replace function public.get_my_reviewable_visits()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'queue_entry_id', e.id, 'shop_id', e.shop_id, 'shop_name', s.name, 'barber_id', e.barber_id,
    'barber_name', b.name, 'service_name', sv.name, 'completed_at', e.completed_at
  ) order by e.completed_at desc), '[]'::jsonb)
  from public.queue_entries e
  join public.shops s on s.id = e.shop_id
  join public.services sv on sv.id = e.service_id
  left join public.barbers b on b.id = e.barber_id
  where e.user_id = auth.uid() and e.status = 'completed'
    and not exists (select 1 from public.reviews r where r.queue_entry_id = e.id)
    and e.completed_at > now() - interval '14 days'
$$;

-- =============================================================================
-- Admin
-- =============================================================================
create or replace function public.admin_set_shop_status(p_shop_id uuid, p_status public.shop_status, p_reason text default null)
returns public.shops language plpgsql security definer set search_path = public as $$
declare v_shop public.shops;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.shops
     set status = p_status,
         approved_at = case when p_status = 'approved' then coalesce(approved_at, now()) else approved_at end,
         rejection_reason = case when p_status in ('rejected', 'suspended') then p_reason else null end,
         is_open = case when p_status = 'approved' then is_open else false end
   where id = p_shop_id
  returning * into v_shop;
  if not found then raise exception 'NOT_FOUND: shop'; end if;

  perform public.create_notification(
    v_shop.owner_id,
    (case p_status when 'approved' then 'shop_approved' when 'rejected' then 'shop_rejected' when 'suspended' then 'shop_suspended' else 'system' end)::public.notification_type,
    case p_status when 'approved' then 'Your shop is approved' when 'rejected' then 'Shop registration rejected'
                  when 'suspended' then 'Your shop has been suspended' else 'Shop status updated' end,
    case p_status
      when 'approved' then format('%s is now live. Open your shop and start accepting customers.', v_shop.name)
      when 'rejected' then format('%s was not approved.%s', v_shop.name, coalesce(' Reason: ' || p_reason, ''))
      when 'suspended' then format('%s has been suspended.%s', v_shop.name, coalesce(' Reason: ' || p_reason, ''))
      else format('%s status changed to %s.', v_shop.name, p_status) end,
    jsonb_build_object('shop_id', v_shop.id)
  );
  return v_shop;
end $$;

create or replace function public.admin_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then jsonb_build_object(
    'total_users', (select count(*) from public.users),
    'total_customers', (select count(*) from public.users where role = 'customer'),
    'total_shops', (select count(*) from public.shops),
    'pending_shops', (select count(*) from public.shops where status = 'pending'),
    'approved_shops', (select count(*) from public.shops where status = 'approved'),
    'active_queues', (select count(*) from public.queues where queue_date = public.app_today() and waiting_count > 0),
    'completed_services', (select count(*) from public.queue_entries where status = 'completed'),
    'completed_today', (select count(*) from public.queue_entries where status = 'completed' and queue_date = public.app_today()),
    'total_barbers', (select count(*) from public.barbers where status = 'active'),
    'total_reviews', (select count(*) from public.reviews),
    'waiting_now', (select coalesce(sum(waiting_count), 0) from public.queues where queue_date = public.app_today())
  ) else null end
$$;

-- Daily activity for the last N days (admin reports).
create or replace function public.admin_daily_report(p_days integer default 14)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then coalesce((
    select jsonb_agg(jsonb_build_object(
      'date', d::date,
      'joined', (select count(*) from public.queue_entries e where e.queue_date = d::date),
      'completed', (select count(*) from public.queue_entries e where e.queue_date = d::date and e.status = 'completed'),
      'cancelled', (select count(*) from public.queue_entries e where e.queue_date = d::date and e.status = 'cancelled'),
      'no_show', (select count(*) from public.queue_entries e where e.queue_date = d::date and e.status = 'no_show'),
      'new_users', (select count(*) from public.users u where (u.created_at at time zone public.app_timezone())::date = d::date)
    ) order by d)
    from generate_series(public.app_today() - (greatest(1, least(p_days, 90)) - 1), public.app_today(), interval '1 day') d
  ), '[]'::jsonb) else null end
$$;

-- =============================================================================
-- Privileges: expose RPCs to signed-in users (and public read models to anon)
-- =============================================================================
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.app_today(), public.app_now(), public.app_local_time(), public.app_timezone() to anon, authenticated;
grant execute on function public.distance_km(double precision, double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.shop_is_open_now(public.shops) to anon, authenticated;
grant execute on function public.estimate_wait_minutes(uuid, integer) to anon, authenticated;
grant execute on function public.get_queue_snapshot(uuid) to anon, authenticated;
grant execute on function public.get_shop_live_status(uuid) to anon, authenticated;
grant execute on function public.list_public_shops(double precision, double precision, text, integer) to anon, authenticated;

-- Helpers are referenced by RLS policies, so anon must be able to call them (they return false without a session).
grant execute on function public.current_user_role(), public.is_admin(), public.owns_shop(uuid), public.can_manage_shop(uuid) to anon, authenticated;
grant execute on function public.join_queue(uuid, uuid, uuid) to authenticated;
grant execute on function public.call_next(uuid) to authenticated;
grant execute on function public.start_service(uuid) to authenticated;
grant execute on function public.complete_service(uuid) to authenticated;
grant execute on function public.cancel_queue_entry(uuid) to authenticated;
grant execute on function public.mark_no_show(uuid) to authenticated;
grant execute on function public.set_shop_queue_paused(uuid, boolean) to authenticated;
grant execute on function public.set_shop_open(uuid, boolean) to authenticated;
grant execute on function public.get_my_active_queue_entry() to authenticated;
grant execute on function public.get_shop_queue_board(uuid, date) to authenticated;
grant execute on function public.ensure_today_queues(uuid) to authenticated;
grant execute on function public.can_review_entry(uuid) to authenticated;
grant execute on function public.get_my_reviewable_visits() to authenticated;
grant execute on function public.admin_set_shop_status(uuid, public.shop_status, text) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.admin_daily_report(integer) to authenticated;
