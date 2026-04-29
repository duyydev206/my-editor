import { TimelineTrackLaneLayout } from "@/src/features/editor/lib/build-track-lane-layouts";
// import { TIMELINE_GUTTER_X } from "@/src/features/editor/lib/timeline-math";

type TimelineLaneBackgroundsProps = {
    width: number;
    lanes: TimelineTrackLaneLayout[];
};

const TimelineLaneBackgrounds: React.FC<TimelineLaneBackgroundsProps> = ({
    width,
    lanes,
}) => {
    return (
        <div
            className='absolute min-w-full'
            style={{
                width,
                // marginLeft: -TIMELINE_GUTTER_X,
            }}>
            {lanes.map((lane) => (
                <div
                    key={lane.trackId}
                    className='min-w-full pointer-events-none flex border-b border-black/20'
                    style={{
                        height: lane.laneHeight,
                        width,
                    }}
                />
            ))}
        </div>
    );
};

export default TimelineLaneBackgrounds;
