<!-- src/routes/profile/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';

	export let data;
	export let form;

	let { session, supabase, profile } = data;
	$: ({ session, supabase, profile } = data);

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
</script>

<div class="grid grid-flow-row">
	<form method="post" action="?/update" use:enhance={handleSubmit} bind:this={profileForm}>
		<div>
			<label for="email">Email</label>
			<input class="input" id="email" type="text" value={session.user.email} disabled />
		</div>

		<div>
			<label for="fullName">Full Name</label>
			<input
				class="input input-bordered"
				id="fullName"
				name="fullName"
				value={form?.fullName ?? fullName}
			/>

			<input
				type="submit"
				class="btn btn-primary"
				value={loading ? 'Loading...' : 'Update'}
				disabled={loading}
			/>
		</div>
	</form>

	<form method="post" action="?/signout" use:enhance={handleSignOut}>
		<button class="btn" disabled={loading}>Sign Out</button>
	</form>
</div>
