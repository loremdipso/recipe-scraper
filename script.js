// setTimeout(() => {
// 	document.location.reload();
// }, 5000);
//

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
	let firstIndex = elements.map((e) => extract_text(e)).findLastIndex((e) => e.toLowerCase() === "ingredients");

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
	const copyFromClipboardButton = document.querySelector(
		"#copy-from-clipboard-button"
	);
	const copyMarkdownToClipboardButton = document.querySelector(
		"#copy-markdown-to-clipboard-button"
	);
	const outputDiv = document.querySelector(".output");
	const helpDiv = document.querySelector(".help");
	let data = {};

	const add_child = (tag, content, parent) => {
		let child = document.createElement(tag);
		if (content) {
			child.textContent = content;
		}
		if (parent) {
			parent.appendChild(child);
		} else {
			outputDiv.appendChild(child);
		}
		return child;
	};

	const render_data = (data) => {
		// Clear the old data out
		outputDiv.innerHTML = "";

		if (data.title) {
			add_child("h1", data.title);
		}

		render_list(data.ingredients, data.keywords, "Ingredients");
		render_list(data.instructions, data.keywords, "Instructions");
		render_list(data.notes, data.keywords, "Notes");
	};

	const render_list = (list, keywords, title) => {
		if (list.length) {
			add_child("h2", title);
			let parent = add_child("ul");
			for (let item of list) {
				if (item.startsWith(LI_PREFIX)) {
					item = item.substr(LI_PREFIX.length);
				} else if (item.startsWith(SUBHEADER_PREFIX)) {
					item = item.substr(SUBHEADER_PREFIX.length);
					add_child("h3", item);
					parent = add_child("ul");
					continue;
				}
				add_child("li", item, parent);
			}
		}
	};

	const doit = (url, title) => {
		fetch(`https://corsproxy.io/?url=${encodeURI(url)}`).then((result) => {
			result.text().then((text) => {
				data = extract_data(text, title);
				copyMarkdownToClipboardButton.removeAttribute("disabled");
				render_data(data);
				helpDiv.setAttribute("hidden", true);
			});
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
	}

	let installPrompt = null;
	const installButton = document.querySelector("#install-button");
	window.addEventListener("beforeinstallprompt", (event) => {
		event.preventDefault();
		installPrompt = event;
		installButton.removeAttribute("hidden");
	});

	installButton.addEventListener("click", async () => {
		if (!installPrompt) {
			return;
		}
		const result = await installPrompt.prompt();
		installPrompt = null;
		installButton.setAttribute("hidden", "");
	});

	const helpButton = document.querySelector("#help-button");
	helpButton.addEventListener("click", async () => {
		helpDiv.removeAttribute("hidden");
	});
};
