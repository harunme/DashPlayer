/**
 * 外部存储目录目标。
 *
 * 说明：
 * - 仅表示用户可配置的外部存储目录；
 * - 不包含数据库、日志等应用内部状态目录。
 */
export enum StorageDirectoryTarget {
    LIBRARY_ROOT = 'library_root',
    FAVORITE_CLIPS = 'favorite_clips',
    FAVORITE_CLIPS_COLLECTION = 'favorite_clips_collection',
    WORD_VIDEO = 'word_video',
    VIDEOS = 'videos',
    TEMP = 'temp',
    TEMP_OSS = 'temp_oss',
    MODELS = 'models',
}

/**
 * 外部存储目录提供器。
 */
export default interface StorageDirectoryProvider {
    /**
     * 提供指定目标对应的可写目录。
     *
     * 行为说明：
     * - 会基于当前配置解析目标目录；
     * - 会在需要时尝试恢复外部根目录访问权限；
     * - 返回前确保目标目录已存在。
     *
     * @param target 目录目标。
     * @returns 可直接读写的绝对目录路径。
     */
    provideDirectory(target: StorageDirectoryTarget): Promise<string>;
}
