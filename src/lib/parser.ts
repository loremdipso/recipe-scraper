import {
	LI_PREFIX,
	State,
	SUB_HEADER_PREFIX,
	SUB_SUB_HEADER_PREFIX,
} from "./constants";
import type { IRecipe } from "./types";

export function extract_text(element: HTMLElement) {
	if (element.nodeName.startsWith("H")) {
		let should_repeat = true;
		while (should_repeat) {
			should_repeat = false;
			for (let child of element.children) {
				if (child.nodeName == "DIV") {
					element.removeChild(child);
					should_repeat = true;
				}
			}
		}
	}

	let text = get_text_from_element(element)
	return text
		.replace(/▢/, "")
		.replaceAll(/(\.)([A-Z])/g, "$1 $2")
		.replace(/^(?:Step\s*)?[0-9]+\.\s+/, "")
		.replaceAll(" , ", ", ")
		.replaceAll("–", "-")
		.replaceAll("”", '"')
		.replaceAll("½", "1/2")
		.replaceAll("¾", "3/4")
		.replaceAll("⅓", "1/3")
		.replaceAll("⅔", "2/3")
		.replaceAll("¼", "1/4")
		.replaceAll(/([0-9]+)\s+-\s+([0-9]+)/g, "$1-$2")
		.trim();
}

export function extract_data(
	url: string,
	text: string,
	title: string
): IRecipe {
	let parser = new DOMParser();
	let doc = parser.parseFromString(text, "text/html");
	let state = State.None;
	let level = null;
	let keywords = {};
	let ingredients: string[] = [];
	let instructions: string[] = [];
	let notes: string[] = [];
	title = title || get_title(doc);
	let elements = [...doc.querySelectorAll("li,p,h1,h2,h3,h4,h5,h6")];
	let firstIndex = Math.max(
		0,
		elements
			.filter((e) => max_depth(e) > 2)
			.map((e) => extract_text(e as HTMLElement))
			.findLastIndex((e) => e.toLowerCase() === "ingredients" || e.toLowerCase() === "gather your ingredients")
	);

	let seen = new Set();
	for (let i = firstIndex; i < elements.length; i++) {
		let element = elements[i];
		if (!element.parentNode) {
			continue;
		}

		// Remove any junk from a header
		if (element.nodeName.startsWith("H")) {
			if (element.nodeName == level) {
				state = State.None;
			}
		}

		// if (max_depth(element) > 2) {
		// 	continue;
		// }

		if (already_seen(seen, element)) {
			continue;
		}

		let text = extract_text(element as HTMLElement);
		if (!text.length) {
			continue;
		}

		let temp = text.toLowerCase();
		switch (temp) {
			case "ingredients":
				state = State.Ingredients;
				level = element.nodeName;
				continue;
			case "instructions":
				state = State.Instructions;
				level = element.nodeName;
				continue;
			case "notes":
				state = State.Notes;
				level = element.nodeName;
				continue;
			default:
				break;
		}

		switch (element.nodeName) {
			case "H1":
			case "H2":
			case "H3":
			case "H4":
			case "H5":
			case "H6":
			case "H7":
			case "H8":
			case "H9":
				text = text.replace(/:$/, "");
				text = `${SUB_HEADER_PREFIX}${text}`;
				break;
			default:
				text = `${LI_PREFIX}${text}`;
				break;
		}

		switch (state) {
			case State.Ingredients:
				ingredients.push(text);
				break;
			case State.Instructions:
				if (text.startsWith(LI_PREFIX)) {
					let matches = text
						.replace(LI_PREFIX, "")
						.match(/^([^\.\:]+):(.+)/);
					if (matches) {
						instructions.push(
							`${SUB_SUB_HEADER_PREFIX}${matches[1]}`
						);
						instructions.push(`${LI_PREFIX}${matches[2]}`);
					} else {
						instructions.push(text);
					}
				}
				break;
			case State.Notes:
				notes.push(text);
				break;
			default:
				break;
		}
	}

	return {
		title,
		ingredients,
		instructions,
		notes,
		keywords,
		url,
	};
}

function max_depth(node: any, old_depth = 0): number {
	const new_depth = old_depth + 1;
	let max = new_depth;
	for (let child of node.children) {
		max = Math.max(max, max_depth(child, new_depth));
	}
	return max;
}

function already_seen(seen: Set<any>, element: any): boolean {
	for (let sub_element of [element, ...element.querySelectorAll("*")]) {
		if (seen.has(sub_element)) {
			return true;
		}
		seen.add(sub_element);
	}
	return false;
}

function get_title(doc: Document) {
	for (let meta of doc.querySelectorAll("meta")) {
		let property = meta.getAttribute("property");
		if (property === "og:title") {
			return meta.getAttribute("content") || "";
		}
	}
	return "";
}

function get_text_from_element(element: any): string {
	return [...element.childNodes].map((child) => {
		if (child.childNodes.length) {
			return get_text_from_element(child);
		}
		return child.textContent;
	}).join(" ").replaceAll(/  +/g, " ");
}

