"use client";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type FormEvent,
    type PointerEvent,
} from "react";
import { useEditorStore } from "../../../stores";
import { TextClip } from "../../../types";

type PreviewTextOverlayProps = {
    compositionWidth: number;
    compositionHeight: number;
    renderedWidth: number;
    renderedHeight: number;
};

const isTextVisibleAtFrame = (clip: TextClip, frame: number) => {
    return frame >= clip.from && frame < clip.from + clip.durationInFrames;
};

const getTextOverlayStyle = ({
    clip,
    scaleX,
    scaleY,
    isSelected,
    isEditing,
}: {
    clip: TextClip;
    scaleX: number;
    scaleY: number;
    isSelected: boolean;
    isEditing: boolean;
}): CSSProperties => {
    const transform = clip.transform ?? {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 1,
        anchorX: 0.5,
        anchorY: 0.5,
    };

    return {
        position: "absolute",
        left: transform.x * scaleX,
        top: transform.y * scaleY,
        transform: `
            translate(-50%, -50%)
            rotate(${transform.rotation}deg)
            scale(${transform.scaleX}, ${transform.scaleY})
        `,
        opacity: transform.opacity ?? 1,
        // OLD logic: The overlay painted selected text, so it doubled the Remotion text layer.
        // NEW logic: Only edit mode paints text; selected mode only paints editor controls.
        color: isEditing ? clip.style.color : "transparent",
        backgroundColor: isEditing
            ? "rgba(37, 99, 235, 0.92)"
            : "transparent",
        border:
            isSelected && !isEditing
                ? "1px solid #38bdf8"
                : "1px solid transparent",
        outline: "none",
        boxShadow:
            isSelected && !isEditing
                ? "0 0 0 1px rgba(2, 132, 199, 0.35)"
                : "none",
        padding: isEditing ? "2px 4px" : 0,
        minWidth: isEditing ? 28 : undefined,
        minHeight: isEditing ? 20 : undefined,
        whiteSpace: "pre-wrap",
        textAlign: clip.style.textAlign ?? "center",
        fontFamily: clip.style.fontFamily,
        fontSize: (clip.style.fontSize ?? 32) * scaleX,
        fontWeight: clip.style.fontWeight,
        fontStyle: clip.style.fontStyle,
        lineHeight: clip.style.lineHeight,
        letterSpacing: clip.style.letterSpacing,
        textDecoration: clip.style.textDecoration,
        textTransform: clip.style.textTransform,
        cursor: isEditing ? "text" : "move",
        userSelect: isEditing ? "text" : "none",
        pointerEvents: "auto",
    };
};

