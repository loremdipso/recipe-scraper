<script lang="ts">
	import Notification from "./Notification.svelte";
	import { notifications, type INotification } from "../lib/globals.svelte";

	function remove_notification(notification: INotification) {
		for (let i = 0; i < notifications.length; i++) {
			if (notifications[i] && notifications[i] === notification) {
				notifications.splice(i, 1);
				i -= 1;
			}
		}
	}
</script>

<div class="notifications">
	{#each notifications as notification}
		<Notification
			onRemove={() => remove_notification(notification)}
			{notification}
		/>
	{/each}
</div>

<style lang="scss">
	.notifications {
		position: fixed;
		width: 80%;
		bottom: 1rem;
		display: flex;
		flex-direction: column-reverse;
		left: 10%;
		gap: 1rem;
	}
</style>
