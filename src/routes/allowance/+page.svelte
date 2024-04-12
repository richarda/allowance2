<!-- src/routes/allowance/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';

	export let data;
	export let form;

	let { session, childrenWithBalance } = data;
	$: ({ session, childrenWithBalance } = data);

</script>

<div class="grid-container">
	{#each childrenWithBalance ?? [] as child}
		<div class="grid-item">
			
			<div class="form-widget">
				<form class="form-widget" method="post" action="?/pay" use:enhance>
					<div class="form-row">
						<h2>{child.name}</h2>
						<p>Balance: ${child.balance}</p>
					</div>
					<div class="form-row">
						<label for="amount">Amount:</label>
						<div class="input-group">
							<input name="amount" type="number" step="0.01" min="0" required />
							<input type="hidden" name="childId" value={child.id} />
							<button class="pay-button" type="submit">Pay</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/each}
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
