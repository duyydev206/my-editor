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
const PLAYHEAD_DRIFT_RESYNC_THRESHOLD_FRAMES = 2;

type TimelinePlayheadViewportLayerProps = {
    scrollViewportRef: React.RefObject<HTMLDivElement | null>;
    timelineContentRef: React.RefObject<HTMLDivElement | null>;
    pixelsPerFrame: number;
    playbackDurationInFrames: number;
};

const TimelinePlayheadViewportLayer: React.FC<
    TimelinePlayheadViewportLayerProps
> = ({
    scrollViewportRef,
    timelineContentRef,
    pixelsPerFrame,
    playbackDurationInFrames,
}) => {
    const playheadRef = useRef<HTMLDivElement>(null);
    const scrubFrameRef = useRef<number | null>(null);
    const scrollLeftRef = useRef(0);
    const scrubSyncTimeoutRef = useRef<number | null>(null);
    const scrubLastSyncedAtRef = useRef(0);
    const scrubPreviewAnimationFrameRef = useRef<number | null>(null);
    const playbackAnimationFrameRef = useRef<number | null>(null);
    const visualFrameRef = useRef(0);
    const playbackAnchorFrameRef = useRef(0);
    const playbackAnchorTimeRef = useRef(0);
    const currentFrame = useEditorStore((state) => state.runtime.player.currentFrame);
    const playbackStatus = useEditorStore((state) => state.runtime.player.status);
    const playbackRate = useEditorStore((state) => state.runtime.player.playbackRate);
    const fps = useEditorStore((state) => state.project.video.fps);
    const seekToFrame = useEditorStore((state) => state.seekToFrame);
    const pause = useEditorStore((state) => state.pause);
    const currentFrameRef = useRef(currentFrame);

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

    const getPredictedPlaybackFrame = useCallback(
        (now: number) => {
            const elapsedMs = Math.max(0, now - playbackAnchorTimeRef.current);
            const elapsedFrames = (elapsedMs / 1000) * fps * playbackRate;

            return Math.max(
                0,
                Math.min(
                    playbackDurationInFrames,
                    playbackAnchorFrameRef.current + elapsedFrames,
                ),
            );
        },
        [fps, playbackDurationInFrames, playbackRate],
    );

    const syncViewportToVisualFrame = useCallback(
        (frame: number) => {
            const viewport = scrollViewportRef.current;
            if (!viewport) return;

            const playheadX = frameToPx(frame, pixelsPerFrame);
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

            if (targetScrollLeft !== viewport.scrollLeft) {
                viewport.scrollTo({
                    left: targetScrollLeft,
                    behavior: "auto",
                });
            }
        },
        [pixelsPerFrame, scrollViewportRef],
    );

    const stopPlaybackAnimation = useCallback(() => {
        if (playbackAnimationFrameRef.current !== null) {
            window.cancelAnimationFrame(playbackAnimationFrameRef.current);
            playbackAnimationFrameRef.current = null;
        }
    }, []);

    const tickPlaybackAnimation = useCallback(
        function animatePlayback(now: number) {
            const frame = getPredictedPlaybackFrame(now);

            visualFrameRef.current = frame;
            applyPlayheadOffset(frame);
            syncViewportToVisualFrame(frame);

            if (playbackStatus === "playing" && scrubFrameRef.current === null) {
                playbackAnimationFrameRef.current =
                    window.requestAnimationFrame(animatePlayback);
            }
        },
        [
            applyPlayheadOffset,
            getPredictedPlaybackFrame,
            playbackStatus,
            syncViewportToVisualFrame,
        ],
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

            applyPlayheadOffset(
                playbackStatus === "playing"
                    ? visualFrameRef.current
                    : currentFrameRef.current,
            );
        };

        syncScrollPosition();
        viewport.addEventListener("scroll", syncScrollPosition, {
            passive: true,
        });

        return () => {
            viewport.removeEventListener("scroll", syncScrollPosition);
        };
    }, [applyPlayheadOffset, playbackStatus, scrollViewportRef]);

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
        currentFrameRef.current = currentFrame;

        if (playbackStatus !== "playing") return;
        if (scrubFrameRef.current !== null) return;

        const predictedFrame = getPredictedPlaybackFrame(window.performance.now());
        if (
            Math.abs(predictedFrame - currentFrame) <
            PLAYHEAD_DRIFT_RESYNC_THRESHOLD_FRAMES
        ) {
            return;
        }

        playbackAnchorFrameRef.current = currentFrame;
        playbackAnchorTimeRef.current = window.performance.now();
        visualFrameRef.current = currentFrame;
    }, [currentFrame, getPredictedPlaybackFrame, playbackStatus]);

    useLayoutEffect(() => {
        currentFrameRef.current = currentFrame;

        if (scrubFrameRef.current !== null) return;

        if (playbackStatus === "playing") return;

        visualFrameRef.current = currentFrame;
        applyPlayheadOffset(currentFrame);
    }, [applyPlayheadOffset, currentFrame, playbackStatus]);

    useEffect(() => {
        if (scrubFrameRef.current !== null) return;

        if (playbackStatus === "playing") {
            playbackAnchorFrameRef.current = currentFrameRef.current;
            playbackAnchorTimeRef.current = window.performance.now();
            visualFrameRef.current = currentFrameRef.current;
            stopPlaybackAnimation();
            playbackAnimationFrameRef.current =
                window.requestAnimationFrame(tickPlaybackAnimation);
            return;
        }

        stopPlaybackAnimation();
        visualFrameRef.current = currentFrameRef.current;
        applyPlayheadOffset(currentFrameRef.current);
    }, [
        applyPlayheadOffset,
        playbackStatus,
        stopPlaybackAnimation,
        tickPlaybackAnimation,
    ]);

    useEffect(() => {
        return () => {
            stopPlaybackAnimation();

            if (scrubSyncTimeoutRef.current !== null) {
                window.clearTimeout(scrubSyncTimeoutRef.current);
            }

            if (scrubPreviewAnimationFrameRef.current !== null) {
                window.cancelAnimationFrame(scrubPreviewAnimationFrameRef.current);
            }
        };
    }, [stopPlaybackAnimation]);

    return (
        <div className='pointer-events-none absolute inset-y-0 left-0 right-0 z-20 overflow-hidden'>
            <Playhead
                ref={playheadRef}
                onScrubStart={handlePlayheadScrubStart}
                onScrubMove={handlePlayheadScrubMove}
                onScrubEnd={handlePlayheadScrubEnd}
            />
        </div>
    );
};

export default TimelinePlayheadViewportLayer;
