import { error } from '@sveltejs/kit';
import { loadTransactions, resolveMonth, round2, TIME_ZONE } from '$lib/server/transactions';
import type { RequestHandler } from './$types';

/** Local date and time in TIME_ZONE, e.g. '2026-11-08 19:55'. */
const localDateTime = (iso: string) =>
	new Intl.DateTimeFormat('en-CA', {
		timeZone: TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	})
		.format(new Date(iso))
		.replace(',', '');

const csvField = (value: string | number) => {
	const s = String(value);
	return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV of the same rows the child page shows: one month (?month=YYYY-MM, default this month) or
// everything (?month=all). Oldest first, with the running balance after each transaction.
export const GET: RequestHandler = async ({
	locals: { supabase, safeGetSession },
	params,
	url
}) => {
	const { session } = await safeGetSession();
	if (!session) throw error(401, 'Not signed in');

	const { data: child } = await supabase
		.from('children')
		.select('name')
		.eq('id', params.slug)
		.maybeSingle();
	if (!child) throw error(404, 'Not found');

	const month = resolveMonth(url.searchParams.get('month'));
	const transactions = (await loadTransactions(supabase, params.slug)).filter(
		(t) => month === 'all' || t.month === month
	);

	const rows = [
		['Date', 'Amount', 'Balance', 'Type', 'Note'],
		...transactions.map((t) => [
			localDateTime(t.created_at),
			round2(t.amount).toFixed(2),
			round2(t.runningTotal).toFixed(2),
			t.kind === 'interest' ? 'Interest' : 'Manual',
			t.note ?? ''
		])
	];
	const csv = rows.map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n';

	const name = child.name.replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '') || 'child';
	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="${name}-${month}.csv"`
		}
	});
};
