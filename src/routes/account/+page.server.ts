import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw redirect(303, '/');
	}

	const { data: profile, error: error } = await supabase
		.from('profiles')
		.select(`full_name, avatar_url`)
		.eq('id', session.user.id)
		.single();

    // compute balances based on sum of amounts in transactions by child
	const { data: children, error: error2 } = await supabase.from('children').select('id, name, transactions(balance:amount.sum())');
    
    type ChildWithBalance = typeof children[0] & { balance: number };

    const childrenWithBalance: ChildWithBalance[] = children.map(child => {
        return {
            ...child,
            balance: child.transactions[0]?.balance || 0
        }
    });
    
	return { session, profile, childrenWithBalance };
};

export const actions: Actions = {
	update: async ({ request, locals: { supabase, safeGetSession } }) => {
		const formData = await request.formData();
		const fullName = formData.get('fullName') as string;

		const { session } = await safeGetSession();

		const { error } = await supabase.from('profiles').upsert({
			id: session?.user.id,
			full_name: fullName,
			updated_at: new Date()
		});

		if (error) {
			return fail(500, {
				fullName,
			});
		}

		return {
			fullName,
		};
	},
	signout: async ({ locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (session) {
			await supabase.auth.signOut();
			throw redirect(303, '/');
		}
	},
	pay: async ({ request, locals: { supabase, safeGetSession } }) => {
		const formData = await request.formData();
		const amount = formData.get('amount') as number;
		const childId = formData.get('childId') as number;

		const { error } = await supabase.from('transactions')
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
        }
	}
};
