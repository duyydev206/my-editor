import { TimelineTrackLaneLayout } from "@/src/features/editor/lib/build-track-lane-layouts";
import { TIMELINE_GUTTER_X } from "@/src/features/editor/lib/timeline-math";
import TimelineLaneBackgrounds from "./timeline-lane-backgrounds";
import TimelineItemsLayer from "./timeline-items-layer";

type TimelineBodyProps = {
    width: number;
    lanes: TimelineTrackLaneLayout[];
    totalHeight: number;
    children?: React.ReactNode;
};

const TimelineBody: React.FC<TimelineBodyProps> = ({
    width,
    lanes,
    totalHeight,
    children,
}) => {
    return (
        <div
            className='relative'
            style={{
                width,
                height: totalHeight,
                paddingLeft: TIMELINE_GUTTER_X,
                paddingRight: TIMELINE_GUTTER_X,
            }}>
            <TimelineLaneBackgrounds width={width} lanes={lanes} />
            <TimelineItemsLayer>{children}</TimelineItemsLayer>
        </div>
    );
};

export default TimelineBody;
