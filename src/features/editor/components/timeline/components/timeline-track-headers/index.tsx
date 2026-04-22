import { TimelineTrackLaneLayout } from "@/src/features/editor/lib/build-track-lane-layouts";
import { RULER_HEIGHT } from "@/src/features/editor/lib/timeline-math";
import TimelineTrackHeaderRow from "./timeline-track-header-row";
import { TimelineTrack } from "@/src/features/editor/types";

type TimelineTrackHeadersProps = {
    tracks: TimelineTrack[];
    lanes: TimelineTrackLaneLayout[];
    totalHeight: number;
};

const TimelineTrackHeaders: React.FC<TimelineTrackHeadersProps> = ({
    tracks,
    lanes,
    totalHeight,
}) => {
    const sortedTracks = [...tracks].sort((a, b) => a.index - b.index);
    const laneMap = new Map(lanes.map((lane) => [lane.trackId, lane]));

    return (
        <div
            id='track-headers'
            className='border-editor-starter-border sticky left-0 flex w-full shrink-0 flex-col border-r'
            style={{
                height: totalHeight + RULER_HEIGHT,
                paddingTop: RULER_HEIGHT,
            }}>
            {sortedTracks.map((track, index) => {
                const lane = laneMap.get(track.id);
                if (!lane) return null;

                return (
                    <TimelineTrackHeaderRow
                        key={track.id}
                        track={track}
                        laneHeight={lane.laneHeight}
                        displayIndex={sortedTracks.length - index}
                    />
                );
            })}
        </div>
    );
};

export default TimelineTrackHeaders;
