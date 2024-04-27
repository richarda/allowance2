<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../styles.css';
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';

	export let data;
	$: ({ supabase, session } = data);

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((event, _session) => {
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => data.subscription.unsubscribe();
	});
</script>

<svelte:head>
	<title>User Management</title>
</svelte:head>

<!-- nav bar -->
<div class="navbar bg-base-100">
	<a href="/allowance" class="btn btn-ghost text-xl">Allowance</a>
	<a href="/profile" class="btn btn-ghost text-xl">Profile</a>
</div>

<div class="container" style="padding: 50px 0 100px 0">
	<slot />
</div>

<style lang="postcss">
	:global(html) {
		background-color: #ffc0cb;
	}
</style>
