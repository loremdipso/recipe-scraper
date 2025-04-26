<script lang="ts">
	import Notification from "./Notification.svelte";
	import { notifications, type INotification } from "../lib/globals.svelte";
</script>

<div class="notifications">
	{#each notifications as notification (notification.id)}
		<Notification {notification} />
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
