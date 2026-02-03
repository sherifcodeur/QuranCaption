<script lang="ts">
	import {
		PredefinedSubtitleClip,
		SubtitleClip,
		type ClipWithTranslation
	} from '$lib/classes/Clip.svelte';
	import { globalState } from '$lib/runes/main.svelte';
	import { onMount } from 'svelte';
	import NoTranslationsToShow from './NoTranslationsToShow.svelte';
	import Translation from './translation/Translation.svelte';
	import ArabicText from './ArabicText.svelte';

	function addTranslationButtonClick() {
		setAddTranslationModalVisibility(true);
	}

	let {
		setAddTranslationModalVisibility
	}: {
		setAddTranslationModalVisibility: (visible: boolean) => void;
	} = $props();

	let goToVerseInput = $state('');

	// Raccourcis vers l'état
	let translationsState = $derived(globalState.getTranslationsState);
	let clips = $derived(globalState.getSubtitleTrack.clips);

	// Editions à afficher
	let editionsToShowInEditor = $derived.by(() =>
		globalState.currentProject!.content.projectTranslation.addedTranslationEditions.filter(
			(edition) => edition.showInTranslationsEditor
		)
	);

	// Noms des éditions pour le filtrage
	let editionNames = $derived(new Set(editionsToShowInEditor.map((e) => e.name)));

	// Reconstruire l'index et les filtres au montage
	onMount(() => {
		if (clips.length > 0) {
			translationsState.rebuildIndex(clips);
			translationsState.rebuildFilteredKeys(clips, editionNames);
		}
	});

	// Reconstruire les clés filtrées quand les filtres ou la recherche changent
	// On surveille filters et searchQuery explicitement
	let lastFiltersJson = '';
	let lastSearch = '';
	let lastEditionsJson = '';

	$effect(() => {
		const currentFiltersJson = JSON.stringify(translationsState.filters);
		const currentSearch = translationsState.searchQuery;
		const currentEditionsJson = JSON.stringify([...editionNames]);

		if (
			currentFiltersJson !== lastFiltersJson ||
			currentSearch !== lastSearch ||
			currentEditionsJson !== lastEditionsJson
		) {
			lastFiltersJson = currentFiltersJson;
			lastSearch = currentSearch;
			lastEditionsJson = currentEditionsJson;

			if (clips.length > 0 && translationsState.verseKeys.length > 0) {
				translationsState.rebuildFilteredKeys(clips, editionNames);
			}
		}
	});

	// Utiliser le cache de clés filtrées
	let filteredVerseKeys = $derived(translationsState.filteredVerseKeys);

	// Pagination
	let totalPages = $derived(Math.ceil(filteredVerseKeys.length / translationsState.itemsPerPage));
	let currentPage = $derived(translationsState.currentPage);

	let paginatedKeys = $derived.by(() => {
		const start = (currentPage - 1) * translationsState.itemsPerPage;
		const end = start + translationsState.itemsPerPage;
		return filteredVerseKeys.slice(start, end);
	});

	// Référence au conteneur de contenu pour scroll to top
	let contentContainer: HTMLElement | undefined = undefined;

	function scrollToTop() {
		contentContainer?.scrollTo({ top: 0, behavior: 'smooth' });
	}

	// Ajuster la page si elle dépasse
	$effect(() => {
		if (currentPage > totalPages && totalPages > 0) {
			translationsState.currentPage = totalPages;
		} else if (currentPage < 1 && totalPages > 0) {
			translationsState.currentPage = 1;
		}
	});

	function goToPage(page: number) {
		if (page >= 1 && page <= totalPages && page !== currentPage) {
			translationsState.isLoading = true;
			setTimeout(() => {
				translationsState.currentPage = page;
				scrollToTop();
				setTimeout(() => {
					translationsState.isLoading = false;
				}, 100);
			}, 50);
		}
	}

	function goToVerse() {
		const match = goToVerseInput.trim().match(/^(\d+):(\d+)$/);
		if (!match) return;

		const targetSurah = parseInt(match[1]);
		const targetVerse = parseInt(match[2]);

		translationsState.isLoading = true;
		setTimeout(() => {
			if (translationsState.goToVerse(targetSurah, targetVerse)) {
				goToVerseInput = '';
				scrollToTop();
			}
			setTimeout(() => {
				translationsState.isLoading = false;
			}, 100);
		}, 50);
	}

	// Numéros de pages visibles
	let visiblePageNumbers = $derived.by(() => {
		const pages: number[] = [];
		const maxVisible = 7;

		if (totalPages <= maxVisible) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			pages.push(1);
			let start = Math.max(2, currentPage - 2);
			let end = Math.min(totalPages - 1, currentPage + 2);

			if (start > 2) pages.push(-1);
			for (let i = start; i <= end; i++) pages.push(i);
			if (end < totalPages - 1) pages.push(-1);
			pages.push(totalPages);
		}
		return pages;
	});
</script>

<section
	class="min-h-0 bg-secondary border border-color rounded-lg shadow-lg h-full overflow-hidden flex flex-col"
	id="translations-workspace"
