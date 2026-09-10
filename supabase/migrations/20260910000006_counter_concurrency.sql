-- =============================================================================
-- Fix derived counters under concurrency
-- =============================================================================
-- The original triggers recomputed counters with a subquery
-- (`set waiting_count = (select count(*) ...)`). Under READ COMMITTED, two
-- concurrent transactions each evaluate that subquery against their own
-- snapshot, so simultaneous joins/cancels could leave `queues.waiting_count`
-- disagreeing with the actual rows.
--
-- `waiting_count` now moves by a delta (`col = col + n`), which Postgres
-- re-evaluates against the freshly locked row, making concurrent updates
-- additive rather than last-write-wins.
-- =============================================================================

create or replace function public.queue_entries_after_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_queue_id uuid := coalesce(new.queue_id, old.queue_id);
  v_delta integer := 0;
begin
  if tg_op = 'INSERT' then
    v_delta := case when new.status = 'waiting' then 1 else 0 end;
  elsif tg_op = 'DELETE' then
    v_delta := case when old.status = 'waiting' then -1 else 0 end;
  else
    v_delta := (case when new.status = 'waiting' then 1 else 0 end)
             - (case when old.status = 'waiting' then 1 else 0 end);
  end if;

  -- Always bump updated_at: customers subscribe to the (public, PII-free)
  -- queue row to learn that *something* in the queue changed.
  update public.queues q
     set waiting_count = greatest(0, q.waiting_count + v_delta),
         updated_at = now()
   where q.id = v_queue_id;

  return null;
end $$;

-- Reconcile any drift left by the previous implementation.
update public.queues q
   set waiting_count = (select count(*) from public.queue_entries e where e.queue_id = q.id and e.status = 'waiting');

-- Rating aggregates are recomputed (an average cannot be maintained by delta
-- without tracking the sum), so serialize them: lock the shop row first, then
-- recompute in a second statement whose snapshot is taken after the lock.
create or replace function public.reviews_after_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_shop_id uuid := coalesce(new.shop_id, old.shop_id);
begin
  perform 1 from public.shops where id = v_shop_id for update;

  perform set_config('app.internal_write', 'on', true);
  update public.shops s
     set rating = coalesce((select round(avg(r.rating)::numeric, 2) from public.reviews r where r.shop_id = s.id and not r.is_hidden), 0),
         review_count = (select count(*) from public.reviews r where r.shop_id = s.id and not r.is_hidden)
   where s.id = v_shop_id;
  perform set_config('app.internal_write', 'off', true);
  return null;
end $$;
