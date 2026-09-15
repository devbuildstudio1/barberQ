-- =============================================================================
-- Row Level Security
-- =============================================================================
-- Principles
--  * Deny by default: every table has RLS enabled and only listed policies open access.
--  * Clients never write queue_entries/notifications/queues directly — only via
--    SECURITY DEFINER functions (0002). Admins get full access via is_admin().
-- =============================================================================

alter table public.users enable row level security;
alter table public.shops enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.queues enable row level security;
alter table public.queue_entries enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;

-- ---------- users ----------------------------------------------------------
create policy users_select_own on public.users
  for select to authenticated using (id = auth.uid() or public.is_admin());

create policy users_update_own on public.users
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- (role/is_active changes are blocked for non-admins by users_protect_columns trigger)

create policy users_delete_admin on public.users
  for delete to authenticated using (public.is_admin());

-- ---------- shops ----------------------------------------------------------
create policy shops_select_public on public.shops
  for select to anon, authenticated
  using (status = 'approved' or owner_id = auth.uid() or public.is_admin());

create policy shops_insert_owner on public.shops
  for insert to authenticated
  with check (owner_id = auth.uid() and public.current_user_role() in ('shop_owner', 'admin'));

create policy shops_update_owner on public.shops
  for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());
-- (status/owner changes blocked for non-admins by shops_protect_columns trigger)

create policy shops_delete on public.shops
  for delete to authenticated
  using (public.is_admin() or (owner_id = auth.uid() and status = 'pending'));

-- ---------- barbers --------------------------------------------------------
create policy barbers_select on public.barbers
  for select to anon, authenticated
  using (
    exists (select 1 from public.shops s where s.id = barbers.shop_id and (s.status = 'approved' or s.owner_id = auth.uid()))
    or public.is_admin()
  );

create policy barbers_write on public.barbers
  for all to authenticated
  using (public.can_manage_shop(shop_id))
  with check (public.can_manage_shop(shop_id));

-- ---------- services -------------------------------------------------------
create policy services_select on public.services
  for select to anon, authenticated
  using (
    exists (select 1 from public.shops s where s.id = services.shop_id and (s.status = 'approved' or s.owner_id = auth.uid()))
    or public.is_admin()
  );

create policy services_write on public.services
  for all to authenticated
  using (public.can_manage_shop(shop_id))
  with check (public.can_manage_shop(shop_id));

-- ---------- queues ---------------------------------------------------------
-- Queue rows carry no personal data; public read enables realtime for customers.
create policy queues_select on public.queues
  for select to anon, authenticated
  using (
    exists (select 1 from public.shops s where s.id = queues.shop_id and (s.status = 'approved' or s.owner_id = auth.uid()))
    or public.is_admin()
  );

create policy queues_admin_write on public.queues
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- queue_entries --------------------------------------------------
create policy queue_entries_select on public.queue_entries
  for select to authenticated
  using (user_id = auth.uid() or public.can_manage_shop(shop_id));

-- No insert/update/delete policies for regular users: all transitions go
-- through join_queue / call_next / start_service / complete_service /
-- cancel_queue_entry / mark_no_show (SECURITY DEFINER).
create policy queue_entries_admin_write on public.queue_entries
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- reviews --------------------------------------------------------
create policy reviews_select on public.reviews
  for select to anon, authenticated
  using (
    (not is_hidden and exists (select 1 from public.shops s where s.id = reviews.shop_id and s.status = 'approved'))
    or user_id = auth.uid()
    or public.can_manage_shop(shop_id)
  );

-- Business rule 10: only after a completed visit, one review per visit.
create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and queue_entry_id is not null
    and public.can_review_entry(queue_entry_id)
    and exists (select 1 from public.queue_entries e where e.id = queue_entry_id and e.shop_id = reviews.shop_id
                  and e.barber_id is not distinct from reviews.barber_id)
  );

create policy reviews_update_own on public.reviews
  for update to authenticated
  using (user_id = auth.uid() and not is_hidden) with check (user_id = auth.uid() and not is_hidden);

create policy reviews_admin_all on public.reviews
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- notifications --------------------------------------------------
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_delete_own on public.notifications
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------- Table privileges --------------------------------------------
-- RLS gates rows; grants gate operations. Keep both tight.
revoke all on all tables in schema public from anon, authenticated;

grant select on public.shops, public.barbers, public.services, public.queues, public.reviews to anon;
grant select, insert, update, delete on public.shops, public.barbers, public.services to authenticated;
grant select, update, delete on public.users to authenticated;
grant select on public.queues, public.queue_entries to authenticated;
grant select, insert, update on public.reviews to authenticated;
grant select, update, delete on public.notifications to authenticated;
-- Admin-only writes on queues/queue_entries/reviews are enforced by RLS above.
grant insert, update, delete on public.queues, public.queue_entries to authenticated;
grant delete on public.reviews to authenticated;
