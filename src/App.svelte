<script lang="ts" module>
	import GithubCorner from "./components/GithubCorner.svelte";
	import Notifications from "./components/Notifications.svelte";
	import Recipe from "./components/Recipe.svelte";
	import { Pages } from "./lib/constants";

	let current_page = Pages.Recipe;
</script>

<GithubCorner />

{#if current_page === Pages.Recipe}
	<Recipe />
{/if}

<Notifications />

<style lang="scss">
</style>
