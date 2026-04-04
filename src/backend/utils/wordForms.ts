import nlp from 'compromise';

/**
 * 单词归一化结果。
 */
export interface WordForms {
    /**
     * 小写后的原始单词。
     */
    lower: string;
    /**
     * 词形还原后的基础形态。
     */
    normalized: string;
    /**
     * 兜底词干形态。
     */
    stem: string;
}

/**
 * 提取单词的多种归一化形态。
 *
 * 行为说明：
 * - 优先尝试基于词性的词形还原结果。
 * - 当词形还原不可用时，退回到简化词干算法。
 *
 * @param term 原始单词。
 * @returns 归一化后的多种形态；若输入为空则返回空字符串形态。
 */
export const deriveWordForms = (term: string): WordForms => {
    const lower = term.toLowerCase().trim();
    if (!lower) {
        return {
            lower: '',
            normalized: '',
            stem: '',
        };
    }

    const normalized = getLemma(lower);
    const stem = getStem(lower);

    return {
        lower,
        normalized,
        stem,
    };
};

/**
 * 基于词性做词形还原。
 *
 * @param term 小写后的单词。
 * @returns 还原后的基础形态。
 */
const getLemma = (term: string): string => {
    try {
        const doc = nlp(term);

        if (doc.has('#Verb')) {
            const infinitive = doc.verbs().toInfinitive().out('text');
            if (infinitive && infinitive.length > 0) {
                return infinitive.toLowerCase();
            }
        }

        if (doc.has('#Noun')) {
            const singular = doc.nouns().toSingular().out('text');
            if (singular && singular.length > 0) {
                return singular.toLowerCase();
            }
        }

        if (doc.has('#Adjective')) {
            const adjectives = (doc as any).adjectives?.();
            const positive = adjectives?.toPositive?.().out?.('text');
            if (typeof positive === 'string' && positive.length > 0) {
                return positive.toLowerCase();
            }
        }

        const normal = doc.terms().out('normal');
        return (Array.isArray(normal) ? normal[0] : normal)?.toLowerCase() || term;
    } catch (error) {
        return term;
    }
};

/**
 * 使用简单规则生成兜底词干。
 *
 * @param term 小写后的单词。
 * @returns 粗粒度词干。
 */
const getStem = (term: string): string => {
    try {
        let stem = term;
        const suffixes = ['ing', 'ied', 'ed', 'ies', 'es', 's', 'er', 'est', 'ly'];

        for (const suffix of suffixes) {
            if (!stem.endsWith(suffix) || stem.length <= suffix.length + 2) {
                continue;
            }

            if (suffix === 'ied') {
                return `${stem.slice(0, -3)}y`;
            }

            if (suffix === 'ies') {
                return `${stem.slice(0, -3)}y`;
            }

            stem = stem.slice(0, -suffix.length);

            if ((suffix === 'ing' || suffix === 'ed') && hasDoubleTail(stem)) {
                stem = stem.slice(0, -1);
            }

            return stem;
        }

        return stem;
    } catch (error) {
        return term;
    }
};

/**
 * 判断词尾是否出现双写字符。
 *
 * @param value 待检查文本。
 * @returns 若末尾两个字符相同则返回 true。
 */
const hasDoubleTail = (value: string): boolean => {
    if (value.length < 2) {
        return false;
    }

    const lastChar = value.at(-1);
    const prevChar = value.at(-2);
    return !!lastChar && !!prevChar && lastChar === prevChar;
};
