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
import { getEditorPlaybackDurationInFrames } from "../lib/playback-duration";

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
    audio: 35,
    video: 71,
    image: 35,
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
    if (clips.length === 0) return 0;

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
    const existingGroup = getCompatibleGroup(project.trackGroups, kind);
    const groupId = existingGroup?.id ?? getNextId(`group-${kind}`);
    const trackId = getNextId(`track-${kind}`);
    const shiftedTracks = project.tracks.map((track) => ({
        ...track,
        index: track.index + 1,
    }));

    const nextTrack: TimelineTrack = {
        id: trackId,
        groupId,
        label: getTrackLabel(kind),
        kind,
        index: 0,
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
                        trackIds: [trackId, ...group.trackIds],
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
        // OLD logic: New clips reused an existing lane when possible.
        // NEW logic: Each new clip creates a new top lane; layerIndex controls preview stacking above older clips.
        tracks: [nextTrack, ...shiftedTracks],
        trackGroups: nextTrackGroups,
    };
};

const createTrackForMovedClip = (
    project: EditorProject,
    kind: TrackMediaKind,
    placement: "above" | "below",
    relativeTrackId?: string,
): {
    trackId: string;
    tracks: TimelineTrack[];
    trackGroups: TimelineTrackGroup[];
} => {
    const existingGroup = getCompatibleGroup(project.trackGroups, kind);
    const groupId = existingGroup?.id ?? getNextId(`group-${kind}`);
    const trackId = getNextId(`track-${kind}`);
    const sortedTracks = [...project.tracks].sort((a, b) => a.index - b.index);
    const relativeTrack = relativeTrackId
        ? sortedTracks.find((track) => track.id === relativeTrackId) ?? null
        : null;
    const insertAtTop = placement === "above" && !relativeTrack;
    const insertAtBottom = placement === "below" && !relativeTrack;
    const relativeTrackIndex = relativeTrack?.index ?? -1;
    const insertionIndex = insertAtTop
        ? 0
        : insertAtBottom
          ? project.tracks.reduce((maxIndex, track) => {
                return Math.max(maxIndex, track.index);
            }, -1) + 1
          : placement === "above"
            ? relativeTrackIndex
            : relativeTrackIndex + 1;
    const nextTrack: TimelineTrack = {
        id: trackId,
        groupId,
        label: getTrackLabel(kind),
        kind,
        index: insertionIndex,
        height: DEFAULT_TRACK_HEIGHT_BY_KIND[kind],
        isLocked: false,
        isMuted: false,
        isHidden: false,
    };
    const shiftedTracks =
        insertAtTop || insertAtBottom
            ? insertAtTop
                ? project.tracks.map((track) => ({
                      ...track,
                      index: track.index + 1,
                  }))
                : project.tracks
            : project.tracks.map((track) => ({
                  ...track,
                  index:
                      track.index >= insertionIndex
                          ? track.index + 1
                          : track.index,
              }));
    const nextTrackGroups = existingGroup
        ? project.trackGroups.map((group) => {
              if (group.id !== existingGroup.id) return group;

              return {
                  ...group,
                  trackIds: insertAtTop
                      ? [trackId, ...group.trackIds]
                      : insertAtBottom
                        ? [...group.trackIds, trackId]
                        : (() => {
                              const nextTrackIds = [...group.trackIds];
                              const relativeTrackGroupIndex =
                                  relativeTrackId !== undefined
                                      ? nextTrackIds.indexOf(relativeTrackId)
                                      : -1;

                              if (relativeTrackGroupIndex < 0) {
                                  nextTrackIds.push(trackId);
                                  return nextTrackIds;
                              }

                              const insertIndex =
                                  placement === "above"
                                      ? relativeTrackGroupIndex
                                      : relativeTrackGroupIndex + 1;
                              nextTrackIds.splice(insertIndex, 0, trackId);
                              return nextTrackIds;
                          })(),
              };
          })
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
        // OLD logic: Moving a clip could only target an already existing lane.
        // NEW logic: Dragging can also create a lane above/below a specific existing lane, not only at the stack edges.
        tracks: [...shiftedTracks, nextTrack].sort((a, b) => a.index - b.index),
        trackGroups: nextTrackGroups,
    };
};

const getClipOverlapInTrack = ({
    clips,
    clipId,
    trackId,
    from,
    durationInFrames,
}: {
    clips: TimelineClip[];
    clipId: string;
    trackId: string;
    from: number;
    durationInFrames: number;
}) => {
    const nextStart = from;
    const nextEnd = from + durationInFrames;

    return (
        clips.find((clip) => {
            if (clip.id === clipId || clip.trackId !== trackId) return false;

            const clipStart = clip.from;
            const clipEnd = clip.from + clip.durationInFrames;

            return nextStart < clipEnd && nextEnd > clipStart;
        }) ?? null
    );
};

