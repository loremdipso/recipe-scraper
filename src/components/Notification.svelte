<script lang="ts">
	import { onMount } from "svelte";
	import type { INotification } from "../lib/globals.svelte";

	let { notification, onRemove } = $props<{
		notification: INotification;
		onRemove(): void;
	}>();

	let element: any;
	setTimeout(() => {
		element.classList.add("fade-out");
	}, 1000);
	setTimeout(() => {
		onRemove();
	}, 3000);
</script>

<div class="notification {notification.extra_class}" bind:this={element}>
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

	.fade-out {
		transition: opacity 3s ease-in-out;
		opacity: 0.2;
	}
</style>
