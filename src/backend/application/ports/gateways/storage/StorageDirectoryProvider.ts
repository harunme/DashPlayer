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

    /**
     * 确保指定文件路径具备访问权限。
     *
     * 行为说明：
     * - 仅用于存储目录体系之外的外部文件访问场景，例如播放历史中的外部视频；
     * - 存储目录体系内部的文件在 `provideDirectory(...)` 获取过权限了，不需要调用此方法重复做权限校验；
     * - 会校验文件本身或其所在文件夹当前是否具备访问权限；
     * - 会在需要时引导用户恢复访问权限；
     * - 返回前确保文件所在文件夹已存在。
     *
     * @param filePath 文件绝对路径。
     */
    ensureFileAccessPermission(filePath: string): Promise<void>;
}
