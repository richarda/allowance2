-- Monthly interest on average daily balance.
-- See docs/interest.md for a full explanation.
--
-- Apply by pasting into the Supabase dashboard SQL editor (or `supabase db push`).
-- Safe to re-run: every statement is idempotent.

---------------------------------------------------------------------------
-- 1. Configuration
---------------------------------------------------------------------------

-- APY (annual percentage yield) history, e.g. 0.10 = 10% APY. To change it, INSERT a new row; never edit old ones,
-- so recalculating a past month always uses the rate that applied at the time.
create table if not exists public.interest_settings (
	id bigint generated always as identity primary key,
	apy numeric(6, 4) not null check (apy >= 0),
	effective_from date not null,
	created_at timestamptz not null default now()
);

insert into public.interest_settings (apy, effective_from)
select 0.10, date '2026-01-01'
where not exists (select 1 from public.interest_settings);

-- Single-row config: the time zone used to decide which calendar day a
-- transaction belongs to, and when "the last day of the month" ends.
create table if not exists public.interest_config (
	id boolean primary key default true check (id), -- enforces exactly one row
	timezone text not null default 'America/New_York'
);

insert into public.interest_config (id, timezone)
values (true, 'America/New_York')
on conflict (id) do nothing;

grant select on public.interest_settings, public.interest_config to authenticated;
revoke insert, update, delete on public.interest_settings, public.interest_config from anon, authenticated;

alter table public.interest_settings enable row level security;
alter table public.interest_config enable row level security;

drop policy if exists "Authenticated can read interest settings" on public.interest_settings;
create policy "Authenticated can read interest settings"
	on public.interest_settings for select to authenticated using (true);

drop policy if exists "Authenticated can read interest config" on public.interest_config;
create policy "Authenticated can read interest config"
	on public.interest_config for select to authenticated using (true);

---------------------------------------------------------------------------
-- 2. Transactions: mark interest rows and make posting idempotent
---------------------------------------------------------------------------

alter table public.transactions
	add column if not exists kind text not null default 'manual',
	add column if not exists interest_period date;

do $$
begin
	if not exists (
		select 1 from pg_constraint where conname = 'transactions_kind_check'
	) then
		alter table public.transactions
			add constraint transactions_kind_check check (kind in ('manual', 'interest'));
	end if;
end $$;

-- One interest posting per child per month. Re-running a month is a no-op.
create unique index if not exists transactions_child_interest_period_key
	on public.transactions (child_id, interest_period)
	where interest_period is not null;

---------------------------------------------------------------------------
-- 3. Calculation
---------------------------------------------------------------------------

-- Read-only: what interest each child would earn for the month containing p_month.
create or replace function public.preview_monthly_interest(p_month date)
returns table (
	child_id bigint,
	days_in_month integer,
	avg_daily_balance numeric,
	apy numeric,
	interest numeric
)
language sql
stable
security definer
set search_path = public
as $$
	with cfg as (
		select ic.timezone as tz from interest_config ic limit 1
	),
	bounds as (
		select
			date_trunc('month', p_month)::date as m_start,
			(date_trunc('month', p_month) + interval '1 month - 1 day')::date as m_end
	),
	rate as (
		select s.apy
		from interest_settings s, bounds b
		where s.effective_from <= b.m_end
		order by s.effective_from desc, s.id desc
		limit 1
	),
	month_days as (
		select gs::date as d
		from bounds b, generate_series(b.m_start, b.m_end, interval '1 day') gs
	),
	-- End-of-day balance for every child on every day of the month. Includes all
	-- history before the month (the opening balance) and prior months' interest,
	-- but never this month's own interest posting.
	daily as (
		select
			c.id::bigint as cid,
			md.d,
			coalesce((
				select sum(t.amount)::numeric
				from transactions t, cfg
				where t.child_id = c.id
					and (t.created_at at time zone cfg.tz)::date <= md.d
					and t.interest_period is distinct from (select m_start from bounds)
			), 0) as bal
		from children c
		cross join month_days md
	),
	per_child as (
		select cid, count(*)::integer as n_days, avg(bal) as adb
		from daily
		group by cid
	)
	select
		pc.cid,
		pc.n_days,
		round(pc.adb, 2),
		r.apy,
		case
			when pc.adb <= 0 then 0::numeric
			else round(pc.adb * (power(1 + r.apy, pc.n_days / 365.0) - 1), 2)
		end
	from per_child pc
	cross join rate r
	order by pc.cid;
$$;

-- Posts interest for one completed month. Returns number of rows inserted.
create or replace function public.post_monthly_interest(p_month date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	v_tz text;
	v_start date := date_trunc('month', p_month)::date;
	v_end date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
	v_count integer;
begin
	select timezone into v_tz from interest_config limit 1;

	if v_start >= date_trunc('month', now() at time zone v_tz)::date then
		raise exception 'Month % has not finished yet in %', to_char(v_start, 'Mon YYYY'), v_tz;
	end if;

	insert into transactions (child_id, amount, created_at, note, kind, interest_period)
	select
		p.child_id,
		p.interest,
		(v_end + time '23:59:59') at time zone v_tz,
		format(
			'Interest: %s%% APY on avg daily balance $%s (%s)',
			trim_scale(p.apy * 100),
			to_char(p.avg_daily_balance, 'FM999999990.00'),
			to_char(v_start, 'Mon YYYY')
		),
		'interest',
		v_start
	from preview_monthly_interest(v_start) p
	where p.interest > 0
	on conflict (child_id, interest_period) where interest_period is not null do nothing;

	get diagnostics v_count = row_count;
	return v_count;
end;
$$;

-- Posts interest for the month before the current one (used by the cron job).
create or replace function public.post_previous_month_interest()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	v_tz text;
begin
	select timezone into v_tz from interest_config limit 1;
	return post_monthly_interest(
		(date_trunc('month', now() at time zone v_tz) - interval '1 month')::date
	);
end;
$$;

-- Posts every month from p_from through p_to, oldest first, so each month's
-- interest is part of the next month's balance (compounding).
create or replace function public.backfill_interest(p_from date, p_to date)
returns table (period_month date, rows_posted integer)
language plpgsql
security definer
set search_path = public
as $$
declare
	m date := date_trunc('month', p_from)::date;
begin
	while m <= date_trunc('month', p_to)::date loop
		period_month := m;
		rows_posted := post_monthly_interest(m);
		return next;
		m := (m + interval '1 month')::date;
	end loop;
end;
$$;

-- These run with owner privileges; keep them away from the public API.
revoke execute on function public.preview_monthly_interest(date) from public, anon, authenticated;
revoke execute on function public.post_monthly_interest(date) from public, anon, authenticated;
revoke execute on function public.post_previous_month_interest() from public, anon, authenticated;
revoke execute on function public.backfill_interest(date, date) from public, anon, authenticated;

---------------------------------------------------------------------------
-- 4. Schedule: 09:00 UTC on the 1st of each month (~4-5 AM Eastern)
---------------------------------------------------------------------------

create extension if not exists pg_cron with schema pg_catalog;

-- cron.schedule with an existing job name updates that job.
select cron.schedule(
	'monthly-interest',
	'0 9 1 * *',
	$$ select public.post_previous_month_interest() $$
);
