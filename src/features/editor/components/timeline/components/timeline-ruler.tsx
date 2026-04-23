import { Frames } from "@/src/features/editor/types/primitives";
import {
    TIMELINE_GUTTER_X,
    RULER_HEIGHT,
} from "@/src/features/editor/lib/timeline-math";

type TimelineRulerProps = {
    fps: number;
    visibleDurationInFrames: Frames;
    tickFrames: Frames;
    timelineWidth: number;
    onSeekFrame?: (frame: number) => void;
};

const formatTimecode = (frame: number, fps: number) => {
    const totalSeconds = Math.floor(frame / fps);
    const frames = frame % fps;

    const minutes = Math.floor(totalSeconds / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    const frameText = frames.toString().padStart(2, "0");

    return `${minutes}:${seconds}:${frameText}${frameText !== "00" ? "f" : ""}`;
};

const TimelineRuler: React.FC<TimelineRulerProps> = ({
    fps,
    visibleDurationInFrames,
    tickFrames,
    timelineWidth,
    onSeekFrame,
}: TimelineRulerProps) => {
    const usableWidth = Math.max(0, timelineWidth - TIMELINE_GUTTER_X * 2);
    const pixelsPerFrame =
        visibleDurationInFrames > 0 ? usableWidth / visibleDurationInFrames : 0;

    const tickCount = Math.floor(visibleDurationInFrames / tickFrames);

    const markers = Array.from({ length: tickCount + 1 }, (_, index) => {
        const frame = index * tickFrames;
        const left = TIMELINE_GUTTER_X + frame * pixelsPerFrame;

        return {
            frame,
            left,
            label: formatTimecode(frame, fps),
        };
    });

    return (
        <div className='sticky top-0 z-1'>
            <div
                className='pointer-events-none absolute top-0 h-7 bg-gray-300'
                style={{ width: timelineWidth }}
            />

            <div
                id='tick-headers'
                className='relative overflow-hidden select-none h-7 cursor-pointer'
                onPointerDown={(event) => {
                    if (pixelsPerFrame <= 0) return;

                    const rect = event.currentTarget.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const frame = Math.round(
                        (x - TIMELINE_GUTTER_X) / pixelsPerFrame,
                    );

                    // OLD logic: Ruler was display-only.
                    // NEW logic: Clicking the ruler seeks the shared player frame.
                    onSeekFrame?.(
                        Math.max(
                            0,
                            Math.min(frame, visibleDurationInFrames - 1),
                        ),
                    );
                }}
                style={{
                    width: timelineWidth,
                }}>
                {markers.map((marker) => (
                    <div
                        key={marker.frame}
                        className='absolute top-0 h-7'
                        style={{
                            left: marker.left,
                            width: 1,
                        }}>
                        <div
                            className='absolute top-0 h-7 border-l border-l-gray-500'
                            style={{
                                left: 0,
                            }}
                        />

                        {marker.label ? (
                            <div
                                className='absolute pt-3 pl-1 text-slate-800 whitespace-nowrap'
                                style={{
                                    top: 0,
                                    left: 0,
                                    fontSize: 10,
                                    height: RULER_HEIGHT,
                                }}>
                                {marker.label}
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TimelineRuler;
