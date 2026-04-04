import nlp from 'compromise';

/**
 * 用于词表匹配的候选项。
 */
export interface MatchCandidate {
    /**
     * 原始文本中的词形。
     */
    original: string;
    /**
     * 按匹配优先级排序的候选形态列表。
     *
     * 行为说明：
     * - 第一个元素优先级最高。
     * - 后续元素用于兜底匹配。
     */
    forms: string[];
}

/**
 * 从文本中提取可直接参与词表匹配的候选项。
 */
export interface MatchCandidateExtractor {
    extract(text: string): MatchCandidate[];
}

/**
 * 基于 compromise 的匹配候选提取器。
 */
export class CompromiseMatchCandidateExtractor implements MatchCandidateExtractor {

    /**
     * 从文本中提取匹配候选。
     *
     * 行为说明：
     * - 优先使用 compromise 分词。
     * - 若分词失败，则退回到正则提取英文单词。
     * - 返回结果已包含匹配所需的归一化信息。
     *
     * @param text 待分析文本。
     * @returns 匹配候选列表。
     */
    extract(text: string): MatchCandidate[] {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return [];
        }

        const terms = this.extractTerms(text);
        const results: MatchCandidate[] = [];
        const processedTerms = new Set<string>();

        for (const term of terms) {
            if (!term || typeof term !== 'string') {
                continue;
            }

            const candidate = analyzeWord(term);
            const primaryForm = candidate.forms[0] ?? '';
            if (!primaryForm || primaryForm.length < 2 || processedTerms.has(primaryForm)) {
                continue;
            }

            processedTerms.add(primaryForm);
            results.push(candidate);
        }

        return results;
    }

    /**
     * 提取文本中的英文词项。
     *
     * @param text 待分析文本。
     * @returns 原始词项列表。
     */
    private extractTerms(text: string): string[] {
        try {
            const doc = nlp(text);
            if (!doc || !doc.terms) {
                return this.extractTermsByRegex(text);
            }

            const terms = doc.terms().out('array');
            return Array.isArray(terms) && terms.length > 0
                ? terms.filter((item): item is string => typeof item === 'string')
                : this.extractTermsByRegex(text);
        } catch (error) {
            return this.extractTermsByRegex(text);
        }
    }

    /**
     * 使用正则从文本中提取英文词项。
     *
     * @param text 待分析文本。
     * @returns 英文词项列表。
     */
    private extractTermsByRegex(text: string): string[] {
        return text.match(/[a-zA-Z]+/g) ?? [];
    }
}

/**
 * 分析单个英文词的归一化形态。
 *
 * @param term 原始单词。
 * @returns 匹配候选项。
 */
function analyzeWord(term: string): MatchCandidate {
    const lower = term.toLowerCase().trim();
    if (!lower) {
        return {
            original: term,
            forms: [],
        };
    }

    const forms = Array.from(new Set([
        lower,
        getLemma(lower),
        getStem(lower),
    ].filter((form) => typeof form === 'string' && form.length > 0)));

    return {
        original: term,
        forms,
    };
}

/**
 * 基于词性做词形还原。
 *
 * @param term 小写后的单词。
 * @returns 还原后的基础形态。
 */
function getLemma(term: string): string {
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
}

/**
 * 使用轻量规则推导词干。
 *
 * @param term 小写后的单词。
 * @returns 词干形态。
 */
function getStem(term: string): string {
    try {
        let stem = term;
        const suffixes = ['ing', 'ied', 'ed', 'ies', 'es', 's', 'er', 'est', 'ly'];

        for (const suffix of suffixes) {
            if (!stem.endsWith(suffix) || stem.length <= suffix.length + 2) {
                continue;
            }

            if (suffix === 'ied' || suffix === 'ies') {
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
}

/**
 * 判断词尾是否双写。
 *
 * @param value 待检查文本。
 * @returns 是否双写。
 */
function hasDoubleTail(value: string): boolean {
    if (value.length < 2) {
        return false;
    }

    const lastChar = value.at(-1);
    const prevChar = value.at(-2);
    return !!lastChar && !!prevChar && lastChar === prevChar;
}
