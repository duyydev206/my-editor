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
import TimelinePlayheadViewportLayer from "./components/timeline-playhead-viewport-layer";
import { buildTrackLaneLayouts } from "../../lib/build-track-lane-layouts";
import { buildClipLayouts } from "../../lib/build-clip-layouts";
import TimelineTrackHeaders from "./components/timeline-track-headers";
// import { TimelineClip, TimelineTrack } from "../../types";
import { useEditorStore } from "../../stores";
import { frameToPx, TRACK_HEADER_WIDTH } from "../../lib/timeline-math";
import { computeTimelineZoom } from "../../lib/timeline-zoom-engine";
import { getEditorPlaybackDurationInFrames } from "../../lib/playback-duration";

const TIMELINE_MIN_PANEL_HEIGHT = 220;
const PREVIEW_MIN_PANEL_HEIGHT = 140;
const LANE_INSERT_PREVIEW_HEIGHT = 3;
const LANE_INSERT_SNAP_THRESHOLD = 8;

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
    previewKind?: "clip" | "lane-insert";
};

type TimelineBoundaryScrollEvent = CustomEvent<{
    position: "start" | "end";
}>;

const Timeline: React.FC = () => {
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const timelineContentRef = useRef<HTMLDivElement>(null);
    const timelineRootRef = useRef<HTMLDivElement>(null);
    const timelineScrollRafRef = useRef<number | null>(null);
    const [horizontalScrollbarHeight, setHorizontalScrollbarHeight] =
        useState(0);
    const [clipDropPreview, setClipDropPreview] =
        useState<ClipDropPreview | null>(null);
    const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
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

    const clipLayouts = useMemo(() => {
        return buildClipLayouts(
            clips,
            tracks,
            laneResult.layouts,
            zoomComputed.pixelsPerFrame,
        );
    }, [clips, tracks, laneResult.layouts, zoomComputed.pixelsPerFrame]);

    const getClipDropPreview = (
        clipId: string,
        delta: { x: number; y: number },
    ): ClipDropPreview | null => {
        const clip = clips.find((item) => item.id === clipId);
        const clipLayout = clipLayouts.find((layout) => {
            return layout.clip.id === clipId;
        });

        if (!clip || !clipLayout || zoomComputed.pixelsPerFrame <= 0) {
            return null;
        }

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
        const requestedFrom = Math.max(0, clip.from + deltaFrames);
        const sourceLane = laneResult.layouts.find((lane) => {
            return lane.trackId === clip.trackId;
        });
        const sourceLaneHeight = sourceLane?.laneHeight ?? clipLayout.height;
        const sourceItemInsetY = sourceLane?.itemInsetY ?? 1.5;
        const sourceItemHeight = sourceLane?.itemHeight ?? clipLayout.height;
        const targetLaneCenterY = sourceLane
            ? sourceLane.top + sourceLane.laneHeight / 2 + delta.y
            : clipLayout.top + clipLayout.height / 2 + delta.y;

        if (targetLaneCenterY < 0) {
            return {
                clipId,
                from: requestedFrom,
                left: frameToPx(requestedFrom, zoomComputed.pixelsPerFrame),
                top: sourceItemInsetY,
                width: clipLayout.width,
                height: sourceItemHeight,
                createTrackPlacement: "above",
            };
        }

        if (targetLaneCenterY > laneResult.totalHeight) {
            return {
                clipId,
                from: requestedFrom,
                left: frameToPx(requestedFrom, zoomComputed.pixelsPerFrame),
                top: laneResult.totalHeight + sourceItemInsetY,
                width: clipLayout.width,
                height: sourceItemHeight,
                createTrackPlacement: "below",
                previewKind: "clip",
            };
        }

        const sortedLanes = [...laneResult.layouts].sort(
            (a, b) => a.top - b.top,
        );
        const betweenLanePreview = sortedLanes
            .slice(0, -1)
            .find((lane, index) => {
                const nextLane = sortedLanes[index + 1];
                if (!nextLane) return false;

                const boundaryY = lane.top + lane.laneHeight;

                return (
                    Math.abs(targetLaneCenterY - boundaryY) <=
                    LANE_INSERT_SNAP_THRESHOLD
                );
            });

        if (betweenLanePreview) {
            const nextLane =
                sortedLanes[sortedLanes.indexOf(betweenLanePreview) + 1];

            if (nextLane) {
                return {
                    clipId,
                    from: requestedFrom,
                    left: 0,
                    top:
                        nextLane.top -
                        Math.ceil(LANE_INSERT_PREVIEW_HEIGHT / 2),
                    width: zoomComputed.timelineWidth,
                    height: LANE_INSERT_PREVIEW_HEIGHT,
                    trackId: nextLane.trackId,
                    createTrackPlacement: "above",
                    relativeTrackId: nextLane.trackId,
                    previewKind: "lane-insert",
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
                height: sourceLaneHeight - sourceItemInsetY * 2,
                createTrackPlacement: "above",
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

        setDraggingClipId(clipId);
        setClipDropPreview(null);
        setSelectedClipIds([clipId]);
    };

    const handleClipDragMove = (event: DragMoveEvent) => {
        const clipId = String(event.active.id);

        setClipDropPreview(getClipDropPreview(clipId, event.delta));
    };

    const handleClipDragEnd = (event: DragEndEvent) => {
        const clipId = String(event.active.id);
        const dropPreview = getClipDropPreview(clipId, event.delta);

        setDraggingClipId(null);
        setClipDropPreview(null);

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

        if (!timelineRoot || !gridContainer) return;

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
            const deltaY = startPointerY - moveEvent.clientY;
            const nextPanelHeight = Math.max(
                TIMELINE_MIN_PANEL_HEIGHT,
                Math.min(maxPanelHeight, startPanelHeight + deltaY),
            );

            setTimelinePanelHeight(nextPanelHeight);
        };

        const handlePointerEnd = () => {
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
                            {/* ===== Track controls ===== */}
                            <div className='sticky left-0 flex flex-col min-h-0 h-full z-30 min-w-28 bg-white'>
                                <TimelineTrackHeaders
                                    tracks={tracks}
                                    lanes={laneResult.layouts}
                                    totalHeight={laneResult.totalHeight}
                                />
                            </div>

                            {/* ===== Track corner ===== */}
                            <div
                                className='absolute top-0 left-0 h-7 z-30 bg-gray-300'
                                style={{ width: TRACK_HEADER_WIDTH }}></div>

                            <div
                                className='relative h-full w-full'
                                ref={timelineContentRef}>
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
                                />

                                {/* ===== Track container ===== */}
                                <DndContext
                                    sensors={sensors}
                                    onDragStart={handleClipDragStart}
                                    onDragMove={handleClipDragMove}
                                    onDragEnd={handleClipDragEnd}
                                    onDragCancel={handleClipDragCancel}>
                                    <TimelineBody
                                        timelineWidth={
                                            zoomComputed.timelineWidth
                                        }
                                        lanes={laneResult.layouts}
                                        totalHeight={
                                            draggingClipId &&
                                            clipDropPreview?.createTrackPlacement ===
                                                "below"
                                                ? Math.max(
                                                      laneResult.totalHeight,
                                                      clipDropPreview.top +
                                                          clipDropPreview.height +
                                                          1.5,
                                                  )
                                                : laneResult.totalHeight
                                        }>
                                        {draggingClipId && clipDropPreview && (
                                            <div
                                                className={`pointer-events-none absolute ${
                                                    clipDropPreview.previewKind ===
                                                    "lane-insert"
                                                        ? "rounded-none bg-sky-500"
                                                        : "rounded-sm border border-sky-500 bg-sky-500/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]"
                                                }`}
                                                style={{
                                                    left: clipDropPreview.left,
                                                    top: clipDropPreview.top,
                                                    width: clipDropPreview.width,
                                                    height: clipDropPreview.height,
                                                    zIndex: 9999,
                                                }}
                                            />
                                        )}
                                        {clipLayouts.map((clipLayout) => (
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
                                        ))}
                                    </TimelineBody>
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
                                    visibleDurationInFrames={
                                        zoomComputed.visibleDurationInFrames
                                    }
                                    playbackDurationInFrames={
                                        playbackDurationInFrames
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
