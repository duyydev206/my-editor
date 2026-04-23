import { create } from "zustand";
import type { EditorStore } from "./editor.types";
import { INITIAL_EDITOR_STATE } from "./editor.initial-state";
import type {
    ClipTransform,
    EditorProject,
    MediaAsset,
    TimelineClip,
    TimelineTrack,
    TimelineTrackGroup,
    TrackMediaKind,
} from "../types";

const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(value, max));
};

const clampFrame = (frame: number, durationInFrames: number) => {
    if (durationInFrames <= 0) return 0;
    // OLD logic: UI frame was clamped to the final rendered frame.
    // NEW logic: UI playhead can sit on the end boundary so it aligns with clip ends and ruler labels.
    return clamp(frame, 0, durationInFrames);
};

const DEFAULT_TRACK_HEIGHT_BY_KIND: Record<TrackMediaKind, number> = {
    text: 35,
    shape: 35,
    audio: 71,
    video: 71,
    image: 71,
};

const CLIP_COLOR_BY_KIND: Record<TrackMediaKind, string> = {
    text: "#7a5de8",
    shape: "#d97706",
    audio: "#3a7a44",
    video: "#3d5ec9",
    image: "#0f766e",
};

const getNextId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getProjectDurationInFrames = (clips: TimelineClip[]) => {
    // OLD logic: Empty projects started at 60 frames.
    // NEW logic: Project duration represents real content length; timeline padding is handled by the timeline zoom layer.
    if (clips.length === 0) return 1;

    const maxClipEnd = clips.reduce((maxEnd, clip) => {
        return Math.max(maxEnd, clip.from + clip.durationInFrames);
    }, 0);

    return Math.max(1, maxClipEnd);
};

const getTrackLabel = (kind: TrackMediaKind) => {
    switch (kind) {
        case "text":
            return "Text";
        case "shape":
            return "Shape";
        case "audio":
            return "Audio";
        case "video":
            return "Video";
        case "image":
            return "Image";
        default:
            return "Track";
    }
};

const getGroupLabel = (kind: TrackMediaKind) => {
    if (kind === "text") return "Text";
    if (kind === "shape") return "Overlays";
    return "Media";
};

const getCompatibleGroup = (
    trackGroups: TimelineTrackGroup[],
    kind: TrackMediaKind,
) => {
    const exactGroup = trackGroups.find((group) => group.kind === kind);

    if (exactGroup) return exactGroup;

    if (kind === "video" || kind === "audio" || kind === "image") {
        return trackGroups.find((group) => group.label === "Media") ?? null;
    }

    return null;
};

const ensureTrackForKind = (
    project: EditorProject,
    kind: TrackMediaKind,
): {
    trackId: string;
    tracks: TimelineTrack[];
    trackGroups: TimelineTrackGroup[];
} => {
    const existingTrack = project.tracks.find((track) => track.kind === kind);

    if (existingTrack) {
        return {
            trackId: existingTrack.id,
            tracks: project.tracks,
            trackGroups: project.trackGroups,
        };
    }

    const existingGroup = getCompatibleGroup(project.trackGroups, kind);
    const groupId = existingGroup?.id ?? getNextId(`group-${kind}`);
    const trackId = getNextId(`track-${kind}`);

    const nextTrack: TimelineTrack = {
        id: trackId,
        groupId,
        label: getTrackLabel(kind),
        kind,
        index: project.tracks.length,
        height: DEFAULT_TRACK_HEIGHT_BY_KIND[kind],
        isLocked: false,
        isMuted: false,
        isHidden: false,
    };

    const nextTrackGroups = existingGroup
        ? project.trackGroups.map((group) =>
              group.id === existingGroup.id
                  ? {
                        ...group,
                        trackIds: [...group.trackIds, trackId],
                    }
                  : group,
          )
        : [
              ...project.trackGroups,
              {
                  id: groupId,
                  label: getGroupLabel(kind),
                  kind,
                  trackIds: [trackId],
                  isCollapsed: false,
                  isLocked: false,
                  isMuted: false,
                  isHidden: false,
              },
          ];

    return {
        trackId,
        tracks: [...project.tracks, nextTrack],
        trackGroups: nextTrackGroups,
    };
};

const getCenteredTransform = (
    project: EditorProject,
    width?: number,
    height?: number,
): ClipTransform => {
    return {
        x: project.video.width / 2,
        y: project.video.height / 2,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
        width,
        height,
        anchorX: 0.5,
        anchorY: 0.5,
    };
};

