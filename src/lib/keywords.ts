import { AMOUNT_REGEX, LI_PREFIX } from "./constants";
import { ChildType, type IRecipe, type Keywords } from "./types";
import {
	get_last_word,
	is_number,
	iter_over_unmarked_sections,
	longest,
} from "./utils";

export function extract_keywords(data: IRecipe) {
	let keywords: Keywords = {};

	for (let list of [data.ingredients, data.instructions]) {
		extract_keywords_generic(list, keywords, [
			{
				kw_type: ChildType.Temperature,
				regex: /(\b[0-9]+°\s*[CF]?\b)/gi,
			},
			{
				kw_type: ChildType.Amount,
				regex: new RegExp(AMOUNT_REGEX, "gi"),
			},
		]);
	}

	for (let i = 0; i < data.ingredients.length; i++) {
		let ingredient = data.ingredients[i];
		if (ingredient.startsWith(LI_PREFIX)) {
			ingredient = ingredient.replace(LI_PREFIX, "");

			// Ingredients
			{
				let regex =
					/^(?:(?:\*\*[^\*\*]+\*\*)+[\s\(\),]*)+([^,^\(^\*]+)/i;
				const match = ingredient.match(regex);
				if (match) {
					let text = match[match.length - 1].trim();
					ingredient = ingredient.replace(text, `**${text}**`);
					text = text.toLowerCase();
					keywords[text] = ChildType.Ingredient;

					// Best guess
					let pieces = text.split(" ");
					for (let i = 1; pieces.length - i > 0; i++) {
						let substring = get_last_word(text, pieces.length - i);
						keywords[substring] = ChildType.Ingredient;
					}
				}
			}
		}
		data.ingredients[i] = ingredient;
	}

	// Apply keywords, large to small
	let temp_keywords = Object.keys(keywords);
	temp_keywords.sort(longest);
	for (let i = 0; i < data.instructions.length; i++) {
		let instruction = data.instructions[i];
		for (let keyword of temp_keywords) {
			instruction = iter_over_unmarked_sections(instruction, (piece) => {
				piece = piece.replaceAll(
					new RegExp(String.raw`\b${keyword}\b`, "gi"),
					`**${keyword}**`
				);
				return piece;
			});
		}

		data.instructions[i] = instruction;
	}

	// Naked numbers
	let regex = /(\b[0-9]+)\b/gi;
	for (let list of [data.ingredients, data.instructions]) {
		for (let i = 0; i < list.length; i++) {
			let item = list[i];
			item = item
				.split(/(\*\*[^\*]+\*\*)/)
				.map((piece) => {
					if (piece.startsWith("**") && piece.endsWith("**")) {
						return piece;
					}
					let matches = piece.match(regex);
					if (matches) {
						piece = piece.replaceAll(regex, "**$1**");
						for (let match of matches) {
							keywords[match] = ChildType.Amount;
						}
					}
					return piece;
				})
				.join("");
			list[i] = item;
		}
	}

	return keywords;
}

function extract_keywords_generic(
	list: string[],
	keywords: Keywords,
	regexes: { regex: RegExp; kw_type: ChildType }[]
) {
	for (let i = 0; i < list.length; i++) {
		for (let r of regexes) {
			let regex = r.regex;
			let kw_type = r.kw_type;

			list[i] = iter_over_unmarked_sections(list[i], (piece: string) => {
				if (piece.startsWith("**") && piece.endsWith("**")) {
					return piece;
				}

				const matches = [...new Set(piece.match(regex) || [])];
				matches.sort(longest);
				for (let some_match of matches) {
					let text = some_match.trim();
					if (!text.length || is_number(text)) {
						continue;
					}
					piece = iter_over_unmarked_sections(
						piece,
						(piece: string) => piece.replaceAll(text, `**${text}**`)
					);
					text = text.toLowerCase();
					keywords[text] = kw_type;
				}
				return piece;
			});
		}
	}
}
