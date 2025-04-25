<script lang="ts">
	import { writable } from "svelte/store";
	import { AMOUNT_REGEX, KEYS, LI_PREFIX, UNITS } from "../lib/constants";
	import { add_recipe, find_recipe_by_url, try_load_url } from "../lib/data";
	import { extract_data } from "../lib/parser";
	import { data_to_markdown_string } from "../lib/renderers";
	import type { IRecipe } from "../lib/types";
	import { valid_url } from "../lib/utils";
	import { set_wake_lock } from "../lib/wake_lock";
	import List from "./List.svelte";
	import { notify } from "../lib/globals.svelte";

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

	let last_seen_url = "";
	$effect(() => {
		if (current_url !== last_seen_url) {
			last_seen_url = current_url;
			(async () => {
				reload_data(false);
			})();
		}
	});

	async function reload_data(force_reload = false) {
		data.set(await try_load_url(current_url, "", force_reload));

		// if (current_url !== url) {
		const url_obj = new URL(window.location.href);
		url_obj.searchParams.set("url", current_url);
		window.history.pushState({}, "", url_obj.toString());
		// }
	}

	let show_colors = $state(true);
	let SELECTED_KEYWORD = $state<string | null>(null);

	/*

		};

		let focused_pane_element = null;
		const remove_focused_panes = () => {
			for (let element of document.querySelectorAll(".focus-pane")) {
				element.parentElement.removeChild(element);
			}
		};

		const focus = (elements) => {
			remove_focused_panes();

			let shared_data = { did_drag: false, total_height: 0 };

			let pane = add_child(
				{
					tag: "div",
					style: {
						"min-height": `30vh`,
					},
					classes: ["focus-pane"],
				},
				document.body
			);

			let content = add_child(
				{
					tag: "div",
					classes: ["focus-pane-content"],
					prepend: true,
				},
				pane
			);

			for (let element of elements) {
				content.appendChild(element.cloneNode(true));
			}

			add_child(
				{
					tag: "div",
					classes: ["resize-handle"],
					onmousedown: (e) => {
						e.preventDefault();

						let mousemove = (e) => {
							e.preventDefault();
							let height =
								document.body.clientHeight -
								(e.pageY || e.touches[0].pageY);
							pane.style.minHeight = `max(20px, min(${height}px, ${shared_data.total_height}px))`;
						};

						let mouseup = (e) => {
							e.preventDefault();
							shared_data.did_drag = true;
							document.removeEventListener(
								"mousemove",
								mousemove
							);
							document.removeEventListener(
								"touchmove",
								mousemove
							);
							document.removeEventListener("mouseup", mouseup);
							setTimeout(() => {
								shared_data.did_drag = false;
							}, 0);
						};

						document.addEventListener("mousemove", mousemove);
						document.addEventListener("touchmove", mousemove);
						document.addEventListener("mouseup", mouseup);
					},
				},
				pane
			);

			for (let button of pane.querySelectorAll(".close-focused-button")) {
				button.addEventListener("click", remove_focused_panes);
			}

			shared_data.total_height = content.scrollHeight + 10;
			pane.style.minHeight = `min(30vh, ${shared_data.total_height}px)`;

			for (let input of content.querySelectorAll("input")) {
				input.addEventListener("change", checkbox_on_change);
			}

			for (let keywordEl of content.querySelectorAll(
				".clickable-keyword"
			)) {
				keywordEl.addEventListener("click", click_keyword);
			}

			focused_pane_element = pane;
		};

		let CURRENT_UNITS = UNITS.ORIGINAL;
		const set_units = (new_units) => {
			if (new_units === CURRENT_UNITS) {
				return;
			}

			CURRENT_UNITS = new_units;
			doit(current_url);
		};

		let CURRENT_QUANTITY = 1.0;
		const set_quantity = (new_quantity) => {
			if (equals(new_quantity, CURRENT_QUANTITY)) {
				return;
			}

			CURRENT_QUANTITY = new_quantity;
			doit(current_url);
		};

						{
							tag: "div",
							classes: ["flex-col", "right"],
							children: [
								{
									tag: "a",
									text: "Open the original",
									attributes: {
										target: "_blank",
										href: url,
									},
								},
							tag: "div",
							classes: ["flex-col", "right"],
							children: [
								{
									tag: "a",
									text: "Open the original",
									attributes: {
										target: "_blank",
										href: url,
									},
								},
								{
									tag: "a",
									text: "Reload",) {
									},
								},
							],
						},
					],
				});
				add_child({
					tag: "div",
					classes: ["flex-row"],
					children: [
						{
							tag: "div",
							children: [
								{
									tag: "button",
									classes: [
										"rounded-button",
										"black",
										CURRENT_UNITS === UNITS.IMPERIAL
											? "selected"
											: null,
									],
									text: "Imperial",
									onclick: () => set_units(UNITS.IMPERIAL),
								},
								{
									tag: "button",
									classes: [
										"rounded-button",
										"black",
										CURRENT_UNITS === UNITS.ORIGINAL
											? "selected"
											: null,
									],
									text: "Original",
									onclick: () => set_units(UNITS.ORIGINAL),
								},
								{
									tag: "button",
									classes: [
										"rounded-button",
										"black",
										CURRENT_UNITS === UNITS.METRIC
											? "selected"
											: null,
									],
									text: "Metric",
									onclick: () => set_units(UNITS.METRIC),
								},
							],
						},
						{
							tag: "div",
							children: [
								{
									tag: "button",
									classes: [
										"rounded-button",
										"black",
										equals(CURRENT_QUANTITY, 0.5)
											? "selected"
											: null,
									],
									text: "0.5x",
									onclick: () => set_quantity(0.5),
								},
								{
									tag: "button",
									classes: [
										"rounded-button",
										"black",
										equals(CURRENT_QUANTITY, 1.0)
											? "selected"
											: null,
									],
									text: "1x",
									onclick: () => set_quantity(1),
								},
								{
									tag: "button",
									classes: [
										"rounded-button",
										"black",
										equals(CURRENT_QUANTITY, 2.0)
											? "selected"
											: null,
									],
									text: "2x",
									onclick: () => set_quantity(2),
								},
							],
						},
					],
				});
			}

			for (let header of contentDiv.querySelectorAll("h1,h2,h3,h4")) {
				let list = header.nextSibling;
				if (
					list &&
					list.hasChildNodes() &&
					list.classList.contains("list")
				) {
					add_child(
						{
							tag: "a",
							text: " +",
							classes: ["focused-button"],
							onclick: () => {
								focus([header, list]);
							},
						},
						header
					);

					add_child(
						{
							tag: "a",
							text: " close",
							classes: ["close-focused-button"],
						},
						header
					);
				}
			}

			for (let element of document.querySelectorAll(
				".amount, .temperature"
			)) {
				let oldTextContent = element.textContent;
				newTextContent = try_convert_and_resize(
					oldTextContent,
					CURRENT_QUANTITY,
					CURRENT_UNITS
				);
				if (newTextContent === null) {
					element.classList.add("failed");
				} else if (newTextContent !== oldTextContent) {
					element.textContent = newTextContent;
					element.classList.add("converted");
				}
			}
		};

*/

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
			disabled={!data}
			onclick={async () => {
				if ($data) {
					let markdown = data_to_markdown_string($data);
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
		{#if $data}
			{#if $data?.title}
				<h1>{$data?.title}</h1>
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
				</div>
			</div>

			<List
				title="Ingredients"
				{show_colors}
				list={$data.ingredients}
				keywords={$data.keywords}
			/>

			<List
				title="Instructions"
				{show_colors}
				list={$data.instructions}
				keywords={$data.keywords}
			/>

			<List
				title="Notes"
				{show_colors}
				list={$data.notes}
				keywords={$data.keywords}
			/>
		{/if}
	</div>
</main>

<style lang="scss">
</style>
