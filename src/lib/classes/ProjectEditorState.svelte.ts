import type SubtitlesEditor from '$lib/components/projectEditor/tabs/subtitlesEditor/SubtitlesEditor.svelte';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
	ClipWithTranslation,
	PredefinedSubtitleClip,
	SilenceClip,
	SubtitleClip
} from './Clip.svelte';
import { ProjectEditorTabs } from './enums';
import { SerializableBase } from './misc/SerializableBase';
import { globalState } from '$lib/runes/main.svelte';
import ModalManager from '$lib/components/modals/ModalManager';

/**
 * État de l'éditeur de projet, utilisé pour gérer l'interface utilisateur et les interactions
 * dans l'éditeur de projet.
 */
export class ProjectEditorState extends SerializableBase {
	// L'onglet actuellement sélectionné dans l'éditeur de projet
	currentTab: ProjectEditorTabs = $state(ProjectEditorTabs.VideoEditor);

	// Indique si on montre ou non l'indication "Drop your files here"
	showDropScreen: boolean = $state(false);

	// Indique quelle(s) section(s) de l'éditeur sont étendues
	sections: {
		[name: string]: {
			extended: boolean;
		};
	} = $state({});

	// Timeline
	timeline: TimelineState = $state(new TimelineState());

	// Video preview
	videoPreview: VideoPreviewState = $state(new VideoPreviewState());

	// Subtitles editor
	subtitlesEditor: SubtitlesEditorState = $state(new SubtitlesEditorState());

	// Translations editor
	translationsEditor: TranslationsEditorState = $state(new TranslationsEditorState());

	// Styles editor
	stylesEditor: StylesEditorState = $state(new StylesEditorState());

	// Export
	export: ExportState = $state(new ExportState());

	// Hauteur de la section supérieure dans chaque onglet
	upperSectionHeight: number = $state(68);
}

export class StylesEditorState extends SerializableBase {
	// Indique la position du scroll dans l'éditeur de styles
	scrollPosition: number = $state(0);

	// Indique quel est la sélection actuelle dans l'éditeur de styles (global/arabic/translation)
	currentSelection: 'global' | 'arabic' | 'translation' = $state('global');

	// Indique quelle traduction est actuellement sélectionnée dans l'éditeur de styles
	currentSelectionTranslation: string = $state('');

	// Indique la requête de recherche actuelle dans l'éditeur de styles
	searchQuery: string = $state('');

	// Indique les sous-titres actuellement sélectionnés dans l'éditeur de styles
	selectedSubtitles: SubtitleClip[] = $state([]);

	// Indique la catégorie sur laquelle on doit scroll et highlight quelque seconde
	scrollAndHighlight: string | null = $state(null);

	getCurrentSelection(): 'global' | 'arabic' | string {
		if (this.currentSelection === 'global' || this.currentSelection === 'arabic') {
			return this.currentSelection;
		}
		return this.currentSelectionTranslation;
	}

	isSelected(id: number) {
		return this.selectedSubtitles.some((subtitle) => subtitle.id === id);
	}

	toggleSelection(clip: SubtitleClip) {
		if (clip instanceof SubtitleClip === false) return;

		if (this.isSelected(clip.id)) {
			this.selectedSubtitles = this.selectedSubtitles.filter((subtitle) => subtitle.id !== clip.id);
		} else {
			this.selectedSubtitles.push(clip);
		}
	}

	removeSelection(id: number) {
		this.selectedSubtitles = this.selectedSubtitles.filter((subtitle) => subtitle.id !== id);
	}

	clearSelection() {
		globalState.getSubtitlesEditorState.editSubtitle = null;
		this.selectedSubtitles = [];
	}
}

/**
 * État de la timeline dans l'éditeur de projet.
 */
export class TimelineState extends SerializableBase {
	// Niveau de zoom de la timeline
	zoom: number = $state(29.25);

	// Position du curseur dans la timeline
	cursorPosition: number = $state(1);

	// Indique si on doit afficher ou non le curseur de la timeline
	showCursor: boolean = $state(true);

