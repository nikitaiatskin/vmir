-- RLS isolation tests (run with `supabase test db`).
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- Two users
insert into auth.users (id, email, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'a@test.dev', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'b@test.dev', 'authenticated', 'authenticated');

-- Act as user A
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

insert into public.items (id, category, photo_path)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'top', '11111111-1111-1111-1111-111111111111/a.jpg');
insert into public.wishes (id, category, cooloff_days, decide_at)
values ('aaaaaaaa-0000-0000-0000-000000000002', 'shoes', 7, now());
insert into public.wears (item_id, worn_on) values ('aaaaaaaa-0000-0000-0000-000000000001', current_date);

select is((select count(*) from public.items)::int, 1, 'A sees own item');
select is(
  (select (decide_at - created_at) from public.wishes where id = 'aaaaaaaa-0000-0000-0000-000000000002'),
  interval '7 days', 'decide_at is created_at + cooloff_days');
select throws_ok(
  $$ insert into public.items (category, photo_path, user_id)
     values ('top', 'x.jpg', '22222222-2222-2222-2222-222222222222') $$,
  '42501', null, 'A cannot insert a row for B');
select throws_ok(
  $$ insert into public.wears (item_id, worn_on) values ('aaaaaaaa-0000-0000-0000-000000000001', current_date) $$,
  '23505', null, 'only one wear per item per day');

-- Act as user B
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select is((select count(*) from public.items)::int, 0, 'B cannot see A items');
select is((select count(*) from public.wishes)::int, 0, 'B cannot see A wishes');
select is((select count(*) from public.wears)::int, 0, 'B cannot see A wears');

update public.items set name = 'hacked' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
delete from public.items where id = 'aaaaaaaa-0000-0000-0000-000000000001';

insert into public.outfits (id, name) values ('bbbbbbbb-0000-0000-0000-000000000001', 'B outfit');
select throws_ok(
  $$ insert into public.outfit_items (outfit_id, item_id, x, y)
     values ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 0.5, 0.5) $$,
  'P0001', 'outfit item must reference your own outfit and item',
  'B cannot put A item into an outfit');
select throws_ok(
  $$ insert into public.wears (item_id) values ('aaaaaaaa-0000-0000-0000-000000000001') $$,
  'P0001', 'wear must reference your own item', 'B cannot log a wear on A item');

-- Back to user A: the row is untouched
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
select is(
  (select name from public.items where id = 'aaaaaaaa-0000-0000-0000-000000000001'), null,
  'B could not update A item');
select is((select count(*) from public.items)::int, 1, 'B could not delete A item');

select public.delete_my_data();
select is((select count(*) from public.items)::int, 0, 'delete_my_data removes own rows');

select * from finish();
rollback;
