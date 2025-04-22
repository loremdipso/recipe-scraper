const KEYS = {
	TABS: "tabs",
};

const UNITS = {
	IMPERIAL: "imperial",
	ORIGINAL: "original",
	METRIC: "metric",
	ANY: "any",
};

let data = {};
let current_url = null;
let tabs = [];
let show_colors = true;

try {
	tabs = JSON.parse(localStorage.getItem(KEYS.TABS) || "[]");
} catch (e) {
	console.error(e);
}

const equals = (a, b) => {
	return Math.abs(a - b) < 0.01;
};

const save_tabs = () => {
	localStorage.setItem(KEYS.TABS, JSON.stringify(tabs));
};

let defs = {
	teaspoon: {
		regex: /^teaspoon[s]?$/i,
		singular: "teaspoon",
		plural: "teaspoons",
		unit: UNITS.IMPERIAL,
	},
	stick: {
		regex: /^stick[s]?$/i,
		singular: "stick",
		plural: "sticks",
		unit: UNITS.ANY,
	},
	lb: {
		regex: /^lb[s]?$/i,
		singular: "lb",
		plural: "lbs",
		unit: UNITS.IMPERIAL,
	},
	tablespoon: {
		regex: /^tablespoon[s]?$/i,
		singular: "tablespoon",
		plural: "tablespoons",
		unit: UNITS.IMPERIAL,
	},
	tbsp: {
		regex: /^tbsp[s]?$/i,
		singular: "tbsp",
		plural: "tbsps",
		unit: UNITS.IMPERIAL,
		converters: {
			ml: (value) => value * 14.787,
		},
	},
	tsp: {
		regex: /^tsp[s]?$/i,
		singular: "tsp",
		plural: "tsps",
		unit: UNITS.IMPERIAL,
		converters: {
			ml: (value) => value * 4.929,
		},
	},
	oz: {
		regex: /^oz[s]?$/i,
		singular: "oz",
		plural: "oz",
		unit: UNITS.METRIC,
	},
	ml: {
		regex: /^ml[s]?$/i,
		singular: "ml",
		plural: "mls",
		unit: UNITS.METRIC,
	},
	g: {
		regex: /^g[s]?$/i,
		singular: "g",
		plural: "g",
		join: true,
		unit: UNITS.METRIC,
	},
	cm: {
		regex: /^cm[s]?$/i,
		singular: "cm",
		plural: "cms",
		unit: UNITS.METRIC,
		converters: {
			inch: (value) => value / 2.54,
		},
	},
	celsius: {
		regex: /°C?$/i,
		singular: "°C",
		plural: "°C",
		unit: UNITS.METRIC,
		join: true,
		converters: {
			fahrenheit: (value) => (value * 9) / 5 + 32,
		},
	},
	fahrenheit: {
		regex: /°F?$/i,
		singular: "°F",
		plural: "°F",
		unit: UNITS.IMPERIAL,
		join: true,
		converters: {
			celsius: (value) => ((value - 32) * 5) / 9,
		},
	},
	cup: {
		regex: /^cup[s]?$/i,
		singular: "cup",
		plural: "cups",
		unit: UNITS.IMPERIAL,
		converters: {
			ml: (value) => value * 236.5882365,
		},
	},
	quart: {
		regex: /^quart[s]?$/i,
		singular: "quart",
		plural: "quarts",
		unit: UNITS.IMPERIAL,
	},
	ounce: {
		regex: /^ounce[s]?$/i,
		singular: "ounce",
		plural: "ounces",
		unit: UNITS.METRIC,
	},
	inch: {
		regex: /^"?$/i,
		singular: '"',
		plural: '"',
		join: true,
		unit: UNITS.IMPERIAL,
		converters: {
			cm: (value) => value * 2.54,
		},
	},
	hour: {
		regex: /hour[s]?$/i,
		skip: true,
	},
	minute: {
		regex: /minute[s]?$/i,
		skip: true,
	},
	day: {
		regex: /day[s]?$/i,
		skip: true,
	},
};

