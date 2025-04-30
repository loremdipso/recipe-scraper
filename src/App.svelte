<script lang="ts">
	import { writable } from "svelte/store";
	import GithubCorner from "./components/GithubCorner.svelte";
	import MyRecipes from "./components/MyRecipes.svelte";
	import Notifications from "./components/Notifications.svelte";
	import Recipe from "./components/Recipe.svelte";
	import { Pages } from "./lib/constants";
	import { get_query_url } from "./lib/utils";

	const current_page = writable(Pages.Recipe);
	let current_url = $state("");

	let query_url = get_query_url();
	if (query_url) {
		current_url = query_url;
	} else {
		let url_obj = new URL((document as any).location);
		if (url_obj.searchParams.get("my-recipes")) {
			current_page.set(Pages.MyRecipes);
		}
	}
</script>

<GithubCorner />

{#if $current_page === Pages.Recipe}
	<Recipe
		onMyRecipes={() => current_page.set(Pages.MyRecipes)}
		{current_url}
	/>
{:else if $current_page === Pages.MyRecipes}
	<MyRecipes
		onBack={() => current_page.set(Pages.Recipe)}
		{current_url}
		onOpenUrl={(new_url) => {
			current_url = new_url;
			current_page.set(Pages.Recipe);
		}}
	/>
{/if}

<Notifications />

<style lang="scss">
</style>
