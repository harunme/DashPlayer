import { dialog } from 'electron';
import { inject, injectable } from 'inversify';
import fs from 'fs/promises';
import path from 'path';
import StorageDirectoryProvider, {
    StorageDirectoryTarget,
} from '@/backend/application/ports/gateways/storage/StorageDirectoryProvider';
import { SettingsStore } from '@/backend/application/ports/gateways/SettingsStore';
import TYPES from '@/backend/ioc/types';
import {
    getStorageRootStatus,
    resolveStorageDirectory,
} from '@/backend/infrastructure/storage/StorageDirectorySupport';
import { StorageStatusVO } from '@/common/types/vo/StorageStatusVO';

/**
 * 外部存储目录提供器实现。
 */
@injectable()
export default class StorageDirectoryProviderImpl implements StorageDirectoryProvider {
    constructor(
        @inject(TYPES.SettingsStore) private readonly settingsStore: SettingsStore,
    ) {}

    /**
     * 提供指定目标目录。
     * @param target 目录目标。
     * @returns 已确保存在的目标目录路径。
     */
    public async provideDirectory(target: StorageDirectoryTarget): Promise<string> {
        const rootPath = await this.ensureStorageRootAccessible();
        const targetPath = resolveStorageDirectory(rootPath, target);
        await fs.mkdir(targetPath, { recursive: true });
        return targetPath;
    }

    /**
     * 确保外部根目录可访问。
     * @returns 当前可访问的根目录。
     */
    private async ensureStorageRootAccessible(): Promise<string> {
        const configuredPath = this.settingsStore.get('storage.path');
        let status = getStorageRootStatus(configuredPath);

        if (status.available) {
            return status.resolvedPath;
        }

        if (status.code === 'missing') {
            status = await this.tryCreateMissingRoot(status, configuredPath);
            if (status.available) {
                return status.resolvedPath;
            }
        }

        if (status.code === 'not_directory') {
            throw new Error(status.message);
        }

        const recoveredStatus = await this.reacquireStorageRootAccess(status);
        return recoveredStatus.resolvedPath;
    }

    /**
     * 当根目录尚不存在时尝试主动创建。
     * @param status 当前状态。
     * @param configuredPath 用户保存的原始路径。
     * @returns 创建后的最新状态。
     */
    private async tryCreateMissingRoot(status: StorageStatusVO, configuredPath: string): Promise<StorageStatusVO> {
        try {
            await fs.mkdir(status.resolvedPath, { recursive: true });
            return getStorageRootStatus(configuredPath);
        } catch {
            return status;
        }
    }

    /**
     * 引导用户重新选择同一目录，以恢复系统访问权限。
     * @param status 当前不可访问的目录状态。
     * @returns 恢复后的目录状态。
     */
    private async reacquireStorageRootAccess(status: StorageStatusVO): Promise<StorageStatusVO> {
        const result = await dialog.showOpenDialog({
            title: '请重新选择之前设置的存储目录',
            defaultPath: status.resolvedPath,
            properties: ['openDirectory'],
        });

        if (result.canceled || result.filePaths.length === 0) {
            throw new Error(status.message);
        }

        const selectedPath = path.resolve(result.filePaths[0]);
        const expectedPath = path.resolve(status.resolvedPath);
        if (selectedPath !== expectedPath) {
            throw new Error(`请选择之前设置的同一个存储目录：${status.resolvedPath}`);
        }

        const recoveredStatus = getStorageRootStatus(selectedPath);
        if (!recoveredStatus.available) {
            throw new Error(recoveredStatus.message);
        }
        return recoveredStatus;
    }
}
