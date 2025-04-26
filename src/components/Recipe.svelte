<script lang="ts">
	import { writable } from "svelte/store";
	import { UNITS } from "../lib/constants";
	import {
		fix_data,
		get_meta_sections,
		get_sections,
		try_load_url,
	} from "../lib/data";
	import { data_to_markdown_string } from "../lib/renderers";
	import { type IRecipe, type ISection } from "../lib/types";
	import { equals } from "../lib/utils";
	import { set_wake_lock } from "../lib/wake_lock";
	import List from "./List.svelte";
	import { notify } from "../lib/globals.svelte";
	import Pane from "./Pane.svelte";

	let { onMyRecipes, current_url } = $props<{
		onMyRecipes(): void;
		current_url: string;
	}>();

	const data = writable<IRecipe | null>({
		title: "",
		url: "",
		instructions: [],
		ingredients: [],
		notes: [],
		keywords: {},
	});

	let CURRENT_UNITS = $state(UNITS.ORIGINAL);
	let CURRENT_QUANTITY = $state(1.0);
	let show_colors = $state(true);
	const final_data = $derived(fix_data($data, show_colors));

	let selected_keyword = $state<string | null>(null);
	let section_to_focus = $state<ISection | null>(null);

	let meta_sections = $derived(
		get_meta_sections(
			final_data,
			show_colors,
			CURRENT_UNITS,
			CURRENT_QUANTITY
		)
	);

	let last_seen_url = "";
	$effect(() => {
		if (current_url !== last_seen_url) {
			last_seen_url = current_url;
			(async () => {
				reload_data(false);
			})();
		}
	});

	function set_units(new_units: UNITS) {
		if (new_units === CURRENT_UNITS) {
			return;
		}

		CURRENT_UNITS = new_units;
	}

	function set_quantity(new_quantity: number) {
		if (equals(new_quantity, CURRENT_QUANTITY)) {
			return;
		}

		CURRENT_QUANTITY = new_quantity;
	}

	async function reload_data(force_reload = false) {
		data.set(await try_load_url(current_url, "", force_reload));

		// unlikely we're going to run out of numbers, but still...
		selected_keyword = null;
		section_to_focus = null;

		if (current_url !== window.location.href) {
			const url_obj = new URL(window.location.href);
			url_obj.searchParams.set("url", current_url);
			window.history.pushState({}, "", url_obj.toString());
		}
	}

	let installPrompt = $state<any>(null);
	window.addEventListener("beforeinstallprompt", (event) => {
		event.preventDefault();
		installPrompt = event;
	});
</script>

<main>
	<div class="input full-width">
		<button
			class="green"
			onclick={async () => {
				const items = await navigator.clipboard.read();
				for (const item of items) {
					for (const type of item.types) {
						const blob = await item.getType(type);
						const text = await blob.text();
						data.set(null);
						notify("Loading...");
						current_url = text;
						return;
					}
				}
			}}
		>
			Copy from clipboard
		</button>
		<button
			class="blue"
			disabled={!final_data}
			onclick={async () => {
				if (final_data) {
					let markdown = data_to_markdown_string(final_data);
					await navigator.clipboard.writeText(markdown);
					notify("Copied to clipboard :)");
				}
			}}
		>
			Get markdown
		</button>
		{#if navigator.share}
			<button
				id="share-button"
				class="black"
				onclick={async () => {
					const url_obj = new URL(window.location.href);
					url_obj.search = "";
					if (current_url) {
						url_obj.searchParams.set("url", current_url);
					}
					await navigator.share({
						title: "Here's a recipe for ya!",
						url: url_obj.toString(),
					});
				}}
			>
				Share
			</button>
		{/if}

		<button
			id="my-recipes-button"
			class="pink"
			onclick={() => onMyRecipes()}
		>
			My recipes
		</button>

		<button
			id="install-button"
			class="purple"
			hidden={!installPrompt}
			onclick={async () => {
				await installPrompt.prompt();
				installPrompt = null;
			}}
		>
			Install
		</button>
	</div>

	<div class="output">
		{#if final_data}
			{#if final_data?.title}
				<h1>{final_data?.title}</h1>
			{/if}

			<div class="flex-row center mb1 mt1">
				<div class="flex-col">
					<button
						class="mb1"
						onclick={() => {
							show_colors = !show_colors;
						}}
					>
						Toggle colors
					</button>
					{#if navigator.wakeLock}
						<label>
							<input
								type="checkbox"
								checked
								onchange={async (e) => {
									await set_wake_lock(
										(e.target as any).checked
									);
								}}
							/>
							Keep screen on
						</label>
					{/if}

					<div>
						<button
							class="rounded-button black"
							onclick={() => set_units(UNITS.IMPERIAL)}
							class:selected={CURRENT_UNITS == UNITS.IMPERIAL}
						>
							Imperial
						</button>
						<button
							class="rounded-button black"
							onclick={() => set_units(UNITS.ORIGINAL)}
							class:selected={CURRENT_UNITS == UNITS.ORIGINAL}
						>
							Original
						</button>
						<button
							class="rounded-button black"
							onclick={() => set_units(UNITS.METRIC)}
							class:selected={CURRENT_UNITS == UNITS.METRIC}
						>
							Metric
						</button>
					</div>
				</div>

				<div class="flex-col">
					<a
						class="mb1"
						href={current_url}
						target="_blank"
						class:disabled={Boolean(current_url)}
					>
						Open the original
					</a>
					<button
						onclick={async () => {
							if (current_url) {
								notify("Reloading...");
								await reload_data(true);
							} else {
								notify("No url!", "error");
							}
						}}>Reload</button
					>
					<div>
						<button
							class="rounded-button black"
							onclick={() => set_quantity(0.5)}
							class:selected={equals(CURRENT_QUANTITY, 0.5)}
						>
							0.5x
						</button>
						<button
							class="rounded-button black"
							onclick={() => set_quantity(1.0)}
							class:selected={equals(CURRENT_QUANTITY, 1.0)}
						>
							1x
						</button>
						<button
							class="rounded-button black"
							onclick={() => set_quantity(2.0)}
							class:selected={equals(CURRENT_QUANTITY, 2.0)}
						>
							2x
						</button>
					</div>
				</div>
			</div>

			{#each meta_sections as sections}
				{#each sections as section}
					<List
						{section}
						onFocusSection={(section) => {
							section_to_focus = section;
						}}
					/>
				{/each}
			{/each}
			{#if section_to_focus}
				<Pane>
					<List
						section={section_to_focus}
						onFocusSection={(section) => {
							section_to_focus = null;
						}}
					/>
				</Pane>
			{/if}
		{/if}
	</div>
</main>

<style lang="scss">
</style>
