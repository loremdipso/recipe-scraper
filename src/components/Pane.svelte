<script lang="ts">
	import { onMount, tick } from "svelte";

	let { content } = $props();

	let resizable = false;
	let shared_data = $state({ did_drag: false, total_height: 0 });
	let min_height = $state("30vh");

	const mousemove = (e: any) => {
		e.preventDefault();
		let height =
			document.body.clientHeight - (e.pageY || e.touches[0].pageY);
		min_height = `max(20px, min(${height}px, ${shared_data.total_height}px))`;
	};

	const mouseup = (e: any) => {
		e.preventDefault();
		shared_data.did_drag = true;
		document.removeEventListener("mousemove", mousemove);
		document.removeEventListener("touchmove", mousemove);
		document.removeEventListener("mouseup", mouseup);
		setTimeout(() => {
			shared_data.did_drag = false;
		}, 0);
	};

	let element: any;

	onMount(async () => {
		await tick(); // hack
		shared_data.total_height = element.scrollHeight + 10;
		min_height = `min(30vh, ${shared_data.total_height}px)`;
	});

	$effect(() => {});
</script>

{#snippet focused_button()}{/snippet}

<div class="focus-pane" style:min-height={min_height} bind:this={element}>
	<div class="focus-pane-content">
		{@render content()}
	</div>

	{#if resizable}
		<div
			class="resize-handle"
			role="button"
			tabindex="0"
			onmousedown={(e) => {
				e.preventDefault();

				document.addEventListener("mousemove", mousemove);
				document.addEventListener("touchmove", mousemove);
				document.addEventListener("mouseup", mouseup);
			}}
		></div>
	{/if}
</div>
