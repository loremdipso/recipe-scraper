import { KEYS } from "./constants";
import type { IPreferences } from "./types";

const DEFAULT_PREFERENCES: IPreferences = {
	keep_screen_awake: true,
	show_colors: true,
};

export function get_preferences(): IPreferences {
	try {
		let value = localStorage.getItem(KEYS.PREFERENCES);
		if (value) {
			return { ...DEFAULT_PREFERENCES, ...JSON.parse(value) };
		}
	} catch (e) {
		console.error(e);
	}

	return { ...DEFAULT_PREFERENCES };
}

export function save_preferences(preferences: IPreferences) {
	localStorage.setItem(KEYS.PREFERENCES, JSON.stringify(preferences));
}

export function save_preference(preference: Partial<IPreferences>) {
	localStorage.setItem(
		KEYS.PREFERENCES,
		JSON.stringify({ ...get_preferences(), ...preference })
	);
}

export function get_preference(key: keyof IPreferences) {
	return get_preferences()[key];
}
