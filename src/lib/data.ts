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
import {
	FragmentType as FragmentType,
	type IRecipe,
	type ISection,
	type Keywords,
} from "./types";
import {
	generate_id_for_keyword,
	generate_unique_id,
	remove_markdown,
	valid_url,
} from "./utils";

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

	if (do_extract_keywords) {
		new_data.keywords = extract_keywords(new_data);
	} else {
		new_data.keywords = {};
	}

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
		rows: [],
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
						rows: [],
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
						rows: [],
					})
				);
				continue;
			}

			current_section.rows.push({
				fragments: split_text(item, keywords, show_colors),
				id: generate_unique_id("row"),
			});
		}

		for (let section of sections) {
			for (let row of section.rows) {
				for (let fragment of row.fragments) {
					switch (fragment.type) {
						case FragmentType.Ingredient:
							fragment.id = generate_id_for_keyword(
								keywords,
								fragment.text
							);
							break;

						case FragmentType.Amount:
							let oldTextContent = fragment.text;
							let newTextContent = try_convert_and_resize(
								oldTextContent,
								quantity,
								units
							);

							if (newTextContent === null) {
								fragment.failed = true;
							} else if (newTextContent !== oldTextContent) {
								fragment.text = newTextContent;
								fragment.converted = true;
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
