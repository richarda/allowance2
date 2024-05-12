<!-- src/routes/allowance/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';

	export let data;
</script>

<div class="grid grid-cols-1 justify-center gap-2 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.children ?? [] as child}
		<div class="container w-80 px-4">
			<div class="grid grid-cols-2">
				<div class="text-2xl">
					<a href="/child/{child.id}">{child.name}</a>
				</div>
				<div><span class="font-mono text-4xl">${child.balance}</span></div>
				<div class="col-span-2">
					<a href="/child/{child.id}">
						<table class="table-xs">
							<!-- head -->
							<thead>
								<tr class="text-left">
									<th>Date</th>
									<th>Amount</th>
									<th>Note</th>
								</tr>
							</thead>
							<tbody>
								{#each child.transactions ?? [] as transaction}
									<tr>
										<td
											>{new Date(transaction.created_at).toLocaleDateString('en-US', {
												day: 'numeric',
												month: 'long'
											})}</td
										>
										<td class="text-right">
											{transaction.amount.toLocaleString('en-US', {
												style: 'currency',
												currency: 'USD'
											})}
										</td>
										<td>{transaction.note ?? ''}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</a>
				</div>
				<div class="form-widget col-span-2">
					<form class="form-widget" method="post" action="?/pay" use:enhance>
						<div class="form-row">
							<div class="join">
								<input
									name="amount"
									class="input join-item input-bordered input-accent"
									type="number"
									step="0.01"
									min="0"
									required
								/>
								<input type="hidden" name="childId" value={child.id} />
								<button class="btn btn-accent join-item w-20" type="submit">Pay</button>
							</div>
						</div>
					</form>
				</div>
				<div class="form-widget col-span-2">
					<form class="form-widget" method="post" action="?/spend" use:enhance>
						<div class="form-row">
							<div class="join">
								<input
									name="amount"
									type="number"
									class="input join-item input-bordered input-primary"
									step="0.01"
									min="0"
									required
								/>
								<input type="hidden" name="childId" value={child.id} />
								<button class="btn btn-primary join-item w-20" type="submit">Spend</button>
							</div>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/each}
</div>
