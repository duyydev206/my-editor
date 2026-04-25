"use client";

import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent,
} from "react";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragMoveEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import TimelineRuler from "./components/timeline-ruler";
import TimelineToolbar from "./components/timeline-toolbar";
import TimelineBody from "./components/timeline-body";
import TimelineItem from "./components/timeline-item";
import TimelineItemContent from "./components/timeline-item/timeline-item-content";
import TimelineItemShell from "./components/timeline-item/timeline-item-shell";
import TimelinePlayheadViewportLayer from "./components/timeline-playhead-viewport-layer";
import { buildTrackLaneLayouts } from "../../lib/build-track-lane-layouts";
import { buildClipLayouts } from "../../lib/build-clip-layouts";
import TimelineTrackHeaders from "./components/timeline-track-headers";
import type { TimelineClip, TimelineTrack, TrackMediaKind } from "../../types";
import { useEditorStore } from "../../stores";
import {
    frameToPx,
    RULER_HEIGHT,
    TRACK_HEADER_WIDTH,
} from "../../lib/timeline-math";
import { computeTimelineZoom } from "../../lib/timeline-zoom-engine";
import { getEditorPlaybackDurationInFrames } from "../../lib/playback-duration";

const TIMELINE_MIN_PANEL_HEIGHT = 220;
const PREVIEW_MIN_PANEL_HEIGHT = 140;
const DRAG_AUTO_SCROLL_EDGE_THRESHOLD = 56;
const DRAG_AUTO_SCROLL_MAX_STEP = 28;
const LANE_GAP_PREVIEW_HEIGHT = 2;
const LANE_INSERT_SNAP_THRESHOLD = 8;
const PREVIEW_TRACK_ID = "__timeline-preview-track__";

type ClipDropPreview = {
    clipId: string;
    from: number;
    left: number;
    top: number;
    width: number;
    height: number;
    trackId?: string;
    createTrackPlacement?: "above" | "below";
    relativeTrackId?: string;
    previewKind?: "clip" | "lane-insert" | "lane-gap";
};

type TimelineBoundaryScrollEvent = CustomEvent<{
    position: "start" | "end";
}>;

const getPreviewTrackKind = (
    clipId: string | null,
    clips: TimelineClip[],
): TrackMediaKind => {
    const clip = clipId ? clips.find((item) => item.id === clipId) : null;

    return clip?.type ?? "image";
};

const getTracksWithInsertPreview = ({
    tracks,
    clips,
    draggingClipId,
    clipDropPreview,
}: {
    tracks: TimelineTrack[];
    clips: TimelineClip[];
    draggingClipId: string | null;
    clipDropPreview: ClipDropPreview | null;
}): TimelineTrack[] => {
    if (
        !draggingClipId ||
        !clipDropPreview ||
        clipDropPreview.previewKind !== "lane-insert" ||
        !clipDropPreview.createTrackPlacement
    ) {
        return tracks;
    }

    const sortedTracks = [...tracks].sort((a, b) => a.index - b.index);
    const relativeTrack = clipDropPreview.relativeTrackId
        ? (sortedTracks.find((track) => {
              return track.id === clipDropPreview.relativeTrackId;
          }) ?? null)
        : null;
    const maxTrackIndex = sortedTracks.reduce((maxIndex, track) => {
        return Math.max(maxIndex, track.index);
    }, -1);
    const insertionIndex =
        clipDropPreview.createTrackPlacement === "above"
            ? (relativeTrack?.index ?? 0)
            : relativeTrack
              ? relativeTrack.index + 1
              : maxTrackIndex + 1;
    const previewTrack: TimelineTrack = {
        id: PREVIEW_TRACK_ID,
        groupId: "__timeline-preview-group__",
        label: "Drop",
        kind: getPreviewTrackKind(draggingClipId, clips),
        index: insertionIndex,
        height: 35,
        isLocked: false,
        isMuted: false,
        isHidden: false,
    };

    return [
        ...sortedTracks.map((track) => ({
            ...track,
            index:
                track.index >= insertionIndex ? track.index + 1 : track.index,
        })),
        previewTrack,
    ].sort((a, b) => a.index - b.index);
};

const getPointerCoordinates = (event: Event) => {
    if ("clientX" in event && "clientY" in event) {
        return {
            x: Number(event.clientX),
            y: Number(event.clientY),
        };
    }

    return null;
};

