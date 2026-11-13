<!-- src/routes/allowance/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';

	export let data;

	const currency = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
	const shortDate = (d: string) =>
		new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
</script>

<div class="grid grid-cols-1 gap-6 px-4 py-6 sm:grid-cols-2 lg:grid-cols-3">
	{#each data.children ?? [] as child}
		<div class="card border border-base-300 bg-base-100 shadow-sm">
			<div class="card-body gap-4 p-5">
				<div class="flex items-baseline justify-between gap-2">
					<a href="/child/{child.id}" class="link-hover card-title truncate text-2xl"
						>{child.name}</a
					>
					<span class="font-mono text-3xl">{currency(child.balance)}</span>
				</div>

				<div>
					<div class="mb-1 flex items-baseline justify-between">
						<h3 class="text-xs font-semibold uppercase tracking-wide opacity-60">
							Recent activity
						</h3>
						<a href="/child/{child.id}" class="link-hover link text-xs opacity-70">View all</a>
					</div>
					{#if child.transactions?.length}
						<ul class="divide-y divide-base-200">
							{#each child.transactions as transaction}
								<li class="py-2">
									<div class="flex items-center justify-between gap-2">
										<span class="text-sm opacity-70">{shortDate(transaction.created_at)}</span>
										<span class="flex items-center gap-2">
											{#if transaction.kind === 'interest'}
												<span class="badge badge-success badge-sm">Interest</span>
											{/if}
											<span class="font-mono text-sm" class:text-error={transaction.amount < 0}>
												{currency(transaction.amount)}
											</span>
										</span>
									</div>
									{#if transaction.note}
										<p class="truncate text-xs opacity-60" title={transaction.note}>
											{transaction.note}
										</p>
									{/if}
								</li>
							{/each}
						</ul>
					{:else}
						<p class="py-2 text-sm opacity-60">No transactions yet.</p>
					{/if}
				</div>

				<div class="flex flex-col gap-2">
					<form method="post" action="?/pay" use:enhance>
						<input type="hidden" name="childId" value={child.id} />
						<div class="join w-full">
							<input
								name="amount"
								aria-label="Amount to pay {child.name}"
								placeholder="0.00"
								class="input join-item input-bordered input-accent w-full"
								type="number"
								step="0.01"
								min="0"
								required
							/>
							<button class="btn btn-accent join-item w-24" type="submit">Pay</button>
						</div>
					</form>
					<form method="post" action="?/spend" use:enhance>
						<input type="hidden" name="childId" value={child.id} />
						<div class="join w-full">
							<input
								name="amount"
								aria-label="Amount {child.name} spent"
								placeholder="0.00"
								class="input join-item input-bordered input-primary w-full"
								type="number"
								step="0.01"
								min="0"
								required
							/>
							<button class="btn btn-primary join-item w-24" type="submit">Spend</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/each}
</div>
