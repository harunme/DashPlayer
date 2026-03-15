import registerRoute from '@/backend/adapters/ipc/registerRoute';
import Controller from '@/backend/adapters/controllers/Controller';
import { inject, injectable } from 'inversify';
import TYPES from '@/backend/ioc/types';
import SettingService from '@/backend/application/services/SettingService';
import { getMainLogger } from '@/backend/infrastructure/logger';
import { SettingKey } from '@/common/types/store_schema';
import SettingsKeyValueService from '@/backend/application/services/impl/SettingsKeyValueService';
import {
    ServiceCredentialSettingDetailVO,
    ServiceCredentialSettingSaveVO,
} from '@/common/types/vo/service-credentials-setting-vo';
import { EngineSelectionSettingVO } from '@/common/types/vo/engine-selection-setting-vo';

@injectable()
export default class SettingsController implements Controller {
    @inject(TYPES.SettingService) private settingService!: SettingService;
    @inject(TYPES.SettingsKeyValueService) private settingsKeyValueService!: SettingsKeyValueService;
    private logger = getMainLogger('SettingsController');

    /**
     * 获取服务凭据页面详情。
     */
    public async getServiceCredentialsDetail(): Promise<ServiceCredentialSettingDetailVO> {
        return this.settingService.getServiceCredentialsDetail();
    }

    /**
     * 保存服务凭据页面数据。
     */
    public async saveServiceCredentials(settings: ServiceCredentialSettingSaveVO): Promise<void> {
        this.logger.info('update service credentials', {
            settings: {
                ...settings,
                openai: { ...settings.openai, key: '***' },
            },
        });
        await this.settingService.saveServiceCredentials(settings);
    }

    /**
     * 获取功能设置页面详情。
     */
    public async getEngineSelectionDetail(): Promise<EngineSelectionSettingVO> {
        return this.settingService.getEngineSelectionDetail();
    }

    /**
     * 保存功能设置页面数据。
     */
    public async saveEngineSelection(settings: EngineSelectionSettingVO): Promise<void> {
        this.logger.info('update engine selection', { settings });
        await this.settingService.saveEngineSelection(settings);
    }

    public async testOpenAi(): Promise<{ success: boolean, message: string }> {
        this.logger.info('testing openai connection');
        return this.settingService.testOpenAi();
    }

    public async testTencent(): Promise<{ success: boolean, message: string }> {
        this.logger.info('testing tencent connection');
        return this.settingService.testTencent();
    }

    public async testYoudao(): Promise<{ success: boolean, message: string }> {
        this.logger.info('testing youdao connection');
        return this.settingService.testYoudao();
    }

    public async updateAppearanceSettings(params: { theme: string; fontSize: string }): Promise<void> {
        await this.settingsKeyValueService.set('appearance.theme', params.theme);
        await this.settingsKeyValueService.set('appearance.fontSize', params.fontSize);
    }

    public async updateShortcutSettings(params: Partial<Record<SettingKey, string>>): Promise<void> {
        const entries = Object.entries(params) as [SettingKey, string | undefined][];
        for (const [key, value] of entries) {
            if (value !== undefined) {
                await this.settingsKeyValueService.set(key, value);
            }
        }
    }

    /**
     * 更新存储设置。
     *
     * 约束说明：
     * - 收藏集合固定使用 `default`，不再允许外部自定义集合名。
     * - `params.collection` 会被忽略，仅保留以兼容现有 IPC 参数结构。
     */
    public async updateStorageSettings(params: { path: string; collection: string }): Promise<void> {
        await this.settingsKeyValueService.set('storage.path', params.path);
        await this.settingsKeyValueService.set('storage.collection', 'default');
    }

    public async updateTranslationSettings(params: {
        engine: 'tencent' | 'openai';
        tencentSecretId?: string;
        tencentSecretKey?: string;
    }): Promise<void> {
        await this.settingsKeyValueService.set('subtitleTranslation.engine', params.engine);
        if (params.tencentSecretId !== undefined) {
            await this.settingsKeyValueService.set('apiKeys.tencent.secretId', params.tencentSecretId);
        }
        if (params.tencentSecretKey !== undefined) {
            await this.settingsKeyValueService.set('apiKeys.tencent.secretKey', params.tencentSecretKey);
        }
    }

    public async updateYoudaoSettings(params: { secretId: string; secretKey: string }): Promise<void> {
        await this.settingsKeyValueService.set('apiKeys.youdao.secretId', params.secretId);
        await this.settingsKeyValueService.set('apiKeys.youdao.secretKey', params.secretKey);
    }

    registerRoutes(): void {
        registerRoute('settings/service-credentials/detail', () => this.getServiceCredentialsDetail());
        registerRoute('settings/service-credentials/save', (p) => this.saveServiceCredentials(p));
        registerRoute('settings/service-credentials/test-openai', () => this.testOpenAi());
        registerRoute('settings/service-credentials/test-tencent', () => this.testTencent());
        registerRoute('settings/service-credentials/test-youdao', () => this.testYoudao());
        registerRoute('settings/engine-selection/detail', () => this.getEngineSelectionDetail());
        registerRoute('settings/engine-selection/save', (p) => this.saveEngineSelection(p));
        registerRoute('settings/appearance/update', (p) => this.updateAppearanceSettings(p));
        registerRoute('settings/shortcuts/update', (p) => this.updateShortcutSettings(p));
        registerRoute('settings/storage/update', (p) => this.updateStorageSettings(p));
        registerRoute('settings/translation/update', (p) => this.updateTranslationSettings(p));
        registerRoute('settings/youdao/update', (p) => this.updateYoudaoSettings(p));
    }
}