const getVisualAssetSize = (project: EditorProject) => {
    // OLD logic: Uploaded visual media was limited to 72% of the composition.
    // NEW logic: New image/video clips fill the preview canvas by default.
    return {
        width: project.video.width,
        height: project.video.height,
    };
};

const getMediaClipDuration = (project: EditorProject, asset: MediaAsset) => {
    if (asset.kind === "image") {
        return project.video.fps * 5;
    }

    return asset.durationInFrames ?? project.video.fps * 5;
};

export const useEditorStore = create<EditorStore>((set, get) => ({
    ...INITIAL_EDITOR_STATE,

    // ===== Player =====
    setCurrentFrame: (frame) => {
        const duration = get().project.video.durationInFrames;

        set((state) => ({
            runtime: {
                ...state.runtime,
                player: {
                    ...state.runtime.player,
                    currentFrame: clampFrame(frame, duration),
                },
            },
        }));
    },

    setPlaybackStatus: (status) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                player: {
                    ...state.runtime.player,
                    status,
                },
            },
        }));
    },

    play: () => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                player: {
                    ...state.runtime.player,
                    status: "playing",
                },
            },
        }));
    },

    pause: () => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                player: {
                    ...state.runtime.player,
                    status: "paused",
                },
            },
        }));
    },

    togglePlay: () => {
        const currentStatus = get().runtime.player.status;

        set((state) => ({
            runtime: {
                ...state.runtime,
                player: {
                    ...state.runtime.player,
                    status: currentStatus === "playing" ? "paused" : "playing",
                },
            },
        }));
    },

    seekToFrame: (frame) => {
        const duration = get().project.video.durationInFrames;

        set((state) => ({
            runtime: {
                ...state.runtime,
                player: {
                    ...state.runtime.player,
                    currentFrame: clampFrame(frame, duration),
                },
            },
        }));
    },

    seekByFrames: (delta) => {
        const currentFrame = get().runtime.player.currentFrame;
        const duration = get().project.video.durationInFrames;

        set((state) => ({
            runtime: {
                ...state.runtime,
                player: {
                    ...state.runtime.player,
                    currentFrame: clampFrame(currentFrame + delta, duration),
                },
            },
        }));
    },

    setMuted: (muted) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                player: {
                    ...state.runtime.player,
                    isMuted: muted,
                },
            },
        }));
    },

    toggleMuted: () => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                player: {
                    ...state.runtime.player,
                    isMuted: !state.runtime.player.isMuted,
                },
            },
        }));
    },

    setPlaybackRate: (rate) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                player: {
                    ...state.runtime.player,
                    playbackRate: rate,
                },
            },
        }));
    },

    // ===== Preview =====
    setPreviewContainerSize: ({ containerWidth, containerHeight }) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                preview: {
                    ...state.runtime.preview,
                    containerWidth,
                    containerHeight,
                },
            },
        }));
    },

    setPreviewZoom: (zoom) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                preview: {
                    ...state.runtime.preview,
                    zoom,
                },
            },
        }));
    },

    setPreviewMode: (mode) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                preview: {
                    ...state.runtime.preview,
                    mode,
                },
            },
        }));
    },

    togglePreviewFullscreen: () => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                preview: {
                    ...state.runtime.preview,
                    isFullscreen: !state.runtime.preview.isFullscreen,
                },
            },
        }));
    },

    setPreviewFullscreen: (isFullscreen) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                preview: {
                    ...state.runtime.preview,
                    isFullscreen,
                },
            },
        }));
    },

    // ===== Timeline Zoom =====
    setTimelineZoomLevel: (zoomLevel) => {
        const minZoomLevel = get().runtime.timeline.zoom.minZoomLevel;
        const maxZoomLevel = get().runtime.timeline.zoom.maxZoomLevel;

        set((state) => ({
            runtime: {
                ...state.runtime,
                timeline: {
                    ...state.runtime.timeline,
                    zoom: {
                        ...state.runtime.timeline.zoom,
                        zoomLevel: clamp(zoomLevel, minZoomLevel, maxZoomLevel),
                    },
                },
            },
        }));
    },

    zoomTimelineIn: () => {
        const { zoomLevel, minZoomLevel, maxZoomLevel } =
            get().runtime.timeline.zoom;

        set((state) => ({
            runtime: {
                ...state.runtime,
                timeline: {
                    ...state.runtime.timeline,
                    zoom: {
                        ...state.runtime.timeline.zoom,
                        zoomLevel: clamp(
                            zoomLevel + 1,
                            minZoomLevel,
                            maxZoomLevel,
                        ),
                    },
                },
            },
        }));
    },

    zoomTimelineOut: () => {
        const { zoomLevel, minZoomLevel, maxZoomLevel } =
            get().runtime.timeline.zoom;

        set((state) => ({
            runtime: {
                ...state.runtime,
                timeline: {
                    ...state.runtime.timeline,
                    zoom: {
                        ...state.runtime.timeline.zoom,
                        zoomLevel: clamp(
                            zoomLevel - 1,
                            minZoomLevel,
                            maxZoomLevel,
                        ),
                    },
                },
            },
        }));
    },

    setTimelinePixelsPerFrame: (pixelsPerFrame) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                timeline: {
                    ...state.runtime.timeline,
                    zoom: {
                        ...state.runtime.timeline.zoom,
                        pixelsPerFrame,
                    },
                },
            },
        }));
    },

    // ===== Timeline Viewport =====
    setTimelineViewportSize: ({ viewportWidth, viewportHeight }) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                timeline: {
                    ...state.runtime.timeline,
                    viewport: {
                        ...state.runtime.timeline.viewport,
                        viewportWidth,
                        viewportHeight,
                    },
                },
            },
        }));
    },

    setTimelineScroll: ({ scrollLeft, scrollTop }) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                timeline: {
                    ...state.runtime.timeline,
                    viewport: {
                        ...state.runtime.timeline.viewport,
                        scrollLeft:
                            scrollLeft ??
                            state.runtime.timeline.viewport.scrollLeft,
                        scrollTop:
                            scrollTop ??
                            state.runtime.timeline.viewport.scrollTop,
                    },
                },
            },
        }));
    },

    // ===== Timeline Toolbar =====
    toggleSnap: () => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                timeline: {
                    ...state.runtime.timeline,
                    toolbar: {
                        ...state.runtime.timeline.toolbar,
                        snapEnabled:
                            !state.runtime.timeline.toolbar.snapEnabled,
                    },
                },
            },
        }));
    },

    toggleLoop: () => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                timeline: {
                    ...state.runtime.timeline,
                    toolbar: {
                        ...state.runtime.timeline.toolbar,
                        isLoopEnabled:
                            !state.runtime.timeline.toolbar.isLoopEnabled,
                    },
                },
            },
        }));
    },

    toggleShowRuler: () => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                timeline: {
                    ...state.runtime.timeline,
                    toolbar: {
                        ...state.runtime.timeline.toolbar,
                        showRuler: !state.runtime.timeline.toolbar.showRuler,
                    },
                },
            },
        }));
    },

    toggleShowWaveforms: () => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                timeline: {
                    ...state.runtime.timeline,
                    toolbar: {
                        ...state.runtime.timeline.toolbar,
                        showWaveforms:
                            !state.runtime.timeline.toolbar.showWaveforms,
                    },
                },
            },
        }));
    },

    toggleShowThumbnails: () => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                timeline: {
                    ...state.runtime.timeline,
                    toolbar: {
                        ...state.runtime.timeline.toolbar,
                        showThumbnails:
                            !state.runtime.timeline.toolbar.showThumbnails,
                    },
                },
            },
        }));
    },

    // ===== Selection =====
    setSelectedClipIds: (clipIds) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                selection: {
                    ...state.runtime.selection,
                    selectedClipIds: clipIds,
                },
            },
        }));
    },

    setSelectedTrackId: (trackId) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                selection: {
                    ...state.runtime.selection,
                    selectedTrackId: trackId,
                },
            },
        }));
    },

    setSelectedGroupId: (groupId) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                selection: {
                    ...state.runtime.selection,
                    selectedGroupId: groupId,
                },
            },
        }));
    },

    clearSelection: () => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                selection: {
                    selectedClipIds: [],
                    selectedTrackId: null,
                    selectedGroupId: null,
                },
            },
        }));
    },

    // ===== Clip Creation =====
    addTextClipAtPlayhead: (payload) => {
        const text = payload?.text?.trim() || "New text";

        set((state) => {
            const { trackId, tracks, trackGroups } = ensureTrackForKind(
                state.project,
                "text",
            );
            const clipId = getNextId("clip-text");
            const durationInFrames =
                payload?.durationInFrames ?? state.project.video.fps * 3;

            const nextClip: TimelineClip = {
                id: clipId,
                trackId,
                type: "text",
                from: state.runtime.player.currentFrame,
                durationInFrames,
                sourceStartFrame: 0,
                label: text,
                color: CLIP_COLOR_BY_KIND.text,
                isLocked: false,
                isHidden: false,
                text,
                style: {
                    fontFamily: "Inter, Arial, sans-serif",
                    fontSize: 96,
                    fontWeight: 700,
                    textAlign: "center",
                    color: "#ffffff",
                },
                transform: getCenteredTransform(state.project),
            };

            const clips = [...state.project.clips, nextClip];

            return {
                project: {
                    ...state.project,
                    trackGroups,
                    tracks,
                    clips,
                    video: {
                        ...state.project.video,
                        durationInFrames: getProjectDurationInFrames(clips),
                    },
                },
                runtime: {
                    ...state.runtime,
                    selection: {
                        selectedClipIds: [clipId],
                        selectedTrackId: trackId,
                        selectedGroupId: null,
                    },
                },
            };
        });
    },

    addMediaAssetAsClip: ({ asset }) => {
        set((state) => {
            const { trackId, tracks, trackGroups } = ensureTrackForKind(
                state.project,
                asset.kind,
            );
            const clipId = getNextId(`clip-${asset.kind}`);
            const durationInFrames = getMediaClipDuration(
                state.project,
                asset,
            );
            const baseClip = {
                id: clipId,
                trackId,
                from: state.runtime.player.currentFrame,
                durationInFrames,
                sourceStartFrame: 0,
                label: asset.name,
                color: CLIP_COLOR_BY_KIND[asset.kind],
                isLocked: false,
                isHidden: false,
            };

            const visualSize = getVisualAssetSize(state.project);
            const nextClip: TimelineClip =
                asset.kind === "audio"
                    ? {
                          ...baseClip,
                          type: "audio",
                          src: asset.src,
                          sourceDurationInFrames: durationInFrames,
                          volume: 1,
                      }
                    : asset.kind === "video"
                      ? {
                            ...baseClip,
                            type: "video",
                            src: asset.src,
                            sourceDurationInFrames: durationInFrames,
                            volume: 1,
                            transform: getCenteredTransform(
                                state.project,
                                visualSize.width,
                                visualSize.height,
                            ),
                        }
                      : {
                            ...baseClip,
                            type: "image",
                            src: asset.src,
                            // OLD logic: Image clips used "contain", leaving black space around mismatched media.
                            // NEW logic: Use "cover" so newly uploaded images fill the preview canvas.
                            objectFit: "cover",
                            transform: getCenteredTransform(
                                state.project,
                                visualSize.width,
                                visualSize.height,
                            ),
                        };

            const mediaAssets = [...state.project.mediaAssets, asset];
            const clips = [...state.project.clips, nextClip];

            return {
                project: {
                    ...state.project,
                    trackGroups,
                    tracks,
                    clips,
                    mediaAssets,
                    video: {
                        ...state.project.video,
                        durationInFrames: getProjectDurationInFrames(clips),
                    },
                },
                runtime: {
                    ...state.runtime,
                    selection: {
                        selectedClipIds: [clipId],
                        selectedTrackId: trackId,
                        selectedGroupId: null,
                    },
                },
            };
        });
    },

    // ===== Text Editing =====
    startTextEditing: ({ clipId, draftText }) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                textEditing: {
                    editingClipId: clipId,
                    draftText,
                    isEditing: true,
                },
            },
        }));
    },

    updateTextDraft: (draftText) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                textEditing: {
                    ...state.runtime.textEditing,
                    draftText,
                },
            },
        }));
    },

    stopTextEditing: () => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                textEditing: {
                    editingClipId: null,
                    draftText: "",
                    isEditing: false,
                },
            },
        }));
    },

    // ===== Toolbar command stubs =====
    splitSelectedClipAtPlayhead: () => {
        console.log("splitSelectedClipAtPlayhead: not implemented yet");
    },

    deleteSelectedClips: () => {
        console.log("deleteSelectedClips: not implemented yet");
    },

    undo: () => {
        console.log("undo: not implemented yet");
    },

    redo: () => {
        console.log("redo: not implemented yet");
    },
}));