>
	{#if globalState.currentProject!.content.projectTranslation.addedTranslationEditions.length === 0}
		<div class="flex items-center flex-col gap-6 justify-center h-full pb-10">
			<div class="flex flex-col items-center gap-4">
				<div class="w-16 h-16 bg-accent rounded-full flex items-center justify-center">
					<span class="material-icons text-accent text-2xl">translate</span>
				</div>
				<div class="text-center">
					<h3 class="text-primary text-lg font-semibold mb-2">No Translations Yet</h3>
					<p class="text-thirdly text-sm max-w-md">
						Start by adding translation editions to begin working on your translations.
					</p>
				</div>
			</div>
			<button
				class="btn-accent px-6 py-3 text-sm font-semibold rounded-lg flex items-center gap-2 hover:shadow-lg transition-all duration-200"
				onclick={addTranslationButtonClick}
			>
				<span class="material-icons text-base">add</span>
				Add Translation
			</button>
		</div>
	{:else if filteredVerseKeys.length === 0}
		<div class="flex p-4 flex-col bg-secondary gap-y-3 h-full">
			<NoTranslationsToShow />
		</div>
	{:else}
		<!-- Pagination Header -->
		<div
			class="flex items-center justify-between px-4 py-3 border-b border-color bg-primary/5 flex-shrink-0"
		>
			<div class="flex items-center gap-4">
				<div class="flex items-center gap-2">
					<span class="material-icons text-thirdly text-sm">search</span>
					<input
						type="text"
						bind:value={goToVerseInput}
						placeholder="Go to verse (2:142)"
						class="bg-secondary border border-color rounded px-2 py-1 text-sm text-primary w-32 focus:outline-none focus:border-accent"
						onkeydown={(e) => e.key === 'Enter' && goToVerse()}
					/>
					<button
						class="btn-accent px-2 py-1 text-xs rounded"
						onclick={goToVerse}
						disabled={!goToVerseInput.trim()}
					>
						Go
					</button>
				</div>
			</div>

			<div class="text-thirdly text-sm">
				Page {currentPage} of {totalPages}
				<span class="text-xs ml-2">({filteredVerseKeys.length} verses)</span>
			</div>
		</div>

		<!-- Content -->
		<div
			bind:this={contentContainer}
			class="flex-1 overflow-y-auto p-4 flex flex-col gap-y-3 relative"
		>
			{#if translationsState.isLoading}
				<div
					class="absolute inset-0 bg-secondary/80 backdrop-blur-sm z-10 flex items-center justify-center"
				>
					<div class="flex flex-col items-center gap-3">
						<div
							class="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin"
						></div>
						<span class="text-thirdly text-sm">Loading...</span>
					</div>
				</div>
			{/if}
			{#each paginatedKeys as verseKey (verseKey)}
				{@const group = translationsState.getVerseGroup(verseKey)}
				{#if group}
					{@const firstClipInGroup = clips[group.indices[0]] as
						| SubtitleClip
						| PredefinedSubtitleClip}
					<div class="border border-color rounded px-4 py-4 text-primary relative space-y-7">
						{#if firstClipInGroup instanceof SubtitleClip}
							<div
								class="absolute top-0 left-0 bg-white/10 px-1 py-1 rounded-br-lg border-color border-l-0 border-t-0 border-1 text-sm"
							>
								{firstClipInGroup.surah}:{firstClipInGroup.verse}
							</div>
						{/if}

						{#each group.indices as clipIndex (clipIndex)}
							<section class="relative">
								<ArabicText subtitle={clips[clipIndex]} />
								{#each editionsToShowInEditor as edition (edition.name)}
									<Translation
										{edition}
										bind:subtitle={clips[clipIndex] as SubtitleClip}
										previousSubtitle={clipIndex > 0
											? (globalState.getSubtitleTrack.getSubtitleBefore(clipIndex) as SubtitleClip)
											: undefined}
									/>
								{/each}
							</section>
						{/each}
					</div>
				{/if}
			{/each}
		</div>

		<!-- Pagination Footer -->
		<div
			class="flex items-center justify-center gap-2 px-4 py-3 border-t border-color bg-primary/5 flex-shrink-0"
		>
			<button
				class="px-3 py-1 rounded border border-color text-primary text-sm hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
				onclick={() => goToPage(currentPage - 1)}
				disabled={currentPage <= 1}
			>
				<span class="material-icons text-sm">chevron_left</span>
			</button>

			{#each visiblePageNumbers as pageNum}
				{#if pageNum === -1}
					<span class="text-thirdly px-2">...</span>
				{:else}
					<button
						class="px-3 py-1 rounded text-sm transition-colors {pageNum === currentPage
							? 'bg-accent text-white'
							: 'border border-color text-primary hover:bg-accent/20'}"
						onclick={() => goToPage(pageNum)}
					>
						{pageNum}
					</button>
				{/if}
			{/each}

			<button
				class="px-3 py-1 rounded border border-color text-primary text-sm hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
				onclick={() => goToPage(currentPage + 1)}
				disabled={currentPage >= totalPages}
			>
				<span class="material-icons text-sm">chevron_right</span>
			</button>
		</div>
	{/if}
</section>
