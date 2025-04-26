import {
	KEYS,
	LI_PREFIX,
	SUB_HEADER_PREFIX,
	SUB_SUB_HEADER_PREFIX,
	UNITS,
} from "./constants";
import { try_convert_and_resize } from "./converters";
import { notify } from "./globals.svelte";
import { extract_keywords } from "./keywords";
import { extract_data } from "./parser";
import { split_text } from "./renderers";
import { ChildType, type IRecipe, type ISection, type Keywords } from "./types";
import { remove_markdown, valid_url } from "./utils";

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

export function fix_data(
	data: IRecipe | null,
	do_extract_keywords: boolean
): IRecipe | null {
	if (!data) {
		return null;
	}
	let new_data = structuredClone(data);

	let keywords = extract_keywords(new_data);
	new_data.keywords = keywords;

	return new_data;
}

export function get_meta_sections(
	data: IRecipe | null,
	show_colors: boolean,
	units: UNITS,
	quantity: number
): ISection[][] {
	if (!data) {
		return [];
	}

	return [
		get_sections(
			"Ingredients",
			data.ingredients,
			data.keywords,
			show_colors,
			units,
			quantity
		),
		get_sections(
			"Instructions",
			data.instructions,
			data.keywords,
			show_colors,
			units,
			quantity
		),
		get_sections(
			"Notes",
			data.notes,
			data.keywords,
			show_colors,
			units,
			quantity
		),
	];
}

export function get_sections(
	title: string,
	list: string[],
	keywords: Keywords,
	show_colors: boolean,
	units: UNITS,
	quantity: number
): ISection[] {
	let sections = [];
	let current_section: ISection = {
		text: title,
		level: 2,
		children: [],
	};

	if (list.length) {
		sections.push(current_section);

		for (let item of list) {
			if (item.startsWith(LI_PREFIX)) {
				item = item.substr(LI_PREFIX.length);
			} else if (item.startsWith(SUB_HEADER_PREFIX)) {
				item = item.substr(SUB_HEADER_PREFIX.length);
				sections.push(
					(current_section = {
						level: 3,
						text: remove_markdown(item),
						children: [],
					})
				);
				sections.push(current_section);
				continue;
			} else if (item.startsWith(SUB_SUB_HEADER_PREFIX)) {
				item = item.substr(SUB_SUB_HEADER_PREFIX.length);
				sections.push(
					(current_section = {
						level: 4,
						text: remove_markdown(item),
						children: [],
					})
				);
				continue;
			}

			current_section.children.push(
				split_text(item, keywords, show_colors)
			);
		}

		for (let section of sections) {
			for (let meta_child of section.children) {
				for (let child of meta_child) {
					switch (child.type) {
						case ChildType.Amount:
							let oldTextContent = child.text;
							let newTextContent = try_convert_and_resize(
								oldTextContent,
								quantity,
								units
							);

							if (newTextContent === null) {
								child.failed = true;
							} else if (newTextContent !== oldTextContent) {
								child.text = newTextContent;
								child.converted = true;
							}
							break;
						default:
							break;
					}
				}
			}
		}
	}

	return sections;
}
