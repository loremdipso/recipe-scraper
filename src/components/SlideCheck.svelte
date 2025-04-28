<script lang="ts">
	let { checked, text, onchange } = $props<{
		text: string;
		checked: boolean;
		onchange(checked: boolean): void;
	}>();
</script>

<label>
	<input
		type="checkbox"
		{checked}
		onchange={(e) => onchange((e.target as any).checked)}
	/>
	<span class="slide-label">{text}</span>
</label>

<style lang="scss">
	label {
		align-items: center;
		display: flex;
	}

	input {
		appearance: none; /* Hide the default checkbox */
		width: 50px;
		height: 24px;
		background-color: #ccc;
		border-radius: 12px;
		position: relative;
		cursor: pointer;
		outline: none; /* Remove default focus outline */

		&::before {
			content: "";
			position: absolute;
			width: 20px;
			height: 20px;
			background-color: white;
			border-radius: 50%;
			top: 2px;
			left: 2px;
			transition: transform 0.3s ease-in-out;
		}

		&:checked {
			background-color: #4caf50; /* Active state color */
		}

		&:checked::before {
			transform: translateX(26px); /* Move the knob to the right */
		}
	}

	.slide-label {
		margin-left: 8px;
		vertical-align: middle;
	}
</style>
