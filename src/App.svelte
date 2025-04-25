<script lang="ts">
	import { writable } from "svelte/store";
	import GithubCorner from "./components/GithubCorner.svelte";
	import Help from "./components/Help.svelte";
	import MyRecipes from "./components/MyRecipes.svelte";
	import Notifications from "./components/Notifications.svelte";
	import Recipe from "./components/Recipe.svelte";
	import { Pages } from "./lib/constants";

	const current_page = writable(Pages.Recipe);
	let current_url = $state("");

	let url_obj = new URL((document as any).location);
	const shared_link =
		url_obj.searchParams.get("link") ||
		url_obj.searchParams.get("description") ||
		url_obj.searchParams.get("url");
	if (shared_link) {
		// TODO: what do about this?
		// decodeURIComponent(url.searchParams.get("name") || "")
		current_url = decodeURI(shared_link);
	} else {
		if (url_obj.searchParams.get("my-recipes")) {
			current_page.set(Pages.MyRecipes);
		} else {
			current_page.set(Pages.Help);
		}
	}
</script>

<GithubCorner />

{#if $current_page === Pages.Help}
	<Help />
{:else if $current_page === Pages.Recipe}
	<Recipe
		onMyRecipes={() => current_page.set(Pages.MyRecipes)}
		{current_url}
	/>
{:else if $current_page === Pages.MyRecipes}
	<MyRecipes
		onBack={() => current_page.set(Pages.Recipe)}
		onOpenUrl={(new_url) => {
			current_url = new_url;
			current_page.set(Pages.Recipe);
		}}
	/>
{/if}

<Notifications />

<style lang="scss">
</style>
