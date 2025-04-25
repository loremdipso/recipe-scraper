<script lang="ts" module>
	import { notifications } from "../lib/globals.svelte";

	export function notify(text: string, extra_class = "") {
		console.info(text);
		notifications.push({ text, extra_class });
		// setTimeout(() => {
		//   child.classList.add("fade-out");
		// }, 1000);
		// setTimeout(() => {
		//   child.parentElement.removeChild(child);
		// }, 3000);
	}
</script>

<div class="notifications">
	{#each notifications as notification}
		<div class="notification {notification.extra_class}">
			{notification.text}
		</div>
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
