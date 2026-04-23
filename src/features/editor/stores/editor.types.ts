import {
    ClipTransform,
    Frame,
    Frames,
    MediaAsset,
    Pixels,
    PlaybackStatus,
} from "../types";
import { EditorState } from "../types/editor";

export type EditorStoreState = EditorState;

export type EditorStoreActions = {
    // ===== Player =====
    setCurrentFrame: (frame: Frame) => void;
    setPlaybackStatus: (status: PlaybackStatus) => void;
    play: () => void;
    pause: () => void;
    togglePlay: () => void;
    seekToFrame: (frame: Frame) => void;
    seekByFrames: (delta: Frames) => void;
    setMuted: (muted: boolean) => void;
    toggleMuted: () => void;
    setPlaybackRate: (rate: number) => void;

    // ===== Preview =====
    setPreviewContainerSize: (payload: {
        containerWidth: Pixels;
        containerHeight: Pixels;
    }) => void;
    setPreviewZoom: (zoom: number) => void;
    setPreviewMode: (mode: EditorState["runtime"]["preview"]["mode"]) => void;
    togglePreviewFullscreen: () => void;
    setPreviewFullscreen: (isFullscreen: boolean) => void;

    // ===== Timeline Zoom =====
    setTimelineZoomLevel: (zoomLevel: number) => void;
    zoomTimelineIn: () => void;
    zoomTimelineOut: () => void;
    setTimelinePixelsPerFrame: (pixelsPerFrame: number) => void;

    // ===== Timeline Viewport =====
    setTimelineViewportSize: (payload: {
        viewportWidth: Pixels;
        viewportHeight: Pixels;
    }) => void;
    setTimelinePanelHeight: (panelHeight: Pixels) => void;
    setTimelineScroll: (payload: {
        scrollLeft?: Pixels;
        scrollTop?: Pixels;
    }) => void;

    // ===== Timeline Toolbar =====
    toggleSnap: () => void;
    toggleLoop: () => void;
    toggleShowRuler: () => void;
    toggleShowWaveforms: () => void;
    toggleShowThumbnails: () => void;

    // ===== Selection =====
    setSelectedClipIds: (clipIds: string[]) => void;
    setSelectedTrackId: (trackId: string | null) => void;
    setSelectedGroupId: (groupId: string | null) => void;
    clearSelection: () => void;

    // ===== Track Controls =====
    toggleTrackHidden: (trackId: string) => void;
    toggleTrackMuted: (trackId: string) => void;

    // ===== Clip Creation =====
    addTextClipAtPlayhead: (payload?: {
        text?: string;
        durationInFrames?: Frames;
    }) => void;
    addMediaAssetAsClip: (payload: { asset: MediaAsset }) => void;
    moveClip: (payload: {
        clipId: string;
        from: Frame;
        trackId?: string;
        createTrackPlacement?: "above" | "below";
    }) => void;

    // ===== Text Editing =====
    updateClipTransform: (payload: {
        clipId: string;
        transform: Partial<ClipTransform>;
    }) => void;
    startTextEditing: (payload: { clipId: string; draftText: string }) => void;
    updateTextDraft: (draftText: string) => void;
    stopTextEditing: () => void;

    // ===== Toolbar command stubs =====
    splitSelectedClipAtPlayhead: () => void;
    deleteSelectedClips: () => void;
    undo: () => void;
    redo: () => void;
};

export type EditorStore = EditorStoreState & EditorStoreActions;
