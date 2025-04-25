<script lang="ts">
	import { notify } from "../components/Notifications.svelte";
	import { KEYS, UNITS } from "../lib/constants";
	import {
		equals,
		fix_regex,
		generate_id_for_keyword,
		get_last_word,
		is_number,
		iter_over_unmarked_sections,
	} from "../lib/utils";
	import { defs, convert } from "../lib/converters";

	interface IData {
		title: string;
		ingredients: string[];
		instructions: string[];
		notes: string[];
		keywords: {};
	}

	interface ITab {
		url: string;
		data: IData;
	}

	let data: IData = {
		title: "",
		instructions: [],
		ingredients: [],
		notes: [],
		keywords: {},
	};
	let current_url: string | null = null;
	let tabs: ITab[] = [];
	let show_colors = true;

	try {
		tabs = JSON.parse(localStorage.getItem(KEYS.TABS) || "[]");
	} catch (e) {
		console.error(e);
	}

	const save_tabs = () => {
		localStorage.setItem(KEYS.TABS, JSON.stringify(tabs));
	};

	const find_tab = (url: string) => {
		for (let tab of tabs) {
			if (tab.url === url) {
				return tab;
			}
		}
		return null;
	};

	const add_tab = (url: string, data: IData, save = true) => {
		remove_tab(url, false);
		tabs.push({ url, data });
		if (save) {
			save_tabs();
		}
	};

	const remove_tab = (url: string, save = true) => {
		tabs = tabs.filter((e) => e.url !== url);
		if (current_url === url) {
			current_url = "";
		}

		if (save) {
			save_tabs();
		}
	};

	const AMOUNT_REGEX = fix_regex(String.raw`
	(?:
		// Number and space prefix
		(?:[0-9]+ )?

		// Decimal prefix
		(?:\.)?

		// Some number
		[0-9]+

		// Decimal
		(?:\.[0-9]+)*

		// number-[other number]
		(?:\s*[\/-]\s*[0-9]+)*

		// number and [other number]
		(?: and [0-9]+)?

		(?:\/[0-9]+)*

		// Decimal suffix
		(?:\.[0-9]+)*

		\s*

		(?:\bteaspoon[s]?\b)?

		(?:\bquart[s]?\b)?

		(?:\bstick[s]?\b)?

		(?:\blb[s]?\b)?\s*

		(?:\btsp[s]?\b)?\s*

		(?:\btbsp[s]?\b)?\s*

		(?:\btablespoon[s]?\b)?

		(?:lb[s]?\b)?

		(?:\bounce[s]?\b)?

		(?:oz[s]?\b)?

		(?:ml[s]?\b)?

		(?:g[s]?\b)?

		(?:cm[s]?\b)?

		(?:cup[s]?\b)?

		(?:day[s]?\b)?

		(?:minute[s]?\b)?

		(?:"\b)?

		(?:\-?inch(?:es)?\b)?

		(?:hour[s]?\b)*

		(?:\")*
	)`);

	function longest(a: string, b: string) {
		return b.length - a.length;
	}

	const extract_keywords_generic = (
		list: string[],
		keywords: any,
		regexes: { regex: RegExp; kw_type: string }[]
	) => {
		for (let i = 0; i < list.length; i++) {
			for (let r of regexes) {
				let regex = r.regex;
				let kw_type = r.kw_type;

				list[i] = iter_over_unmarked_sections(
					list[i],
					(piece: string) => {
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
								(piece: string) =>
									piece.replaceAll(text, `**${text}**`)
							);
							text = text.toLowerCase();
							keywords[text] = kw_type;
						}
						return piece;
					}
				);
			}
		}
	};

	const extract_keywords = (data: IData) => {
		let keywords: any = {};

		for (let list of [data.ingredients, data.instructions]) {
			extract_keywords_generic(list, keywords, [
				{
					kw_type: "temperature",
					regex: /(\b[0-9]+°\s*[CF]?\b)/gi,
				},
				{
					kw_type: "amount",
					regex: new RegExp(String.raw`(${AMOUNT_REGEX})`, "gi"),
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
							let substring = get_last_word(
								text,
								pieces.length - i
							);
							keywords[substring] = "ingredient";
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
				instruction = iter_over_unmarked_sections(
					instruction,
					(piece) => {
						piece = piece.replaceAll(
							new RegExp(String.raw`\b${keyword}\b`, "gi"),
							`**${keyword}**`
						);
						return piece;
					}
				);
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

	let SELECTED_KEYWORD: string | null = null;
	const click_keyword = (e: any) => {
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
					element = element.parentElement as any;
				}
			}
		}
	};

	const checkbox_on_change = (e: any) => {
		for (let element of document.querySelectorAll(`#${e.target.id}`)) {
			if (element != e.target) {
				(element as any).checked = e.target.checked;
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

	let get_title = (doc: Document) => {
		for (let meta of doc.querySelectorAll("meta")) {
			let property = meta.getAttribute("property");
			if (property === "og:title") {
				return meta.getAttribute("content") || "";
			}
		}
		return "";
	};

	const split_text = (value: string, keywords: any) => {
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
			if (!text) {
				continue;
			}
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
						id: generate_id_for_keyword(
							keywords,
							text.toLowerCase()
						),
					},
				});
			} else {
				let piece = text;
				for (let text of piece.split(/(\*[^\*]+\*)/)) {
					if (!text) {
						continue;
					}
					if (text.startsWith("*") && text.endsWith("*")) {
						text = text.replace(/^\*/, "").replace(/\*$/, "");
						elements.push({
							tag: "i",
							text,
						});
					} else {
						elements.push({
							tag: "span",
							text,
						});
					}
				}
			}
		}
		return elements;
	};

	const extract_text = (element: HTMLElement) => {
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

		return (element.textContent || "")
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

	let extract_data = (text: string, title: string) => {
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
				.map((e) => extract_text(e as HTMLElement))
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
		};
	};

	const get_markdown_list = (
		list: string[],
		keywords: any,
		title: string
	) => {
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

	const data_to_markdown_string = (data: IData) => {
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

	/*
			{
				add_child(
					{
						tag: "div",
						classes: ["full-width", "mb1"],
						children: [
							{
								tag: "h2",
								text: "My Saved Recipes",
								classes: ["grow", "no-margin"],
							},
							// {
							// 	tag: "button",
							// 	text: "Quick tips",
							// 	classes: ["blue", "shrink"],
							// 	onclick: show_quick_tips,
							// },
							{
								tag: "button",
								text: "Back",
								classes: ["pink", "shrink"],
								onclick: show_current_recipe,
							},
						],
					},
					myRecipesDiv
				);
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
					{
						tag: "button",
						text: "Delete",
						classes: ["pink", "shrink"],
					},
					parent
				);
				delete_button.addEventListener("click", (event) => {
					event.stopPropagation();
					remove_tab(tab.url);
					show_my_recipes();
				});
			}
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
							document.removeEventListener(
								"mousemove",
								mousemove
							);
							document.removeEventListener(
								"touchmove",
								mousemove
							);
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

			for (let keywordEl of content.querySelectorAll(
				".clickable-keyword"
			)) {
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
					classes: ["flex-row", "center", "mb1", "mt1"],
					children: [
						{
							tag: "div",
							classes: ["flex-col"],
							children: [
								{
									tag: "a",
									text: "Toggle colors",
									classes: ["mb1"],
									onclick: () => {
										show_colors = !show_colors;
										doit(current_url);
									},
								},
								navigator.wakeLock
									? {
											tag: "label",
											children: [
												{
													tag: "input",
													onchange: (e) => {
														set_wake_lock(
															e.target.checked
														);
													},
													attributes: {
														type: "checkbox",
														checked: true,
													},
												},
												{
													text: "Keep screen on",
												},
											],
										}
									: null,
							],
						},
						{
							tag: "div",
							classes: ["flex-col", "right"],
							children: [
								{
									tag: "a",
									text: "Open the original",
									attributes: {
										target: "_blank",
										href: url,
									},
								},
								{
									tag: "a",
									text: "Reload",
									classes: ["mt1"],
									onclick: () => {
										notify("Reloading...");
										if (current_url) {
											doit(current_url, "", true);
										} else {
											notify("No url!", "error");
										}
									},
								},
							],
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
			if (current_url !== url) {
				const url_obj = new URL(window.location.href);
				url_obj.searchParams.set("url", url);
				window.history.pushState({}, "", url_obj.toString());
			}

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

			fetch(`https://corsproxy.io/?url=${encodeURI(url)}`).then(
				(result) => {
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
							notify("Done!", "success");
						});
					}
				}
			);
		};

		const copyFromClipboardButton = document.querySelector(
			"#copy-from-clipboard-button"
		);
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

		const copyMarkdownToClipboardButton = document.querySelector(
			"#copy-markdown-to-clipboard-button"
		);
		copyMarkdownToClipboardButton.addEventListener("click", async () => {
			let markdown = data_to_markdown_string(data);
			await navigator.clipboard.writeText(markdown);
			notify("Copied to clipboard :)");
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
			if (url.searchParams.get("my-recipes")) {
				show_my_recipes();
			} else {
				show_help();
			}
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

		if (navigator.share) {
			const shareButton = document.querySelector("#share-button");
			shareButton.removeAttribute("hidden");
			shareButton.addEventListener("click", async () => {
				const url_obj = new URL(window.location.href);
				url_obj.searchParams = new URLSearchParams();
				if (current_url) {
					url_obj.searchParams.set("url", current_url);
				}
				await navigator.share({
					title: "Here's a recipe for ya!",
					url: url_obj.toString(),
				});
			});
		}

		const myRecipesButton = document.querySelector("#my-recipes-button");
		myRecipesButton.addEventListener("click", async () => {
			show_my_recipes();
		});
	};

	if (navigator.wakeLock) {
		document.addEventListener("visibilitychange", async () => {
			if (document.visibilityState === "visible") {
				setTimeout(async () => await request_wake_lock(), 1000);
			}
		});

		request_wake_lock();
	}
*/
</script>

<main>
	<div class="input full-width">
		<button id="copy-from-clipboard-button" class="green">
			Copy from clipboard
		</button>
		<button id="copy-markdown-to-clipboard-button" class="blue" disabled>
			Get markdown
		</button>
		<button id="share-button" class="black" hidden>Share</button>
		<button id="my-recipes-button" class="pink">My recipes</button>
		<button id="install-button" class="purple" hidden>Install</button>
	</div>

	<div class="output"></div>
</main>

<style lang="scss">
	.content > :not(.full-width),
	.my-recipes > :not(.full-width) {
		margin-left: 0.5rem;
		margin-right: 0.5rem;
	}

	a {
		text-decoration: none;
		font-weight: bold;
		color: #007acc;
	}

	.button-like,
	button {
		border-width: 0;
		flex-grow: 1;
		font-weight: bold;
		color: white;
		padding: 0.5rem;
	}

	a:hover,
	.button-like:hover,
	button:hover {
		cursor: pointer;
	}

	.button-like,
	button:disabled {
		font-weight: normal;
	}

	.flex-row {
		display: flex;
		justify-content: space-between;
	}

	.flex-col {
		display: flex;
		flex-direction: column;
	}

	.flex {
		display: flex;
		flex-direction: column;
	}

	.button-like {
		text-align: center;
		font-size: 13px;
		font-family: sans-serif;
	}

	.hidden {
		display: none;
	}

	.black {
		background: black;
	}

	.green {
		background: #338356;
	}

	.mb1 {
		margin-bottom: 1rem;
	}

	.mt1 {
		margin-top: 1rem;
	}

	.blue {
		background: #007acc;
	}

	.purple {
		background: #d51ced;
	}

	.pink {
		background: #fa8072;
	}

	.red {
		background: red;
	}

	.right {
		text-align: right;
	}

	.center {
		align-items: center;
	}

	.full-width {
		display: flex;
		width: 100%;
	}

	.grow {
		flex-grow: 1;
	}

	.shrink {
		flex-grow: 0;
	}

	.no-margin {
		margin: 0;
	}

	/* Specific */

	.recipe-row {
		display: flex;
		gap: 5px;
		align-items: center;
		cursor: pointer;
		background: black;
		padding: 0.5rem;
		margin: 0.1rem;
	}

	.my-recipes-header {
		display: flex;
		padding-bottom: 1rem;
	}

	.output {
		color: white;
		padding-bottom: 5rem;
	}

	.list input:checked + * {
		text-decoration: line-through;
		opacity: 0.5;
	}

	.list label {
		display: flex;
		gap: 10px;
		padding: 0.5rem;
		overflow: hidden;
	}

	.list label:nth-child(even) {
		background-color: #1a1a1a;
	}

	.list label:nth-child(odd) {
		background-color: black;
	}

	.focus-pane {
		background-color: black;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
		flex-basis: 0;
		overflow: hidden;
	}

	.focus-pane-content {
		border: 5px solid white;
		box-sizing: border-box;
		overflow-y: scroll;
		width: 100%;
		padding: 0 0.3rem;
	}

	.focus-pane .focused-button {
		display: none;
	}

	.content .close-focused-button {
		display: none;
	}

	.resize-handle {
		width: 30px;
		height: 10px;
		position: absolute;
		background: #909090;
		cursor: pointer;
	}

	.ingredient {
		color: lightblue;
	}

	.amount {
		color: #00ff7c;
	}

	.temperature {
		color: #ff7e7e;
	}

	.clickable-keyword {
		background: #6c0047;
		padding: 0.2rem;
		border-radius: 1rem;
		white-space: nowrap;
		cursor: pointer;
	}

	label {
		line-height: 2rem;
	}

	label > div {
		overflow-x: scroll;
	}

	label.selected {
		background: #310f0b !important;
	}

	.clickable-keyword.selected {
		background: #006786 !important;
	}

	.quantity-control {
		margin: 0.2rem;
	}

	.rounded-button.selected {
		color: black;
		background: white;
	}

	.failed,
	.unknown {
		background-color: red;
	}
</style>
