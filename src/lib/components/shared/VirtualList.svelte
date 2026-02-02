<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	interface Props {
		items: any[];
		estimatedItemHeight?: number;
		overscan?: number;
		containerClass?: string;
		children: Snippet<[{ item: any; index: number }]>;
	}

	let {
		items,
		estimatedItemHeight = 250,
		overscan = 5,
		containerClass = '',
		children
	}: Props = $props();

	let container: HTMLElement;
	let scrollTop = $state(0);
	let containerHeight = $state(600);

	// Cache des hauteurs mesurées (index -> hauteur réelle)
	let measuredHeights = $state<Map<number, number>>(new Map());

	// Calculer les positions cumulatives
	let itemPositions = $derived.by(() => {
		const positions: { top: number; height: number }[] = [];
		let currentTop = 0;

		for (let i = 0; i < items.length; i++) {
			const height = measuredHeights.get(i) ?? estimatedItemHeight;
			positions.push({ top: currentTop, height });
			currentTop += height;
		}

		return positions;
	});

	let totalHeight = $derived(
		itemPositions.length > 0
			? itemPositions[itemPositions.length - 1].top + itemPositions[itemPositions.length - 1].height
			: 0
	);

	// Trouver les éléments visibles par recherche binaire
	let visibleRange = $derived.by(() => {
		if (itemPositions.length === 0) {
			return { startIndex: 0, endIndex: 0 };
		}

		// Trouver le premier élément visible (recherche binaire)
		let low = 0;
		let high = itemPositions.length - 1;
		let startIndex = 0;

		while (low <= high) {
			const mid = Math.floor((low + high) / 2);
			const pos = itemPositions[mid];
			if (pos.top + pos.height < scrollTop) {
				low = mid + 1;
			} else {
				startIndex = mid;
				high = mid - 1;
			}
		}

		// Trouver le dernier élément visible
		const viewportBottom = scrollTop + containerHeight;
		let endIndex = startIndex;
		while (endIndex < itemPositions.length && itemPositions[endIndex].top < viewportBottom) {
			endIndex++;
		}

		// Ajouter overscan
		startIndex = Math.max(0, startIndex - overscan);
		endIndex = Math.min(itemPositions.length, endIndex + overscan);

		return { startIndex, endIndex };
	});

	let visibleItems = $derived.by(() => {
		const { startIndex, endIndex } = visibleRange;
		return items.slice(startIndex, endIndex).map((item, i) => ({
			item,
			index: startIndex + i,
			top: itemPositions[startIndex + i]?.top ?? 0
		}));
	});

	function handleScroll(e: Event) {
		const target = e.target as HTMLElement;
		scrollTop = target.scrollTop;
	}

	// Mesurer la hauteur d'un élément après le rendu
	function measureItem(node: HTMLElement, index: number) {
		const measure = () => {
			const height = node.getBoundingClientRect().height;
			if (height > 0 && measuredHeights.get(index) !== height) {
				measuredHeights.set(index, height);
				measuredHeights = new Map(measuredHeights);
			}
		};

		// Mesurer après le premier rendu
		requestAnimationFrame(measure);

		const observer = new ResizeObserver(() => {
			measure();
		});
		observer.observe(node);

		return {
			destroy() {
				observer.disconnect();
			}
		};
	}

	onMount(() => {
		if (container) {
			containerHeight = container.clientHeight;
			const resizeObserver = new ResizeObserver((entries) => {
				containerHeight = entries[0].contentRect.height;
			});
			resizeObserver.observe(container);
			return () => resizeObserver.disconnect();
		}
	});
</script>

<div bind:this={container} class="virtual-list-container {containerClass}" onscroll={handleScroll}>
	<div class="virtual-list-spacer" style="height: {totalHeight}px;">
		{#each visibleItems as { item, index, top } (index)}
			<div
				class="virtual-list-item"
				style="position: absolute; top: {top}px; left: 0; right: 0;"
				use:measureItem={index}
			>
				{@render children({ item, index })}
			</div>
		{/each}
	</div>
</div>

<style>
	.virtual-list-container {
		overflow-y: auto;
		overflow-x: hidden;
		height: 100%;
		position: relative;
	}

	.virtual-list-spacer {
		position: relative;
		width: 100%;
	}

	.virtual-list-item {
		width: 100%;
	}
</style>
