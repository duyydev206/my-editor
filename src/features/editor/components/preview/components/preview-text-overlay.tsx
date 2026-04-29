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

type ResizeHandle = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const TEXT_RESIZE_HANDLE_SIZE = 8;
const MIN_TEXT_RENDER_SIZE = 24;

const RESIZE_HANDLE_CONFIG: Record<
    ResizeHandle,
    {
        cursor: string;
        horizontalDirection: -1 | 1;
        verticalDirection: -1 | 1;
        className: string;
    }
> = {
    "top-left": {
        cursor: "nwse-resize",
        horizontalDirection: -1,
        verticalDirection: -1,
        className: "-left-1 -top-1",
    },
    "top-right": {
        cursor: "nesw-resize",
        horizontalDirection: 1,
        verticalDirection: -1,
        className: "-right-1 -top-1",
    },
    "bottom-left": {
        cursor: "nesw-resize",
        horizontalDirection: -1,
        verticalDirection: 1,
        className: "-bottom-1 -left-1",
    },
    "bottom-right": {
        cursor: "nwse-resize",
        horizontalDirection: 1,
        verticalDirection: 1,
        className: "-bottom-1 -right-1",
    },
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
        color: isEditing ? clip.style.color : "transparent",
        backgroundColor: isEditing ? "rgba(37, 99, 235, 0.92)" : "transparent",
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

const getTextTransform = (clip: TextClip) => {
    return (
        clip.transform ?? {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            anchorX: 0.5,
            anchorY: 0.5,
        }
    );
};

const useTextMove = (clip: TextClip, scaleX: number, scaleY: number) => {
    const dragStartRef = useRef<{
        pointerX: number;
        pointerY: number;
        clipX: number;
        clipY: number;
    } | null>(null);
    const updateClipTransform = useEditorStore(
        (state) => state.updateClipTransform,
    );

    const startMove = (event: PointerEvent<HTMLDivElement>) => {
        const transform = getTextTransform(clip);

        event.currentTarget.setPointerCapture(event.pointerId);
        dragStartRef.current = {
            pointerX: event.clientX,
            pointerY: event.clientY,
            clipX: transform.x,
            clipY: transform.y,
        };
    };

    const moveText = (event: PointerEvent<HTMLDivElement>) => {
        if (!dragStartRef.current) return;

        const dragStart = dragStartRef.current;
        const nextX =
            dragStart.clipX + (event.clientX - dragStart.pointerX) / scaleX;
        const nextY =
            dragStart.clipY + (event.clientY - dragStart.pointerY) / scaleY;

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

    return {
        startMove,
        moveText,
        stopMove,
    };
};

const useTextResize = ({
    clip,
    scaleX,
    scaleY,
    measuredSize,
}: {
    clip: TextClip;
    scaleX: number;
    scaleY: number;
    measuredSize: { width: number; height: number };
}) => {
    const resizeStartRef = useRef<{
        handle: ResizeHandle;
        pointerX: number;
        pointerY: number;
        clipX: number;
        clipY: number;
        scaleX: number;
        scaleY: number;
        width: number;
        height: number;
    } | null>(null);
    const updateClipTransform = useEditorStore(
        (state) => state.updateClipTransform,
    );

    const startResize =
        (handle: ResizeHandle) => (event: PointerEvent<HTMLSpanElement>) => {
            event.stopPropagation();

            const transform = getTextTransform(clip);
            resizeStartRef.current = {
                handle,
                pointerX: event.clientX,
                pointerY: event.clientY,
                clipX: transform.x,
                clipY: transform.y,
                scaleX: transform.scaleX ?? 1,
                scaleY: transform.scaleY ?? 1,
                width: Math.max(measuredSize.width, MIN_TEXT_RENDER_SIZE),
                height: Math.max(measuredSize.height, MIN_TEXT_RENDER_SIZE),
            };

            event.currentTarget.setPointerCapture(event.pointerId);
        };

    const resizeText = (event: PointerEvent<HTMLSpanElement>) => {
        const resizeStart = resizeStartRef.current;
        if (!resizeStart) return;

        const handleConfig = RESIZE_HANDLE_CONFIG[resizeStart.handle];
        const startRenderedWidth = resizeStart.width * resizeStart.scaleX;
        const startRenderedHeight = resizeStart.height * resizeStart.scaleY;
        const deltaX =
            ((event.clientX - resizeStart.pointerX) / scaleX) *
            handleConfig.horizontalDirection;
        const deltaY =
            ((event.clientY - resizeStart.pointerY) / scaleY) *
            handleConfig.verticalDirection;

        const nextRenderedWidth = Math.max(
            MIN_TEXT_RENDER_SIZE,
            startRenderedWidth + deltaX,
        );
        const nextRenderedHeight = Math.max(
            MIN_TEXT_RENDER_SIZE,
            startRenderedHeight + deltaY,
        );
        const renderedWidthDelta = nextRenderedWidth - startRenderedWidth;
        const renderedHeightDelta = nextRenderedHeight - startRenderedHeight;

        updateClipTransform({
            clipId: clip.id,
            transform: {
                x:
                    resizeStart.clipX +
                    (renderedWidthDelta / 2) *
                        handleConfig.horizontalDirection,
                y:
                    resizeStart.clipY +
                    (renderedHeightDelta / 2) *
                        handleConfig.verticalDirection,
                scaleX: nextRenderedWidth / resizeStart.width,
                scaleY: nextRenderedHeight / resizeStart.height,
            },
        });
    };

    const stopResize = () => {
        resizeStartRef.current = null;
    };

    return {
        startResize,
        resizeText,
        stopResize,
    };
};

const TextDisplayLayer: React.FC<{
    clip: TextClip;
    scaleX: number;
    scaleY: number;
    isSelected: boolean;
}> = ({ clip, scaleX, scaleY, isSelected }) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const [measuredSize, setMeasuredSize] = useState({
        width: 0,
        height: 0,
    });
    const setSelectedClipIds = useEditorStore(
        (state) => state.setSelectedClipIds,
    );
    const startTextEditing = useEditorStore((state) => state.startTextEditing);
    const { startMove, moveText, stopMove } = useTextMove(clip, scaleX, scaleY);
    const { startResize, resizeText, stopResize } = useTextResize({
        clip,
        scaleX,
        scaleY,
        measuredSize,
    });

    useEffect(() => {
        const element = rootRef.current;
        if (!element) return;

        const updateMeasuredSize = () => {
            const rect = element.getBoundingClientRect();
            setMeasuredSize({
                width: rect.width,
                height: rect.height,
            });
        };

        const resizeObserver = new ResizeObserver(updateMeasuredSize);
        updateMeasuredSize();
        resizeObserver.observe(element);

        return () => {
            resizeObserver.disconnect();
        };
    }, [clip.text, isSelected]);

    return (
        <div
            ref={rootRef}
            data-editor-focus-target='preview-text'
            className='rounded-xs'
            style={getTextOverlayStyle({
                clip,
                scaleX,
                scaleY,
                isSelected,
                isEditing: false,
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
                setSelectedClipIds([clip.id]);
            }}
            onDoubleClick={(event) => {
                event.stopPropagation();
                setSelectedClipIds([clip.id]);
                startTextEditing({ clipId: clip.id, draftText: clip.text });
            }}>
            <span>{clip.text}</span>
            {isSelected && (
                <>
                    {(Object.keys(RESIZE_HANDLE_CONFIG) as ResizeHandle[]).map(
                        (handle) => {
                            const handleConfig = RESIZE_HANDLE_CONFIG[handle];

                            return (
                                <span
                                    key={handle}
                                    className={`absolute border border-sky-500 bg-white ${handleConfig.className}`}
                                    style={{
                                        width: TEXT_RESIZE_HANDLE_SIZE,
                                        height: TEXT_RESIZE_HANDLE_SIZE,
                                        cursor: handleConfig.cursor,
                                    }}
                                    onPointerDown={startResize(handle)}
                                    onPointerMove={resizeText}
                                    onPointerUp={stopResize}
                                    onPointerCancel={stopResize}
                                    onLostPointerCapture={stopResize}
                                />
                            );
                        },
                    )}
                    <span className='absolute left-0 top-full mt-1 bg-blue-600 px-1.5 py-0.5 text-xs leading-4 text-white'>
                        {Math.round(measuredSize.width)}x
                        {Math.round(measuredSize.height)}
                    </span>
                </>
            )}
        </div>
    );
};

const TextEditLayer: React.FC<{
    clip: TextClip;
    scaleX: number;
    scaleY: number;
}> = ({ clip, scaleX, scaleY }) => {
    const editableRef = useRef<HTMLDivElement>(null);
    const updateTextDraft = useEditorStore((state) => state.updateTextDraft);
    const stopTextEditing = useEditorStore((state) => state.stopTextEditing);

    useEffect(() => {
        const element = editableRef.current;
        if (!element) return;

        if (
            document.activeElement === element &&
            element.textContent === clip.text
        ) {
            return;
        }

        element.focus();
        element.textContent = clip.text;

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(element);
        selection?.removeAllRanges();
        selection?.addRange(range);
    }, [clip.id, clip.text]);

    return (
        <div
            ref={editableRef}
            data-editor-focus-target='preview-text'
            role='textbox'
            aria-label='Edit text clip'
            contentEditable
            suppressContentEditableWarning
            className='rounded-xs'
            style={getTextOverlayStyle({
                clip,
                scaleX,
                scaleY,
                isSelected: true,
                isEditing: true,
            })}
            onPointerDown={(event) => {
                event.stopPropagation();
            }}
            onClick={(event) => {
                event.stopPropagation();
            }}
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
    );
};

const PreviewTextOverlay: React.FC<PreviewTextOverlayProps> = ({
    compositionWidth,
    compositionHeight,
    renderedWidth,
    renderedHeight,
}) => {
    const project = useEditorStore((state) => state.project);
    const currentFrame = useEditorStore(
        (state) => state.runtime.player.currentFrame,
    );
    const selectedClipIds = useEditorStore(
        (state) => state.runtime.selection.selectedClipIds,
    );
    const textEditing = useEditorStore((state) => state.runtime.textEditing);
    const clearSelection = useEditorStore((state) => state.clearSelection);
    const stopTextEditing = useEditorStore((state) => state.stopTextEditing);

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

    useEffect(() => {
        if (!textEditing.isEditing || !textEditing.editingClipId) {
            return;
        }

        const editingClip = visibleTextClips.find((clip) => {
            return clip.id === textEditing.editingClipId;
        });

        if (!editingClip) {
            stopTextEditing();
        }
    }, [
        stopTextEditing,
        textEditing.editingClipId,
        textEditing.isEditing,
        visibleTextClips,
    ]);

    useEffect(() => {
        const handleDocumentPointerDown = (event: PointerEvent | globalThis.PointerEvent) => {
            const target = event.target;

            if (!(target instanceof HTMLElement)) {
                return;
            }

            if (target.closest("[data-editor-focus-target]")) {
                return;
            }

            // OLD logic: Selection only changed when clicking another selectable node.
            // NEW logic: Clicking anywhere outside Timeline clips and Preview text clears focus/edit state.
            clearSelection();
            stopTextEditing();
        };

        document.addEventListener("pointerdown", handleDocumentPointerDown);

        return () => {
            document.removeEventListener(
                "pointerdown",
                handleDocumentPointerDown,
            );
        };
    }, [clearSelection, stopTextEditing]);

    const scaleX = renderedWidth / compositionWidth;
    const scaleY = renderedHeight / compositionHeight;

    return (
        <div className='pointer-events-none absolute inset-0 z-20'>
            {visibleTextClips.map((clip) => {
                const isEditing =
                    textEditing.isEditing &&
                    textEditing.editingClipId === clip.id;

                if (isEditing) {
                    return (
                        <TextEditLayer
                            key={`${clip.id}-editing`}
                            clip={clip}
                            scaleX={scaleX}
                            scaleY={scaleY}
                        />
                    );
                }

                return (
                    <TextDisplayLayer
                        key={`${clip.id}-display`}
                        clip={clip}
                        scaleX={scaleX}
                        scaleY={scaleY}
                        isSelected={selectedClipIds.includes(clip.id)}
                    />
                );
            })}
        </div>
    );
};

export default PreviewTextOverlay;