const try_convert_and_resize = (text, quantity, units) => {
	if (
		Number(text).toString() === text ||
		(equals(quantity, 1) && units === UNITS.ORIGINAL)
	) {
		return text;
	}

	for (let def of Object.values(defs)) {
		if (def.regex.exec(text) != null) {
			if (def.skip) {
				return text;
			}
		}
	}

	let fix_match = (match) => {
		match = match.trim();
		if (Number(match).toString() == match) {
			return Number(match);
		}

		let matches = match.match(/^([0-9]+)\/([0-9]+)$/);
		if (matches) {
			return Number(matches[1]) / Number(matches[2]);
		}

		matches = match.match(/^([0-9])\s([0-9]+)\/([0-9]+)$/);
		if (matches) {
			return Number(matches[1]) + Number(matches[2]) / Number(matches[3]);
		}

		return NaN;
	};

	let matches = text.match(
		new RegExp(
			fix_regex(
				String.raw`
		// Number and space prefix
		(?:[0-9]+ )?

		// Some number
		[0-9]+

		// number-[other number]
		(?:\s*[\/-]\s*[0-9]+)*

		// number and [other number]
		(?: and [0-9]+)?

		(?:\/[0-9]+)*
	`
			),
			"gi"
		)
	);

	if (matches == null) {
		return null;
	}

	for (let i = 0; i < matches.length; i++) {
		let match = matches[i];
		matches[i] = fix_match(match);
		text = text.replace(match, "").trim();
	}

	let value = matches.reduce((acc, match) => acc + match, 0);
	if (value < 0 || isNaN(value)) {
		return null;
	}

	let convert = (def) => {
		let new_value = value * quantity;

		if (units !== def.unit) {
			if (def.converters) {
				let converter_key = Object.keys(def.converters)[0];
				new_value = Math.round(
					def.converters[converter_key](new_value)
				);
				def = defs[converter_key];
			} else {
				return null;
			}
		}

		if (equals(new_value, 1)) {
			if (def.join) {
				return `${new_value}${def.singular}`;
			}
			return `${new_value} ${def.singular}`;
		}

		if (def.join) {
			return `${new_value}${def.plural}`;
		}
		return `${new_value} ${def.plural}`;
	};

	for (let def of Object.values(defs)) {
		if (def.regex.exec(text) != null) {
			let value = convert(def);
			if (value) {
				return value;
			}
		}
	}

	return null;
};

let fix_regex = (text) => {
	return text.replaceAll(/^\s+(\/\/.*)?/gm, "").replaceAll("\n", "");
};

const find_tab = (url) => {
	for (let tab of tabs) {
		if (tab.url === url) {
			return tab;
		}
	}
	return null;
};

const add_tab = (url, data, save = true) => {
	remove_tab(url, false);
	tabs.push({ url, data });
	if (save) {
		save_tabs();
	}
};

const remove_tab = (url, save = true) => {
	tabs = tabs.filter((e) => e.url !== url);
	if (current_url === url) {
		current_url = "";
	}

	if (save) {
		save_tabs();
	}
};

const remove_markdown = (text) => {
	return text.replaceAll("**", "");
};

const get_last_word = (text, number_of_pieces = 1) => {
	let pieces = text.split(" ");
	while (pieces.length > number_of_pieces) {
		pieces.shift();
	}
	return pieces.join(" ");
};

const AMOUNT_REGEX_RAW = fix_regex(String.raw`
	(?:
		// Number and space prefix
		(?:[0-9]+ )?

		// Some number
		[0-9]+

		// number-[other number]
		(?:\s*[\/-]\s*[0-9]+)*

		// number and [other number]
		(?: and [0-9]+)?

		(?:\/[0-9]+)*

		\s*

		(?:\bteaspoon[s]?\b)*

		(?:\bquart[s]?\b)*

		(?:\bstick[s]?\b)*

		(?:\blb[s]?\b)*\s*

		(?:\btsp[s]?\b)*\s*

		(?:\btbsp[s]?\b)*\s*

		(?:\btablespoon[s]?\b)*

		(?:lb[s]\b)*

		(?:\bounce[s]\b)*

		(?:oz[s]?\b)*

		(?:ml[s]?\b)*

		(?:g[s]?\b)*

		(?:cm[s]?\b)*

		(?:cup[s]?\b)*

		(?:day[s]?\b)*

		(?:minute[s]?\b)*

		(?:hour[s]?\b)*

		(?:\")*
	)`);
