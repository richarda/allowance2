<!-- src/routes/allowance/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';

	export let data;
</script>

<div class="grid-container">
	{#each data.childrenWithBalance ?? [] as child}
		<div class="grid-item">
            <div class="header">
                <h2>{child.name}</h2>
                <p class="balance">${child.balance}</p>
            </div>
			<div class="form-widget">
				<form class="form-widget" method="post" action="?/pay" use:enhance>
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
			<div class="form-widget">
				<form class="form-widget" method="post" action="?/spend" use:enhance>
					<div class="form-row">
						<div class="input-group">
							<input name="amount" type="number" step="0.01" min="0" required />
							<input type="hidden" name="childId" value={child.id} />
							<button class="spend-button" type="submit">Spend</button>
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
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.balance {
		font-size: 2em;
		text-align: right;
        font-family: 'Monaco', monospace;
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
	.pay-button,
	.spend-button {
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

	.pay-button {
		background-color: green;
	}

	.pay-button:hover {
		background-color: darkgreen;
	}
	.spend-button {
		background-color: rgb(151, 2, 129);
	}

	.spend-button:hover {
		background-color: rgb(73, 13, 59);
	}
	.pay-button,
	.spend-button {
		min-width: 90px; /* adjust this value as needed */
	}
</style>
