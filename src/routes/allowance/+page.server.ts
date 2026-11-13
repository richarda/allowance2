import { fail, redirect } from '@sveltejs/kit';
import type { Action, Actions, PageServerLoad } from './$types';
import { isParent } from '$lib/server/transactions';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw redirect(303, '/');
	}

	// compute balances based on sum of amounts in transactions by child
	const { data: children, error: error } = await supabase
		.from('children_with_balance')
		.select('id, name, balance: total_transactions, transactions (amount, created_at, note, kind)')
		.order('created_at', { referencedTable: 'transactions', ascending: false })
		.limit(3, { foreignTable: 'transactions' });

	const canTransact = await isParent(supabase, session.user.id);

	return { children, canTransact };
};

// Pay adds money, spend takes it out. The note is optional.
const addTransaction =
	(sign: 1 | -1): Action =>
	async ({ request, locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session || !(await isParent(supabase, session.user.id))) {
			return fail(403, { message: 'Only parents can pay or spend.' });
		}

		const formData = await request.formData();
		const amount = parseFloat(formData.get('amount') as string) * sign;
		const childId = parseInt(formData.get('childId') as string);
		const note = (formData.get('note') as string | null)?.trim() || null;

		const { error } = await supabase
			.from('transactions')
			.insert({ child_id: childId, amount, note });
		if (error) {
			return fail(500, { amount, childId });
		}

		return { amount, childId };
	};

export const actions: Actions = {
	pay: addTransaction(1),
	spend: addTransaction(-1)
};
