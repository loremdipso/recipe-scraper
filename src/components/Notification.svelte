<script lang="ts">
	import { onMount } from "svelte";
	import type { INotification } from "../lib/globals.svelte";
	import { fade } from "svelte/transition";

	let { notification, onRemove } = $props<{
		notification: INotification;
		onRemove(): void;
	}>();

	setTimeout(() => {
		onRemove();
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
