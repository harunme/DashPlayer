import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import hash from 'object-hash';
import { Sentence } from '@/common/types/SentenceC';
import { getRendererLogger } from '@/fronted/log/simple-logger';
import { RendererTranslationItem, TranslationMode } from '@/common/types/TranslationResult';
import { backendClient } from '@/fronted/application/bootstrap/backendClient';

// 每句话的翻译状态
export type TranslationStatus = 'untranslated' | 'translating' | 'completed';

// 翻译状态
export interface TranslationState {
    // 翻译引擎
    engine: 'tencent' | 'openai' | 'none';
    openAiMode: TranslationMode;
    activeFileHash: string | null;

    // 翻译缓存 - key为translationKey，value为翻译结果
    translations: Map<string, string>;

    // 翻译状态 - key为translationKey，value为状态
    translationStatus: Map<string, TranslationStatus>;
}

// 注：现在直接使用 Sentence.transGroup 字段，不需要重新计算分组

// 翻译动作
export interface TranslationActions {

    // 懒加载翻译 - 发送索引数组
    loadTranslationGroup: (sentences: Sentence[], currentIndex: number) => void;

    // 强制重新翻译
    retranslate: (fileHash: string, indices: number[], useCache?: boolean) => void;

    // 更新翻译结果 (由前端Controller调用) - 单个
    updateTranslation: (item: RendererTranslationItem) => void;

    // 批量更新翻译结果 (由前端Controller调用) - 数组
    updateTranslations: (translations: RendererTranslationItem[]) => void;

    // 清除翻译缓存
    clearTranslations: () => void;

    // 设置翻译引擎
    setEngine: (engine: 'tencent' | 'openai' | 'none') => void;

    // 更新 OpenAI 字幕模式
    setOpenAiMode: (mode: TranslationMode) => void;

    // 设置当前激活的字幕文件哈希
    setActiveFileHash: (fileHash: string | null) => void;
}