	// State permettant de trigger le changement du temps de la vidéo et de l'audio dans la preview
	movePreviewTo: number = $state(0);

	// Position du scroll
	scrollX: number = $state(0);
}

/**
 * État de la prévisualisation vidéo dans l'éditeur de projet.
 */
export class VideoPreviewState extends SerializableBase {
	// Indique si la prévisualisation vidéo est en pause
	isPlaying: boolean = $state(false);

	// Indique si la prévisualisation vidéo est en plein écran
	isFullscreen: boolean = $state(false);

	// Indique si on doit mute la vidéo
	showVideosAndAudios: boolean = $state(false);

	// Fonction pour toggle play/pause, sera définie par le composant VideoPreview
	togglePlayPause: () => void = () => {};

	// Fonction pour scroll la timeline à la position du curseur, sera définie par le composant Timeline
	scrollTimelineToCursor: () => void = () => {};

	async toggleFullScreen() {
		const appWindow = getCurrentWindow();

		try {
			globalState.currentProject!.projectEditorState.videoPreview.isFullscreen =
				!globalState.currentProject!.projectEditorState.videoPreview.isFullscreen;
			await appWindow.setFullscreen(
				globalState.currentProject!.projectEditorState.videoPreview.isFullscreen
			);
		} catch (err: any) {
			ModalManager.errorModal(
				'Error',
				'There was an error toggling fullscreen!',
				JSON.stringify(err)
			);
		}
	}
}

export class SubtitlesEditorState extends SerializableBase {
	// Indique la sourate actuellement sélectionnée dans l'éditeur de sous-titres
	selectedSurah: number = $state(1);

	// Indique le numéro du verset actuellement sélectionné dans l'éditeur de sous-titres
	selectedVerse: number = $state(1);

	// Indique l'index du premier mot actuellement sélectionné dans l'éditeur de sous-titres
	startWordIndex: number = $state(0);

	// Indique l'index du dernier mot actuellement sélectionné dans l'éditeur de sous-titres
	endWordIndex: number = $state(0);

	// Playback speed
	playbackSpeed: number = $state(1.0);

	// Affiche la traduction des mots
	showWordTranslation: boolean = $state(true);

	// Affiche la translittération des mots
	showWordTransliteration: boolean = $state(false);

	// Indique le sous-titre à éditer dans l'éditeur de sous-titres (null si aucun)
	editSubtitle: SubtitleClip | PredefinedSubtitleClip | ClipWithTranslation | SilenceClip | null =
		$state(null);

	// Nombre initial de segments à review (set lors de l'auto-segmentation)
	// Utilisé pour afficher la barre de progression des segments à review
	initialLowConfidenceCount: number = $state(0);

	// Filtre par nombre de mots minimum dans la liste des sous-titres
	minWordCount: number = $state(0);
}

export class TranslationsEditorState extends SerializableBase {
	// Indique si l'utilisateur montre les instructions pour utiliser l'IA
	showAIInstructions: boolean = $state(false);

	// Indique le filtre actuellement appliqué dans l'éditeur de traductions
	filters: { [statut: string]: boolean } = $state({
		'to review': true,
		'ai error': true,
		'ai trimmed': true,
		'automatically trimmed': true,
		reviewed: true,
		'completed by default': false
	});

	searchQuery: string = $state('');

	// === INDEX PRÉ-CALCULÉ ===
	// Structure: { "2:142": { indices: [45, 46, 47], surah: 2, verse: 142 }, ... }
	verseIndex: Map<string, { indices: number[]; surah: number; verse: number }> = $state(new Map());
	
	// Liste ordonnée des clés de versets pour la pagination
	verseKeys: string[] = $state([]);
	
	// Indique si l'index a été construit
	indexBuilt: boolean = $state(false);

	// Page courante pour la pagination
	currentPage: number = $state(1);
	itemsPerPage: number = 20;

	checkOnlyFilters(list: string[]) {
		for (const key in this.filters) {
			if (list.includes(key)) {
				this.filters[key] = true;
			} else {
				this.filters[key] = false;
			}
		}
	}

