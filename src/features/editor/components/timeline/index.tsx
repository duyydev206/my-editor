"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragMoveEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import Playhead from "./components/playhead";
import TimelineRuler from "./components/timeline-ruler";
import TimelineToolbar from "./components/timeline-toolbar";
import TimelineBody from "./components/timeline-body";
import TimelineItem from "./components/timeline-item";
import { buildTrackLaneLayouts } from "../../lib/build-track-lane-layouts";
import { buildClipLayouts } from "../../lib/build-clip-layouts";
import TimelineTrackHeaders from "./components/timeline-track-headers";
// import { TimelineClip, TimelineTrack } from "../../types";
import { useEditorStore } from "../../stores";
import {
    frameToPx,
    TIMELINE_GUTTER_X,
    TRACK_HEADER_WIDTH,
} from "../../lib/timeline-math";
import { computeTimelineZoom } from "../../lib/timeline-zoom-engine";
import { getEditorPlaybackDurationInFrames } from "../../lib/playback-duration";

const PLAYHEAD_PAGE_SCROLL_THRESHOLD = 2;
const PLAYHEAD_SCRUB_STORE_SYNC_INTERVAL_MS = 33;

type ClipDropPreview = {
    clipId: string;
    from: number;
    left: number;
    top: number;
    width: number;
    height: number;
    trackId?: string;
    createTrackPlacement?: "above" | "below";
};

type TimelineBoundaryScrollEvent = CustomEvent<{
    position: "start" | "end";
}>;

type PreviewSeekEvent = CustomEvent<{
    frame: number;
}>;

