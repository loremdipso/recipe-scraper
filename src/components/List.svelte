<script lang="ts">
	import { ChildType, type IChild, type ISection } from "../lib/types";

	let { section, onFocusSection } = $props<{
		section: ISection;
		onFocusSection(section: ISection): void;
	}>();

	function get_class(fragment: IChild): string {
		switch (fragment.type) {
			case ChildType.Ingredient:
				return "ingredient";
				break;
			case ChildType.Temperature:
				return "temperature";
				break;
			case ChildType.Amount:
				return "amount";
			default:
				return "";
		}
	}
</script>

<div class="list">
	{#if section.level === 2}
		<h2>
			{section.text}<button
				class="focused-button"
				tabindex="0"
				onclick={() => onFocusSection(section)}
			>
				+</button
			>
		</h2>
	{:else if section.level === 3}
		<h3>{section.text}</h3>
	{:else if section.level === 4}
		<h4>{section.text}</h4>
	{/if}

	{#each section.children as item}
		<label>
			<input
				type="checkbox"
				onchange={(e) => {
					// TODO
				}}
			/>

			<div>
				{#each item as fragment}
					{#if fragment.type === ChildType.Plain}
						<span>{fragment.text}</span>
					{:else if fragment.type === ChildType.Bold}
						<b>{fragment.text}</b>
					{:else if fragment.type === ChildType.Italic}
						<b>{fragment.text}</b>
					{:else}
						<span
							class={get_class(fragment)}
							class:failed={fragment.failed}
							class:converted={fragment.converted}
						>
							{fragment.text}
						</span>
					{/if}
				{/each}
			</div>
		</label>
	{/each}
</div>