	/**
	 * Reconstruit l'index des versets à partir des clips.
	 * Appelé une seule fois au chargement du projet.
	 */
	rebuildIndex(clips: any[]) {
		const newIndex = new Map<string, { indices: number[]; surah: number; verse: number }>();
		const keys: string[] = [];

		for (let i = 0; i < clips.length; i++) {
			const clip = clips[i];
			if (clip.type === 'Subtitle') {
				const key = `${clip.surah}:${clip.verse}`;
				if (!newIndex.has(key)) {
					newIndex.set(key, { indices: [], surah: clip.surah, verse: clip.verse });
					keys.push(key);
				}
				newIndex.get(key)!.indices.push(i);
			} else if (clip.type === 'Pre-defined Subtitle') {
				// Les pre-defined subtitles ont leur propre entrée
				const key = `predefined_${i}`;
				newIndex.set(key, { indices: [i], surah: -1, verse: -1 });
				keys.push(key);
			}
		}

		this.verseIndex = newIndex;
		this.verseKeys = keys;
		this.indexBuilt = true;
		console.log(`[TranslationsEditor] Index rebuilt: ${keys.length} verse groups from ${clips.length} clips`);
	}

	/**
	 * Récupère un groupe de versets par sa clé.
	 */
	getVerseGroup(key: string): { indices: number[]; surah: number; verse: number } | undefined {
		// Vérifier si verseIndex est un Map valide (peut être corrompu après désérialisation)
		if (this.verseIndex instanceof Map) {
			return this.verseIndex.get(key);
		}
		// Si c'est un objet plain (après désérialisation JSON), accéder comme un objet
		return (this.verseIndex as any)[key];
	}

	/**
	 * Trouve la page contenant un verset spécifique.
	 */
	findPageForVerse(surah: number, verse: number): number {
		const key = `${surah}:${verse}`;
		const index = this.verseKeys.indexOf(key);
		if (index === -1) return 1;
		return Math.floor(index / this.itemsPerPage) + 1;
	}

	/**
	 * Navigue vers un verset spécifique.
	 */
	goToVerse(surah: number, verse: number): boolean {
		const page = this.findPageForVerse(surah, verse);
		if (page !== this.currentPage) {
			this.currentPage = page;
			return true;
		}
		return false;
	}
}

export class ExportState extends SerializableBase {
	// Indique le type d'export choisie
	selectedChoice: 'video' | 'subtitles' | 'chapters' | 'project' = $state('video');

	/*
	 * ============================================
	 * SUBTITLES EXPORT STATES
	 * ============================================
	 */

	// Le format de sous-titre choisi
	subtitleFormat: 'SRT' | 'VTT' = $state('SRT');

	// Indique les cibles incluses dans l'export
	includedTarget: { [target: string]: boolean } = $state({});

	// Indique si on exporte les numéros de verset ou pas
	exportVerseNumbers: { [target: string]: boolean } = $state({});

	// Indique le format du texte arabe
	arabicTextFormat: 'Plain' | 'V1' | 'V2' = $state('Plain');

	// Indique la sélection d'exportation des chapitres YouTube
	ytbChaptersChoice: 'Each Surah' | 'Each Verse' = $state('Each Surah');

	// Indique la partie de la vidéo à exporter
	videoStartTime: number = $state(0);
	videoEndTime: number = $state(0);
	fps: number = $state(30);
	chunkSize: number = $state(50);
	customFileName: string = $state('');
}

SerializableBase.registerChildClass(ProjectEditorState, 'timeline', TimelineState);
SerializableBase.registerChildClass(
	ProjectEditorState,
	'translationsEditor',
	TranslationsEditorState
);
SerializableBase.registerChildClass(ProjectEditorState, 'videoPreview', VideoPreviewState);
SerializableBase.registerChildClass(ProjectEditorState, 'subtitlesEditor', SubtitlesEditorState);
SerializableBase.registerChildClass(ProjectEditorState, 'stylesEditor', StylesEditorState);
SerializableBase.registerChildClass(ProjectEditorState, 'export', ExportState);
