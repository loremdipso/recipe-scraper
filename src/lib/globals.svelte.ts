
export interface INotification {
  text: String,
  extra_class?: String
}

const notifications: INotification[] = $state([]);

export { notifications };