// const AMOUNT_REGEX = String.raw`${AMOUNT_REGEX_RAW}(?: / ${AMOUNT_REGEX_RAW})*`;
const AMOUNT_REGEX = String.raw`${AMOUNT_REGEX_RAW}`;

const extract_keywords_generic = (list, keywords, regexes) => {
	for (let i = 0; i < list.length; i++) {
		let value = list[i];

		for (let r of regexes) {
			let regex = r.regex;
			let kw_type = r.kw_type;

			const match = value.match(regex);
			if (match) {
				for (let some_match of match) {
					let text = some_match.trim();
					if (!text.length || Number(text).toString() === text) {
						continue;
					}
					value = value.replace(text, `**${text}**`);
					text = text.toLowerCase();
					keywords[text] = kw_type;
				}
			}
		}

		list[i] = value;
	}
};

const extract_keywords = (data) => {
	let keywords = {};

	for (let list of [data.ingredients, data.instructions]) {
		extract_keywords_generic(list, keywords, [
			{
				kw_type: "amount",
				regex: new RegExp(String.raw`(${AMOUNT_REGEX})`, "gi"),
			},
			{
				kw_type: "temperature",
				regex: /(\b[0-9]+°\s*[CF]?\b)/gi,
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
					keywords[text] = "ingredient";

					// Best guess
					let pieces = text.split(" ");
					for (let i = 1; pieces.length - i > 0; i++) {
						let substring = get_last_word(text, pieces.length - i);
						keywords[substring] = "ingredient";
					}
				}
			}
		}
		data.ingredients[i] = ingredient;
	}

	let temp_keywords = Object.keys(keywords);
	temp_keywords.sort((a, b) => b.length - a.length);
	for (let i = 0; i < data.instructions.length; i++) {
		let instruction = data.instructions[i];
		for (let keyword of temp_keywords) {
			instruction = instruction
				.split(/(\*\*[^\*]+\*\*)/)
				.map((piece) => {
					if (piece.startsWith("**") && piece.endsWith("**")) {
						return piece;
					}
					piece = piece.replaceAll(
						new RegExp(String.raw`\b${keyword}\b`, "gi"),
						`**${keyword}**`
					);
					return piece;
				})
				.join("");
		}

		data.instructions[i] = instruction;
	}

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
							keywords[match] = "amount";
						}
					}
					return piece;
				})
				.join("");
			list[i] = item;
		}
	}

	return keywords;
};

const generate_id_for_keyword = (keywords, term) => {
	term = term.toLowerCase();
	let last_word = get_last_word(term);
	if (keywords[last_word]) {
		return last_word;
	}
	return term.replaceAll(/\s/g, "_");
};

let ID = 0;
const generate_unique_id = (prefix) => {
	return `${prefix}_${++ID}`;
};

let SELECTED_KEYWORD = null;
const click_keyword = (e) => {
	e.preventDefault();
	for (let element of document.querySelectorAll(`.selected`)) {
		element.classList.remove("selected");
	}

	if (e.target.id === SELECTED_KEYWORD) {
		SELECTED_KEYWORD = null;
	} else {
		SELECTED_KEYWORD = e.target.id;
		for (let element of document.querySelectorAll(`#${e.target.id}`)) {
			element.classList.add("selected");
			while (element) {
				if (element.tagName == "LABEL") {
					element.classList.add("selected");
					break;
				}
				element = element.parentElement;
			}
		}
	}
};

const checkbox_on_change = (e) => {
	for (let element of document.querySelectorAll(`#${e.target.id}`)) {
		if (element != e.target) {
			element.checked = e.target.checked;
		}
	}
};

let State = {
	None: 0,
	Ingredients: 1,
	Instructions: 2,
	Notes: 3,
};

const SUB_HEADER_PREFIX = "### ";
const SUB_SUB_HEADER_PREFIX = "#### ";
const LI_PREFIX = "   - ";

let get_title = (doc) => {
	for (let meta of doc.querySelectorAll("meta")) {
		let property = meta.getAttribute("property");
		if (property === "og:title") {
			return meta.getAttribute("content") || "";
		}
	}
	return "";
};

