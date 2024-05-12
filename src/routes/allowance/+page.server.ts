import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw redirect(303, '/');
	}

	// compute balances based on sum of amounts in transactions by child
	const { data: children, error: error } = await supabase
		.from('children_with_balance')
		.select('id, name, balance: total_transactions, transactions (amount, created_at, note)')
		.order('created_at', { referencedTable: 'transactions', ascending: false })
		.limit(3, { foreignTable: 'transactions' });

	return { children };
};

export const actions: Actions = {
	pay: async ({ request, locals: { supabase, safeGetSession } }) => {
		const formData = await request.formData();
		const amount = parseFloat(formData.get('amount') as string);
		const childId = parseInt(formData.get('childId') as string);

		const { error } = await supabase
			.from('transactions')
			.insert({ child_id: childId, amount: amount });
		if (error) {
			return fail(500, {
				amount,
				childId
			});
		}

		return {
			amount,
			childId
		};
	},
	spend: async ({ request, locals: { supabase, safeGetSession } }) => {
		const formData = await request.formData();
		const amount = parseFloat(formData.get('amount') as string) * -1;
		const childId = parseInt(formData.get('childId') as string);

		const { error } = await supabase
			.from('transactions')
			.insert({ child_id: childId, amount: amount });
		if (error) {
			return fail(500, {
				amount,
				childId
			});
		}

		return {
			amount,
			childId
		};
	}
};
