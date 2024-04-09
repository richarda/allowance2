<!-- src/routes/account/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	export let data;
	export let form;

	let { session, supabase, profile, children } = data;
	$: ({ session, supabase, profile, children } = data);

	let profileForm: HTMLFormElement;
	let loading = false;
	let fullName: string = profile?.full_name ?? '';
	let avatarUrl: string = profile?.avatar_url ?? '';

	const handleSubmit: SubmitFunction = () => {
		loading = true;
		return async () => {
			loading = false;
		};
	};

	const handleSignOut: SubmitFunction = () => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			update();
		};
	};

	const handlePayment: SubmitFunction = () => {
		loading = true;
		return async ({ update }) => {
			loading = false;
			update();
		};
	};
</script>

<div class="grid-container">
	{#each children ?? [] as child (child.id)}
		<div class="grid-item">
			<h2>{child.name}</h2>
			<p>Balance: ${child.balance}</p>
			<div class="form-widget">
				<form class="form-widget" method="post" action="?/pay" use:enhance={handlePayment}>
					<div class="form-row">
						<label for="amount">Amount:</label>
						<div class="input-group">
							<input id="amount" type="number" min="0" bind:value={child.paymentAmount} required />
							<button class="pay-button" type="submit">Pay</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/each}
</div>

<div class="form-widget">
	<form
		class="form-widget"
		method="post"
		action="?/update"
		use:enhance={handleSubmit}
		bind:this={profileForm}
	>
		<div>
			<label for="email">Email</label>
			<input id="email" type="text" value={session.user.email} disabled />
		</div>

		<div>
			<label for="fullName">Full Name</label>
			<input id="fullName" name="fullName" type="text" value={form?.fullName ?? fullName} />
		</div>

		<div>
			<input
				type="submit"
				class="button block primary"
				value={loading ? 'Loading...' : 'Update'}
				disabled={loading}
			/>
		</div>
	</form>

	<form method="post" action="?/signout" use:enhance={handleSignOut}>
		<div>
			<button class="button block" disabled={loading}>Sign Out</button>
		</div>
	</form>
</div>

<style>
	.grid-container {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 20px;
	}
	.grid-item {
		border: 1px solid #ccc;
		padding: 20px;
	}
	.form-row {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 10px;
	}
	.input-group {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.pay-button {
        background-color: green;
        color: white;
        border: none;
        padding: 10px 20px;
        text-align: center;
        text-decoration: none;
        display: inline-block;
        font-size: 16px;
        margin: 4px 2px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .pay-button:hover {
        background-color: darkgreen;
    }
</style>
