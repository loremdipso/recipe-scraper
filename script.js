const KEYS = {
	TABS: "tabs"
};

let data = {};
let current_url = null;
let tabs = [];

try {
	tabs = JSON.parse(localStorage.getItem(KEYS.TABS) || '[]');
} catch (e) {
	console.error(e);
}

const save_tabs = () => {
	localStorage.setItem(KEYS.TABS, JSON.stringify(tabs));
}

const find_tab = (url) => {
	for (let tab of tabs) {
		if (tab.url === url) {
			return tab;
		}
	}
	return null;
}

const add_tab = (url, data, save = true) => {
	remove_tab(url, false);
	tabs.push({ url, data });
	if (save) {
		save_tabs();
	}
}

const remove_tab = (url, save = true) => {
	tabs = tabs.filter((e) => e.url !== url);
	if (current_url === url) {
		current_url = "";
	}

	if (save) {
		save_tabs();
	}
}

let State = {
	None: 0,
	Ingredients: 1,
	Instructions: 2,
	Notes: 3,
};

const SUBHEADER_PREFIX = "### ";
const LI_PREFIX = "   - ";

let get_title = (doc) => {
	for (let meta of doc.querySelectorAll("meta")) {
		let property = meta.getAttribute("property");
		if (property === "og:title") {
			return meta.getAttribute("content") || "";
		}
	}
	return "";
}

let extract_text = (element) => {
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

	let text = element.textContent.trim().replace("▢", "");
	return text;
}

let extract_data = (text, title) => {
	let parser = new DOMParser();
	let doc = parser.parseFromString(text, "text/html");
	let state = State.None;
	let level = null;
	let keywords = {}; // TODO: implement this
	let ingredients = [];
	let instructions = [];
	let notes = [];
	title = title || get_title(doc);
	let elements = [...doc.querySelectorAll("li,p,h1,h2,h3,h4,h5,h6")];
	let firstIndex = Math.max(0, elements.map((e) => extract_text(e)).findLastIndex((e) => e.toLowerCase() === "ingredients"));

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
				text = `${SUBHEADER_PREFIX}${text}`;
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
				instructions.push(text);
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
		keywords,
		notes,
	};
};

const get_markdown_list = (list, keywords, title) => {
	let rv = "";
	if (list.length) {
		rv += `\n\n## ${title}\n`;
		for (let item of list) {
			if (item.startsWith(SUBHEADER_PREFIX)) {
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

		contentDiv.setAttribute("hidden", true);
		myRecipesDiv.removeAttribute("hidden");

		{
			let parent = add_child({ tag: "div", classes: ["my-recipes-header"] }, myRecipesDiv);
			add_child({ tag: "h2", text: "My Saved Recipes", classes: ["grow", "no-margin"] }, parent);
			let back_button = add_child({ tag: "button", text: "Back", classes: ["red", "shrink"] }, parent);
			back_button.addEventListener("click", (event) => {
				event.stopPropagation();
				doit(current_url);
			});
		}

		for (let i = tabs.length - 1; i >= 0 && tabs.length; i--) {
			let tab = tabs[i];
			let parent = add_child({ tag: "div", classes: ["recipe-row"] }, myRecipesDiv);
			parent.addEventListener("click", (event) => {
				event.stopPropagation();
				doit(tab.url);
			});

			add_child({ tag: "span", text: tab.data.title || "<missing title>", classes: ["grow"] }, parent);
			let delete_button = add_child({ tag: "button", text: "Delete", classes: ["red", "shrink"] }, parent);
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
	}

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
				if (data.prefix) {
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
					child.classList.add(some_class);
				}
			}

			if (data.children) {
				add_child(data.children, child);
			}

			if (data.onclick) {
				child.addEventListener("click", data.onclick);
			}

			return child;
		}
	};

	const clear_div = (div = outputDiv) => {
		div.innerHTML = "";
	}

	const show = (element) => {
		element.removeAttribute("hidden");
	}

	const hide = (element) => {
		element.setAttribute("hidden", "");
	}

	let hide_focused_pane_cb = null;
	let focused_pane_element = null;
	const focus = (elements, callback) => {
		if (hide_focused_pane_cb) {
			hide_focused_pane_cb();
			hide_focused_pane_cb = null;
		}

		let new_callback = () => {
			if (focused_pane_element) {
				focused_pane_element.parentElement.removeChild(focused_pane_element);
				focused_pane_element = null;
			}
			if (callback) {
				callback();
			}
		}
		hide_focused_pane_cb = new_callback;

		let child = add_child({
			tag: "div",
			classes: ["focus-pane"],
			onclick: new_callback,
		}, document.body);

		for (let element of elements) {
			child.appendChild(element.cloneNode(true));
		}

		focused_pane_element = child;
	}

	const render_data = (data, url) => {
		// Clear the old data out
		clear_div();

		if (data.title) {
			add_child({ tag: "h1", text: data.title });
		}

		if (url) {
			add_child({
				tag: "div",
				classes: ["right"],
				children: [{
					tag: "a",
					text: "Open the original",
					attributes: {
						target: "_blank",
						href: url
					}
				}]
			});
		}

		render_list(data.ingredients, data.keywords, "Ingredients");
		render_list(data.instructions, data.keywords, "Instructions");
		render_list(data.notes, data.keywords, "Notes");

		for (let header of document.querySelectorAll(".output h1,h2,h3,h4")) {
			let list = header.nextSibling;
			if (list && list.hasChildNodes() && list.classList.contains("list")) {
				add_child({
					tag: "a",
					text: " +",
					classes: ["focused-button"],
					onclick: () => {
						focus([header, list], () => {
							show(header);
							show(list);
						});
						hide(header);
						hide(list);
					},
				}, header);
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
				} else if (item.startsWith(SUBHEADER_PREFIX)) {
					item = item.substr(SUBHEADER_PREFIX.length);
					add_child({ tag: "h3", text: item });
					parent = add_child({ tag: "div", classes: ["list"] });
					continue;
				}

				// Simple li
				// add_child({ tag: "li", text: item }, parent);

				// More complex checkbox
				add_child({
					tag: "label",
					children: [{
						tag: "input",
						attributes: {
							type: "checkbox",
						}
					}, {
						tag: "span",
						text: item,
					}]
				}, parent);
			}
		}
	};

	const set_data = (url, new_data) => {
		current_url = url;
		data = new_data;
		copyMarkdownToClipboardButton.removeAttribute("disabled");
		render_data(data, url);
	}

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
	}

	const show_help = () => {
		clear_div();
		add_child([
			{
				tag: "p",
				text: "Welcome to recipe scraper!"
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
							target: "_blank"
						}
					},
					{
						tag: "span",
						text: " are some instructions to get you started."
					}
				]
			}
		]);
	}

	const doit = (url, title, force_refresh) => {
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
				add_child({ tag: "h1", text: `Uh-oh, got an error code while trying to fetch that recipe. Sorry :/ Some sites don't work with this app, unfortunately` });
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
		doit(decodeURI(sharedLink), decodeURIComponent(url.searchParams.get("name") || ''));
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
			doit(current_url, '', true);
		}
	});

	const myRecipesButton = document.querySelector("#my-recipes-button");
	myRecipesButton.addEventListener("click", async () => {
		show_my_recipes();
	});
};
