import { KEYS } from "./constants";
import type { IPreferences } from "./types";

export function get_preferences(): IPreferences {
	try {
		let value = localStorage.getItem(KEYS.PREFERENCES);
		if (value) {
			return JSON.parse(value);
		}
	} catch (e) {
		console.error(e);
	}

	return { keep_screen_awake: true };
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
