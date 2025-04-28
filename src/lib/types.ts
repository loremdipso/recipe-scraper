export interface IRecipe {
	title: string;
	url: string;
	ingredients: string[];
	instructions: string[];
	notes: string[];
	keywords: Keywords;
}

export type Keywords = {
	[key: string]: FragmentType;
};

export enum FragmentType {
	Unknown,
	Plain,
	Bold,
	Italic,
	Ingredient,
	Temperature,
	Amount,
}

export interface ISection {
	text: string;
	level: Number;
	rows: IRow[];
}

export interface IRow {
	id: string;
	fragments: IFragment[];
}

export interface IFragment {
	type: FragmentType;
	text: string;
	converted?: boolean;
	failed?: boolean;
	id?: string;
}

export interface IPreferences {
	keep_screen_awake: boolean;
	show_colors: boolean;
}
