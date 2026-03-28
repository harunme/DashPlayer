import { SettingKey } from '@/common/types/store_schema';
import registerRoute from '@/backend/adapters/ipc/registerRoute';
import Controller from '@/backend/adapters/controllers/Controller';
import { inject, injectable } from 'inversify';
import TYPES from '@/backend/ioc/types';
import LocationService from '@/backend/application/services/LocationService';
import FileUtil from '@/backend/utils/FileUtil';
import { getMainLogger } from '@/backend/infrastructure/logger';
import SettingsKeyValueService from '@/backend/application/services/impl/SettingsKeyValueService';
import { StorageStatusVO } from '@/common/types/vo/StorageStatusVO';

@injectable()
export default class StorageController implements Controller {
    @inject(TYPES.SettingsKeyValueService) private settingsKeyValueService!: SettingsKeyValueService;
    @inject(TYPES.LocationService) private locationService!: LocationService;
    private logger = getMainLogger('StorageController');

    /**
     * 写入指定设置项。
     * @param param0 设置项键值对。
     */
    public async storeSet({ key, value }: { key: SettingKey, value: string }): Promise<void> {
        this.logger.debug('store setting', { key, value });
        await this.settingsKeyValueService.set(key, value);
    }

    /**
     * 读取指定设置项。
     * @param key 设置项键。
     * @returns 当前设置值。
     */
    public async storeGet(key: SettingKey): Promise<string> {
        return this.settingsKeyValueService.get(key);
    }

    /**
     * 查询媒体库目录占用空间。
     *
     * 行为说明：
     * - 仅在媒体库可访问时才执行目录遍历；
     * - 目录失效时直接抛出显式错误，避免误报为 0 KB。
     */
    public async queryCacheSize(): Promise<string> {
        this.locationService.assertLibraryAccessible();
        return await FileUtil.calculateReadableFolderSize(this.locationService.getBaseLibraryPath());
    }

    /**
     * 返回当前媒体库目录健康状态。
     * @returns 可供设置页直接展示的状态信息。
     */
    public async queryStorageStatus(): Promise<StorageStatusVO> {
        return this.locationService.getLibraryStatus();
    }

    /**
     * 列出可切换的收藏集合。
     * @returns 当前支持的集合列表。
     */
    public async listCollectionPaths(): Promise<string[]> {
        return this.locationService.listCollectionPaths();
    }


    registerRoutes(): void {
        registerRoute('storage/put', (p) => this.storeSet(p));
        registerRoute('storage/get', (p) => this.storeGet(p));
        registerRoute('storage/cache/size', () => this.queryCacheSize());
        registerRoute('storage/status', () => this.queryStorageStatus());
        registerRoute('storage/collection/paths', () => this.listCollectionPaths());
    }
}
