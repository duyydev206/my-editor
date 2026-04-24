import { TimelineTrackLaneLayout } from "@/src/features/editor/lib/build-track-lane-layouts";
import TimelineLaneBackgrounds from "./timeline-lane-backgrounds";
import TimelineItemsLayer from "./timeline-items-layer";

type TimelineBodyProps = {
    timelineWidth: number;
    lanes: TimelineTrackLaneLayout[];
    totalHeight: number;
    children?: React.ReactNode;
};

const TimelineBody: React.FC<TimelineBodyProps> = ({
    timelineWidth,
    lanes,
    totalHeight,
    children,
}) => {
    return (
        <div
            className='relative min-w-full'
            style={{
                width: timelineWidth,
                height: totalHeight,
                // OLD logic: TimelineBody also applied horizontal gutter padding.
                // NEW logic: frameToPx/ruler/playhead already own the gutter, so body padding would offset clips twice.
            }}>
            <TimelineLaneBackgrounds width={timelineWidth} lanes={lanes} />
            <TimelineItemsLayer>{children}</TimelineItemsLayer>
        </div>
    );
};

export default TimelineBody;
