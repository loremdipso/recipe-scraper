import { SUB_HEADER_PREFIX, SUB_SUB_HEADER_PREFIX } from "./constants";
import { ChildType, type IChild, type IRecipe, type Keywords } from "./types";
import { remove_markdown } from "./utils";

export function get_markdown_list(
	list: string[],
	keywords: Keywords,
	title: string
): string {
	let rv = "";
	if (list.length) {
		rv += `\n\n## ${title}\n`;
		for (let item of list) {
			if (
				item.startsWith(SUB_HEADER_PREFIX) ||
				item.startsWith(SUB_SUB_HEADER_PREFIX)
			) {
				item = `\n\n${item}\n`;
			} else {
				rv += `\n${item}`;
			}
		}
	}
	return rv;
}

export function data_to_markdown_string(data: IRecipe): string {
	let markdown = "";

	if (data.title) {
		markdown += `# ${data.title}\n`;
	}

	markdown += get_markdown_list(
		data.ingredients,
		data.keywords,
		"Ingredients"
	);
	markdown += get_markdown_list(
		data.instructions,
		data.keywords,
		"Instructions"
	);
	markdown += get_markdown_list(data.notes, data.keywords, "Notes");

	return markdown.trim();
}

export function split_text(
	value: string,
	keywords: Keywords,
	show_colors: boolean
): IChild[] {
	if (!show_colors) {
		return [
			{
				type: ChildType.Plain,
				text: remove_markdown(value),
			},
		];
	}

	let children: IChild[] = [];
	for (let text of value.split(/(\*\*[^\*]+\*\*)/)) {
		if (!text) {
			continue;
		}

		if (text.startsWith("**") && text.endsWith("**")) {
			text = text.replace(/^\*\*/, "").replace(/\*\*$/, "");

			children.push({
				text,
				type: keywords[text.toLowerCase()] || ChildType.Unknown,
			});
		} else {
			let piece = text;
			for (let text of piece.split(/(\*[^\*]+\*)/)) {
				if (!text) {
					continue;
				}
				if (text.startsWith("*") && text.endsWith("*")) {
					text = text.replace(/^\*/, "").replace(/\*$/, "");
					children.push({
						type: ChildType.Italic,
						text,
					});
				} else {
					children.push({
						type: ChildType.Plain,
						text,
					});
				}
			}
		}
	}

	return children;
}
