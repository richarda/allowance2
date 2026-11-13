<script lang="ts">
	import { page } from '$app/stores';

	export let data;

	const currency = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
	// Month view: the month is in the heading, so just 'Nov 8'.
	const shortDate = (d: string) =>
		new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	// All view: 'Nov 8, 2026'.
	const fullDate = (d: string) =>
		new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

	$: monthName = data.monthLabel.split(' ')[0];
	$: previousMonthName = data.isAll ? '' : data.previousMonthLabel.split(' ')[0];
	$: firstDate =
		data.isAll && data.transactions.length
			? new Date(data.transactions[data.transactions.length - 1].created_at).toLocaleDateString(
					'en-US',
					{ month: 'short', year: 'numeric' }
				)
			: null;
	$: interestCount = data.transactions.filter((t) => t.kind === 'interest').length;
	$: rate = data.isAll || data.apy === null ? '' : `${+(data.apy * 100).toFixed(2)}% APY`;
</script>

<div class="px-4 py-6">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<div class="flex min-w-24 gap-1">
			{#if data.prevLink}
				<a class="btn btn-ghost btn-sm" href="?month={data.prevLink}">← Previous</a>
			{/if}
		</div>
		<h2 class="text-xl font-semibold">{data.monthLabel}</h2>
		<div class="flex min-w-24 justify-end gap-1">
			{#if data.nextLink}
				<a class="btn btn-ghost btn-sm" href="?month={data.nextLink}">Next →</a>
			{/if}
		</div>
	</div>

	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<div class="join">
			<a class="btn join-item btn-sm" class:btn-active={data.isCurrentMonth} href="?">This month</a>
			<a class="btn join-item btn-sm" class:btn-active={data.isAll} href="?month=all">All</a>
		</div>
		<a
			class="btn btn-outline btn-sm"
			href="/child/{$page.params.slug}/transactions.csv?month={data.month}"
			download
		>
			Download CSV
		</a>
	</div>

	<!-- Two stats, each exactly three lines (label, amount, detail) so the sides line up. -->
	<div class="card mb-6 border border-base-300 bg-base-100 shadow-sm">
		<div class="card-body flex-row flex-wrap justify-between gap-6 p-5">
			{#if data.isAll}
				<div>
					<div class="text-sm opacity-70">Balance</div>
					<div class="font-mono text-3xl">{currency(data.balance)}</div>
					<div class="text-sm opacity-70">
						{firstDate ? `Since ${firstDate}` : 'No transactions yet'}
					</div>
				</div>
				<div class="text-right">
					<div class="text-sm opacity-70">Total interest earned</div>
					<div class="font-mono text-3xl text-success">{currency(data.totalInterest)}</div>
					<div class="text-sm opacity-70">
						{interestCount}
						{interestCount === 1 ? 'payment' : 'payments'}
					</div>
				</div>
			{:else}
				<div>
					<div class="text-sm opacity-70">Opening balance, {monthName} 1</div>
					<div class="font-mono text-3xl">{currency(data.openingBalance)}</div>
					<div
						class="text-sm"
						class:text-success={data.lastInterest}
						class:opacity-70={!data.lastInterest}
					>
						{data.lastInterest
							? `Includes +${currency(data.lastInterest)} ${previousMonthName} interest`
							: `No ${previousMonthName} interest`}
					</div>
				</div>
				<div class="text-right">
					{#if data.projection}
						<div class="text-sm opacity-70">Projected {monthName} interest</div>
						<div class="font-mono text-3xl text-success">{currency(data.projection.estimate)}</div>
						<div class="text-sm opacity-70">
							{rate} if {currency(data.projection.currentBalance)} stays through {data.projection
								.monthEnd}
						</div>
					{:else}
						<div class="text-sm opacity-70">{monthName} interest</div>
						<div class="font-mono text-3xl text-success">{currency(data.monthInterest ?? 0)}</div>
						<div class="text-sm opacity-70">{rate}</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	{#if data.transactions.length}
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th class="w-32 whitespace-nowrap">Date</th>
						<th>Amount</th>
						<th>Balance</th>
						<th>Note</th>
					</tr>
				</thead>
				<tbody>
					{#each data.transactions as transaction (transaction.id)}
						<tr>
							<td class="whitespace-nowrap">
								{data.isAll ? fullDate(transaction.created_at) : shortDate(transaction.created_at)}
							</td>
							<td class:text-error={transaction.amount < 0}>
								{currency(transaction.amount)}
								{#if transaction.kind === 'interest'}
									<span class="badge badge-success badge-sm ml-1">Interest</span>
								{/if}
							</td>
							<td>{currency(transaction.runningTotal)}</td>
							<td>
								{#if transaction.kind === 'interest'}
									<!-- Automatic transactions keep the note the system wrote. -->
									<span class="text-sm opacity-70">{transaction.note ?? ''}</span>
								{:else}
									<form class="form-widget" method="post" action="?month={data.month}&/addNote">
										<input type="hidden" name="transactionId" value={transaction.id} />
										<div class="join">
											<input
												name="note"
												type="text"
												class="input join-item input-bordered"
												value={transaction.note ?? ''}
												placeholder="Enter note"
											/>
											<button type="submit" class="btn join-item rounded-r-full">Save Note</button>
										</div>
									</form>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<p class="py-8 text-center opacity-60">
			No transactions{data.isAll ? '' : ` in ${data.monthLabel}`}{data.isCurrentMonth
				? ' yet'
				: ''}.
		</p>
	{/if}
</div>
