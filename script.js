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

let extract_markdown = (html) => {
	let parser = new DOMParser();
	let doc = parser.parseFromString(html, 'text/html');
	let state = State.None;
	let level = null;
	let ingredients = [];
	let instructions = [];
	let notes = [];
	for (let element of doc.querySelectorAll("li,p,h1,h2,h3,h4,h5,h6")) {
		let text = element.textContent.trim();
		if (text.length == 0) {
			continue;
		}

		// TODO: figure out a good system for this.
		// if (level && level !== element.nodeName) {
		// 	console.log({ level, nodeName: element.nodeName });
		// 	state = State.None;
		// }
		// level = element.nodeName;

		let temp = text.toLowerCase();
		switch (temp) {
			case "ingredients":
				state = State.Ingredients;
				level = null;
				continue;
			case "instructions":
				state = State.Instructions;
				level = null;
				continue;
			case "notes":
				state = State.Notes;
				level = null;
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
				text = `\n### ${text}`;
				break;
			default:
				text = `  - ${text}`;
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

	let markdown = "";
	if (ingredients.length > 0) {
		markdown += "## Ingredients\n\n";
		markdown += ingredients.join("\n");
	}

	if (instructions.length > 0) {
		markdown += "\n\n## Instructions\n\n";
		markdown += instructions.join("\n");
	}

	if (notes.length > 0) {
		markdown += "\n\n## Notes\n\n";
		markdown += notes.join("\n");
	}

	return markdown;
};

window.onload = () => {
	const inputDiv = document.querySelector(".input");
	const inputEl = document.querySelector(".input input");
	const button = document.querySelector(".input button");
	const outputDiv = document.querySelector(".output");
	const outputEl = document.querySelector(".output textarea");

	const doit = () => {
		let url = encodeURI(inputEl.value);
		fetch(`https://corsproxy.io/?url=${url}`).then((result) => {
			result.text().then((text) => {
				let markdown = extract_markdown(text);
				outputEl.value = markdown;
			});
		});
	};

	button.addEventListener("click", () => {
		doit();
	});

	inputEl.addEventListener("keyup", (event) => {
		if (event.key == "Enter") {
			doit();
		}
	});
};
