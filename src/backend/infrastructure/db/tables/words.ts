import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const words = sqliteTable('dp_words', {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    word: text('word').notNull().unique(),
    /**
     * @deprecated 历史遗留字段。当前匹配逻辑统一改为运行时推导，不再依赖该字段。
     */
    stem: text('stem'),
    translate: text('translate'),
    /**
     * @deprecated 历史遗留字段。当前业务流程未再消费该字段，保留仅为兼容既有表结构。
     */
    note: text('note'),
    created_at: text('created_at')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    updated_at: text('updated_at')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
});

export type Word = typeof words.$inferSelect; // return type when queried
export type InsertWord = typeof words.$inferInsert; // insert type
