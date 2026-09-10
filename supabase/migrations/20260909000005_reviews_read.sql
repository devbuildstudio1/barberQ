-- Public review feed for a shop with reviewer display info, without exposing
-- the users table to other customers.
create or replace function public.get_shop_reviews(p_shop_id uuid, p_limit integer default 20, p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'rating', r.rating, 'review', r.review, 'created_at', r.created_at,
    'barber_name', b.name,
    'reviewer_name', coalesce(u.name, 'Customer'),
    'reviewer_image', u.profile_image
  ) order by r.created_at desc), '[]'::jsonb)
  from (
    select * from public.reviews r
    where r.shop_id = p_shop_id and not r.is_hidden
      and exists (select 1 from public.shops s where s.id = r.shop_id and (s.status = 'approved' or public.can_manage_shop(s.id)))
    order by r.created_at desc
    limit greatest(1, least(p_limit, 100)) offset greatest(0, p_offset)
  ) r
  left join public.users u on u.id = r.user_id
  left join public.barbers b on b.id = r.barber_id
$$;

grant execute on function public.get_shop_reviews(uuid, integer, integer) to anon, authenticated;
