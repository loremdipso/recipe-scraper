<script lang="ts">
	/*
		const focus = (elements) => {
			remove_focused_panes();

			let shared_data = { did_drag: false, total_height: 0 };

			let pane = add_child(
				{
					tag: "div",
					style: {
						"min-height": `30vh`,
					},
					classes: ["focus-pane"],
				},
				document.body
			);

			let content = add_child(
				{
					tag: "div",
					classes: ["focus-pane-content"],
					prepend: true,
				},
				pane
			);

			for (let element of elements) {
				content.appendChild(element.cloneNode(true));
			}

			add_child(
				{
					tag: "div",
					classes: ["resize-handle"],
					onmousedown: (e) => {
						e.preventDefault();

						let mousemove = (e) => {
							e.preventDefault();
							let height =
								document.body.clientHeight -
								(e.pageY || e.touches[0].pageY);
							pane.style.minHeight = `max(20px, min(${height}px, ${shared_data.total_height}px))`;
						};

						let mouseup = (e) => {
							e.preventDefault();
							shared_data.did_drag = true;
							document.removeEventListener(
								"mousemove",
								mousemove
							);
							document.removeEventListener(
								"touchmove",
								mousemove
							);
							document.removeEventListener("mouseup", mouseup);
							setTimeout(() => {
								shared_data.did_drag = false;
							}, 0);
						};

						document.addEventListener("mousemove", mousemove);
						document.addEventListener("touchmove", mousemove);
						document.addEventListener("mouseup", mouseup);
					},
				},
				pane
			);

			for (let button of pane.querySelectorAll(".close-focused-button")) {
				button.addEventListener("click", remove_focused_panes);
			}

			shared_data.total_height = content.scrollHeight + 10;
			pane.style.minHeight = `min(30vh, ${shared_data.total_height}px)`;

			for (let input of content.querySelectorAll("input")) {
				input.addEventListener("change", checkbox_on_change);
			}

			for (let keywordEl of content.querySelectorAll(
				".clickable-keyword"
			)) {
				keywordEl.addEventListener("click", click_keyword);
			}

			focused_pane_element = pane;
		};
*/
</script>

<div class="focus-pane">
	<div class="focus-pane-content">
		<slot></slot>
	</div>
</div>
