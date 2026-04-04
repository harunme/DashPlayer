import { InsertWord, Word } from '@/backend/infrastructure/db/tables/words';

/**
 * 单词列表查询参数。
 */
export interface GetAllWordsQuery {
    search?: string;
}

/**
 * 单词更新补丁。
 */
export type WordsUpdatePatch = Partial<Pick<InsertWord, 'stem' | 'translate' | 'note' | 'updated_at'>>;

/**
 * 单词仓储接口。
 */
export default interface WordsRepository {
    getAll(query?: GetAllWordsQuery): Promise<Word[]>;
    findIdByWord(word: string): Promise<number | null>;
    insert(values: InsertWord): Promise<void>;
    updateByWord(word: string, patch: WordsUpdatePatch): Promise<void>;
    upsert(values: InsertWord): Promise<Word>;
    replaceAll(values: InsertWord[]): Promise<void>;
}
