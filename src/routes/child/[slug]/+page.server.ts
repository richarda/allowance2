import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession }, params }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw redirect(303, '/');
	}

	const { data: transactions, error: error } = await supabase.from('transactions').select(`created_at, amount`).eq('child_id', params.slug);

	return { transactions };
};