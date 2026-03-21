/**
 * 管理播放器复制模式，负责暂停播放、记录待复制内容和退出时写入剪贴板。
 */
import { create } from 'zustand';
import usePlayerToaster from './usePlayerToaster';
import { usePlayer } from '@/fronted/hooks/usePlayer';

export type UseCopyModeState = {
    isCopyMode: boolean,
    copyContent: string,
};

export type UseCopyModeActions = {
    enterCopyMode: () => void;
    exitCopyMode: () => void;
    setCopyContent: (content: string) => void;

};

const Toaster = usePlayerToaster.getState();
const { pause } = usePlayer.getState();


const useCopyModeController = create<UseCopyModeState & UseCopyModeActions>(
    (set,get) => ({
        isCopyMode: false,
        copyContent: '',
        enterCopyMode: () => {
            // pause the video
            pause();
            Toaster.setNotification({ type: 'info', text: 'open copy mode' });
            set({ isCopyMode: true })
        },
        exitCopyMode: () => {
            navigator.clipboard.writeText((get().copyContent));
            Toaster.setNotification({ type: 'info', text: 'close copy mode' });
            // Toaster.setNotification({ type: 'info', text: 'copy success' });
            set({ isCopyMode: false, copyContent: '' })

        },
        setCopyContent: (content: string) => {
            set({copyContent:content})
            Toaster.setNotification({ type: 'info', text: `copy: ${content} ` });
        },
    })
);


export default useCopyModeController;