const split_text = (value, keywords) => {
	if (!show_colors) {
		return [
			{
				tag: "span",
				text: value,
			},
		];
	}
	let elements = [];

	for (let text of value.split(/(\*\*[^\*]+\*\*)/)) {
		if (text.startsWith("**") && text.endsWith("**")) {
			text = text.replace(/^\*\*/, "").replace(/\*\*$/, "");
			let some_class = keywords[text.toLowerCase()] || "unknown";
			let classes = [some_class];
			let onclick = null;
			if (some_class == "ingredient") {
				classes.push("clickable-keyword");
				onclick = click_keyword;
			}

			elements.push({
				tag: "b",
				text,
				classes,
				onclick,
				attributes: {
					id: generate_id_for_keyword(keywords, text.toLowerCase()),
				},
			});
		} else {
			elements.push({
				tag: "span",
				text,
			});
		}
	}
	return elements;
};

const extract_text = (element) => {
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

	return element.textContent
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
};

let extract_data = (text, title) => {
	let parser = new DOMParser();
	let doc = parser.parseFromString(text, "text/html");
	let state = State.None;
	let level = null;
	let ingredients = [];
	let instructions = [];
	let notes = [];
	title = title || get_title(doc);
	let elements = [...doc.querySelectorAll("li,p,h1,h2,h3,h4,h5,h6")];
	let firstIndex = Math.max(
		0,
		elements
			.map((e) => extract_text(e))
			.findLastIndex((e) => e.toLowerCase() === "ingredients")
	);

	for (let i = firstIndex; i < elements.length; i++) {
		let element = elements[i];

		// Remove any junk from a header
		if (element.nodeName.startsWith("H")) {
			if (element.nodeName == level) {
				state = State.None;
			}
		}

		let text = extract_text(element);
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
	};
};

const get_markdown_list = (list, keywords, title) => {
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
};

const data_to_markdown_string = (data) => {
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
};

