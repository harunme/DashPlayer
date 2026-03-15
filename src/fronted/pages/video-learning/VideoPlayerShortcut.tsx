import React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import useSetting from '@/fronted/hooks/useSetting';

type Props = {
    onPlayPause: () => void;
    onPrevSentence: () => void;
    onNextSentence: () => void;
    onRepeatSentence: () => void;
    onSeekToCurrentStart: () => void;
    onChangeSingleRepeat: () => void;
    onChangeAutoPause: () => void;
};

/**
 * 视频学习页快捷键注册器：监听设置变化后即时更新绑定。
 */
const VideoPlayerShortcut: React.FC<Props> = ({
    onPlayPause,
    onPrevSentence,
    onNextSentence,
    onRepeatSentence,
    onSeekToCurrentStart,
    onChangeSingleRepeat,
    onChangeAutoPause,
}) => {
    const shortcuts = useSetting((s) => ({
        previousSentence: s.values.get('shortcut.previousSentence') ?? '',
        nextSentence: s.values.get('shortcut.nextSentence') ?? '',
        repeatSentence: s.values.get('shortcut.repeatSentence') ?? '',
        playPause: s.values.get('shortcut.playPause') ?? '',
        repeatSingleSentence: s.values.get('shortcut.repeatSingleSentence') ?? '',
        autoPause: s.values.get('shortcut.autoPause') ?? '',
    }));

    // 处理快捷键配置，去除空格和无效按键
    const process = (values: string) => values
        .split(',')
        .map((k) => k.replaceAll(' ', ''))
        .filter((k) => k !== '')
        // remove left right up down space
        .filter((k) => k !== 'left' && k !== 'right' && k !== 'up' && k !== 'down' && k !== 'space');

    // 基础方向键导航（与主播放器保持一致）
    useHotkeys('left', (e) => {
        e.preventDefault();
        onPrevSentence();
    }, [onPrevSentence]);

    useHotkeys('right', (e) => {
        e.preventDefault();
        onNextSentence();
    }, [onNextSentence]);

    useHotkeys('down', (e) => {
        e.preventDefault();
        onRepeatSentence();
    }, [onRepeatSentence]);

    // 空格和上方向键播放/暂停（与主播放器保持一致）
    useHotkeys('space', (e) => {
        e.preventDefault();
        onPlayPause();
    }, [onPlayPause]);

    useHotkeys('up', (e) => {
        e.preventDefault();
        onPlayPause();
    }, [onPlayPause]);

    // 自定义快捷键配置（从设置中读取）
    useHotkeys(process(shortcuts.previousSentence), (e) => {
        e.preventDefault();
        onPrevSentence();
    }, [onPrevSentence]);

    useHotkeys(process(shortcuts.nextSentence), (e) => {
        e.preventDefault();
        onNextSentence();
    }, [onNextSentence]);

    useHotkeys(process(shortcuts.repeatSentence), (e) => {
        e.preventDefault();
        onRepeatSentence();
    }, [onRepeatSentence]);

    useHotkeys(process(shortcuts.playPause), (e) => {
        e.preventDefault();
        onPlayPause();
    }, [onPlayPause]);

    useHotkeys(process(shortcuts.repeatSingleSentence), (e) => {
        e.preventDefault();
        onChangeSingleRepeat();
    }, [onChangeSingleRepeat]);

    useHotkeys(process(shortcuts.autoPause), (e) => {
        e.preventDefault();
        onChangeAutoPause();
    }, [onChangeAutoPause]);

    // 返回空fragment，不渲染任何UI
    return <></>;
};

export default VideoPlayerShortcut;
