import { Frame, Frames } from "@/src/features/editor/types/primitives";
import {
    TIMELINE_GUTTER_X,
    RULER_HEIGHT,
    getTimelineContentWidth,
} from "@/src/features/editor/lib/timeline-math";

type TimelineRulerProps = {
    fps: number;
    durationInFrames: Frames;
    pixelsPerFrame: number;
};

type Marker = {
    frame: Frame;
    label: string;
};

const formatTime = (frame: number, fps: number) => {
    const totalSeconds = Math.floor(frame / fps);
    const minutes = Math.floor(totalSeconds / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");

    return `${minutes}:${seconds}`;
};

const pickMajorStepFrames = (fps: number, pixelsPerFrame: number) => {
    const candidates = [
        fps * 24,
        fps * 8,
        fps * 4,
        fps * 2,
        fps,
        Math.round(fps * 0.8),
        Math.round(fps * 0.4),
        Math.round(fps * 0.2),
        12,
        6,
        3,
        1,
    ];

    for (const step of candidates) {
        const width = step * pixelsPerFrame;
        if (width >= 120 && width <= 260) {
            return step;
        }
    }

    return candidates[candidates.length - 1];
};

const TimelineRuler: React.FC<TimelineRulerProps> = ({
    fps,
    durationInFrames,
    pixelsPerFrame,
}: TimelineRulerProps) => {
    const totalWidth = getTimelineContentWidth(
        durationInFrames,
        pixelsPerFrame,
        TIMELINE_GUTTER_X,
    );

    const stepFrames = pickMajorStepFrames(fps, pixelsPerFrame);
    const stepWidth = stepFrames * pixelsPerFrame;

    const markers: Marker[] = [];

    for (let frame = 0; frame <= durationInFrames; frame += stepFrames) {
        markers.push({
            frame,
            label: formatTime(frame, fps),
        });
    }

    return (
        <div className='sticky top-0 z-1'>
            <div
                className='pointer-events-none absolute top-0 h-7 bg-gray-300'
                style={{ width: totalWidth }}
            />

            <div
                id='tick-headers'
                className='flex overflow-hidden select-none h-7'
                style={{
                    width: totalWidth,
                    paddingLeft: TIMELINE_GUTTER_X,
                }}>
                {markers.map((marker) => (
                    <div
                        key={marker.frame}
                        className='relative shrink-0'
                        style={{
                            width: stepWidth,
                            minWidth: stepWidth,
                        }}>
                        <div
                            className=' flex items-start truncate border-l border-l-gray-500 pt-3 pl-1 text-slate-800'
                            style={{
                                fontSize: 10,
                                height: RULER_HEIGHT,
                            }}>
                            {marker.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TimelineRuler;