const EditableTextLayer: React.FC<{
    clip: TextClip;
    scaleX: number;
    scaleY: number;
    isSelected: boolean;
    isEditing: boolean;
}> = ({ clip, scaleX, scaleY, isSelected, isEditing }) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const editableRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{
        pointerX: number;
        pointerY: number;
        clipX: number;
        clipY: number;
    } | null>(null);
    const [measuredSize, setMeasuredSize] = useState({
        width: 0,
        height: 0,
    });
    const setSelectedClipIds = useEditorStore(
        (state) => state.setSelectedClipIds,
    );
    const startTextEditing = useEditorStore((state) => state.startTextEditing);
    const updateTextDraft = useEditorStore((state) => state.updateTextDraft);
    const stopTextEditing = useEditorStore((state) => state.stopTextEditing);
    const updateClipTransform = useEditorStore(
        (state) => state.updateClipTransform,
    );

    useEffect(() => {
        if (!isEditing) return;

        const element = editableRef.current;
        if (!element) return;

        element.focus();
        element.textContent = clip.text;

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(element);
        selection?.removeAllRanges();
        selection?.addRange(range);
    }, [clip.text, isEditing]);

    useEffect(() => {
        const element = rootRef.current;
        if (!element) return;

        const updateMeasuredSize = () => {
            setMeasuredSize({
                width: element.offsetWidth,
                height: element.offsetHeight,
            });
        };
        const resizeObserver = new ResizeObserver(updateMeasuredSize);

        updateMeasuredSize();
        resizeObserver.observe(element);

        return () => {
            resizeObserver.disconnect();
        };
    }, [clip.text, isSelected, isEditing]);

    const startMove = (event: PointerEvent<HTMLDivElement>) => {
        if (isEditing) return;

        const transform = clip.transform ?? {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            anchorX: 0.5,
            anchorY: 0.5,
        };

        event.currentTarget.setPointerCapture(event.pointerId);
        dragStartRef.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            clipX: transform.x,
            clipY: transform.y,
        };
    };

    const moveText = (event: PointerEvent<HTMLDivElement>) => {
        if (isEditing || !dragStartRef.current) return;

        const dragStart = dragStartRef.current;
        const nextX = dragStart.clipX + (event.clientX - dragStart.pointerX) / scaleX;
        const nextY = dragStart.clipY + (event.clientY - dragStart.pointerY) / scaleY;

        updateClipTransform({
            clipId: clip.id,
            transform: {
                x: nextX,
                y: nextY,
            },
        });
    };

    const stopMove = () => {
        dragStartRef.current = null;
    };

    return (
        <div
            ref={rootRef}
            className='rounded-xs'
            style={getTextOverlayStyle({
                clip,
                scaleX,
                scaleY,
                isSelected,
                isEditing,
            })}
            onPointerDown={(event) => {
                event.stopPropagation();
                setSelectedClipIds([clip.id]);
                startMove(event);
            }}
            onPointerMove={(event) => {
                event.stopPropagation();
                moveText(event);
            }}
            onPointerUp={stopMove}
            onPointerCancel={stopMove}
            onLostPointerCapture={stopMove}
            onClick={(event) => {
                event.stopPropagation();
            }}
            onDoubleClick={(event) => {
                event.stopPropagation();
                setSelectedClipIds([clip.id]);
                startTextEditing({ clipId: clip.id, draftText: clip.text });
            }}>
            {isEditing ? (
                <div
                    key={`${clip.id}-editing`}
                    ref={editableRef}
                    role='textbox'
                    aria-label='Edit text clip'
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(event: FormEvent<HTMLDivElement>) => {
                        updateTextDraft(event.currentTarget.textContent ?? "");
                    }}
                    onBlur={() => {
                        stopTextEditing();
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            event.currentTarget.blur();
                        }
                    }}
                />
            ) : (
                <span key={`${clip.id}-display`}>{clip.text}</span>
            )}
            {isSelected && !isEditing && (
                <>
                    <span className='absolute -left-1 -top-1 h-2 w-2 border border-sky-500 bg-white' />
                    <span className='absolute -right-1 -top-1 h-2 w-2 border border-sky-500 bg-white' />
                    <span className='absolute -bottom-1 -left-1 h-2 w-2 border border-sky-500 bg-white' />
                    <span className='absolute -bottom-1 -right-1 h-2 w-2 border border-sky-500 bg-white' />
                    <span className='absolute left-0 top-full mt-1 bg-blue-600 px-1.5 py-0.5 text-xs leading-4 text-white'>
                        {Math.round(measuredSize.width)}x
                        {Math.round(measuredSize.height)}
                    </span>
                </>
            )}
        </div>
    );
};

const PreviewTextOverlay: React.FC<PreviewTextOverlayProps> = ({
    compositionWidth,
    compositionHeight,
    renderedWidth,
    renderedHeight,
}) => {
    const project = useEditorStore((state) => state.project);
    const currentFrame = useEditorStore((state) => state.runtime.player.currentFrame);
    const selectedClipIds = useEditorStore(
        (state) => state.runtime.selection.selectedClipIds,
    );
    const textEditing = useEditorStore((state) => state.runtime.textEditing);

    const visibleTextClips = useMemo(() => {
        const trackMap = new Map(project.tracks.map((track) => [track.id, track]));

        return project.clips.filter((clip): clip is TextClip => {
            const track = trackMap.get(clip.trackId);

            return (
                clip.type === "text" &&
                !clip.isHidden &&
                !track?.isHidden &&
                isTextVisibleAtFrame(clip, currentFrame)
            );
        });
    }, [currentFrame, project.clips, project.tracks]);
    const scaleX = renderedWidth / compositionWidth;
    const scaleY = renderedHeight / compositionHeight;

    return (
        <div className='pointer-events-none absolute inset-0 z-20'>
            {visibleTextClips.map((clip) => (
                <EditableTextLayer
                    key={clip.id}
                    clip={clip}
                    scaleX={scaleX}
                    scaleY={scaleY}
                    isSelected={selectedClipIds.includes(clip.id)}
                    isEditing={
                        textEditing.isEditing &&
                        textEditing.editingClipId === clip.id
                    }
                />
            ))}
        </div>
    );
};

export default PreviewTextOverlay;
