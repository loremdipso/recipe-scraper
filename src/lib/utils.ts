export function remove_markdown(text: string): string {
	return text.replaceAll("**", "");
}

export function get_last_word(text: string, number_of_pieces = 1): string {
	let pieces = text.split(" ");
	while (pieces.length > number_of_pieces) {
		pieces.shift();
	}
	return pieces.join(" ");
}

export function fix_regex(text: string): string {
	return text.replaceAll(/^\s+(\/\/.*)?/gm, "").replaceAll("\n", "");
}

export function round(
	value: string | number,
	places: number,
	try_fractionalize = false
): string | number {
	if (typeof value === "string") {
		return value;
	}

	value *= 10 ** places;
	value = Math.round(value);
	value /= 10 ** places;
	if (try_fractionalize) {
		if (equals(value, 1 / 2)) {
			return "1/2";
		}
		if (equals(value, 1 / 3)) {
			return "1/3";
		}
		if (equals(value, 1 / 4)) {
			return "1/4";
		}
		if (equals(value, 1 / 8)) {
			return "1/8";
		}
		if (equals(value, 2 / 3)) {
			return "2/3";
		}
		if (equals(value, 3 / 4)) {
			return "3/4";
		}
	}

	return value;
}

export function is_number(str: any): boolean {
	if (typeof str != "string") {
		return false;
	}

	return isNaN(Number(str)) && !isNaN(parseFloat(str));
}

export function equals(a: number, b: number): boolean {
	return Math.abs(a - b) < 0.01;
}

export function iter_over_unmarked_sections(
	str: string,
	cb: (piece: string) => string
): string {
	return str
		.split(/(\*\*[^\*]+\*\*)/)
		.map((piece) => {
			if (piece.startsWith("**") && piece.endsWith("**")) {
				return piece;
			}

			return cb(piece);
		})
		.join("");
}

export function generate_id_for_keyword(keywords: any, term: string): string {
	term = term.toLowerCase();
	let last_word = get_last_word(term);
	if (keywords[last_word]) {
		return last_word;
	}
	return term.replaceAll(/\s/g, "_");
}

let ID = 0;
export const generate_unique_id = (prefix: string) => {
	return `${prefix}_${++ID}`;
};
