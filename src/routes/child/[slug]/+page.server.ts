import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import {
	addMonths,
	dayOf,
	daysInMonth,
	loadTransactions,
	monthLabel,
	monthOf,
	resolveMonth,
	round2
} from '$lib/server/transactions';

export const load: PageServerLoad = async ({
	locals: { supabase, safeGetSession },
	params,
	url
}) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw redirect(303, '/');
	}

	// Running balance needs the full history, even when only one month is shown.
	const transactions = await loadTransactions(supabase, params.slug);
	const currentMonth = monthOf(new Date());
	const month = resolveMonth(url.searchParams.get('month'));

	if (month === 'all') {
		return {
			month: 'all',
			monthLabel: 'All transactions',
			isAll: true as const,
			balance: round2(transactions.at(-1)?.runningTotal ?? 0),
			totalInterest: round2(
				transactions.filter((t) => t.kind === 'interest').reduce((sum, t) => sum + t.amount, 0)
			),
			transactions: [...transactions].reverse(),
			prevLink: null,
			nextLink: null,
			isCurrentMonth: false
		};
	}

	const previousMonth = addMonths(month, -1);
	const monthDays = daysInMonth(month);
	const lastDay = `${month}-${String(monthDays).padStart(2, '0')}`;

	// Opening balance: everything before the 1st of this month, including last month's interest
	// (which is dated 11:59 PM on last month's final day).
	const before = transactions.filter((t) => t.month < month);
	const openingBalance = round2(before.at(-1)?.runningTotal ?? 0);
	const interestFor = (m: string) =>
		transactions.find((t) => t.kind === 'interest' && t.interest_period?.slice(0, 7) === m);
	const lastInterest = interestFor(previousMonth);

	const monthTransactions = transactions.filter((t) => t.month === month);
	const firstMonth = transactions[0]?.month ?? month;
	const isCurrentMonth = month === currentMonth;

	// The rate that will apply to this month: newest row in effect on the month's last day.
	const { data: rate } = await supabase
		.from('interest_settings')
		.select('apy')
		.lte('effective_from', lastDay)
		.order('effective_from', { ascending: false })
		.limit(1)
		.maybeSingle();
	const apy = rate ? Number(rate.apy) : null;

	// For the current month, estimate this month's interest the same way the monthly job will:
	// average daily balance, using actual end-of-day balances for days already past and assuming
	// today's balance stays put through the end of the month.
	let projection = null;
	if (isCurrentMonth && apy !== null) {
		const today = dayOf(new Date());
		const currentBalance = transactions.at(-1)?.runningTotal ?? 0;
		let balance = openingBalance;
		let i = 0;
		let sum = 0;
		for (let d = 1; d <= monthDays; d++) {
			const day = `${month}-${String(d).padStart(2, '0')}`;
			if (day >= today) {
				sum += currentBalance * (monthDays - d + 1);
				break;
			}
			while (
				i < monthTransactions.length &&
				dayOf(new Date(monthTransactions[i].created_at)) <= day
			) {
				balance = monthTransactions[i].runningTotal;
				i++;
			}
			sum += balance;
		}
		const adb = sum / monthDays;
		const estimate = adb > 0 ? round2(adb * (Math.pow(1 + apy, monthDays / 365) - 1)) : 0;
		projection = {
			currentBalance: round2(currentBalance),
			estimate,
			monthEnd: new Date(`${lastDay}T12:00:00Z`).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				timeZone: 'UTC'
			})
		};
	}

	return {
		month,
		monthLabel: monthLabel(month),
		isAll: false as const,
		previousMonthLabel: monthLabel(previousMonth),
		openingBalance,
		lastInterest: lastInterest ? round2(lastInterest.amount) : null,
		// For past months, the interest the month itself earned (posted on its last day).
		monthInterest: isCurrentMonth ? null : interestFor(month)?.amount ?? null,
		apy,
		projection,
		transactions: [...monthTransactions].reverse(),
		prevLink: previousMonth >= firstMonth ? previousMonth : null,
		nextLink: month < currentMonth ? addMonths(month, 1) : null,
		isCurrentMonth
	};
};

export const actions: Actions = {
	addNote: async ({ request, locals: { supabase, safeGetSession } }) => {
		const formData = await request.formData();
		const note = formData.get('note') as string;
		const transactionId = parseInt(formData.get('transactionId') as string);

		const { data, error } = await supabase
			.from('transactions')
			.update({ note: note })
			.eq('id', transactionId)
			.neq('kind', 'interest'); // automatic transactions keep their system-written note
		if (error) {
			return fail(500, {
				note,
				transactionId
			});
		}

		return {
			data
		};
	}
};
