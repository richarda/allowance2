<script>
    export let data;
</script>

{#if data.transactions}
<table>
	<thead>
		<tr>
			<th>Date</th>
			<th>Amount</th>
			<th>Note</th>
		</tr>
	</thead>
	<tbody>
		{#each data.transactions as transaction, i}
			<tr class:even={i % 2 === 0} class:odd={i % 2 !== 0}>
				<td>{transaction.created_at}</td>
				<td>${transaction.amount}</td>
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
