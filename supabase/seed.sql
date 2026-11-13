-- Local dev seed. Runs on `supabase start` (first time) and `supabase db reset`.
-- Log in at http://localhost:5173 with parent@example.com via magic link;
-- read the email at http://127.0.0.1:54324 (Mailpit).

insert into auth.users (
	instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
	raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
	confirmation_token, recovery_token, email_change_token_new, email_change
) values
	('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
	 'authenticated', 'authenticated', 'parent@example.com', crypt('password123', gen_salt('bf')), now(),
	 '{"provider":"email","providers":["email"]}', '{"full_name":"Pat Parent"}', now(), now(), '', '', '', ''),
	('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
	 'authenticated', 'authenticated', 'kid@example.com', crypt('password123', gen_salt('bf')), now(),
	 '{"provider":"email","providers":["email"]}', '{"full_name":"Casey Kid"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), id, id::text,
	jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
	'email', now(), now(), now()
from auth.users
where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

insert into public.families (id, family_name) overriding system value values (1, 'Test Family');
select setval(pg_get_serial_sequence('public.families', 'id'), 1);

insert into public.parents (user_id, family_id) values ('11111111-1111-1111-1111-111111111111', 1);

insert into public.children (name, family_id, user_id) values
	('Casey', 1, '22222222-2222-2222-2222-222222222222'),
	('Sam', 1, null);

insert into public.transactions (created_at, amount, child_id, note)
select ts, amt, c.id, note
from public.children c
cross join (values
	(now() - interval '60 days', 20.00, 'Birthday money'),
	(now() - interval '30 days', 5.00, 'Weekly allowance'),
	(now() - interval '10 days', -3.50, 'Candy')
) as t(ts, amt, note);
