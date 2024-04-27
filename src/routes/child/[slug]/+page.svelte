<script>
	import { enhance } from '$app/forms';

	export let data;
	let transactionsWithRunningTotal = data.transactions?.map((transaction, i, transactions) => {
		const runningTotal = transactions.slice(0, i + 1).reduce((total, t) => total + t.amount, 0);
		return { ...transaction, runningTotal };
	});
	transactionsWithRunningTotal?.reverse();
</script>

{#if transactionsWithRunningTotal}
	<table>
		<thead>
			<tr>
				<th>Date</th>
				<th>Amount</th>
				<th>Balance</th>
				<th>Note</th>
			</tr>
		</thead>
		<tbody>
			{#each transactionsWithRunningTotal as transaction, i}
				<tr class:even={i % 2 === 0} class:odd={i % 2 !== 0}>
					<td>{new Date(transaction.created_at).toLocaleString()}</td>
					<td>${transaction.amount}</td>
					<td>${transaction.runningTotal.toFixed(2)}</td>
					<td>
						<form class="form-widget" method="post" action="?/addNote">
							<input type="hidden" name="transactionId" value={transaction.id} />
							<div class="join">
								<input
									name="note"
									type="text"
									class="input join-item input-bordered"
									bind:value={transaction.note}
									placeholder="Enter note"
								/>
								<button type="submit" class="btn join-item rounded-r-full">Submit</button>
							</div>
						</form>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<style>
	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		border: 1px solid #ccc;
		padding: 8px;
		text-align: left;
	}

	th {
		background-color: #f0f0f0;
	}

	.even {
		background-color: #f0f0f0;
	}

	.odd {
		background-color: #f8f8f8;
	}
</style>
