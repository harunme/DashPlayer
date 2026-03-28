import { StorageStatusVO } from '@/common/types/vo/StorageStatusVO';

/**
 * 媒体库路径校验能力。
 */
export interface StoragePathValidator {
    /**
     * 返回当前媒体库目录的健康状态。
     *
     * @param configuredPath 可选原始路径；不传时使用当前设置值。
     * @returns 当前媒体库目录的健康状态。
     */
    getLibraryStatus(configuredPath?: string): StorageStatusVO;

    /**
     * 断言当前媒体库目录可访问，不满足时直接抛错。
     *
     * @param configuredPath 可选原始路径；不传时使用当前设置值。
     * @returns 校验通过后的媒体库状态。
     */
    assertLibraryAccessible(configuredPath?: string): StorageStatusVO;
}
