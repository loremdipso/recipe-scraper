import { KEYS } from "./constants";
import { notify } from "./globals.svelte";
import { extract_data } from "./parser";
import type { IRecipe } from "./types";
import { valid_url } from "./utils";

export function get_all_recipes(): IRecipe[] {
	try {
		return JSON.parse(localStorage.getItem(KEYS.RECIPES) || "[]");
	} catch (e) {
		console.error(e);
		return [];
	}
}

export function save_recipes(recipes: IRecipe[]) {
	localStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));
}

export function find_recipe_by_url(url: string): IRecipe | null {
	let recipes = get_all_recipes();
	for (let recipe of recipes) {
		if (recipe.url === url) {
			return recipe;
		}
	}
	return null;
}

export function add_recipe(data: IRecipe, save = true): IRecipe[] {
	let recipes = get_all_recipes();
	recipes = delete_recipe(recipes, data.url, false);
	recipes.push(data);
	if (save) {
		save_recipes(recipes);
	}
	return recipes;
}

export function delete_recipe(
	recipes: IRecipe[],
	url: string,
	save = true
): IRecipe[] {
	recipes = recipes.filter((e) => e.url !== url);

	// TODO: this
	// if (current_url === url) {
	// 	current_url = "";
	// }

	if (save) {
		save_recipes(recipes);
	}
	return recipes;
}

export async function try_load_url(
	url: string,
	title: string = "",
	force_refresh: boolean = false
): Promise<IRecipe | null> {
	console.log(url);
	// unlikely we're going to run out of numbers, but still...
	// SELECTED_KEYWORD = null;

	if (!valid_url(url)) {
		// TODO: this
		// current_page = Pages.Help;
		notify("ERROR", "error");
		return null;
	}

	if (!force_refresh) {
		let data = find_recipe_by_url(url);
		if (data) {
			notify("Done!", "success");
			return data;
		}
	}

	let result = await fetch(`https://corsproxy.io/?url=${encodeURI(url)}`);
	if (result.status !== 200) {
		// add_child({
		// 	tag: "h1",
		// 	text: `Uh-oh, got an error code while trying to fetch that recipe. Sorry :/ Some sites don't work with this app, unfortunately`,
		// });
		// "Uh-oh, got an error code while trying to fetch that recipe. Sorry :/ Some sites don't work with this app, unfortunately";
		notify("ERROR", "error");
	} else {
		let text = await result.text();
		let data = extract_data(url, text, title);
		add_recipe(data);
		// current_page = Pages.Recipe;
		notify("Done!", "success");
		return data;
	}

	return null;
}
