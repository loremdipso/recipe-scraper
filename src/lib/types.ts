export interface IRecipe {
	title: string;
	url: string;
	ingredients: string[];
	instructions: string[];
	notes: string[];
	keywords: Keywords;
}

export type Keywords = {
	[key: string]: ChildType;
};

export enum ChildType {
	Unknown,
	Plain,
	Bold,
	Italic,
	Ingredient,
	Temperature,
	Amount,
}

export interface IChild {
	type: ChildType;
	text: string;
	id?: string;
}
