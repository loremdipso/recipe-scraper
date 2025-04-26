<script lang="ts">
	import { onMount } from "svelte";
	import {
		remove_notification,
		type INotification,
	} from "../lib/globals.svelte";
	import { fade } from "svelte/transition";

	let { notification } = $props<{
		notification: INotification;
	}>();

	setTimeout(() => {
		remove_notification(notification);
	}, 3000);
</script>

<div
	out:fade={{ duration: 3000 }}
	class="notification {notification.extra_class}"
>
	{notification.text}
</div>

<style lang="scss">
	.notification {
		background: #1c2257;
		padding: 1rem;
		border-radius: 2rem;
	}

	.notification.error {
		background: #fa8072;
	}

	.notification.success {
		background: #338356;
	}
</style>
