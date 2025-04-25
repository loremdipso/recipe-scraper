export interface INotification {
	text: String;
	extra_class?: String;
}

const notifications: INotification[] = $state([]);

export function notify(text: string, extra_class = "") {
	console.info(text);
	notifications.push({ text, extra_class });
}

export { notifications };
