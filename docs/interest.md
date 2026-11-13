# Monthly Interest

Each child's balance earns interest. Once a month, the database (Supabase) works out each child's **average daily balance** for the month that just ended, applies the yearly rate (an APY), and posts an interest deposit dated **11:59:59 PM (Eastern) on the last day of that month**.

Everything runs inside the Supabase Postgres database. The SvelteKit app only displays the results. The SQL is in [`supabase/migrations/20261113000000_monthly_interest.sql`](../supabase/migrations/20261113000000_monthly_interest.sql).

## The rate is an APY

The rate is stored as an **APY (annual percentage yield)**, the same number a bank advertises for a savings account. US banks are required to quote deposit rates as APY (Truth in Savings Act). That makes this number directly comparable to a real account: **10% APY means $100 left alone for a full year grows to $110.**

APY already includes compounding. By contrast, an *APR* of 10% compounded monthly would actually yield about 10.47% a year. Banks quote APR on loans, not on savings.

## The formula

```
interest = round( ADB × ((1 + APY) ^ (days_in_month / 365) − 1) , 2 )
```

- **End-of-day balance**: the sum of every transaction for the child (all history, not only this month) up to the end of that day in Eastern time.
- **ADB (average daily balance)**: the average of the end-of-day balances over every day of the month. It includes the balance carried in from all earlier months.
- **APY**: the rate in effect on the last day of the month (see [Changing the rate](#changing-the-rate)).
- **(1 + APY) ^ (days / 365) − 1**: the month's share of the yearly growth. A 31-day month earns a little more than a 28-day month, and the twelve monthly factors multiply to exactly `1 + APY`.
- The result is rounded to the cent. If it rounds to $0.00, or the ADB is zero or negative, no transaction is posted.

At 10% APY that comes to roughly 0.81% of the ADB in a 31-day month, 0.79% in a 30-day month and 0.73% in February.

### Worked example (January, 31 days, 10% APY)

| Dates      | End-of-day balance | Days |
| ---------- | ------------------ | ---- |
| Jan 1–10   | $100.00            | 10   |
| Jan 11–31  | $160.00 (deposited $60 on Jan 11) | 21 |

- ADB = (100 × 10 + 160 × 21) / 31 = **$140.65**
- Interest = 140.65 × (1.10 ^ (31/365) − 1) = 140.65 × 0.00813 = **$1.14**, posted Jan 31 11:59:59 PM.

The transaction note reads: `Interest: 10% APY on avg daily balance $140.65 (Jan 2026)`.

### Compounding

Each interest deposit is an ordinary transaction, so it counts in the next month's balance. February's ADB in the example starts from $161.14. Interest therefore compounds monthly. A $100 balance left alone for a year ends at $110.01; the extra cent is from rounding each month's interest to the cent, as a real bank does.

### Time zone

Days are counted in **America/New_York**. A deposit at 11:30 PM Eastern on Jan 31 counts for January even though it is already Feb 1 in UTC. The time zone is stored in `interest_config.timezone`.

## Database objects

| Object | Purpose |
| ------ | ------- |
| `interest_settings` | Rate history: `apy` (e.g. `0.1000` = 10% APY) and `effective_from`. |
| `interest_config` | One row holding `timezone`. |
| `transactions.kind` | `'manual'` (default, for everything entered in the app) or `'interest'`. |
| `transactions.interest_period` | For interest rows, the first day of the month the interest covers (e.g. `2026-01-01`). |
| Unique index on `(child_id, interest_period)` | A child can receive at most one interest posting per month. |
| `preview_monthly_interest(month)` | **Read-only.** Shows what each child would earn. Changes nothing. |
| `post_monthly_interest(month)` | Posts one month. Refuses a month that hasn't finished. Returns the number of rows inserted. |
| `post_previous_month_interest()` | Posts last month. The cron job calls this. |
| `backfill_interest(from, to)` | Posts a range of months in order, oldest first. |

These functions can't be called through the app's API (`anon` and `authenticated` have no `execute` permission). Run them from the Supabase SQL editor or let the scheduled job run them.

## Automation

The migration enables `pg_cron` and schedules:

```
monthly-interest    0 9 1 * *    select public.post_previous_month_interest()
```

This runs at 09:00 UTC on the 1st of each month (4–5 AM Eastern, after the Eastern month has ended) and posts the previous month. Useful queries:

```sql
select * from cron.job;                                             -- the schedule
select * from cron.job_run_details order by start_time desc limit 10; -- recent runs
```

Running a month twice is harmless: the second run inserts 0 rows. If a run fails, you can call `select post_previous_month_interest();` by hand at any point during that month.

## Common tasks

### Preview a month

```sql
select * from preview_monthly_interest('2026-10-01');
```

### Backfill (one-time setup)

```sql
select * from backfill_interest('2026-01-01', '2026-10-01');  -- Jan–Oct 2026
```

After that, cron posts November 2026 on Dec 1 and continues each month from there.

### Changing the rate

Add a new row; don't edit old ones. That way recalculating a past month still uses the rate that applied then.

```sql
insert into interest_settings (apy, effective_from) values (0.05, '2027-01-01');
```

A month uses the newest row whose `effective_from` is on or before the month's last day.

### Undo or recalculate a month

A month's interest feeds into every later month, so redo that month **and every month after it**:

```sql
delete from transactions where kind = 'interest' and interest_period >= '2026-03-01';
select * from backfill_interest('2026-03-01', '2026-10-01');
```

Recalculate if a transaction is added or edited with a date in an earlier month that already has interest posted. The posted interest is **not** updated automatically.

## Local development and deploying

`supabase/migrations/20240328000000_remote_schema.sql` is a baseline: a `supabase db dump` of the hosted schema taken before interest existed. With it, `supabase start` / `supabase db reset` builds a complete local database. To test with real data, load a data-only dump (keep it out of git):

```sh
supabase db dump --linked --data-only -s public -f /path/outside/repo/data.sql
docker exec -i supabase_db_allowance24 psql -U postgres -d postgres < /path/outside/repo/data.sql
```

**Deploying with the CLI** (CLI 3.x targets the local database unless you pass `--remote`): the hosted database already contains the baseline schema, so mark that migration as applied **once** before the first push. Otherwise `db push` would try to create the tables again:

```sh
supabase migration repair --status applied 20240328000000 --remote
supabase db push --remote --dry-run   # should list only 20261113000000_monthly_interest.sql
supabase db push --remote
```

Then run the backfill in the dashboard SQL editor.

## In the app

Interest rows appear on each child's transaction page with an **Interest** badge. They are included in the balance shown on `/allowance` because `children_with_balance` sums all transactions.
