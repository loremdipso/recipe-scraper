<script lang="ts">
	import { get_all_recipes, delete_recipe } from "../lib/data";

	let { onBack, onOpenUrl } = $props<{
		onBack(): void;
		onOpenUrl(new_url: string): void;
	}>();

	let recipes = $state(get_all_recipes());
</script>

<main class="my-recipes">
	<div class="full-width mb1 right">
		<button class="pink shrink" onclick={() => onBack()}> Back </button>
	</div>

	<h2 class="grow no-margin">My Saved Recipes</h2>

	{#each recipes as recipe}
		<div
			class="recipe-row"
			role="button"
			onclick={(event) => {
				event.stopPropagation();
				onOpenUrl(recipe.url);
			}}
			tabindex="0"
			onkeypress={(event) => {
				// TODO
			}}
		>
			<span class="grow">
				{recipe.title || "<missing title>"}
			</span>

			<button
				class="pink shrink"
				onclick={(event) => {
					event.stopPropagation();
					recipes = delete_recipe(recipes, recipe.url);
				}}
			>
				Delete
			</button>
		</div>
	{/each}
</main>

<style lang="scss">
</style>
