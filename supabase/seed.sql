-- =============================================================================
-- Development seed. NEVER run against production.
-- Creates demo auth users (password: Password123!), shops, barbers, services,
-- queues, queue entries and reviews with realistic Indian pricing.
--
-- Test logins (local):
--   admin:   admin@queuecut.dev / Password123!
--   owners:  owner1@queuecut.dev ... owner5@queuecut.dev / Password123!
--   customers (phone OTP, code 123456): +919000000001 ... +919000000005
-- =============================================================================

-- ---- helper: create an auth user with password ------------------------------
create or replace function pg_temp.seed_user(p_id uuid, p_email text, p_phone text, p_name text, p_role text)
returns void language plpgsql as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, phone, encrypted_password,
    email_confirmed_at, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
    p_email, p_phone, extensions.crypt('Password123!', extensions.gen_salt('bf')),
    case when p_email is not null then now() end, case when p_phone is not null then now() end,
    jsonb_build_object('provider', case when p_email is not null then 'email' else 'phone' end,
                       'providers', array[case when p_email is not null then 'email' else 'phone' end]),
    jsonb_build_object('name', p_name, 'role', p_role),
    now(), now(), '', '', '', ''
  );
  if p_email is not null then
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), p_id, p_email, 'email',
            jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true), now(), now(), now());
  end if;
  if p_phone is not null then
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), p_id, p_phone, 'phone',
            jsonb_build_object('sub', p_id::text, 'phone', p_phone, 'phone_verified', true), now(), now(), now());
  end if;
end $$;

-- ---- users -----------------------------------------------------------------
select pg_temp.seed_user('a0000000-0000-4000-8000-000000000001', 'admin@queuecut.dev', null, 'Platform Admin', 'admin');
update public.users set role = 'admin' where id = 'a0000000-0000-4000-8000-000000000001';

select pg_temp.seed_user('b0000000-0000-4000-8000-000000000001', 'owner1@queuecut.dev', null, 'Ravi Kumar', 'shop_owner');
select pg_temp.seed_user('b0000000-0000-4000-8000-000000000002', 'owner2@queuecut.dev', null, 'Imran Sheikh', 'shop_owner');
select pg_temp.seed_user('b0000000-0000-4000-8000-000000000003', 'owner3@queuecut.dev', null, 'Suresh Nair', 'shop_owner');
select pg_temp.seed_user('b0000000-0000-4000-8000-000000000004', 'owner4@queuecut.dev', null, 'Deepak Menon', 'shop_owner');
select pg_temp.seed_user('b0000000-0000-4000-8000-000000000005', 'owner5@queuecut.dev', null, 'Arjun Reddy', 'shop_owner');
select pg_temp.seed_user('b0000000-0000-4000-8000-000000000006', 'owner6@queuecut.dev', null, 'Vikram Singh', 'shop_owner');

select pg_temp.seed_user('c0000000-0000-4000-8000-000000000001', null, '919000000001', 'Rahul Sharma', 'customer');
select pg_temp.seed_user('c0000000-0000-4000-8000-000000000002', null, '919000000002', 'Arun Prakash', 'customer');
select pg_temp.seed_user('c0000000-0000-4000-8000-000000000003', null, '919000000003', 'Karthik Raja', 'customer');
select pg_temp.seed_user('c0000000-0000-4000-8000-000000000004', null, '919000000004', 'Priya Nair', 'customer');
select pg_temp.seed_user('c0000000-0000-4000-8000-000000000005', null, '919000000005', 'John Mathew', 'customer');

-- ---- shops (Chennai, IN) -----------------------------------------------------
insert into public.shops (id, owner_id, name, description, address, city, latitude, longitude, phone, email, image, images, status, is_open, opening_time, closing_time, approved_at, created_at) values
('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Classic Cuts',
 'Neighbourhood barbershop since 2009. Classic cuts, hot-towel shaves and a chai while you wait.',
 '12, Anna Salai, Thousand Lights', 'Chennai', 13.0604, 80.2496, '+919876543210', 'hello@classiccuts.in',
 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&q=80',
 array['https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1200&q=80','https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80','https://images.unsplash.com/photo-1521490683712-35a1cb235d1c?w=1200&q=80'],
 'approved', true, '09:00', '21:00', now() - interval '120 days', now() - interval '130 days'),