const getNextNonOverlappingFrameInTrack = ({
    clips,
    clipId,
    trackId,
    requestedFrom,
    durationInFrames,
}: {
    clips: TimelineClip[];
    clipId: string;
    trackId: string;
    requestedFrom: number;
    durationInFrames: number;
}) => {
    const trackClips = clips
        .filter((clip) => clip.id !== clipId && clip.trackId === trackId)
        .sort((a, b) => a.from - b.from);

    if (trackClips.length === 0) {
        return requestedFrom;
    }

    let nextFrom = requestedFrom;
    let overlappingClip = getClipOverlapInTrack({
        clips,
        clipId,
        trackId,
        from: nextFrom,
        durationInFrames,
    });

    while (overlappingClip) {
        nextFrom = overlappingClip.from + overlappingClip.durationInFrames;
        overlappingClip = getClipOverlapInTrack({
            clips,
            clipId,
            trackId,
            from: nextFrom,
            durationInFrames,
        });
    }

    return nextFrom;
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

const getNextLayerIndex = (clips: TimelineClip[]) => {
    if (clips.length === 0) return 0;

    return (
        clips.reduce((maxLayerIndex, clip) => {
            return Math.max(maxLayerIndex, clip.layerIndex);
        }, 0) + 1
    );
};

const removeEmptyTracks = (
    tracks: TimelineTrack[],
    trackGroups: TimelineTrackGroup[],
    clips: TimelineClip[],
) => {
    const usedTrackIds = new Set(clips.map((clip) => clip.trackId));
    const tracksWithClips = tracks
        .filter((track) => usedTrackIds.has(track.id))
        .sort((a, b) => a.index - b.index)
        .map((track, index) => ({
            ...track,
            index,
        }));
    const remainingTrackIds = new Set(tracksWithClips.map((track) => track.id));

    const nextTrackGroups = trackGroups.flatMap((group) => {
        const trackIds = group.trackIds.filter((trackId) => {
            return remainingTrackIds.has(trackId);
        });

        if (trackIds.length === 0) {
            return [];
        }

        return [
            {
                ...group,
                trackIds,
            },
        ];
    });

    return {
        tracks: tracksWithClips,
        trackGroups: nextTrackGroups,
    };
};

const syncClipLayerIndexesWithTrackOrder = (
    clips: TimelineClip[],
    tracks: TimelineTrack[],
) => {
    const nextLayerIndexByClipId = new Map<string, number>();
    let nextLayerIndex = 0;

    const tracksFromBottomToTop = [...tracks].sort((a, b) => {
        return b.index - a.index;
    });

    for (const track of tracksFromBottomToTop) {
        const trackClips = clips
            .filter((clip) => clip.trackId === track.id)
            .sort((a, b) => {
                if (a.layerIndex !== b.layerIndex) {
                    return a.layerIndex - b.layerIndex;
                }

                return a.from - b.from;
            });

        for (const clip of trackClips) {
            nextLayerIndexByClipId.set(clip.id, nextLayerIndex);
            nextLayerIndex += 1;
        }
    }

    return clips.map((clip) => {
        const layerIndex = nextLayerIndexByClipId.get(clip.id);

        if (layerIndex === undefined || clip.layerIndex === layerIndex) {
            return clip;
        }

        return {
            ...clip,
            layerIndex,
        };
    });
};

export const useEditorStore = create<EditorStore>((set, get) => ({
    ...INITIAL_EDITOR_STATE,

    // ===== Player =====
    setCurrentFrame: (frame) => {
        const duration = getEditorPlaybackDurationInFrames(get().project);

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
                    // OLD logic: Playing from the end boundary could ask Remotion to play from its final renderable frame.
                    // NEW logic: Restart from frame 0 when play is requested at the project end.
                    currentFrame:
                        state.runtime.player.currentFrame >=
                        getEditorPlaybackDurationInFrames(state.project)
                            ? 0
                            : state.runtime.player.currentFrame,
                    status:
                        getEditorPlaybackDurationInFrames(state.project) <= 0
                            ? "paused"
                            : "playing",
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
                    currentFrame:
                        currentStatus !== "playing" &&
                        state.runtime.player.currentFrame >=
                            getEditorPlaybackDurationInFrames(state.project)
                            ? 0
                            : state.runtime.player.currentFrame,
                    status:
                        currentStatus === "playing" ||
                        getEditorPlaybackDurationInFrames(state.project) <= 0
                            ? "paused"
                            : "playing",
                },
            },
        }));
    },

    seekToFrame: (frame) => {
        const duration = getEditorPlaybackDurationInFrames(get().project);

        set((state) => ({
            runtime: {
                ...state.runtime,
                player: {
                    ...state.runtime.player,
                    currentFrame: clampFrame(frame, duration),
                    // OLD logic: Seeking while playing kept playback running.
                    // NEW logic: User seek/scrub/skip pauses playback at the chosen frame.
                    status:
                        state.runtime.player.status === "playing"
                            ? "paused"
                            : state.runtime.player.status,
                },
            },
        }));
    },

    seekByFrames: (delta) => {
        const currentFrame = get().runtime.player.currentFrame;
        const duration = getEditorPlaybackDurationInFrames(get().project);

        set((state) => ({
            runtime: {
                ...state.runtime,
                player: {
                    ...state.runtime.player,
                    currentFrame: clampFrame(currentFrame + delta, duration),
                    status:
                        state.runtime.player.status === "playing"
                            ? "paused"
                            : state.runtime.player.status,
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

    setTimelinePanelHeight: (panelHeight) => {
        set((state) => ({
            runtime: {
                ...state.runtime,
                timeline: {
                    ...state.runtime.timeline,
                    panelHeight: Math.max(220, Math.round(panelHeight)),
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

    // ===== Track Controls =====
    toggleTrackHidden: (trackId) => {
        set((state) => ({
            project: {
                ...state.project,
                tracks: state.project.tracks.map((track) => {
                    if (track.id !== trackId) return track;

                    return {
                        ...track,
                        // OLD logic: Track hide button only changed icon state locally.
                        // NEW logic: Track hidden state lives in project data and drives Timeline + Preview visibility.
                        isHidden: !track.isHidden,
                    };
                }),
            },
            runtime: {
                ...state.runtime,
                selection: {
                    ...state.runtime.selection,
                    selectedTrackId: trackId,
                },
            },
        }));
    },

    toggleTrackMuted: (trackId) => {
        set((state) => ({
            project: {
                ...state.project,
                tracks: state.project.tracks.map((track) => {
                    if (track.id !== trackId) return track;

                    return {
                        ...track,
                        // OLD logic: Track mute button only changed icon state locally.
                        // NEW logic: Track muted state lives in project data and drives Timeline + Preview audio.
                        isMuted: !track.isMuted,
                    };
                }),
            },
            runtime: {
                ...state.runtime,
                selection: {
                    ...state.runtime.selection,
                    selectedTrackId: trackId,
                },
            },
        }));
    },

    // ===== Clip Creation =====
    addTextClipAtPlayhead: (payload) => {
        // OLD logic: New text was created passively with "New text" and required a later edit action.
        // NEW logic: New text starts selected and editable in Preview, matching direct canvas editing.
        const text = payload?.text?.trim() || "Text";

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
                layerIndex: getNextLayerIndex(state.project.clips),
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
                    textEditing: {
                        editingClipId: clipId,
                        draftText: text,
                        isEditing: true,
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
            const durationInFrames = getMediaClipDuration(state.project, asset);
            const baseClip = {
                id: clipId,
                trackId,
                from: state.runtime.player.currentFrame,
                durationInFrames,
                sourceStartFrame: 0,
                label: asset.name,
                color: CLIP_COLOR_BY_KIND[asset.kind],
                layerIndex: getNextLayerIndex(state.project.clips),
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

    moveClip: ({ clipId, from, trackId, createTrackPlacement, relativeTrackId }) => {
        set((state) => {
            const clip = state.project.clips.find((item) => item.id === clipId);

            if (!clip || clip.isLocked) {
                return state;
            }

            const currentTrack = state.project.tracks.find((track) => {
                return track.id === clip.trackId;
            });

            if (!currentTrack || currentTrack.isLocked) {
                return state;
            }

            const trackPlacement = createTrackPlacement
                ? createTrackForMovedClip(
                      state.project,
                      clip.type,
                      createTrackPlacement,
                      relativeTrackId,
                  )
                : null;
            const projectTracks =
                trackPlacement?.tracks ?? state.project.tracks;
            const projectTrackGroups =
                trackPlacement?.trackGroups ?? state.project.trackGroups;
            const nextTrackId =
                trackPlacement?.trackId ?? trackId ?? currentTrack.id;
            const nextTrack = projectTracks.find((track) => {
                return track.id === nextTrackId;
            });

            if (!nextTrack) {
                return state;
            }

            if (nextTrack.isLocked) {
                return state;
            }

            const requestedFrom = Math.max(0, Math.round(from));
            const overlappingClip = getClipOverlapInTrack({
                clips: state.project.clips,
                clipId,
                trackId: nextTrack.id,
                from: requestedFrom,
                durationInFrames: clip.durationInFrames,
            });
            const nextFrom = overlappingClip
                ? getNextNonOverlappingFrameInTrack({
                      clips: state.project.clips,
                      clipId,
                      trackId: nextTrack.id,
                      requestedFrom,
                      durationInFrames: clip.durationInFrames,
                  })
                : requestedFrom;

            // OLD logic: Overlap drops could snap to the nearest free slot, including before the target clip.
            // NEW logic: Dropping onto a clip walks forward to the next free frame so clips sit after the overlap.
            const movedClips = state.project.clips.map((item) => {
                if (item.id !== clipId) return item;

                return {
                    ...item,
                    from: nextFrom,
                    trackId: nextTrack.id,
                };
            });
            const { tracks, trackGroups } = removeEmptyTracks(
                projectTracks,
                projectTrackGroups,
                movedClips,
            );
            // OLD logic: Drag/drop changed clip.trackId but kept stale layerIndex, so Preview stacking could differ from Timeline.
            // NEW logic: Rebuild layerIndex from lane order; upper Timeline lanes get higher layerIndex and render above lower lanes.
            const clips = syncClipLayerIndexesWithTrackOrder(
                movedClips,
                tracks,
            );
            const durationInFrames = getProjectDurationInFrames(clips);

            // OLD logic: Clip movement was constrained to same-kind lanes.
            // NEW logic: Any clip kind can move to any unlocked lane; overlap drops snap beside existing clips.
            return {
                project: {
                    ...state.project,
                    trackGroups,
                    tracks,
                    clips,
                    video: {
                        ...state.project.video,
                        durationInFrames,
                    },
                },
                runtime: {
                    ...state.runtime,
                    player: {
                        ...state.runtime.player,
                        currentFrame: clampFrame(
                            state.runtime.player.currentFrame,
                            getEditorPlaybackDurationInFrames({
                                ...state.project,
                                clips,
                                video: {
                                    ...state.project.video,
                                    durationInFrames,
                                },
                            }),
                        ),
                    },
                    selection: {
                        ...state.runtime.selection,
                        selectedClipIds: [clipId],
                        selectedTrackId: nextTrack.id,
                    },
                },
            };
        });
    },

    // ===== Text Editing =====
    updateClipTransform: ({ clipId, transform }) => {
        set((state) => ({
            project: {
                ...state.project,
                clips: state.project.clips.map((clip) => {
                    if (clip.id !== clipId) {
                        return clip;
                    }

                    const baseTransform =
                        clip.transform ?? getCenteredTransform(state.project);

                    return {
                        ...clip,
                        // OLD logic: Preview text overlay could only select/edit text content.
                        // NEW logic: Preview overlay can persist transform changes, starting with x/y movement.
                        transform: {
                            ...baseTransform,
                            ...transform,
                        },
                    };
                }),
            },
        }));
    },

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
            project: {
                ...state.project,
                clips: state.project.clips.map((clip) => {
                    if (
                        clip.id !== state.runtime.textEditing.editingClipId ||
                        clip.type !== "text"
                    ) {
                        return clip;
                    }

                    return {
                        ...clip,
                        text: draftText,
                        label: draftText.trim() || "Text",
                    };
                }),
            },
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
        set((state) => {
            const selectedClipIds = new Set(
                state.runtime.selection.selectedClipIds,
            );

            if (selectedClipIds.size === 0) {
                return state;
            }

            const clips = state.project.clips.filter((clip) => {
                return !selectedClipIds.has(clip.id);
            });
            const { tracks, trackGroups } = removeEmptyTracks(
                state.project.tracks,
                state.project.trackGroups,
                clips,
            );
            const durationInFrames = getProjectDurationInFrames(clips);
            const currentFrame =
                clips.length === 0
                    ? 0
                    : clampFrame(
                          state.runtime.player.currentFrame,
                          getEditorPlaybackDurationInFrames({
                              ...state.project,
                              video: {
                                  ...state.project.video,
                                  durationInFrames,
                              },
                              clips,
                          }),
                      );

            // OLD logic: Delete toolbar action was a stub.
            // NEW logic: Remove selected clips, recalculate project duration, and clear stale selection.
            return {
                project: {
                    ...state.project,
                    trackGroups,
                    tracks,
                    clips,
                    video: {
                        ...state.project.video,
                        durationInFrames,
                    },
                },
                runtime: {
                    ...state.runtime,
                    player: {
                        ...state.runtime.player,
                        currentFrame,
                    },
                    selection: {
                        selectedClipIds: [],
                        selectedTrackId: null,
                        selectedGroupId: null,
                    },
                },
            };
        });
    },

    undo: () => {
        console.log("undo: not implemented yet");
    },

    redo: () => {
        console.log("redo: not implemented yet");
    },
}));
