import type { SupabaseClient } from '@supabase/supabase-js';

// Same time zone the interest job uses (interest_config.timezone) to decide which day and month
// a transaction belongs to.
export const TIME_ZONE = 'America/New_York';

/** 'YYYY-MM-DD' for a timestamp, in TIME_ZONE. */
export const dayOf = (date: Date) =>
	new Intl.DateTimeFormat('en-CA', {
		timeZone: TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(date);

/** 'YYYY-MM' for a timestamp, in TIME_ZONE. */
export const monthOf = (date: Date) => dayOf(date).slice(0, 7);

export const daysInMonth = (month: string) => {
	const [y, m] = month.split('-').map(Number);
	return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Shift a 'YYYY-MM' month by `delta` months. */
export const addMonths = (month: string, delta: number) => {
	const [y, m] = month.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
};

export const monthLabel = (month: string) =>
	new Date(`${month}-15T12:00:00Z`).toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	});

/** The `?month=` value: 'all', or a 'YYYY-MM' no later than this month (default: this month). */
export const resolveMonth = (requested: string | null): 'all' | string => {
	const currentMonth = monthOf(new Date());
	if (requested === 'all') return 'all';
	return requested && /^\d{4}-\d{2}$/.test(requested) && requested <= currentMonth
		? requested
		: currentMonth;
};

/** All of a child's transactions, oldest first, with the running balance after each one. */
export const loadTransactions = async (supabase: SupabaseClient, childId: string) => {
	const { data } = await supabase
		.from('transactions')
		.select(`id, created_at, amount, note, kind, interest_period`)
		.eq('child_id', childId)
		.order('created_at', { ascending: true });

	let total = 0;
	return (data ?? []).map((t) => {
		total += t.amount;
		return { ...t, runningTotal: total, month: monthOf(new Date(t.created_at)) };
	});
};
