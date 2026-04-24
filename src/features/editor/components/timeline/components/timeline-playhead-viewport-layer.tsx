"use client";

import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    type PointerEvent,
} from "react";
import Playhead from "./playhead";
import { useEditorStore } from "@/src/features/editor/stores";
import { frameToPx, TIMELINE_GUTTER_X } from "@/src/features/editor/lib/timeline-math";
import { dispatchPreviewSeekFrame } from "@/src/features/editor/lib/preview-seek";

const PLAYHEAD_PAGE_SCROLL_THRESHOLD = 2;
const PLAYHEAD_SCRUB_STORE_SYNC_INTERVAL_MS = 33;

type TimelinePlayheadViewportLayerProps = {
    scrollViewportRef: React.RefObject<HTMLDivElement | null>;
    timelineContentRef: React.RefObject<HTMLDivElement | null>;
    pixelsPerFrame: number;
    visibleDurationInFrames: number;
    playbackDurationInFrames: number;
};

const TimelinePlayheadViewportLayer: React.FC<
    TimelinePlayheadViewportLayerProps
> = ({
    scrollViewportRef,
    timelineContentRef,
    pixelsPerFrame,
    visibleDurationInFrames,
    playbackDurationInFrames,
}) => {
    const playheadRef = useRef<HTMLDivElement>(null);
    const scrubFrameRef = useRef<number | null>(null);
    const scrollLeftRef = useRef(0);
    const scrubSyncTimeoutRef = useRef<number | null>(null);
    const scrubLastSyncedAtRef = useRef(0);
    const scrubPreviewAnimationFrameRef = useRef<number | null>(null);
    const currentFrame = useEditorStore((state) => state.runtime.player.currentFrame);
    const playbackStatus = useEditorStore((state) => state.runtime.player.status);
    const seekToFrame = useEditorStore((state) => state.seekToFrame);
    const pause = useEditorStore((state) => state.pause);

    const applyPlayheadOffset = useCallback(
        (frame: number) => {
            const playhead = playheadRef.current;

            if (!playhead) return;

            const nextLeft =
                frameToPx(frame, pixelsPerFrame) - scrollLeftRef.current;

            playhead.style.transform = `translate3d(${nextLeft}px, 0, 0)`;
        },
        [pixelsPerFrame],
    );

    const syncPreviewToScrubFrame = useCallback(() => {
        const frame = scrubFrameRef.current;

        scrubPreviewAnimationFrameRef.current = null;

        if (frame === null) return;

        dispatchPreviewSeekFrame(frame);
    }, []);

    const schedulePreviewScrubSync = useCallback(() => {
        if (scrubPreviewAnimationFrameRef.current !== null) return;

        scrubPreviewAnimationFrameRef.current = window.requestAnimationFrame(
            syncPreviewToScrubFrame,
        );
    }, [syncPreviewToScrubFrame]);

    const syncStoreToScrubFrame = useCallback(
        (frame: number) => {
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
                    seekToFrame(nextFrame);
                }
            }, PLAYHEAD_SCRUB_STORE_SYNC_INTERVAL_MS - elapsed);
        },
        [seekToFrame],
    );

    const getFrameFromClientX = useCallback(
        (clientX: number) => {
            const content = timelineContentRef.current;
            if (!content || pixelsPerFrame <= 0) return null;

            const rect = content.getBoundingClientRect();
            const timelineX = clientX - rect.left;
            const frame = Math.round(
                (timelineX - TIMELINE_GUTTER_X) / pixelsPerFrame,
            );

            return Math.max(0, Math.min(frame, playbackDurationInFrames));
        },
        [pixelsPerFrame, playbackDurationInFrames, timelineContentRef],
    );

    const scrubToClientX = useCallback(
        (clientX: number) => {
            const frame = getFrameFromClientX(clientX);

            if (frame === null) return;

            scrubFrameRef.current = frame;
            const playhead = playheadRef.current;

            if (!playhead) return;

            playhead.style.transition = "none";
            applyPlayheadOffset(frame);

            schedulePreviewScrubSync();
            syncStoreToScrubFrame(frame);
        },
        [
            applyPlayheadOffset,
            getFrameFromClientX,
            schedulePreviewScrubSync,
            syncStoreToScrubFrame,
        ],
    );

    const handlePlayheadScrubStart = (event: PointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (playbackStatus === "playing") {
            pause();
        }

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
        const viewport = scrollViewportRef.current;
        if (!viewport) return;

        const syncScrollPosition = () => {
            scrollLeftRef.current = viewport.scrollLeft;

            if (scrubFrameRef.current !== null) {
                applyPlayheadOffset(scrubFrameRef.current);
                return;
            }

            applyPlayheadOffset(currentFrame);
        };

        syncScrollPosition();
        viewport.addEventListener("scroll", syncScrollPosition, {
            passive: true,
        });

        return () => {
            viewport.removeEventListener("scroll", syncScrollPosition);
        };
    }, [applyPlayheadOffset, currentFrame, scrollViewportRef]);

    useEffect(() => {
        if (scrubFrameRef.current !== null) return;

        applyPlayheadOffset(currentFrame);
    }, [applyPlayheadOffset, currentFrame]);

    useLayoutEffect(() => {
        if (scrubFrameRef.current !== null) return;

        applyPlayheadOffset(currentFrame);
    }, [applyPlayheadOffset, currentFrame]);

    useEffect(() => {
        const viewport = scrollViewportRef.current;
        if (!viewport) return;
        if (playbackStatus !== "playing") return;

        const playheadX = frameToPx(currentFrame, pixelsPerFrame);
        const playheadViewportX = playheadX - viewport.scrollLeft;

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

        viewport.scrollTo({
            left: targetScrollLeft,
            behavior: "auto",
        });
    }, [currentFrame, pixelsPerFrame, playbackStatus, scrollViewportRef]);

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
    }, [currentFrame, playbackDurationInFrames, playbackStatus, scrollViewportRef]);

    useEffect(() => {
        return () => {
            if (scrubSyncTimeoutRef.current !== null) {
                window.clearTimeout(scrubSyncTimeoutRef.current);
            }

            if (scrubPreviewAnimationFrameRef.current !== null) {
                window.cancelAnimationFrame(scrubPreviewAnimationFrameRef.current);
            }
        };
    }, []);

    return (
        <div className='pointer-events-none absolute inset-y-0 left-0 right-0 z-20 overflow-hidden'>
            <Playhead
                ref={playheadRef}
                currentFrame={currentFrame}
                durationInFrames={visibleDurationInFrames}
                pixelsPerFrame={pixelsPerFrame}
                leftOffset={frameToPx(currentFrame, pixelsPerFrame)}
                isPlaying={playbackStatus === "playing"}
                onScrubStart={handlePlayheadScrubStart}
                onScrubMove={handlePlayheadScrubMove}
                onScrubEnd={handlePlayheadScrubEnd}
            />
        </div>
    );
};

export default TimelinePlayheadViewportLayer;
