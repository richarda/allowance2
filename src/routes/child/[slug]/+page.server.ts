import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, params }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw redirect(303, '/');
	}

	const { data: transactions, error: error } = await supabase
		.from('transactions')
		.select(`id, created_at, amount, note`)
		.eq('child_id', params.slug)
		.order('created_at', { ascending: true });

	return { transactions };
};

export const actions: Actions = {
	addNote: async ({ request, locals: { supabase, safeGetSession } }) => {
		const formData = await request.formData();
		const note = formData.get('note') as string;
		const transactionId = parseInt(formData.get('transactionId') as string);

		const { data, error } = await supabase
			.from('transactions')
			.update({ note: note })
			.eq('id', transactionId);
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
