"use client";

import { useEffect, useRef } from "react";
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

const PLAYHEAD_PAGE_SCROLL_THRESHOLD = 2;

const Timeline: React.FC = () => {
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const project = useEditorStore((state) => state.project);
    const runtime = useEditorStore((state) => state.runtime);
    const selectedClipIds = useEditorStore(
        (state) => state.runtime.selection.selectedClipIds,
    );
    const setSelectedClipIds = useEditorStore(
        (state) => state.setSelectedClipIds,
    );
    const seekToFrame = useEditorStore((state) => state.seekToFrame);
    const setTimelineScroll = useEditorStore(
        (state) => state.setTimelineScroll,
    );

    const tracks = project.tracks;
    const clips = project.clips;
    const fps = project.video.fps;
    const durationInFrames = project.video.durationInFrames;
    const currentFrame = runtime.player.currentFrame;
    const playbackStatus = runtime.player.status;
    const zoomValue = runtime.timeline.zoom.zoomLevel;
    const laneResult = buildTrackLaneLayouts(tracks);
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

    useEffect(() => {
        const viewport = scrollViewportRef.current;
        if (!viewport) return;
        if (playbackStatus !== "playing") return;

        const playheadX = frameToPx(
            currentFrame,
            zoomComputed.pixelsPerFrame,
        );
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
    }, [
        currentFrame,
        playbackStatus,
        zoomComputed.pixelsPerFrame,
    ]);

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
                                className='absolute top-0 left-0 h-7 w z-20 bg-gray-300'
                                style={{ width: "111px" }}></div>

                            <div className='relative h-full'>
                                {/* ===== Tick header =====*/}
                                <TimelineRuler
                                    fps={fps}
                                    visibleDurationInFrames={
                                        zoomComputed.visibleDurationInFrames
                                    }
                                    tickFrames={zoomComputed.tickFrames}
                                    timelineWidth={zoomComputed.timelineWidth}
                                    onSeekFrame={seekToFrame}
                                />

                                {/* ===== Track container ===== */}
                                <TimelineBody
                                    timelineWidth={zoomComputed.timelineWidth}
                                    lanes={laneResult.layouts}
                                    totalHeight={laneResult.totalHeight}>
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
                                                setSelectedClipIds([clipId]);
                                            }}
                                        />
                                    ))}
                                </TimelineBody>

                                {/* ===== Playhead ===== */}
                                <Playhead
                                    currentFrame={currentFrame}
                                    durationInFrames={
                                        zoomComputed.visibleDurationInFrames
                                    }
                                    pixelsPerFrame={zoomComputed.pixelsPerFrame}
                                    isPlaying={playbackStatus === "playing"}
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