window.onload = () => {
	const contentDiv = document.querySelector(".content");
	const myRecipesDiv = document.querySelector(".my-recipes");
	const outputDiv = document.querySelector(".output");

	const copyFromClipboardButton = document.querySelector(
		"#copy-from-clipboard-button"
	);
	const copyMarkdownToClipboardButton = document.querySelector(
		"#copy-markdown-to-clipboard-button"
	);

	const show_my_recipes = () => {
		clear_div(myRecipesDiv);

		myRecipesDiv.removeAttribute("hidden");
		contentDiv.setAttribute("hidden", true);
		if (focused_pane_element) {
			focused_pane_element.classList.add("hidden");
		}

		{
			let parent = add_child(
				{ tag: "div", classes: ["my-recipes-header"] },
				myRecipesDiv
			);
			add_child(
				{
					tag: "h2",
					text: "My Saved Recipes",
					classes: ["grow", "no-margin"],
				},
				parent
			);
			let back_button = add_child(
				{ tag: "button", text: "Back", classes: ["red", "shrink"] },
				parent
			);
			back_button.addEventListener("click", () => {
				show_current_recipe();
			});
		}

		for (let i = tabs.length - 1; i >= 0 && tabs.length; i--) {
			let tab = tabs[i];
			let parent = add_child(
				{ tag: "div", classes: ["recipe-row"] },
				myRecipesDiv
			);
			parent.addEventListener("click", (event) => {
				event.stopPropagation();
				doit(tab.url);
			});

			add_child(
				{
					tag: "span",
					text: tab.data.title || "<missing title>",
					classes: ["grow"],
				},
				parent
			);
			let delete_button = add_child(
				{ tag: "button", text: "Delete", classes: ["red", "shrink"] },
				parent
			);
			delete_button.addEventListener("click", (event) => {
				event.stopPropagation();
				remove_tab(tab.url);
				show_my_recipes();
			});
		}
	};

	const show_current_recipe = () => {
		myRecipesDiv.setAttribute("hidden", true);
		contentDiv.removeAttribute("hidden");
		if (focused_pane_element) {
			focused_pane_element.classList.remove("hidden");
		}
	};

	const add_child = (data, parent = outputDiv) => {
		if (data instanceof Array) {
			for (let child of data) {
				add_child(child, parent);
			}
			return null;
		} else {
			if (!data.tag) {
				if (data.text) {
					parent.append(data.text);
				}
				return null;
			}

			let child = document.createElement(data.tag);
			if (data.text) {
				child.textContent = data.text;
			}

			if (parent) {
				if (data.prepend) {
					parent.prepend(child);
				} else {
					parent.appendChild(child);
				}
			}

			if (data.attributes) {
				for (let key of Object.keys(data.attributes)) {
					child.setAttribute(key, data.attributes[key]);
				}
			}
			if (data.classes) {
				for (let some_class of data.classes) {
					if (some_class) {
						child.classList.add(some_class);
					}
				}
			}
			if (data.style) {
				for (let style of Object.keys(data.style)) {
					child.style[style] = data.style[style];
				}
			}
			if (data.children) {
				add_child(data.children, child);
			}
			if (data.onclick) {
				child.addEventListener("click", data.onclick);
			}
			if (data.onchange) {
				child.addEventListener("change", data.onchange);
			}
			if (data.onmousedown) {
				child.addEventListener("mousedown", data.onmousedown);
				child.addEventListener("touchstart", data.onmousedown);
			}
			if (data.ondrag) {
				child.addEventListener("drag", data.ondrag);
			}
			if (data.ondragstart) {
				child.addEventListener("dragstart", data.ondragstart);
			}
			if (data.ondragend) {
				child.addEventListener("dragend", data.ondragend);
			}

			return child;
		}
	};

	const clear_div = (div = outputDiv) => {
		div.innerHTML = "";
	};

	const show = (element) => {
		element.removeAttribute("hidden");
	};

	const hide = (element) => {
		element.setAttribute("hidden", "");
	};

	let focused_pane_element = null;
	const remove_focused_panes = () => {
		for (let element of document.querySelectorAll(".focus-pane")) {
			element.parentElement.removeChild(element);
		}
	};

	const focus = (elements) => {
		remove_focused_panes();

		let shared_data = { did_drag: false, total_height: 0 };

		let pane = add_child(
			{
				tag: "div",
				style: {
					"min-height": `30vh`,
				},
				classes: ["focus-pane"],
			},
			document.body
		);

		let content = add_child(
			{
				tag: "div",
				classes: ["focus-pane-content"],
				prepend: true,
			},
			pane
		);

		for (let element of elements) {
			content.appendChild(element.cloneNode(true));
		}

		add_child(
			{
				tag: "div",
				classes: ["resize-handle"],
				onmousedown: (e) => {
					e.preventDefault();

					let mousemove = (e) => {
						e.preventDefault();
						let height =
							document.body.clientHeight -
							(e.pageY || e.touches[0].pageY);
						pane.style.minHeight = `max(20px, min(${height}px, ${shared_data.total_height}px))`;
					};

					let mouseup = (e) => {
						e.preventDefault();
						shared_data.did_drag = true;
						document.removeEventListener("mousemove", mousemove);
						document.removeEventListener("touchmove", mousemove);
						document.removeEventListener("mouseup", mouseup);
						setTimeout(() => {
							shared_data.did_drag = false;
						}, 0);
					};

					document.addEventListener("mousemove", mousemove);
					document.addEventListener("touchmove", mousemove);
					document.addEventListener("mouseup", mouseup);
				},
			},
			pane
		);

		for (let button of pane.querySelectorAll(".close-focused-button")) {
			button.addEventListener("click", remove_focused_panes);
		}

		shared_data.total_height = content.scrollHeight + 10;
		pane.style.minHeight = `min(30vh, ${shared_data.total_height}px)`;

		for (let input of content.querySelectorAll("input")) {
			input.addEventListener("change", checkbox_on_change);
		}

		for (let keywordEl of content.querySelectorAll(".clickable-keyword")) {
			keywordEl.addEventListener("click", click_keyword);
		}

		focused_pane_element = pane;
	};

	let CURRENT_UNITS = UNITS.ORIGINAL;
	const set_units = (new_units) => {
		if (new_units === CURRENT_UNITS) {
			return;
		}

		CURRENT_UNITS = new_units;
		doit(current_url);
	};

	let CURRENT_QUANTITY = 1.0;
	const set_quantity = (new_quantity) => {
		if (equals(new_quantity, CURRENT_QUANTITY)) {
			return;
		}

		CURRENT_QUANTITY = new_quantity;
		doit(current_url);
	};

	const render_data = (data, url) => {
		data = structuredClone(data);
		let keywords = {};
		if (show_colors) {
			keywords = extract_keywords(data);
		}

		// Clear the old data out
		clear_div();
		remove_focused_panes();

		if (data.title) {
			add_child({ tag: "h1", text: data.title });
		}

		if (url) {
			add_child({
				tag: "div",
				classes: ["flex-row"],
				children: [
					{
						tag: "a",
						text: "Toggle colors",
						onclick: () => {
							show_colors = !show_colors;
							doit(current_url);
						},
					},
					{
						tag: "a",
						text: "Open the original",
						attributes: {
							target: "_blank",
							href: url,
						},
					},
				],
			});
			add_child({
				tag: "div",
				classes: ["flex-row"],
				children: [
					{
						tag: "div",
						children: [
							{
								tag: "button",
								classes: [
									"rounded-button",
									"black",
									CURRENT_UNITS === UNITS.IMPERIAL
										? "selected"
										: null,
								],
								text: "Imperial",
								onclick: () => set_units(UNITS.IMPERIAL),
							},
							{
								tag: "button",
								classes: [
									"rounded-button",
									"black",
									CURRENT_UNITS === UNITS.ORIGINAL
										? "selected"
										: null,
								],
								text: "Original",
								onclick: () => set_units(UNITS.ORIGINAL),
							},
							{
								tag: "button",
								classes: [
									"rounded-button",
									"black",
									CURRENT_UNITS === UNITS.METRIC
										? "selected"
										: null,
								],
								text: "Metric",
								onclick: () => set_units(UNITS.METRIC),
							},
						],
					},
					{
						tag: "div",
						children: [
							{
								tag: "button",
								classes: [
									"rounded-button",
									"black",
									equals(CURRENT_QUANTITY, 0.5)
										? "selected"
										: null,
								],
								text: "0.5x",
								onclick: () => set_quantity(0.5),
							},
							{
								tag: "button",
								classes: [
									"rounded-button",
									"black",
									equals(CURRENT_QUANTITY, 1.0)
										? "selected"
										: null,
								],
								text: "1x",
								onclick: () => set_quantity(1),
							},
							{
								tag: "button",
								classes: [
									"rounded-button",
									"black",
									equals(CURRENT_QUANTITY, 2.0)
										? "selected"
										: null,
								],
								text: "2x",
								onclick: () => set_quantity(2),
							},
						],
					},
				],
			});
		}

		render_list(data.ingredients, keywords, "Ingredients");
		render_list(data.instructions, keywords, "Instructions");
		render_list(data.notes, keywords, "Notes");

		for (let header of contentDiv.querySelectorAll("h1,h2,h3,h4")) {
			let list = header.nextSibling;
			if (
				list &&
				list.hasChildNodes() &&
				list.classList.contains("list")
			) {
				add_child(
					{
						tag: "a",
						text: " +",
						classes: ["focused-button"],
						onclick: () => {
							focus([header, list]);
						},
					},
					header
				);

				add_child(
					{
						tag: "a",
						text: " close",
						classes: ["close-focused-button"],
					},
					header
				);
			}
		}

		for (let element of document.querySelectorAll(
			".amount, .temperature"
		)) {
			let oldTextContent = element.textContent;
			newTextContent = try_convert_and_resize(
				oldTextContent,
				CURRENT_QUANTITY,
				CURRENT_UNITS
			);
			if (newTextContent === null) {
				element.classList.add("failed");
			} else if (newTextContent !== oldTextContent) {
				element.textContent = newTextContent;
				element.classList.add("converted");
			}
		}
	};

	const render_list = (list, keywords, title) => {
		if (list.length) {
			add_child({ tag: "h2", text: title });
			let parent = add_child({ tag: "div", classes: ["list"] });
			for (let item of list) {
				if (item.startsWith(LI_PREFIX)) {
					item = item.substr(LI_PREFIX.length);
				} else if (item.startsWith(SUB_HEADER_PREFIX)) {
					item = item.substr(SUB_HEADER_PREFIX.length);
					add_child({ tag: "h3", text: remove_markdown(item) });
					parent = add_child({ tag: "div", classes: ["list"] });
					continue;
				} else if (item.startsWith(SUB_SUB_HEADER_PREFIX)) {
					item = item.substr(SUB_SUB_HEADER_PREFIX.length);
					add_child({ tag: "h4", text: remove_markdown(item) });
					parent = add_child({ tag: "div", classes: ["list"] });
					continue;
				}

				// Simple li
				// add_child({ tag: "li", text: item }, parent);

				// More complex checkbox
				add_child(
					{
						tag: "label",
						children: [
							{
								tag: "input",
								onchange: checkbox_on_change,
								attributes: {
									id: generate_unique_id("checkbox"),
									type: "checkbox",
								},
							},
							{
								tag: "div",
								children: split_text(item, keywords),
							},
						],
					},
					parent
				);
			}
		}
	};

	const set_data = (url, new_data) => {
		current_url = url;
		data = new_data;
		copyMarkdownToClipboardButton.removeAttribute("disabled");
		render_data(data, url);
	};

	const valid_url = (url) => {
		if (!url || !url.length || url.length > 500) {
			return false;
		}

		try {
			url = new URL(url);
		} catch (_) {
			return false;
		}

		return url.protocol === "http:" || url.protocol === "https:";
	};

	const show_help = () => {
		clear_div();
		add_child([
			{
				tag: "p",
				text: "Welcome to recipe scraper!",
			},
			{
				tag: "p",
				text: "New here? ",
				children: [
					{
						tag: "a",
						text: "Here",
						attributes: {
							href: "https://github.com/loremdipso/recipe-scraper?tab=readme-ov-file#recipe-scraper",
							target: "_blank",
						},
					},
					{
						tag: "span",
						text: " are some instructions to get you started.",
					},
				],
			},
		]);
	};

	const doit = (url, title, force_refresh) => {
		// unlikely we're going to run out of numbers, but still...
		ID = 0;
		SELECTED_KEYWORD = null;
		show_current_recipe();

		if (!force_refresh) {
			let tab = find_tab(url);
			if (tab) {
				set_data(tab.url, tab.data);
				return;
			}
		}

		if (!valid_url(url)) {
			show_help();
			return;
		}

		fetch(`https://corsproxy.io/?url=${encodeURI(url)}`).then((result) => {
			if (result.status !== 200) {
				clear_div();
				add_child({
					tag: "h1",
					text: `Uh-oh, got an error code while trying to fetch that recipe. Sorry :/ Some sites don't work with this app, unfortunately`,
				});
			} else {
				result.text().then((text) => {
					let data = extract_data(text, title);
					add_tab(url, data);
					set_data(url, data);
				});
			}
		});
	};

	copyFromClipboardButton.addEventListener("click", async () => {
		const items = await navigator.clipboard.read();
		for (const item of items) {
			for (const type of item.types) {
				const blob = await item.getType(type);
				const text = await blob.text();
				doit(text);
				return;
			}
		}
	});

	copyMarkdownToClipboardButton.addEventListener("click", async () => {
		let markdown = data_to_markdown_string(data);
		await navigator.clipboard.writeText(markdown);
	});

	let url = new URL(document.location);
	const sharedLink =
		url.searchParams.get("link") ||
		url.searchParams.get("description") ||
		url.searchParams.get("url");
	if (sharedLink) {
		doit(
			decodeURI(sharedLink),
			decodeURIComponent(url.searchParams.get("name") || "")
		);
	} else {
		show_help();
	}

	let installPrompt = null;
	const installButton = document.querySelector("#install-button");
	window.addEventListener("beforeinstallprompt", (event) => {
		event.preventDefault();
		installPrompt = event;
		show(installButton);
	});

	installButton.addEventListener("click", async () => {
		if (!installPrompt) {
			return;
		}
		await installPrompt.prompt();
		installPrompt = null;
		hide(installButton);
	});

	const reloadButton = document.querySelector("#reload-button");
	reloadButton.addEventListener("click", async () => {
		if (current_url) {
			doit(current_url, "", true);
		}
	});

	const myRecipesButton = document.querySelector("#my-recipes-button");
	myRecipesButton.addEventListener("click", async () => {
		show_my_recipes();
	});
};

function make_resizable(element, handle) {}
