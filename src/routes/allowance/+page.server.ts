import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();

	if (!session) {
		throw redirect(303, '/');
	}

    // compute balances based on sum of amounts in transactions by child
	const { data: children, error: error2 } = await supabase.from('children').select('id, name, transactions(balance:amount.sum())');
    
    type ChildWithBalance = typeof children[0] & { balance: number };

    const childrenWithBalance: ChildWithBalance[] = children.map(child => {
        return {
            ...child,
            balance: child.transactions[0]?.balance || 0
        }
    });
    
	return { childrenWithBalance };
};

export const actions: Actions = {
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