const Timeline: React.FC = () => {
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const timelineContentRef = useRef<HTMLDivElement>(null);
    const playheadRef = useRef<HTMLDivElement>(null);
    const scrubFrameRef = useRef<number | null>(null);
    const scrubSyncTimeoutRef = useRef<number | null>(null);
    const scrubLastSyncedAtRef = useRef(0);
    const scrubPreviewAnimationFrameRef = useRef<number | null>(null);
    const [clipDropPreview, setClipDropPreview] =
        useState<ClipDropPreview | null>(null);
    const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
    const project = useEditorStore((state) => state.project);
    const runtime = useEditorStore((state) => state.runtime);
    const selectedClipIds = useEditorStore(
        (state) => state.runtime.selection.selectedClipIds,
    );
    const setSelectedClipIds = useEditorStore(
        (state) => state.setSelectedClipIds,
    );
    const moveClip = useEditorStore((state) => state.moveClip);
    const seekToFrame = useEditorStore((state) => state.seekToFrame);
    const pause = useEditorStore((state) => state.pause);
    const deleteSelectedClips = useEditorStore(
        (state) => state.deleteSelectedClips,
    );
    const setTimelineScroll = useEditorStore(
        (state) => state.setTimelineScroll,
    );

    const tracks = project.tracks;
    const clips = project.clips;
    const fps = project.video.fps;
    const durationInFrames = project.video.durationInFrames;
    const playbackDurationInFrames = getEditorPlaybackDurationInFrames(project);
    const currentFrame = runtime.player.currentFrame;
    const playbackStatus = runtime.player.status;
    const timelineScrollLeft = runtime.timeline.viewport.scrollLeft;
    const zoomValue = runtime.timeline.zoom.zoomLevel;
    const laneResult = buildTrackLaneLayouts(tracks, clips);
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

    const clipLayouts = buildClipLayouts(
        clips,
        tracks,
        laneResult.layouts,
        zoomComputed.pixelsPerFrame,
    );
    const playheadViewportLeft =
        TRACK_HEADER_WIDTH +
        frameToPx(currentFrame, zoomComputed.pixelsPerFrame) -
        timelineScrollLeft;

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
            };
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
        });
    };

    const handleClipDragCancel = () => {
        setDraggingClipId(null);
        setClipDropPreview(null);
    };

    const getFrameFromClientX = (clientX: number) => {
        const content = timelineContentRef.current;
        if (!content || zoomComputed.pixelsPerFrame <= 0) return null;

        const rect = content.getBoundingClientRect();
        const timelineX = clientX - rect.left;
        const frame = Math.round(
            (timelineX - TIMELINE_GUTTER_X) / zoomComputed.pixelsPerFrame,
        );

        return Math.max(0, Math.min(frame, playbackDurationInFrames));
    };

    const syncPreviewToScrubFrame = () => {
        const frame = scrubFrameRef.current;

        scrubPreviewAnimationFrameRef.current = null;

        if (frame === null) return;

        const event: PreviewSeekEvent = new CustomEvent(
            "editor:preview-seek-frame",
            {
                detail: { frame },
            },
        );

        window.dispatchEvent(event);
    };

    const schedulePreviewScrubSync = () => {
        if (scrubPreviewAnimationFrameRef.current !== null) return;

        scrubPreviewAnimationFrameRef.current = window.requestAnimationFrame(
            syncPreviewToScrubFrame,
        );
    };

    const syncStoreToScrubFrame = (frame: number) => {
        const now = window.performance.now();
        const elapsed = now - scrubLastSyncedAtRef.current;

        if (elapsed >= PLAYHEAD_SCRUB_STORE_SYNC_INTERVAL_MS) {
            scrubLastSyncedAtRef.current = now;
            seekToFrame(frame);
            return;
        }

        if (scrubSyncTimeoutRef.current !== null) return;

        scrubSyncTimeoutRef.current = window.setTimeout(() => {
            const nextFrame = scrubFrameRef.current;

            scrubSyncTimeoutRef.current = null;
            scrubLastSyncedAtRef.current = window.performance.now();

            if (nextFrame !== null) {
                // OLD logic: Preview/time only updated after releasing the playhead.
                // NEW logic: Sync store time at a capped rate while preview seeks on animation frames.
                seekToFrame(nextFrame);
            }
        }, PLAYHEAD_SCRUB_STORE_SYNC_INTERVAL_MS - elapsed);
    };

    const scrubToClientX = (clientX: number) => {
        const frame = getFrameFromClientX(clientX);

        if (frame === null) return;

        scrubFrameRef.current = frame;
        const playhead = playheadRef.current;

        if (!playhead) return;

        const viewport = scrollViewportRef.current;
        const scrollLeft = viewport?.scrollLeft ?? timelineScrollLeft;
        const left =
            TRACK_HEADER_WIDTH +
            frameToPx(frame, zoomComputed.pixelsPerFrame) -
            scrollLeft;

        // OLD logic: Pointer move updated React state and rebuilt the full timeline on every pixel.
        // NEW logic: Move the playhead element directly during drag, then commit the frame on release.
        playhead.style.transition = "none";
        playhead.style.transform = `translate3d(${left}px, 0, 0)`;

        schedulePreviewScrubSync();
        syncStoreToScrubFrame(frame);
    };

    const handlePlayheadScrubStart = (event: PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (playbackStatus === "playing") {
            pause();
        }

        // OLD logic: The playhead could only be moved by clicking the ruler.
        // NEW logic: Dragging the original playhead marker scrubs the shared frame.
        scrubToClientX(event.clientX);
    };

    const handlePlayheadScrubMove = (event: PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        scrubToClientX(event.clientX);
    };

    const handlePlayheadScrubEnd = (event: PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const frame = scrubFrameRef.current;

        if (frame !== null) {
            seekToFrame(frame);
        }

        if (scrubSyncTimeoutRef.current !== null) {
            window.clearTimeout(scrubSyncTimeoutRef.current);
            scrubSyncTimeoutRef.current = null;
        }

        if (scrubPreviewAnimationFrameRef.current !== null) {
            window.cancelAnimationFrame(scrubPreviewAnimationFrameRef.current);
            scrubPreviewAnimationFrameRef.current = null;
        }

        if (playheadRef.current) {
            playheadRef.current.style.transition = "";
        }

        scrubFrameRef.current = null;
        scrubLastSyncedAtRef.current = 0;
    };

    useEffect(() => {
        return () => {
            if (scrubSyncTimeoutRef.current !== null) {
                window.clearTimeout(scrubSyncTimeoutRef.current);
            }

            if (scrubPreviewAnimationFrameRef.current !== null) {
                window.cancelAnimationFrame(
                    scrubPreviewAnimationFrameRef.current,
                );
            }
        };
    }, []);

    useEffect(() => {
        const viewport = scrollViewportRef.current;
        if (!viewport) return;
        if (playbackStatus !== "playing") return;

        const playheadX = frameToPx(currentFrame, zoomComputed.pixelsPerFrame);
        const playheadViewportX =
            TRACK_HEADER_WIDTH + playheadX - viewport.scrollLeft;

        if (
            playheadViewportX <
            viewport.clientWidth - PLAYHEAD_PAGE_SCROLL_THRESHOLD
        ) {
            return;
        }

        const targetScrollLeft = Math.max(
            0,
            Math.min(
                playheadX - TIMELINE_GUTTER_X,
                viewport.scrollWidth - viewport.clientWidth,
            ),
        );

        // OLD logic: The playhead could move past the visible track area while playback continued.
        // NEW logic: Page-scroll only when the playhead reaches the right edge, making that time the new track start.
        viewport.scrollTo({
            left: targetScrollLeft,
            behavior: "auto",
        });
    }, [currentFrame, playbackStatus, zoomComputed.pixelsPerFrame]);

    useEffect(() => {
        const viewport = scrollViewportRef.current;
        if (!viewport) return;
        if (playbackStatus === "playing") return;
        if (scrubFrameRef.current !== null) return;

        if (currentFrame <= 0) {
            viewport.scrollTo({ left: 0, behavior: "auto" });
            return;
        }

        if (currentFrame >= playbackDurationInFrames) {
            viewport.scrollTo({
                left: Math.max(0, viewport.scrollWidth - viewport.clientWidth),
                behavior: "auto",
            });
        }
    }, [currentFrame, playbackDurationInFrames, playbackStatus]);

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

    return (
        <div className='w-full max-h-full h-full flex flex-col'>
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

                                setTimelineScroll({
                                    scrollLeft: element.scrollLeft,
                                    scrollTop: element.scrollTop,
                                });
                            }}>
                            {/* ===== Track controls ===== */}
                            <div className='sticky left-0 flex flex-col min-h-0 h-full z-20 min-w-28 bg-white'>
                                <TimelineTrackHeaders
                                    tracks={tracks}
                                    lanes={laneResult.layouts}
                                    totalHeight={laneResult.totalHeight}
                                />
                            </div>

                            {/* ===== Track corner ===== */}
                            <div
                                className='absolute top-0 left-0 h-7 z-20 bg-gray-300'
                                style={{ width: "111px" }}></div>

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
                                                className='pointer-events-none absolute rounded-sm border border-sky-500 bg-sky-500/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]'
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
                        </div>

                        {/* ===== Playhead overlay ===== */}
                        <Playhead
                            ref={playheadRef}
                            currentFrame={currentFrame}
                            durationInFrames={
                                zoomComputed.visibleDurationInFrames
                            }
                            pixelsPerFrame={zoomComputed.pixelsPerFrame}
                            leftOffset={playheadViewportLeft}
                            isPlaying={playbackStatus === "playing"}
                            onScrubStart={handlePlayheadScrubStart}
                            onScrubMove={handlePlayheadScrubMove}
                            onScrubEnd={handlePlayheadScrubEnd}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Timeline;
