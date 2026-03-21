import { useShallow } from 'zustand/react/shallow';
import { useHotkeys } from 'react-hotkeys-hook';

import useSetting from '@/fronted/hooks/useSetting';
import { useSubtitleScrollState } from '@/fronted/hooks/useSubtitleScroll';
import useChatPanel from '@/fronted/hooks/useChatPanel';
import useFavouriteClip from '@/fronted/hooks/useFavouriteClip';
import { playerV2Actions } from '@/fronted/components/feature/player/player-v2';
import { usePlayerV2 } from '@/fronted/hooks/usePlayerV2';
import usePlayerUi from '@/fronted/hooks/usePlayerUi';

const process = (values: string) => values
    .split(',')
    .map((k) => k.replaceAll(' ', ''))
    .filter((k) => k !== '')
    .filter((k) => k !== 'left' && k !== 'right' && k !== 'up' && k !== 'down' && k !== 'space');

/**
 * 注册播放器页快捷键，并在快捷键配置变化后即时重绑。
 */
export default function PlayerShortCut() {
    const {
        changeShowEn,
        changeShowCn,
        changeShowEnCn,
        changeShowWordLevel
    } = usePlayerUi(
        useShallow((s) => ({
            changeShowEn: s.changeShowEn,
            changeShowCn: s.changeShowCn,
            changeShowEnCn: s.changeShowEnCn,
            changeShowWordLevel: s.changeShowWordLevel
        }))
    );

    const { onUserFinishScrolling, scrollState } = useSubtitleScrollState(
        useShallow((s) => ({
            onUserFinishScrolling: s.onUserFinishScrolling,
            scrollState: s.scrollState,
        }))
    );

    const shortcuts = useSetting(useShallow((s) => ({
        previousSentence: s.values.get('shortcut.previousSentence') ?? '',
        nextSentence: s.values.get('shortcut.nextSentence') ?? '',
        repeatSentence: s.values.get('shortcut.repeatSentence') ?? '',
        playPause: s.values.get('shortcut.playPause') ?? '',
        repeatSingleSentence: s.values.get('shortcut.repeatSingleSentence') ?? '',
        autoPause: s.values.get('shortcut.autoPause') ?? '',
        toggleEnglishDisplay: s.values.get('shortcut.toggleEnglishDisplay') ?? '',
        toggleChineseDisplay: s.values.get('shortcut.toggleChineseDisplay') ?? '',
        toggleBilingualDisplay: s.values.get('shortcut.toggleBilingualDisplay') ?? '',
        adjustBeginMinus: s.values.get('shortcut.adjustBeginMinus') ?? '',
        adjustBeginPlus: s.values.get('shortcut.adjustBeginPlus') ?? '',
        adjustEndMinus: s.values.get('shortcut.adjustEndMinus') ?? '',
        adjustEndPlus: s.values.get('shortcut.adjustEndPlus') ?? '',
        clearAdjust: s.values.get('shortcut.clearAdjust') ?? '',
        toggleWordLevelDisplay: s.values.get('shortcut.toggleWordLevelDisplay') ?? '',
        nextPlaybackRate: s.values.get('shortcut.nextPlaybackRate') ?? '',
        aiChat: s.values.get('shortcut.aiChat') ?? '',
        addClip: s.values.get('shortcut.addClip') ?? '',
    })));
    const { createFromCurrent } = useChatPanel(useShallow((s) => ({
        createFromCurrent: s.createFromCurrent
    })));

    const setSingleRepeat = usePlayerV2((s) => s.setSingleRepeat);
    const setAutoPause = usePlayerV2((s) => s.setAutoPause);
    const singleRepeat = usePlayerV2((s) => s.singleRepeat);
    const autoPause = usePlayerV2((s) => s.autoPause);

    const toggleSingleRepeat = () => {
        setSingleRepeat(!singleRepeat);
    };
    const toggleAutoPause = () => {
        setAutoPause(!autoPause);
    };

    useHotkeys('left', () => {
        playerV2Actions.prevSentence();
        if (scrollState === 'USER_BROWSING') {
            onUserFinishScrolling();
        }
    });
    useHotkeys('right', () => {
        playerV2Actions.nextSentence();
        if (scrollState === 'USER_BROWSING') {
            onUserFinishScrolling();
        }
    });
    useHotkeys('down', (e) => {
        e.preventDefault();
        playerV2Actions.repeatCurrent({ loop: false });
        if (scrollState === 'USER_BROWSING') {
            onUserFinishScrolling();
        }
    });
    useHotkeys('space', (e) => {
        e.preventDefault();
        playerV2Actions.togglePlay();
    });
    useHotkeys('up', (e) => {
        e.preventDefault();
        playerV2Actions.togglePlay();
    });
    useHotkeys(process(shortcuts.previousSentence), () => {
        playerV2Actions.prevSentence();
        if (scrollState === 'USER_BROWSING') {
            onUserFinishScrolling();
        }
    });
    useHotkeys(process(shortcuts.nextSentence), () => {
        playerV2Actions.nextSentence();
        if (scrollState === 'USER_BROWSING') {
            onUserFinishScrolling();
        }
    });
    useHotkeys(process(shortcuts.repeatSentence), () => {
        playerV2Actions.repeatCurrent({ loop: false });
        if (scrollState === 'USER_BROWSING') {
            onUserFinishScrolling();
        }
    });
    useHotkeys(process(shortcuts.playPause), playerV2Actions.togglePlay.bind(playerV2Actions));
    useHotkeys(process(shortcuts.repeatSingleSentence), toggleSingleRepeat);
    useHotkeys(process(shortcuts.autoPause), toggleAutoPause);
    useHotkeys(process(shortcuts.toggleEnglishDisplay), changeShowEn);
    useHotkeys(process(shortcuts.toggleChineseDisplay), changeShowCn);
    useHotkeys(process(shortcuts.toggleBilingualDisplay), changeShowEnCn);
    useHotkeys(process(shortcuts.adjustBeginMinus), () => {
        playerV2Actions.adjustCurrentBegin(-0.2);
    });
    useHotkeys(process(shortcuts.adjustBeginPlus), () => {
        playerV2Actions.adjustCurrentBegin(0.2);
    });
    useHotkeys(process(shortcuts.adjustEndMinus), () => {
        playerV2Actions.adjustCurrentEnd(-0.2);
    });
    useHotkeys(process(shortcuts.adjustEndPlus), () => {
        playerV2Actions.adjustCurrentEnd(0.2);
    });
    useHotkeys(process(shortcuts.clearAdjust), () => {
        void playerV2Actions.clearAdjust();
    });
    useHotkeys(process(shortcuts.toggleWordLevelDisplay), changeShowWordLevel);
    useHotkeys(process(shortcuts.nextPlaybackRate), playerV2Actions.cyclePlaybackRate.bind(playerV2Actions));
    useHotkeys(process(shortcuts.aiChat), () => {
        playerV2Actions.pause();
        createFromCurrent();
    });

    useHotkeys(process(shortcuts.addClip), async () => {
        useFavouriteClip.getState().changeCurrentLineClip();
    });
    return <></>;
}