('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Urban Blade',
 'Modern grooming studio. Skin fades, beard sculpting and premium products.',
 '45, Khader Nawaz Khan Road, Nungambakkam', 'Chennai', 13.0569, 80.2425, '+919876543211', 'book@urbanblade.in',
 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1200&q=80',
 array['https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1200&q=80','https://images.unsplash.com/photo-1512690459411-b9245aed614b?w=1200&q=80'],
 'approved', true, '10:00', '22:00', now() - interval '90 days', now() - interval '100 days'),
('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'Kings Barber Studio',
 'Award-winning barbers, walk-in friendly. Kids welcome on weekends.',
 '8, Besant Avenue, Adyar', 'Chennai', 13.0067, 80.2571, '+919876543212', 'kings@barberstudio.in',
 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1200&q=80',
 array['https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1200&q=80','https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=1200&q=80'],
 'approved', true, '09:30', '20:30', now() - interval '60 days', now() - interval '70 days'),
('d0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 'Style Street',
 'Budget-friendly cuts done right. Quick service, no fuss.',
 '110, Arcot Road, Vadapalani', 'Chennai', 13.0521, 80.2119, '+919876543213', null,
 'https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?w=1200&q=80',
 array['https://images.unsplash.com/photo-1593702275687-f8b402bf1fb5?w=1200&q=80'],
 'approved', true, '08:00', '21:30', now() - interval '45 days', now() - interval '50 days'),
('d0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', 'Groom House',
 'Full grooming lounge: haircuts, facials, head massage and beard care.',
 '3rd Floor, Phoenix MarketCity, Velachery', 'Chennai', 12.9910, 80.2166, '+919876543214', 'care@groomhouse.in',
 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1200&q=80',
 array['https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1200&q=80','https://images.unsplash.com/photo-1519500528352-2d1460418d41?w=1200&q=80'],
 'approved', false, '11:00', '22:00', now() - interval '30 days', now() - interval '35 days'),
('d0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000006', 'Fade Factory',
 'New studio in T. Nagar specialising in fades and hair tattoos.',
 '22, Usman Road, T. Nagar', 'Chennai', 13.0418, 80.2341, '+919876543215', null,
 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?w=1200&q=80', '{}',
 'pending', false, '10:00', '21:00', null, now() - interval '2 days');

