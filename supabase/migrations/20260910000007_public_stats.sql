-- =============================================================================
-- Public platform statistics
-- =============================================================================
-- The marketing site shows real numbers rather than invented ones. These are
-- deliberately coarse aggregates over already-public data (approved shops and
-- their activity), so nothing here reveals a person, a shop's takings or any
-- individual queue entry. `admin_stats` stays admin-only.
-- =============================================================================

create or replace function public.get_public_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'approved_shops', (select count(*) from public.shops where status = 'approved'),
    'open_now', (select count(*) from public.shops s where s.status = 'approved' and public.shop_is_open_now(s)),
    'active_barbers', (
      select count(*)
      from public.barbers b
      join public.shops s on s.id = b.shop_id
      where b.status = 'active' and s.status = 'approved'
    ),
    'completed_services', (
      select count(*)
      from public.queue_entries e
      join public.shops s on s.id = e.shop_id
      where e.status = 'completed' and s.status = 'approved'
    ),
    'average_rating', coalesce(
      (select round(avg(rating)::numeric, 1) from public.shops where status = 'approved' and review_count > 0),
      0
    ),
    'total_reviews', (
      select count(*)
      from public.reviews r
      join public.shops s on s.id = r.shop_id
      where not r.is_hidden and s.status = 'approved'
    ),
    'cities', (select count(distinct lower(city)) from public.shops where status = 'approved' and city is not null),
    -- Median wait across shops that are open and have someone waiting; a fair
    -- headline number, and null when nothing is running.
    'median_wait_minutes', (
      select percentile_disc(0.5) within group (order by q.wait)
      from (
        select public.estimate_wait_minutes(qq.id) as wait
        from public.queues qq
        join public.shops s on s.id = qq.shop_id
        where qq.queue_date = public.app_today() and qq.waiting_count > 0 and s.status = 'approved'
      ) q
    )
  )
$$;

grant execute on function public.get_public_stats() to anon, authenticated;