const Timeline: React.FC = () => {
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const timelineContentRef = useRef<HTMLDivElement>(null);
    const timelineRootRef = useRef<HTMLDivElement>(null);
    const timelineScrollRafRef = useRef<number | null>(null);
    const dragStartRef = useRef<{
        pointerX: number;
        pointerY: number;
        scrollLeft: number;
        scrollTop: number;
    } | null>(null);
    const [horizontalScrollbarHeight, setHorizontalScrollbarHeight] =
        useState(0);
    const [clipDropPreview, setClipDropPreview] =
        useState<ClipDropPreview | null>(null);
    const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
    const [isTimelinePanelResizing, setIsTimelinePanelResizing] =
        useState(false);
    const project = useEditorStore((state) => state.project);
    const selectedClipIds = useEditorStore(
        (state) => state.runtime.selection.selectedClipIds,
    );
    const setSelectedClipIds = useEditorStore(
        (state) => state.setSelectedClipIds,
    );
    const moveClip = useEditorStore((state) => state.moveClip);
    const seekToFrame = useEditorStore((state) => state.seekToFrame);
    const deleteSelectedClips = useEditorStore(
        (state) => state.deleteSelectedClips,
    );
    const setTimelineScroll = useEditorStore(
        (state) => state.setTimelineScroll,
    );
    const setTimelinePanelHeight = useEditorStore(
        (state) => state.setTimelinePanelHeight,
    );
    const tracks = project.tracks;
    const clips = project.clips;
    const fps = project.video.fps;
    const durationInFrames = project.video.durationInFrames;
    const playbackDurationInFrames = getEditorPlaybackDurationInFrames(project);
    const zoomValue = useEditorStore(
        (state) => state.runtime.timeline.zoom.zoomLevel,
    );
    const timelineScrollTop = useEditorStore(
        (state) => state.runtime.timeline.viewport.scrollTop,
    );
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 4,
            },
        }),
    );
    const zoomComputed = computeTimelineZoom({
        durationInFrames,
        fps,
        zoomLevel: zoomValue,
    });

    const laneResult = useMemo(() => {
        return buildTrackLaneLayouts(tracks, clips);
    }, [tracks, clips]);

    const baseClipLayouts = useMemo(() => {
        return buildClipLayouts(
            clips,
            tracks,
            laneResult.layouts,
            zoomComputed.pixelsPerFrame,
        );
    }, [clips, tracks, laneResult.layouts, zoomComputed.pixelsPerFrame]);
    const displayedTracks = useMemo(() => {
        return getTracksWithInsertPreview({
            tracks,
            clips,
            draggingClipId,
            clipDropPreview,
        });
    }, [clipDropPreview, clips, draggingClipId, tracks]);
    const displayedLaneResult = useMemo(() => {
        return buildTrackLaneLayouts(displayedTracks, clips);
    }, [displayedTracks, clips]);
    const displayedClipLayouts = useMemo(() => {
        return buildClipLayouts(
            clips,
            displayedTracks,
            displayedLaneResult.layouts,
            zoomComputed.pixelsPerFrame,
        );
    }, [
        clips,
        displayedTracks,
        displayedLaneResult.layouts,
        zoomComputed.pixelsPerFrame,
    ]);
    const timelineContentHeight =
        displayedLaneResult.totalHeight + RULER_HEIGHT;
    const draggingClip = draggingClipId
        ? (clips.find((clip) => clip.id === draggingClipId) ?? null)
        : null;
    const draggingClipLayout = draggingClipId
        ? (baseClipLayouts.find((layout) => {
              return layout.clip.id === draggingClipId;
          }) ?? null)
        : null;

    const getEffectiveDragDelta = (delta: { x: number; y: number }) => {
        const viewport = scrollViewportRef.current;
        const dragStart = dragStartRef.current;

        if (!viewport || !dragStart) return delta;

        return {
            x: delta.x + viewport.scrollLeft - dragStart.scrollLeft,
            y: delta.y + viewport.scrollTop - dragStart.scrollTop,
        };
    };

    const getMaxTimelineScrollLeft = () => {
        const viewport = scrollViewportRef.current;

        if (!viewport) return 0;

        return Math.max(
            0,
            TRACK_HEADER_WIDTH +
                zoomComputed.timelineWidth -
                viewport.clientWidth,
        );
    };

    const getMaxTimelineScrollTop = () => {
        const viewport = scrollViewportRef.current;

        if (!viewport) return 0;

        return Math.max(0, timelineContentHeight - viewport.clientHeight);
    };

    const getCurrentDragPointer = (delta: { x: number; y: number }) => {
        const dragStart = dragStartRef.current;

        if (!dragStart) return null;

        return {
            x: dragStart.pointerX + delta.x,
            y: dragStart.pointerY + delta.y,
        };
    };

    const scrollDragViewportIfNeeded = (delta: { x: number; y: number }) => {
        const viewport = scrollViewportRef.current;
        const pointer = getCurrentDragPointer(delta);

        if (!viewport || !pointer) return;

        const rect = viewport.getBoundingClientRect();
        const distanceToLeft = pointer.x - rect.left;
        const distanceToRight = rect.right - pointer.x;
        const distanceToTop = pointer.y - rect.top;
        const distanceToBottom = rect.bottom - pointer.y;
        const getScrollStep = (distanceToEdge: number) => {
            if (distanceToEdge >= DRAG_AUTO_SCROLL_EDGE_THRESHOLD) return 0;

            const ratio =
                (DRAG_AUTO_SCROLL_EDGE_THRESHOLD - distanceToEdge) /
                DRAG_AUTO_SCROLL_EDGE_THRESHOLD;

            return Math.ceil(ratio * DRAG_AUTO_SCROLL_MAX_STEP);
        };
        const scrollLeftDelta =
            distanceToLeft < DRAG_AUTO_SCROLL_EDGE_THRESHOLD
                ? -getScrollStep(distanceToLeft)
                : distanceToRight < DRAG_AUTO_SCROLL_EDGE_THRESHOLD
                  ? getScrollStep(distanceToRight)
                  : 0;
        const scrollTopDelta =
            distanceToTop < DRAG_AUTO_SCROLL_EDGE_THRESHOLD
                ? -getScrollStep(distanceToTop)
                : distanceToBottom < DRAG_AUTO_SCROLL_EDGE_THRESHOLD
                  ? getScrollStep(distanceToBottom)
                  : 0;
        const nextScrollLeft = Math.max(
            0,
            Math.min(
                viewport.scrollLeft + scrollLeftDelta,
                getMaxTimelineScrollLeft(),
            ),
        );
        const nextScrollTop = Math.max(
            0,
            Math.min(
                viewport.scrollTop + scrollTopDelta,
                getMaxTimelineScrollTop(),
            ),
        );

        if (
            nextScrollLeft !== viewport.scrollLeft ||
            nextScrollTop !== viewport.scrollTop
        ) {
            viewport.scrollTo({
                left: nextScrollLeft,
                top: nextScrollTop,
                behavior: "auto",
            });
        }
    };

    const getClipDropPreview = (
        clipId: string,
        rawDelta: { x: number; y: number },
    ): ClipDropPreview | null => {
        const delta = getEffectiveDragDelta(rawDelta);
        const clip = clips.find((item) => item.id === clipId);
        const clipLayout = baseClipLayouts.find((layout) => {
            return layout.clip.id === clipId;
        });

        if (!clip || !clipLayout || zoomComputed.pixelsPerFrame <= 0) {
            return null;
        }

        const canCreateLane = laneResult.layouts.length > 1;

        const getNextVisibleFrom = (trackId: string, requestedFrom: number) => {
            let nextFrom = requestedFrom;
            let overlappingClip = clips.find((item) => {
                if (item.id === clipId || item.trackId !== trackId) {
                    return false;
                }

                return (
                    nextFrom < item.from + item.durationInFrames &&
                    nextFrom + clip.durationInFrames > item.from
                );
            });

            while (overlappingClip) {
                nextFrom =
                    overlappingClip.from + overlappingClip.durationInFrames;
                overlappingClip = clips.find((item) => {
                    if (item.id === clipId || item.trackId !== trackId) {
                        return false;
                    }

                    return (
                        nextFrom < item.from + item.durationInFrames &&
                        nextFrom + clip.durationInFrames > item.from
                    );
                });
            }

            return nextFrom;
        };
        const deltaFrames = Math.round(delta.x / zoomComputed.pixelsPerFrame);
        const maxVisibleFrom = Math.max(
            0,
            zoomComputed.visibleDurationInFrames - clip.durationInFrames,
        );
        const requestedFrom = Math.max(
            0,
            Math.min(clip.from + deltaFrames, maxVisibleFrom),
        );
        const sourceLane = laneResult.layouts.find((lane) => {
            return lane.trackId === clip.trackId;
        });
        const sourceItemInsetY = sourceLane?.itemInsetY ?? 1.5;
        const sourceItemHeight = sourceLane?.itemHeight ?? clipLayout.height;
        const targetLaneCenterY = sourceLane
            ? sourceLane.top + sourceLane.laneHeight / 2 + delta.y
            : clipLayout.top + clipLayout.height / 2 + delta.y;

        if (canCreateLane && targetLaneCenterY < 0) {
            return {
                clipId,
                from: requestedFrom,
                left: frameToPx(requestedFrom, zoomComputed.pixelsPerFrame),
                top: sourceItemInsetY,
                width: clipLayout.width,
                height: sourceItemHeight,
                createTrackPlacement: "above",
                previewKind: "lane-insert",
            };
        }

        if (canCreateLane && targetLaneCenterY > laneResult.totalHeight) {
            return {
                clipId,
                from: requestedFrom,
                left: frameToPx(requestedFrom, zoomComputed.pixelsPerFrame),
                top: laneResult.totalHeight + sourceItemInsetY,
                width: clipLayout.width,
                height: sourceItemHeight,
                createTrackPlacement: "below",
                previewKind: "lane-insert",
            };
        }

        const sortedLanes = [...laneResult.layouts].sort(
            (a, b) => a.top - b.top,
        );
        const hasRealClipInLane = (trackId: string) => {
            return clips.some((item) => {
                return item.id !== clipId && item.trackId === trackId;
            });
        };
        const betweenLanePreview = canCreateLane
            ? sortedLanes.slice(0, -1).find((lane, index) => {
                  const nextLane = sortedLanes[index + 1];
                  if (!nextLane) return false;
                  if (
                      !hasRealClipInLane(lane.trackId) ||
                      !hasRealClipInLane(nextLane.trackId)
                  ) {
                      return false;
                  }

                  const boundaryY = lane.top + lane.laneHeight;

                  return (
                      Math.abs(targetLaneCenterY - boundaryY) <=
                      LANE_INSERT_SNAP_THRESHOLD
                  );
              })
            : null;

        if (betweenLanePreview) {
            const nextLane =
                sortedLanes[sortedLanes.indexOf(betweenLanePreview) + 1];

            if (nextLane) {
                return {
                    clipId,
                    from: requestedFrom,
                    left: 0,
                    top: nextLane.top - Math.ceil(LANE_GAP_PREVIEW_HEIGHT / 2),
                    width: zoomComputed.timelineWidth,
                    height: LANE_GAP_PREVIEW_HEIGHT,
                    trackId: nextLane.trackId,
                    createTrackPlacement: "above",
                    relativeTrackId: nextLane.trackId,
                    previewKind: "lane-gap",
                };
            }
        }

        const targetLane =
            laneResult.layouts.find((lane) => {
                return (
                    targetLaneCenterY >= lane.top &&
                    targetLaneCenterY <= lane.top + lane.laneHeight
                );
            }) ??
            laneResult.layouts.reduce((nearestLane, lane) => {
                const nearestDistance = Math.abs(
                    nearestLane.top +
                        nearestLane.laneHeight / 2 -
                        targetLaneCenterY,
                );
                const laneDistance = Math.abs(
                    lane.top + lane.laneHeight / 2 - targetLaneCenterY,
                );

                return laneDistance < nearestDistance ? lane : nearestLane;
            }, laneResult.layouts[0]);

        if (!targetLane) {
            return {
                clipId,
                from: requestedFrom,
                left: frameToPx(requestedFrom, zoomComputed.pixelsPerFrame),
                top: sourceItemInsetY,
                width: clipLayout.width,
                height: sourceItemHeight,
                createTrackPlacement: "above",
                previewKind: "lane-insert",
            };
        }

        const from = getNextVisibleFrom(targetLane.trackId, requestedFrom);

        // OLD logic: The drop hint showed the raw pointer frame even when the store would snap overlaps.
        // NEW logic: The ghost walks forward past overlapped clips, matching the committed drop behavior.
        return {
            clipId,
            from,
            left: frameToPx(from, zoomComputed.pixelsPerFrame),
            top: targetLane.top + targetLane.itemInsetY,
            width: clipLayout.width,
            height: targetLane.itemHeight,
            trackId: targetLane.trackId,
            previewKind: "clip",
        };
    };

    const handleClipDragStart = (event: DragStartEvent) => {
        const clipId = String(event.active.id);
        const pointer = getPointerCoordinates(event.activatorEvent);
        const viewport = scrollViewportRef.current;

        setDraggingClipId(clipId);
        setClipDropPreview(null);
        setSelectedClipIds([clipId]);

        dragStartRef.current =
            pointer && viewport
                ? {
                      pointerX: pointer.x,
                      pointerY: pointer.y,
                      scrollLeft: viewport.scrollLeft,
                      scrollTop: viewport.scrollTop,
                  }
                : null;
    };

    const handleClipDragMove = (event: DragMoveEvent) => {
        const clipId = String(event.active.id);

        scrollDragViewportIfNeeded(event.delta);
        setClipDropPreview(getClipDropPreview(clipId, event.delta));
    };

    const handleClipDragEnd = (event: DragEndEvent) => {
        const clipId = String(event.active.id);
        const dropPreview = getClipDropPreview(clipId, event.delta);

        setDraggingClipId(null);
        setClipDropPreview(null);
        dragStartRef.current = null;

        if (!dropPreview) return;

        const clip = clips.find((item) => item.id === clipId);
        const nextTrackId = dropPreview.trackId ?? clip?.trackId;

        if (!clip) return;

        if (
            dropPreview.from === clip.from &&
            nextTrackId === clip.trackId &&
            !dropPreview.createTrackPlacement
        ) {
            return;
        }

        // OLD logic: dnd-kit drag only moved clips inside existing lanes.
        // NEW logic: Drag target can be an existing lane or a new top/bottom lane with a live ghost preview.
        moveClip({
            clipId,
            from: dropPreview.from,
            trackId: dropPreview.trackId,
            createTrackPlacement: dropPreview.createTrackPlacement,
            relativeTrackId: dropPreview.relativeTrackId,
        });
    };

    const handleClipDragCancel = () => {
        setDraggingClipId(null);
        setClipDropPreview(null);
        dragStartRef.current = null;
    };

    useEffect(() => {
        const handleBoundaryScroll = (event: Event) => {
            const viewport = scrollViewportRef.current;
            if (!viewport) return;

            const boundaryEvent = event as TimelineBoundaryScrollEvent;

            if (boundaryEvent.detail.position === "start") {
                viewport.scrollTo({ left: 0, behavior: "auto" });
                return;
            }

            viewport.scrollTo({
                left: Math.max(0, viewport.scrollWidth - viewport.clientWidth),
                behavior: "auto",
            });
        };

        window.addEventListener(
            "editor:timeline-scroll-to-boundary",
            handleBoundaryScroll,
        );

        return () => {
            window.removeEventListener(
                "editor:timeline-scroll-to-boundary",
                handleBoundaryScroll,
            );
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target;
            const isEditableTarget =
                target instanceof HTMLElement &&
                (target.isContentEditable ||
                    target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.tagName === "SELECT");

            if (isEditableTarget) return;
            if (event.key !== "Delete" && event.key !== "Backspace") return;

            event.preventDefault();
            deleteSelectedClips();
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [deleteSelectedClips]);

    useEffect(() => {
        const clearStaleClipDropPreview = () => {
            // OLD logic: The ghost only cleared through dnd-kit end/cancel callbacks.
            // NEW logic: Also clear it when the browser ends/cancels the pointer outside the dnd surface.
            setDraggingClipId(null);
            setClipDropPreview(null);
            dragStartRef.current = null;
        };

        window.addEventListener("pointerup", clearStaleClipDropPreview);
        window.addEventListener("pointercancel", clearStaleClipDropPreview);
        window.addEventListener("blur", clearStaleClipDropPreview);

        return () => {
            window.removeEventListener("pointerup", clearStaleClipDropPreview);
            window.removeEventListener(
                "pointercancel",
                clearStaleClipDropPreview,
            );
            window.removeEventListener("blur", clearStaleClipDropPreview);
        };
    }, []);

    useEffect(() => {
        return () => {
            if (timelineScrollRafRef.current !== null) {
                window.cancelAnimationFrame(timelineScrollRafRef.current);
            }
        };
    }, []);

    useLayoutEffect(() => {
        const viewport = scrollViewportRef.current;
        if (!viewport) return;

        const syncScrollbarMetrics = () => {
            setHorizontalScrollbarHeight(
                Math.max(0, viewport.offsetHeight - viewport.clientHeight),
            );
        };

        syncScrollbarMetrics();

        const resizeObserver = new ResizeObserver(syncScrollbarMetrics);
        resizeObserver.observe(viewport);
        window.addEventListener("resize", syncScrollbarMetrics);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", syncScrollbarMetrics);
        };
    }, []);

    const handleTimelineResizeStart = (event: PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const timelineRoot = timelineRootRef.current;
        const gridContainer = timelineRoot?.parentElement?.parentElement;
        const resizeHandle = event.currentTarget;
        const pointerId = event.pointerId;

        if (!timelineRoot || !gridContainer) return;

        setIsTimelinePanelResizing(true);
        resizeHandle.setPointerCapture(pointerId);

        const startPointerY = event.clientY;
        const startPanelHeight = Math.max(
            TIMELINE_MIN_PANEL_HEIGHT,
            Math.round(timelineRoot.getBoundingClientRect().height),
        );
        const maxPanelHeight = Math.max(
            TIMELINE_MIN_PANEL_HEIGHT,
            gridContainer.clientHeight - PREVIEW_MIN_PANEL_HEIGHT,
        );

        const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
            moveEvent.preventDefault();
            const deltaY = startPointerY - moveEvent.clientY;
            const nextPanelHeight = Math.max(
                TIMELINE_MIN_PANEL_HEIGHT,
                Math.min(maxPanelHeight, startPanelHeight + deltaY),
            );

            setTimelinePanelHeight(nextPanelHeight);
        };

        const handlePointerEnd = () => {
            setIsTimelinePanelResizing(false);
            if (resizeHandle.hasPointerCapture(pointerId)) {
                resizeHandle.releasePointerCapture(pointerId);
            }
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerEnd);
            window.removeEventListener("pointercancel", handlePointerEnd);
        };

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerEnd);
        window.addEventListener("pointercancel", handlePointerEnd);
    };

    return (
        <div
            ref={timelineRootRef}
            className='w-full max-h-full h-full flex flex-col'>
            <TimelineToolbar />
            {/* ===== Resize handdle ===== */}
            <div className='relative w-full'>
                <div
                    className='absolute w-full shrink-0 select-none z-30'
                    style={{
                        transformOrigin: "center bottom",
                        cursor: "row-resize",
                        height: "5px",
                        top: "-2px",
                    }}
                    onPointerDown={handleTimelineResizeStart}
                />
            </div>
            {/* ===== Timeline outer ===== */}
            <div className='flex-1 w-full h-full shrink-0 overflow-hidden border'>
                {/* ===== Timeline surface ===== */}
                <div className='relative h-full w-full select-none'>
                    {/* ===== Absolute fill wrapper ===== */}
                    <div className='absolute inset-0 h-full w-full flex flex-col'>
                        {/* ===== Scroll viewport ===== */}
                        <div
                            ref={scrollViewportRef}
                            className='flex h-full w-full overflow-x-scroll overflow-y-scroll'
                            onScroll={(event) => {
                                const element = event.currentTarget;
                                if (timelineScrollRafRef.current !== null) {
                                    window.cancelAnimationFrame(
                                        timelineScrollRafRef.current,
                                    );
                                }

                                timelineScrollRafRef.current =
                                    window.requestAnimationFrame(() => {
                                        setTimelineScroll({
                                            scrollLeft: element.scrollLeft,
                                            scrollTop: element.scrollTop,
                                        });
                                        timelineScrollRafRef.current = null;
                                    });
                            }}>
                            {draggingClipId &&
                                clipDropPreview?.previewKind === "lane-gap" && (
                                    <div
                                        className='pointer-events-none absolute z-[9999] bg-sky-500'
                                        style={{
                                            left: 0,
                                            top:
                                                RULER_HEIGHT +
                                                clipDropPreview.top -
                                                timelineScrollTop,
                                            width:
                                                TRACK_HEADER_WIDTH +
                                                zoomComputed.timelineWidth,
                                            height: clipDropPreview.height,
                                        }}
                                    />
                                )}
                            {/* ===== Track controls ===== */}
                            <div className='sticky left-0 flex flex-col min-h-0 h-full z-30 min-w-28 bg-white'>
                                <TimelineTrackHeaders
                                    tracks={displayedTracks}
                                    lanes={displayedLaneResult.layouts}
                                    totalHeight={
                                        displayedLaneResult.totalHeight
                                    }
                                />
                            </div>

                            {/* ===== Track corner ===== */}
                            <div
                                className='absolute top-0 left-0 h-7 z-30 bg-gray-300'
                                style={{ width: TRACK_HEADER_WIDTH }}></div>

                            <div
                                className='relative min-h-full w-full'
                                ref={timelineContentRef}
                                style={{
                                    height: timelineContentHeight,
                                }}>
                                {/* ===== Tick header =====*/}
                                <TimelineRuler
                                    fps={fps}
                                    visibleDurationInFrames={
                                        zoomComputed.visibleDurationInFrames
                                    }
                                    maxSeekFrame={playbackDurationInFrames}
                                    tickFrames={zoomComputed.tickFrames}
                                    timelineWidth={zoomComputed.timelineWidth}
                                    onSeekFrame={seekToFrame}
                                    isInteractionDisabled={
                                        isTimelinePanelResizing
                                    }
                                />

                                {/* ===== Track container ===== */}
                                <DndContext
                                    sensors={sensors}
                                    autoScroll={false}
                                    onDragStart={handleClipDragStart}
                                    onDragMove={handleClipDragMove}
                                    onDragEnd={handleClipDragEnd}
                                    onDragCancel={handleClipDragCancel}>
                                    <TimelineBody
                                        timelineWidth={
                                            zoomComputed.timelineWidth
                                        }
                                        lanes={displayedLaneResult.layouts}
                                        totalHeight={
                                            displayedLaneResult.totalHeight
                                        }>
                                        {draggingClipId &&
                                            clipDropPreview &&
                                            clipDropPreview.previewKind !==
                                                "lane-gap" && (
                                                <div
                                                    className='pointer-events-none absolute'
                                                    style={{
                                                        left: clipDropPreview.left,
                                                        top: clipDropPreview.top,
                                                        width: clipDropPreview.width,
                                                        height: clipDropPreview.height,
                                                        zIndex: 9998,
                                                    }}>
                                                    <div className='absolute inset-0 rounded-md bg-gray-300' />
                                                </div>
                                            )}
                                        {displayedClipLayouts.map(
                                            (clipLayout) => (
                                                <TimelineItem
                                                    key={clipLayout.clip.id}
                                                    clipLayout={clipLayout}
                                                    // OLD logic: TimelineItem always received the default unselected state.
                                                    // NEW logic: Selection comes from the editor store so toolbar, timeline, and preview share state.
                                                    isSelected={selectedClipIds.includes(
                                                        clipLayout.clip.id,
                                                    )}
                                                    onSelect={(clipId) => {
                                                        setSelectedClipIds([
                                                            clipId,
                                                        ]);
                                                    }}
                                                />
                                            ),
                                        )}
                                    </TimelineBody>
                                    <DragOverlay
                                        dropAnimation={null}
                                        zIndex={10000}>
                                        {draggingClip && draggingClipLayout ? (
                                            <div
                                                className='pointer-events-none relative shadow-[0_8px_22px_rgba(15,23,42,0.24)]'
                                                style={{
                                                    width: draggingClipLayout.width,
                                                    height: draggingClipLayout.height,
                                                }}>
                                                <TimelineItemShell isSelected>
                                                    <TimelineItemContent
                                                        clip={draggingClip}
                                                    />
                                                </TimelineItemShell>
                                            </div>
                                        ) : null}
                                    </DragOverlay>
                                </DndContext>
                            </div>
                            <div
                                className='pointer-events-none absolute top-0 right-0 bottom-0 z-20 overflow-hidden'
                                style={{
                                    left: TRACK_HEADER_WIDTH,
                                    bottom: horizontalScrollbarHeight,
                                }}>
                                <TimelinePlayheadViewportLayer
                                    scrollViewportRef={scrollViewportRef}
                                    timelineContentRef={timelineContentRef}
                                    pixelsPerFrame={zoomComputed.pixelsPerFrame}
                                    playbackDurationInFrames={
                                        playbackDurationInFrames
                                    }
                                    isInteractionDisabled={
                                        isTimelinePanelResizing
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timeline;