// 创建翻译Store
const useTranslation = create(
    subscribeWithSelector<TranslationState & TranslationActions>((set, get) => ({
        // 初始状态
        engine: 'none',
        openAiMode: 'zh',
        activeFileHash: null,
        translations: new Map(),
        translationStatus: new Map(),

        // 懒加载翻译 - 需要传入sentences数据来获取translationKey
        loadTranslationGroup: (sentences: Sentence[], currentIndex: number) => {

            if (!sentences || sentences.length === 0) {
                return;
            }

            const state = get();
            const fileHash = sentences[0]?.fileHash;

            if (!fileHash) {
                return;
            }

            // 计算要翻译的范围 (当前index ± 10)
            const startIndex = Math.max(0, currentIndex - 10);
            const endIndex = Math.min(sentences.length - 1, currentIndex + 10);
            const untranslatedIndices: number[] = [];
            const requestedKeys: string[] = [];

            for (let i = startIndex; i <= endIndex; i++) {
                const sentence = sentences[i];
                if (!sentence || !sentence.translationKey) continue;

                const translationKey = sentence.translationKey;
                const status = state.translationStatus.get(translationKey) || 'untranslated';
                const hasTranslation = state.translations.has(translationKey);

                // 只加入未翻译或翻译失败的
                if (status === 'untranslated' || (!hasTranslation && status !== 'translating')) {
                    untranslatedIndices.push(i);
                    requestedKeys.push(translationKey);
                }
            }

            if (untranslatedIndices.length === 0) {
                return;
            }

            set(currentState => {
                const newStatus = new Map(currentState.translationStatus);
                requestedKeys.forEach((key) => {
                    newStatus.set(key, 'translating');
                });
                return {
                    ...currentState,
                    translationStatus: newStatus
                };
            });

            // 只发送未翻译的索引
            backendClient.call('ai-trans/request-group-translation', {
                fileHash,
                indices: untranslatedIndices,
                useCache: true
            }).catch(error => {
                set(currentState => {
                    const newStatus = new Map(currentState.translationStatus);
                    requestedKeys.forEach((key) => {
                        if (newStatus.get(key) === 'translating') {
                            newStatus.set(key, 'untranslated');
                        }
                    });
                    return {
                        ...currentState,
                        translationStatus: newStatus
                    };
                });
                getRendererLogger('useTranslation').error('group translation request failed', { error });
                const message = error instanceof Error ? error.message : String(error);
                const dedupeKey = `subtitle-translation-request:${state.engine}:${hash(message)}`;
                const event = new CustomEvent('show-toast', {
                    detail: {
                        title: '字幕翻译失败',
                        message,
                        variant: 'error',
                        position: 'top-left',
                        bubble: true,
                        dedupeKey,
                    }
                });
                window.dispatchEvent(event);
            });
        },

        // 强制重新翻译
        retranslate: (fileHash: string, indices: number[], useCache = false) => {
            set(state => {
                const newStatus = new Map(state.translationStatus);
                indices.forEach((index) => {
                    const key = `${fileHash}:${index}`;
                    newStatus.set(key, 'translating');
                });
                return {
                    ...state,
                    translationStatus: newStatus
                };
            });
            // 发送索引数组，不使用缓存
            backendClient.call('ai-trans/request-group-translation', {
                fileHash,
                indices,
                useCache
            }).catch(error => {
                set(state => {
                    const newStatus = new Map(state.translationStatus);
                    indices.forEach((index) => {
                        const key = `${fileHash}:${index}`;
                        if (newStatus.get(key) === 'translating') {
                            newStatus.set(key, 'untranslated');
                        }
                    });
                    return {
                        ...state,
                        translationStatus: newStatus
                    };
                });
                getRendererLogger('useTranslation').error('retranslate request failed', { error });
                const message = error instanceof Error ? error.message : String(error);
                const dedupeKey = `subtitle-translation-request:${get().engine}:${hash(message)}`;
                const event = new CustomEvent('show-toast', {
                    detail: {
                        title: '字幕翻译失败',
                        message,
                        variant: 'error',
                        position: 'top-left',
                        bubble: true,
                        dedupeKey,
                    }
                });
                window.dispatchEvent(event);
            });
        },

        // 更新单个翻译结果 (由前端Controller调用)
        updateTranslation: (item: RendererTranslationItem) => {

            set(state => {
                if (!shouldAcceptTranslation(state, item)) {
                    return state;
                }
                const { key, translation, isComplete = true } = item;
                const newTranslations = new Map(state.translations);
                const newStatus = new Map(state.translationStatus);

                newTranslations.set(key, translation);
                newStatus.set(key, isComplete ? 'completed' : 'translating');

                return {
                    ...state,
                    translations: newTranslations,
                    translationStatus: newStatus
                };
            });
        },

        // 批量更新翻译结果 (由前端Controller调用)
        updateTranslations: (items: RendererTranslationItem[]) => {

            set(state => {
                const filtered = items.filter(item => shouldAcceptTranslation(state, item));
                if (filtered.length === 0) {
                    return state;
                }

                const newTranslations = new Map(state.translations);
                const newStatus = new Map(state.translationStatus);

                filtered.forEach(({ key, translation, isComplete = true }) => {
                    newTranslations.set(key, translation);
                    newStatus.set(key, isComplete ? 'completed' : 'translating');
                });

                return {
                    ...state,
                    translations: newTranslations,
                    translationStatus: newStatus
                };
            });
        },

        // 清除翻译缓存
        clearTranslations: () => {
            set({
                activeFileHash: null,
                translations: new Map(),
                translationStatus: new Map()
            });
        },

        // 设置翻译引擎
        setEngine: (engine: 'tencent' | 'openai' | 'none') => {
            set(state => {
                if (state.engine === engine) {
                    return state;
                }
                return {
                    engine,
                    openAiMode: state.openAiMode,
                    activeFileHash: state.activeFileHash,
                    translations: new Map(),
                    translationStatus: new Map()
                };
            });
        },

        setOpenAiMode: (mode: TranslationMode) => {
            set(state => {
                if (state.openAiMode === mode) {
                    return state;
                }

                const shouldReset = state.engine === 'openai';
                return {
                    engine: state.engine,
                    openAiMode: mode,
                    activeFileHash: state.activeFileHash,
                    translations: shouldReset ? new Map() : state.translations,
                    translationStatus: shouldReset ? new Map() : state.translationStatus
                };
            });
        },

        setActiveFileHash: (fileHash: string | null) => {
            set(state => {
                if (state.activeFileHash === fileHash) {
                    return state;
                }
                return {
                    ...state,
                    activeFileHash: fileHash,
                    translations: new Map(),
                    translationStatus: new Map()
                };
            });
        },
    }))
);

const shouldAcceptTranslation = (
    state: TranslationState,
    item: RendererTranslationItem
): boolean => {
    if (item.provider !== state.engine) {
        return false;
    }

    if (state.activeFileHash !== item.fileHash) {
        return false;
    }

    if (item.provider === 'openai') {
        const mode = item.mode ?? 'zh';
        return mode === state.openAiMode;
    }

    return true;
};

export default useTranslation;
