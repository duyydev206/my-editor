import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { TimelineClipLayout } from "@/src/features/editor/lib/build-clip-layouts";
import TimelineItemContent from "./timeline-item-content";
import TimelineItemResizeHandle from "./timeline-item-resize-handle";
import TimelineItemShell from "./timeline-item-shell";

type TimelineItemProps = {
    clipLayout: TimelineClipLayout;
    isSelected?: boolean;
    isDragDisabled?: boolean;
    onSelect?: (clipId: string) => void;
};

const TimelineItem: React.FC<TimelineItemProps> = ({
    clipLayout,
    isSelected = false,
    isDragDisabled = false,
    onSelect,
}: TimelineItemProps) => {
    const {
        clip,
        left,
        top,
        width,
        height,
        resizeHandleWidth,
        isTrackLocked,
        isTrackHidden,
        isTrackMuted,
    } = clipLayout;
    const isLocked = isTrackLocked || clip.isLocked;
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: clip.id,
            data: {
                clipId: clip.id,
                trackId: clip.trackId,
                type: clip.type,
            },
            disabled: isDragDisabled || isLocked,
        });
    const dragTransform = isDragging ? undefined : CSS.Translate.toString(transform);

    return (
        <div
            className='relative'
            data-hidden={isTrackHidden || clip.isHidden}
            style={{ opacity: isTrackHidden || clip.isHidden ? 0.45 : 1 }}>
            <div data-state='closed' style={{ display: "contents" }}>
                <div
                    ref={setNodeRef}
                    data-editor-focus-target='timeline-clip'
                    {...attributes}
                    {...listeners}
                    onClick={(event) => {
                        event.stopPropagation();
                        onSelect?.(clip.id);
                    }}
                    style={{
                        width,
                        left,
                        top,
                        height,
                        position: "absolute",
                        zIndex: isDragging ? 9999 : 5,
                        transform: dragTransform,
                        opacity: isDragging ? 0 : undefined,
                        touchAction: "none",
                    }}>
                    <TimelineItemShell
                        isLocked={isLocked}
                        isSelected={isSelected}>
                        <TimelineItemContent
                            clip={clip}
                            isTrackMuted={isTrackMuted}
                        />
                    </TimelineItemShell>

                    {!isLocked && (
                        <>
                            <TimelineItemResizeHandle
                                side='start'
                                width={resizeHandleWidth}
                            />
                            <TimelineItemResizeHandle
                                side='end'
                                width={resizeHandleWidth}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TimelineItem;
