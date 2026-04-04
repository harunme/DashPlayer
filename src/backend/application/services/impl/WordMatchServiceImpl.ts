import { Word } from '@/backend/infrastructure/db/tables/words';
import { inject, injectable } from 'inversify';
import {MatchedWord, WordMatchService} from '@/backend/application/services/WordMatchService';
import TYPES from '@/backend/ioc/types';
import WordsRepository from '@/backend/application/ports/repositories/WordsRepository';
import { CompromiseMatchCandidateExtractor, MatchCandidate, MatchCandidateExtractor } from '@/backend/application/kernel/language/MatchCandidateExtractor';

@injectable()
export default class WordMatchServiceImpl implements WordMatchService {

    private readonly matchCandidateExtractor: MatchCandidateExtractor = new CompromiseMatchCandidateExtractor();

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

        const candidates = this.matchCandidateExtractor.extract(text);
        return this.matchCandidates(candidates, vocabIndex);
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
            const [forms] = this.matchCandidateExtractor.extract(word.word);
            if (!forms || forms.forms.length === 0) {
                continue;
            }

            for (const form of forms.forms) {
                index.set(form, word);
            }
        }

        return index;
    }

    /**
     * 按候选形态优先级在索引中查找单词。
     *
     * @param forms 候选形态列表。
     * @param vocabIndex 词表索引。
     * @returns 命中的词条。
     */
    private findMatchingWordInIndex(forms: string[], vocabIndex: Map<string, Word>): Word | undefined {
        for (const form of forms) {
            const matchedWord = vocabIndex.get(form);
            if (matchedWord) {
                return matchedWord;
            }
        }

        return undefined;
    }

    /**
     * 逐个候选项执行词表匹配。
     *
     * @param candidates 匹配候选项。
     * @param vocabIndex 词表索引。
     * @returns 命中结果。
     */
    private matchCandidates(candidates: MatchCandidate[], vocabIndex: Map<string, Word>): MatchedWord[] {
        const matchedWords: MatchedWord[] = [];

        for (const candidate of candidates) {
            const matchedWord = this.findMatchingWordInIndex(candidate.forms, vocabIndex);
            if (!matchedWord) {
                continue;
            }

            matchedWords.push({
                original: candidate.original,
                normalized: candidate.forms[1] ?? candidate.forms[0] ?? '',
                stem: candidate.forms[2] ?? candidate.forms[1] ?? candidate.forms[0] ?? '',
                databaseWord: matchedWord,
            });
        }

        return matchedWords;
    }

    async getVocabularyWords(): Promise<Word[]> {
        return await this.wordsRepository.getAll();
    }
}
