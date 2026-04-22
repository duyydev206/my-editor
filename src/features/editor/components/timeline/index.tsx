import Playhead from "./components/playhead";
import TimelineRuler from "./components/timeline-ruler";
import TimelineToolbar from "./components/timeline-toolbar";
import TimelineBody from "./components/timeline-body";
import TimelineItem from "./components/timeline-item";
import { buildTrackLaneLayouts } from "../../lib/build-track-lane-layouts";
import { buildClipLayouts } from "../../lib/build-clip-layouts";
import TimelineTrackHeaders from "./components/timeline-track-headers";
import { getTimelineContentWidth } from "../../lib/timeline-math";
import { TimelineClip, TimelineTrack } from "../../types";

const tracks: TimelineTrack[] = [
    {
        id: "track-1",
        groupId: "group-1",
        label: "Title",
        kind: "text",
        index: 0,
        height: 35,
        isLocked: false,
        isMuted: false,
        isHidden: false,
    },
    {
        id: "track-2",
        groupId: "group-1",
        label: "Subtitle",
        kind: "text",
        index: 1,
        height: 35,
        isLocked: false,
        isMuted: false,
        isHidden: false,
    },
    {
        id: "track-3",
        groupId: "group-2",
        label: "Audio",
        kind: "audio",
        index: 2,
        height: 71,
        isLocked: false,
        isMuted: false,
        isHidden: false,
    },
    {
        id: "track-4",
        groupId: "group-2",
        label: "Video",
        kind: "video",
        index: 3,
        height: 71,
        isLocked: false,
        isMuted: false,
        isHidden: false,
    },
];

const clips: TimelineClip[] = [
    {
        id: "clip-1",
        trackId: "track-1",
        type: "text",
        from: 0,
        durationInFrames: 90,
        sourceStartFrame: 0,
        label: "Edit this video",
        color: "rgb(122, 93, 232)",
        isLocked: false,
        isHidden: false,
        text: "Edit this video",
        style: {
            fontFamily: "Inter",
            fontSize: 14,
            color: "#ffffff",
        },
    },
    {
        id: "clip-2",
        trackId: "track-2",
        type: "text",
        from: 120,
        durationInFrames: 60,
        sourceStartFrame: 0,
        label: "Demo",
        color: "rgb(122, 93, 232)",
        isLocked: false,
        isHidden: false,
        text: "Demo",
        style: {
            fontFamily: "Inter",
            fontSize: 14,
            color: "#ffffff",
        },
    },
    {
        id: "clip-3",
        trackId: "track-3",
        type: "audio",
        from: 60,
        durationInFrames: 180,
        sourceStartFrame: 0,
        label: "Voice over",
        color: "rgb(58, 122, 68)",
        isLocked: false,
        isHidden: false,
        src: "/audio/voice.mp3",
        sourceDurationInFrames: 180,
        volume: 1,
    },
    {
        id: "clip-4",
        trackId: "track-4",
        type: "video",
        from: 180,
        durationInFrames: 180,
        sourceStartFrame: 0,
        label: "Main footage",
        color: "rgb(61, 94, 201)",
        isLocked: false,
        isHidden: false,
        src: "/video/main.mp4",
        sourceDurationInFrames: 180,
        volume: 1,
    },
];

const fps = 30;
const durationInFrames = 600;
const pixelsPerFrame = 2.5;
const currentFrame = 90;

const Timeline: React.FC = () => {
    const laneResult = buildTrackLaneLayouts(tracks);
    const clipLayouts = buildClipLayouts(
        clips,
        tracks,
        laneResult.layouts,
        pixelsPerFrame,
    );

    const timelineWidth = getTimelineContentWidth(
        durationInFrames,
        pixelsPerFrame,
    );

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
                        <div className='flex h-full w-full overflow-x-scroll overflow-y-scroll'>
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

                            <div
                                className='relative h-full'
                                style={{ width: timelineWidth }}>
                                {/* ===== Tick header =====*/}
                                <TimelineRuler
                                    fps={fps}
                                    durationInFrames={durationInFrames}
                                    pixelsPerFrame={pixelsPerFrame}
                                />

                                {/* ===== Track container ===== */}
                                <TimelineBody
                                    width={timelineWidth}
                                    lanes={laneResult.layouts}
                                    totalHeight={laneResult.totalHeight}>
                                    {clipLayouts.map((clipLayout) => (
                                        <TimelineItem
                                            key={clipLayout.clip.id}
                                            clipLayout={clipLayout}
                                        />
                                    ))}
                                </TimelineBody>

                                {/* ===== Playhead ===== */}
                                <Playhead
                                    currentFrame={currentFrame}
                                    durationInFrames={durationInFrames}
                                    pixelsPerFrame={pixelsPerFrame}
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
