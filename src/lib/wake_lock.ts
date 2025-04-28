import { save_preference } from "./preferences";

let wake_lock: WakeLockSentinel | null = null;
let should_stay_awake = true;

const visibility_change_el = async () => {
	if (document.visibilityState === "visible") {
		setTimeout(async () => await request_wake_lock(), 1000);
	}
};

export const set_wake_lock = async (
	value: boolean,
	persist_preference = true
) => {
	if (!navigator.wakeLock) {
		return;
	}

	should_stay_awake = value;
	if (value) {
		await request_wake_lock();

		// TODO: is this right?
		document.removeEventListener("visibilitychange", visibility_change_el);
		document.addEventListener("visibilitychange", visibility_change_el);
	} else {
		console.info("Disabling wake lock");
		let old_wake_lock = wake_lock;
		wake_lock = null;
		if (old_wake_lock) {
			old_wake_lock.release();
		}
		document.removeEventListener("visibilitychange", visibility_change_el);
	}

	if (persist_preference) {
		save_preference({ keep_screen_awake: value });
	}
};

const request_wake_lock = async () => {
	try {
		if (wake_lock) {
			try {
				console.info("Releasing old wake lock");
				await wake_lock.release();
			} catch {
				// Do nothing...
			}
		}
		wake_lock = await navigator.wakeLock.request("screen");
		console.info("Wake Lock is active");
	} catch (err) {
		console.error(err);
	}
};
