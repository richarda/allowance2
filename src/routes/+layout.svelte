<!-- src/routes/+layout.svelte -->
<script lang="ts">
	import '../styles.css'
	import { invalidate } from '$app/navigation'
	import { onMount } from 'svelte'

	export let data

	let { supabase, session } = data
	$: ({ supabase, session } = data)

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((event, _session) => {
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth')
			}
		})

		return () => data.subscription.unsubscribe()
	})
</script>

<svelte:head>
	<title>User Management</title>
</svelte:head>

<!-- nav bar -->
<nav class="navbar">
	<div class="container">
		<div class="navbar-brand">
			<a href="/" class="navbar-item">Home</a>
			<a href="/account" class="navbar-item">Account</a>
			<a href="/todo" class="navbar-item">Todo</a>
		</div>
		<div class="navbar-end">
			{#if session}
				<a href="/account" class="navbar-item">Sign Out</a>
			{:else}
				<a href="/account" class="navbar-item">Sign In</a>
			{/if}
		</div>
	</div>
</nav>

<div class="container" style="padding: 50px 0 100px 0">
	<slot />
</div>