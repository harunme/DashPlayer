import { Word } from '@/backend/infrastructure/db/tables/words';
import nlp from 'compromise';
import { inject, injectable } from 'inversify';
import {MatchedWord, WordMatchService} from '@/backend/application/services/WordMatchService';
import TYPES from '@/backend/ioc/types';
import WordsRepository from '@/backend/application/ports/repositories/WordsRepository';
import { deriveWordForms } from '@/backend/utils/wordForms';

@injectable()
export default class WordMatchServiceImpl implements WordMatchService {

    @inject(TYPES.WordsRepository)
    private wordsRepository!: WordsRepository;

    async matchWordsInText(text: string): Promise<MatchedWord[]> {
        const results = await this.matchWordsInTexts([text]);
        return results[0] || [];
    }

    async matchWordsInTexts(texts: string[]): Promise<MatchedWord[][]> {
        if (!Array.isArray(texts) || texts.length === 0) {
            return [];
        }

        const vocabularyWords = await this.getVocabularyWords();
        if (!vocabularyWords || vocabularyWords.length === 0) {
            return texts.map(() => []);
        }

        const vocabIndex = this.buildVocabIndex(vocabularyWords);

        return texts.map(text => this.matchSingleText(text, vocabIndex));
    }

    /**
     * 匹配单段文本中的词表单词。
     *
     * 行为说明：
     * - 优先使用 compromise 分词。
     * - 若分词不可用，则退回到正则提取英文单词。
     *
     * @param text 待匹配文本。
     * @param vocabIndex 词表索引。
     * @returns 命中的单词列表。
     */
    private matchSingleText(text: string, vocabIndex: Map<string, Word>): MatchedWord[] {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return [];
        }

        try {
            const doc = nlp(text);
            if (!doc || !doc.terms) {
                return this.fallbackWordMatch(text, vocabIndex);
            }

            const terms = doc.terms();
            const termList = terms.out('array');
            if (!termList || termList.length === 0) {
                return this.fallbackWordMatch(text, vocabIndex);
            }

            return this.matchTerms(termList, vocabIndex);
        } catch (error) {
            return this.fallbackWordMatch(text, vocabIndex);
        }
    }

    /**
     * 构建运行时词表索引。
     *
     * 行为说明：
     * - 仅基于 `word` 本身的运行时推导结果构建索引。
     * - 不再依赖数据库中的 `stem` 字段，兼容逻辑统一放在运行时。
     *
     * @param vocabularyWords 词表单词。
     * @returns 运行时匹配索引。
     */
    private buildVocabIndex(vocabularyWords: Word[]): Map<string, Word> {
        const index = new Map<string, Word>();

        for (const word of vocabularyWords) {
            const forms = deriveWordForms(word.word);
            const aliases = new Set([
                forms.lower,
                forms.normalized,
                forms.stem,
            ].filter(Boolean));

            for (const alias of aliases) {
                index.set(alias, word);
            }
        }

        return index;
    }

    /**
     * 按归一化优先级在索引中查找单词。
     *
     * @param original 原始小写词形。
     * @param normalized 词形还原结果。
     * @param stem 简化词干结果。
     * @param vocabIndex 词表索引。
     * @returns 命中的词条。
     */
    private findMatchingWordInIndex(original: string, normalized: string, stem: string, vocabIndex: Map<string, Word>): Word | undefined {
        return vocabIndex.get(original) || vocabIndex.get(normalized) || vocabIndex.get(stem);
    }

    /**
     * 逐个 term 执行词表匹配。
     *
     * @param terms 候选词数组。
     * @param vocabIndex 词表索引。
     * @returns 命中结果。
     */
    private matchTerms(terms: string[], vocabIndex: Map<string, Word>): MatchedWord[] {
        const matchedWords: MatchedWord[] = [];
        const processedTerms = new Set<string>();

        for (const term of terms) {
            if (!term || typeof term !== 'string') {
                continue;
            }

            const forms = deriveWordForms(term);
            if (!forms.lower || forms.lower.length < 2 || processedTerms.has(forms.lower)) {
                continue;
            }

            processedTerms.add(forms.lower);
            const matchedWord = this.findMatchingWordInIndex(forms.lower, forms.normalized, forms.stem, vocabIndex);
            if (!matchedWord) {
                continue;
            }

            matchedWords.push({
                original: term,
                normalized: forms.normalized,
                stem: forms.stem,
                databaseWord: matchedWord,
            });
        }

        return matchedWords;
    }

    /**
     * 在分词失败时，使用正则提取英文单词后继续走统一匹配流程。
     *
     * @param text 待匹配文本。
     * @param vocabIndex 词表索引。
     * @returns 命中结果。
     */
    private fallbackWordMatch(text: string, vocabIndex: Map<string, Word>): MatchedWord[] {
        const terms = text.match(/[a-zA-Z]+/g) ?? [];
        return this.matchTerms(terms, vocabIndex);
    }

    async getVocabularyWords(): Promise<Word[]> {
        return await this.wordsRepository.getAll();
    }
}
