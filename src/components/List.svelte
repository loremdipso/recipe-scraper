<script lang="ts">
	import {
		FragmentType,
		type IFragment,
		type IRow,
		type ISection,
	} from "../lib/types";

	let {
		section,
		checkedItems,
		onFocusSection,
		selectedKeyword,
		onHighlightKeyword,
		isFocused,
	} = $props<{
		section: ISection;
		selectedKeyword: string | null;
		checkedItems: { [key: string]: boolean };
		onFocusSection(section: ISection): void;
		onHighlightKeyword(keyword: string | null): void;
		isFocused: boolean;
	}>();

	function get_class(fragment: IFragment): string {
		switch (fragment.type) {
			case FragmentType.Ingredient:
				return "ingredient";
				break;
			case FragmentType.Temperature:
				return "temperature";
				break;
			case FragmentType.Amount:
				return "amount";
			default:
				return "";
		}
	}

	function is_row_selected(row: IRow): boolean {
		return (
			selectedKeyword &&
			row.fragments.find((e) => e.id == selectedKeyword)
		);
	}
</script>

{#snippet focused_button()}{/snippet}

<div class="list">
	<div style:display="flex" style:gap="0.5rem">
		{#if section.level === 2}
			<h2>{section.text}</h2>
		{:else if section.level === 3}
			<h3>{section.text}</h3>
		{:else if section.level === 4}
			<h4>{section.text}</h4>
		{/if}

		<div class="center" style:display="flex">
			<button tabindex="0" onclick={() => onFocusSection(section)}>
				{#if isFocused}close{:else}focus{/if}
			</button>
		</div>
	</div>

	{#each section.rows as row}
		<label class:selected={is_row_selected(row)}>
			<input
				type="checkbox"
				checked={checkedItems[row.id]}
				onchange={(e) => {
					checkedItems[row.id] = (e.target! as any).checked;
				}}
			/>

			<div>
				{#each row.fragments as fragment}
					{#if fragment.type === FragmentType.Plain}
						<span>{fragment.text}</span>
					{:else if fragment.type === FragmentType.Bold}
						<b>{fragment.text}</b>
					{:else if fragment.type === FragmentType.Italic}
						<b>{fragment.text}</b>
					{:else}
						<span
							class={get_class(fragment)}
							class:failed={fragment.failed}
							class:converted={fragment.converted}
							class:selected={selectedKeyword &&
								selectedKeyword == fragment.id}
							role="button"
							tabindex="0"
							onkeypress={(event) => {
								// TODO
							}}
							onclick={(event) => {
								if (fragment.type === FragmentType.Ingredient) {
									event.preventDefault();
									onHighlightKeyword(fragment.id);
								}
							}}
						>
							{fragment.text}
						</span>
					{/if}
				{/each}
			</div>
		</label>
	{/each}
</div>
