<!-- src/routes/todo/+page.svelte -->
<script lang="ts">
	import { invalidateAll } from '$app/navigation';

	export let data;
  $: todos = data.todos;

  data.supabase
		.channel('todos')
		.on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, (payload) => {
			console.log('Change received!', payload);
      invalidateAll();
		})
		.subscribe();

</script>

<svelte:head>
	<title>Todo List</title>
</svelte:head>

<div class="container">
	<h1>Todo List</h1>
	{#each todos || [] as todo}
		<div class="todo-item">
			<h2>{todo.task}</h2>
			<p>{todo.is_complete}</p>
		</div>
	{/each}
</div>