-- ---- barbers ----------------------------------------------------------------
insert into public.barbers (id, shop_id, name, image, experience_years, specialization, status, availability, created_at) values
('e0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000001', 'Ravi Kumar', 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=400&q=80', 15, 'Classic cuts, hot-towel shave', 'active', 'available', now() - interval '130 days'),
('e0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000001', 'Mani', 'https://images.unsplash.com/photo-1583195764036-6dc248ac07d9?w=400&q=80', 6, 'Fades, beard styling', 'active', 'available', now() - interval '129 days'),
('e0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000001', 'Selvam', null, 3, 'Kids cuts', 'active', 'on_break', now() - interval '100 days'),
('e0000000-0000-4000-8000-000000000021', 'd0000000-0000-4000-8000-000000000002', 'Imran Sheikh', 'https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=400&q=80', 10, 'Skin fades, hair design', 'active', 'available', now() - interval '100 days'),
('e0000000-0000-4000-8000-000000000022', 'd0000000-0000-4000-8000-000000000002', 'Zaid', null, 4, 'Beard sculpting', 'active', 'available', now() - interval '99 days'),
('e0000000-0000-4000-8000-000000000031', 'd0000000-0000-4000-8000-000000000003', 'Suresh Nair', 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?w=400&q=80', 12, 'Executive cuts', 'active', 'available', now() - interval '70 days'),
('e0000000-0000-4000-8000-000000000032', 'd0000000-0000-4000-8000-000000000003', 'Prakash', null, 8, 'Colouring, styling', 'active', 'available', now() - interval '69 days'),
('e0000000-0000-4000-8000-000000000033', 'd0000000-0000-4000-8000-000000000003', 'Arvind', null, 2, 'Trainee', 'inactive', 'off_duty', now() - interval '60 days'),
('e0000000-0000-4000-8000-000000000041', 'd0000000-0000-4000-8000-000000000004', 'Deepak Menon', null, 9, 'Quick cuts', 'active', 'available', now() - interval '50 days'),
('e0000000-0000-4000-8000-000000000051', 'd0000000-0000-4000-8000-000000000005', 'Arjun Reddy', 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&q=80', 11, 'Grooming, facials', 'active', 'available', now() - interval '35 days'),
('e0000000-0000-4000-8000-000000000052', 'd0000000-0000-4000-8000-000000000005', 'Naveen', null, 5, 'Beard care', 'active', 'available', now() - interval '34 days');

-- ---- services ---------------------------------------------------------------
insert into public.services (shop_id, name, price, duration_minutes, status, sort_order) values
('d0000000-0000-4000-8000-000000000001', 'Haircut', 150, 30, 'active', 1),
('d0000000-0000-4000-8000-000000000001', 'Haircut + Beard', 250, 45, 'active', 2),
('d0000000-0000-4000-8000-000000000001', 'Beard Trim', 100, 15, 'active', 3),
('d0000000-0000-4000-8000-000000000001', 'Hot Towel Shave', 180, 25, 'active', 4),
('d0000000-0000-4000-8000-000000000001', 'Head Massage', 120, 15, 'inactive', 5),
('d0000000-0000-4000-8000-000000000002', 'Skin Fade', 350, 40, 'active', 1),
('d0000000-0000-4000-8000-000000000002', 'Haircut', 250, 30, 'active', 2),
('d0000000-0000-4000-8000-000000000002', 'Beard Sculpt', 200, 20, 'active', 3),
('d0000000-0000-4000-8000-000000000002', 'Fade + Beard', 500, 60, 'active', 4),
('d0000000-0000-4000-8000-000000000003', 'Executive Haircut', 300, 35, 'active', 1),
('d0000000-0000-4000-8000-000000000003', 'Kids Haircut', 200, 25, 'active', 2),
('d0000000-0000-4000-8000-000000000003', 'Beard Trim', 150, 15, 'active', 3),
('d0000000-0000-4000-8000-000000000003', 'Hair Colour', 800, 60, 'active', 4),
('d0000000-0000-4000-8000-000000000004', 'Haircut', 100, 20, 'active', 1),
('d0000000-0000-4000-8000-000000000004', 'Shave', 60, 10, 'active', 2),
('d0000000-0000-4000-8000-000000000004', 'Haircut + Shave', 140, 30, 'active', 3),
('d0000000-0000-4000-8000-000000000005', 'Signature Haircut', 450, 45, 'active', 1),
('d0000000-0000-4000-8000-000000000005', 'Beard Spa', 350, 30, 'active', 2),
('d0000000-0000-4000-8000-000000000005', 'Facial', 700, 45, 'active', 3),
('d0000000-0000-4000-8000-000000000005', 'Head Massage', 300, 20, 'active', 4),
('d0000000-0000-4000-8000-000000000006', 'Fade', 300, 35, 'active', 1);

-- ---- historical queue entries (past days) -----------------------------------
do $$
declare
  v_shop uuid; v_user uuid; v_service record; v_day date; v_queue uuid; v_token int; v_i int;
  shops uuid[] := array['d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000005'];
  customers uuid[] := array['c0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000003','c0000000-0000-4000-8000-000000000004','c0000000-0000-4000-8000-000000000005'];
begin
  for d in 1..10 loop
    v_day := public.app_today() - d;
    foreach v_shop in array shops loop
      insert into public.queues (shop_id, barber_id, queue_date, token_prefix, status, last_token_number, current_token)
      values (v_shop, null, v_day, 'A', 'closed', 0, null) returning id into v_queue;
      v_token := 0;
      for v_i in 1..(3 + (d * 7 + length(v_shop::text)) % 5) loop
        v_token := v_token + 1;
        v_user := customers[1 + (v_i + d) % 5];
        select * into v_service from public.services s where s.shop_id = v_shop and s.status = 'active' order by random() limit 1;
        insert into public.queue_entries (queue_id, shop_id, user_id, service_id, queue_date, token_number, status, estimated_duration_minutes,
                                          joined_at, called_at, started_at, completed_at, cancelled_at)
        values (v_queue, v_shop, v_user, v_service.id, v_day, v_token,
                (case when v_i % 7 = 0 then 'cancelled' when v_i % 9 = 0 then 'no_show' else 'completed' end)::public.queue_entry_status,
                v_service.duration_minutes,
                v_day + time '10:00' + (v_i * interval '25 minutes'),
                v_day + time '10:05' + (v_i * interval '25 minutes'),
                v_day + time '10:07' + (v_i * interval '25 minutes'),
                case when v_i % 7 <> 0 and v_i % 9 <> 0 then v_day + time '10:07' + (v_i * interval '25 minutes') + (v_service.duration_minutes * interval '1 minute') end,
                case when v_i % 7 = 0 or v_i % 9 = 0 then v_day + time '10:20' + (v_i * interval '25 minutes') end);
      end loop;
      update public.queues set last_token_number = v_token, current_token = v_token where id = v_queue;
    end loop;
  end loop;
end $$;

-- ---- reviews (attached to completed visits) ---------------------------------
insert into public.reviews (user_id, shop_id, barber_id, queue_entry_id, rating, review, created_at)
select e.user_id, e.shop_id, e.barber_id, e.id,
       3 + (abs(hashtext(e.id::text)) % 3),
       (array['Quick and clean cut. The live queue saved me a 40 minute wait.',
              'Great fade, friendly staff. Will come back.',
              'Decent service, slightly rushed on a busy evening.',
              'Loved the hot towel shave. Token system works perfectly.',
              'Good value for money. Barber listened to what I wanted.',
              null])[1 + abs(hashtext(e.id::text)) % 6],
       e.completed_at + interval '2 hours'
from public.queue_entries e
where e.status = 'completed' and abs(hashtext(e.id::text)) % 3 = 0;

-- ---- today's live queue at Classic Cuts -------------------------------------
do $$
declare v_queue uuid; v_hc uuid; v_hb uuid; v_bt uuid; v_shop uuid := 'd0000000-0000-4000-8000-000000000001';
begin
  select id into v_hc from public.services where shop_id = v_shop and name = 'Haircut';
  select id into v_hb from public.services where shop_id = v_shop and name = 'Haircut + Beard';
  select id into v_bt from public.services where shop_id = v_shop and name = 'Beard Trim';

  insert into public.queues (shop_id, barber_id, queue_date, token_prefix, status, last_token_number, current_token)
  values (v_shop, null, public.app_today(), 'A', 'active', 26, 22) returning id into v_queue;

  -- Earlier tokens today (completed)
  insert into public.queue_entries (queue_id, shop_id, user_id, service_id, queue_date, token_number, status, estimated_duration_minutes, joined_at, called_at, started_at, completed_at)
  select v_queue, v_shop, ('c0000000-0000-4000-8000-00000000000' || (1 + (t % 5)))::uuid, v_hc, public.app_today(), t, 'completed', 30,
         now() - ((30 - t) * interval '22 minutes'), now() - ((29 - t) * interval '22 minutes'), now() - ((29 - t) * interval '22 minutes') + interval '1 minute', now() - ((28 - t) * interval '22 minutes')
  from generate_series(1, 21) t;

  -- A-22 currently being served (John), A-23..A-26 waiting
  insert into public.queue_entries (queue_id, shop_id, user_id, service_id, queue_date, token_number, status, estimated_duration_minutes, joined_at, called_at, started_at) values
  (v_queue, v_shop, 'c0000000-0000-4000-8000-000000000005', v_hc, public.app_today(), 22, 'serving', 30, now() - interval '35 minutes', now() - interval '8 minutes', now() - interval '6 minutes');
  insert into public.queue_entries (queue_id, shop_id, user_id, service_id, queue_date, token_number, status, estimated_duration_minutes, joined_at) values
  (v_queue, v_shop, 'c0000000-0000-4000-8000-000000000001', v_hc, public.app_today(), 23, 'waiting', 30, now() - interval '30 minutes'),
  (v_queue, v_shop, 'c0000000-0000-4000-8000-000000000002', v_bt, public.app_today(), 24, 'waiting', 15, now() - interval '24 minutes'),
  (v_queue, v_shop, 'c0000000-0000-4000-8000-000000000003', v_hb, public.app_today(), 25, 'waiting', 45, now() - interval '15 minutes'),
  (v_queue, v_shop, 'c0000000-0000-4000-8000-000000000004', v_hc, public.app_today(), 26, 'waiting', 30, now() - interval '5 minutes');
end $$;

-- Today's queues at other open shops (some waiting customers)
do $$
declare v_queue uuid; v_shop uuid; v_svc uuid;
begin
  v_shop := 'd0000000-0000-4000-8000-000000000002';
  select id into v_svc from public.services where shop_id = v_shop and name = 'Skin Fade';
  insert into public.queues (shop_id, barber_id, queue_date, token_prefix, status, last_token_number, current_token)
  values (v_shop, null, public.app_today(), 'A', 'active', 8, 6) returning id into v_queue;
  insert into public.queue_entries (queue_id, shop_id, user_id, service_id, queue_date, token_number, status, estimated_duration_minutes, joined_at, called_at, started_at, completed_at)
  select v_queue, v_shop, ('c0000000-0000-4000-8000-00000000000' || (1 + (t % 5)))::uuid, v_svc, public.app_today(), t, 'completed', 40,
         now() - ((10 - t) * interval '40 minutes'), now() - ((9 - t) * interval '40 minutes'), now() - ((9 - t) * interval '40 minutes'), now() - ((8 - t) * interval '40 minutes')
  from generate_series(1, 6) t;
  -- Note: customers 4 and 5 are already active at Classic Cuts today; use 1..3 here? They are too. Use no active entries for customers with active entries elsewhere.
  -- (Business rule 4 is per shop, so the same customer may wait at two shops. Keep demo simple: two waiting.)
  insert into public.queue_entries (queue_id, shop_id, user_id, service_id, queue_date, token_number, status, estimated_duration_minutes, joined_at) values
  (v_queue, v_shop, 'c0000000-0000-4000-8000-000000000001', v_svc, public.app_today(), 7, 'waiting', 40, now() - interval '12 minutes'),
  (v_queue, v_shop, 'c0000000-0000-4000-8000-000000000002', v_svc, public.app_today(), 8, 'waiting', 40, now() - interval '4 minutes');

  v_shop := 'd0000000-0000-4000-8000-000000000004';
  insert into public.queues (shop_id, barber_id, queue_date, token_prefix, status, last_token_number, current_token)
  values (v_shop, null, public.app_today(), 'A', 'active', 0, null);

  v_shop := 'd0000000-0000-4000-8000-000000000003';
  select id into v_svc from public.services where shop_id = v_shop and name = 'Executive Haircut';
  insert into public.queues (shop_id, barber_id, queue_date, token_prefix, status, last_token_number, current_token)
  values (v_shop, null, public.app_today(), 'A', 'active', 12, 11) returning id into v_queue;
  insert into public.queue_entries (queue_id, shop_id, user_id, service_id, queue_date, token_number, status, estimated_duration_minutes, joined_at) values
  (v_queue, v_shop, 'c0000000-0000-4000-8000-000000000003', v_svc, public.app_today(), 12, 'waiting', 35, now() - interval '3 minutes');
end $$;

-- ---- notifications for demo customers ---------------------------------------
insert into public.notifications (user_id, type, title, message, data, read, created_at) values
('c0000000-0000-4000-8000-000000000001', 'queue_joined', 'You''re in the queue', 'Token A-23 at Classic Cuts. We''ll notify you as your turn approaches.', '{}', true, now() - interval '30 minutes'),
('c0000000-0000-4000-8000-000000000001', 'ahead_one', 'One person ahead of you', 'Token A-23 at Classic Cuts: just one customer ahead.', '{}', false, now() - interval '8 minutes'),
('c0000000-0000-4000-8000-000000000002', 'queue_joined', 'You''re in the queue', 'Token A-24 at Classic Cuts. We''ll notify you as your turn approaches.', '{}', false, now() - interval '24 minutes');
