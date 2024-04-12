<script>
	export let data;
	let transactionsWithRunningTotal = data.transactions?.map((transaction, i, transactions) => {
		const runningTotal = transactions.slice(0, i + 1).reduce((total, t) => total + t.amount, 0);
		return { ...transaction, runningTotal };
	});
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
					<td></td>
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
