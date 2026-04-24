"use client";

import EditorToolbar from "@/src/features/editor/components/editor-toolbar";
import Inspector from "@/src/features/editor/components/inspector";
import EditorPlayer from "@/src/features/editor/components/preview";
import Timeline from "@/src/features/editor/components/timeline";
import { useEditorStore } from "@/src/features/editor/stores";

const Editor = () => {
    const timelinePanelHeight = useEditorStore(
        (state) => state.runtime.timeline.panelHeight,
    );

    return (
        <div className='flex flex-col h-full overflow-hidden'>
            <EditorToolbar />

            <div className='flex-1 min-h-0'>
                <div className='w-full h-full min-h-0 min-w-0 grid grid-cols-6 gap-5'>
                    <div
                        className='col-span-6 min-h-0 min-w-0 grid grid-cols-4'
                        style={{
                            gridTemplateRows: timelinePanelHeight
                                ? `minmax(0, 1fr) minmax(0, 1fr) ${timelinePanelHeight}px`
                                : undefined,
                        }}>
                        <div className='row-span-2 min-h-0 min-w-0 col-span-3 overflow-hidden border'>
                            <EditorPlayer />
                        </div>

                        <div className='row-span-2 min-h-0 min-w-0 col-span-1 border'>
                            <Inspector />
                        </div>

                        <div className='row-span-1 min-h-0 min-w-0 col-span-full overflow-hidden'>
                            <Timeline />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Editor;
