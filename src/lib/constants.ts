import { fix_regex } from "./utils";

export enum KEYS {
	RECIPES = "recipes",
	TABS = "tabs", // deprecated
}

export enum UNITS {
	IMPERIAL = "imperial",
	ORIGINAL = "original",
	METRIC = "metric",
	ANY = "any",
}

export enum State {
	None = 0,
	Ingredients = 1,
	Instructions = 2,
	Notes = 3,
}

export const SUB_HEADER_PREFIX = "### ";
export const SUB_SUB_HEADER_PREFIX = "#### ";
export const LI_PREFIX = "   - ";

export const Pages = {
	Recipe: "recipe",
	MyRecipes: "myrecipe",
};

export const AMOUNT_REGEX = fix_regex(String.raw`
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

		(?:\bpint[s]?\b)?

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
