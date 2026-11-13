<!-- src/routes/allowance/+page.svelte -->
<script lang="ts">
	import { enhance } from '$app/forms';

	export let data;

	const currency = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
	const shortDate = (d: string) =>
		new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

	// Pay/Spend first ask for a note in a dialog, then post amount + note together.
	// Without JavaScript the card forms still post directly (no note).
	type Pending = {
		action: 'pay' | 'spend';
		childId: number;
		childName: string;
		amount: number;
		form: HTMLFormElement;
	};
	let pending: Pending | null = null;
	let dialog: HTMLDialogElement;
	let noteInput: HTMLInputElement;
	let saving = false;

	const ask = (action: Pending['action'], child: { id: number; name: string }, e: SubmitEvent) => {
		const form = e.currentTarget as HTMLFormElement;
		const amount = parseFloat(new FormData(form).get('amount') as string);
		if (!(amount > 0)) return;
		pending = { action, childId: child.id, childName: child.name, amount, form };
		dialog.showModal();
		noteInput.value = '';
		noteInput.focus();
	};
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

				{#if data.canTransact}
					<div class="flex flex-col gap-2">
						<form method="post" action="?/pay" on:submit|preventDefault={(e) => ask('pay', child, e)}>
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
						<form
							method="post"
							action="?/spend"
							on:submit|preventDefault={(e) => ask('spend', child, e)}
						>
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
				{/if}
			</div>
		</div>
	{/each}
</div>

<dialog
	bind:this={dialog}
	class="modal modal-bottom sm:modal-middle"
	on:close={() => (pending = null)}
>
	<div class="modal-box">
		{#if pending}
			<h3 class="text-lg font-semibold">
				{pending.action === 'pay' ? 'Pay' : 'Spend'}
				{currency(pending.amount)}
				{pending.action === 'pay' ? 'to' : 'from'}
				{pending.childName}
			</h3>
		{/if}
		<form
			method="post"
			action="?/{pending?.action ?? 'pay'}"
			class="mt-4 flex flex-col gap-4"
			use:enhance={() => {
				saving = true;
				return async ({ result, update }) => {
					await update();
					saving = false;
					if (result.type === 'success' && pending) {
						pending.form.reset();
						dialog.close();
					}
				};
			}}
		>
			<input type="hidden" name="childId" value={pending?.childId ?? ''} />
			<input type="hidden" name="amount" value={pending?.amount ?? ''} />
			<label class="form-control">
				<span class="label-text mb-1">Note</span>
				<input
					bind:this={noteInput}
					name="note"
					type="text"
					class="input input-bordered w-full"
					placeholder={pending?.action === 'pay' ? 'e.g. Weekly allowance' : 'e.g. Lunch'}
					autocomplete="off"
				/>
			</label>
			<!-- Phones: big full-width button on top, Cancel below. Larger screens: side by side. -->
			<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button
					type="button"
					class="btn btn-ghost btn-lg w-full sm:btn-md sm:w-auto"
					on:click={() => dialog.close()}>Cancel</button
				>
				<button
					type="submit"
					class="btn btn-lg w-full text-lg sm:btn-md sm:w-auto sm:text-sm"
					class:btn-accent={pending?.action === 'pay'}
					class:btn-primary={pending?.action === 'spend'}
					disabled={saving}
				>
					{pending?.action === 'pay' ? 'Pay' : 'Spend'}
				</button>
			</div>
		</form>
	</div>
	<form method="dialog" class="modal-backdrop"><button>close</button></form>
</dialog>
