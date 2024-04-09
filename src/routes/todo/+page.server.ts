import type { Actions, PageServerLoad } from './$types';
import { writable, get } from 'svelte/store'
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw redirect(303, '/');
	}

	const { data: todos, error: error } = await supabase.from('todos').select(`task, is_complete`);

	return { session, todos };
};
