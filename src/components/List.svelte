<script lang="ts">
	import { remove_markdown } from "../lib/utils";
	import {
		LI_PREFIX,
		SUB_HEADER_PREFIX,
		SUB_SUB_HEADER_PREFIX,
	} from "../lib/constants";
	import { split_text } from "../lib/renderers";
	import { ChildType, type IChild, type Keywords } from "../lib/types";

	let { title, list, keywords, show_colors } = $props<{
		title: string;
		list: string[];
		keywords: Keywords;
		show_colors: boolean;
	}>();

	interface ISection {
		text: string;
		level: Number;
		children: IChild[][];
	}

	let sections = $derived(get_sections(title, list, keywords, show_colors));

	function get_sections(
		title: string,
		list: string[],
		keywords: Keywords,
		show_colors: boolean
	): ISection[] {
		let sections = [];
		let current_section: ISection = {
			text: title,
			level: 2,
			children: [],
		};

		if (list.length) {
			sections.push(current_section);

			for (let item of list) {
				if (item.startsWith(LI_PREFIX)) {
					item = item.substr(LI_PREFIX.length);
				} else if (item.startsWith(SUB_HEADER_PREFIX)) {
					item = item.substr(SUB_HEADER_PREFIX.length);
					sections.push(
						(current_section = {
							level: 3,
							text: remove_markdown(item),
							children: [],
						})
					);
					sections.push(current_section);
					continue;
				} else if (item.startsWith(SUB_SUB_HEADER_PREFIX)) {
					item = item.substr(SUB_SUB_HEADER_PREFIX.length);
					sections.push(
						(current_section = {
							level: 4,
							text: remove_markdown(item),
							children: [],
						})
					);
					continue;
				}

				current_section.children.push(
					split_text(item, keywords, show_colors)
				);
			}
		}
		return sections;
	}
</script>

{#each sections as section}
	<div class="list">
		{#if section.level === 2}
			<h2>{section.text}</h2>
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
						{:else if fragment.type === ChildType.Unknown}
							<span class="unknown">{fragment.text}</span>
						{:else if fragment.type === ChildType.Ingredient}
							<span class="ingredient">{fragment.text}</span>
						{:else if fragment.type === ChildType.Temperature}
							<span class="temperature">{fragment.text}</span>
						{:else if fragment.type === ChildType.Amount}
							<span class="amount">{fragment.text}</span>
						{:else if fragment.type === ChildType.Bold}
							<b>{fragment.text}</b>
						{:else if fragment.type === ChildType.Italic}
							<b>{fragment.text}</b>
						{:else}
							Unrecognized: {JSON.stringify(fragment)}
						{/if}
					{/each}
				</div>
			</label>
		{/each}
	</div>
{/each}
