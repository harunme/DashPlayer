import { dialog } from 'electron';
import { inject, injectable } from 'inversify';
import fsSync from 'fs';
import fs from 'fs/promises';
import path from 'path';
import StorageDirectoryProvider, {
    StorageDirectoryTarget,
} from '@/backend/application/ports/gateways/storage/StorageDirectoryProvider';
import { SettingsStore } from '@/backend/application/ports/gateways/SettingsStore';
import TYPES from '@/backend/ioc/types';
import {
    canRecoverAccessFromSelection,
    getDirectoryAccessStatus,
    getFileAccessStatus,
    getStorageRootStatus,
    resolveStorageDirectory,
    StorageAccessStatus,
    StorageAccessTargetType,
} from '@/backend/infrastructure/storage/StorageDirectorySupport';
import { StorageStatusVO } from '@/common/types/vo/StorageStatusVO';

/**
 * 外部存储目录提供器实现。
 */
@injectable()
export default class StorageDirectoryProviderImpl implements StorageDirectoryProvider {
    private static readonly RECOVER_DIRECTORY_DIALOG_TITLE = '请重新选择可访问的文件夹';

    private static readonly RECOVER_DIRECTORY_DIALOG_MESSAGE = '当前文件夹暂时无法访问，请重新选择这个文件夹，或选择包含它的上层文件夹，以恢复访问权限';

    private static readonly RECOVER_FILE_DIALOG_TITLE = '请重新选择可访问的文件或文件夹';

    private static readonly RECOVER_FILE_DIALOG_MESSAGE = '当前文件暂时无法访问，请重新选择这个文件，或选择包含它的上层文件夹，以恢复访问权限';

    private activeRecoveryDialog: Promise<void> | null = null;

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
        await this.ensureDirectoryAccessible(targetPath);
        return targetPath;
    }

    /**
     * 确保指定文件路径具备访问权限。
     *
     * 使用约束：
     * - 仅用于存储目录体系之外的外部文件访问场景；
     * - 若文件位于 `provideDirectory(...)` 返回的目录体系内，应直接依赖目录方法，不要重复调用这里。
     *
     * @param filePath 文件绝对路径。
     */
    public async ensureFileAccessPermission(filePath: string): Promise<void> {
        const resolvedFilePath = path.resolve(filePath);
        await this.ensureFileAccessible(resolvedFilePath);
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

        await this.ensureAccessibleWithRecovery({
            targetPath: status.resolvedPath,
            targetType: 'directory',
        });
        return status.resolvedPath;
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
     * 确保目录可访问。
     * @param directoryPath 目录路径。
     */
    private async ensureDirectoryAccessible(directoryPath: string): Promise<void> {
        const resolvedDirectoryPath = path.resolve(directoryPath);

        try {
            await fs.mkdir(resolvedDirectoryPath, { recursive: true });
        } catch {
            await this.ensureAccessibleWithRecovery({
                targetPath: resolvedDirectoryPath,
                targetType: 'directory',
            });
            await fs.mkdir(resolvedDirectoryPath, { recursive: true });
        }
    }

    /**
     * 确保文件可访问。
     * @param filePath 文件路径。
     */
    private async ensureFileAccessible(filePath: string): Promise<void> {
        const resolvedFilePath = path.resolve(filePath);
        const parentDirectory = path.dirname(resolvedFilePath);

        try {
            await fs.mkdir(parentDirectory, { recursive: true });
        } catch {
            await this.ensureAccessibleWithRecovery({
                targetPath: resolvedFilePath,
                targetType: 'file',
            });
            await fs.mkdir(parentDirectory, { recursive: true });
            return;
        }

        const status = getFileAccessStatus(resolvedFilePath);
        if (status.available) {
            return;
        }

        if (status.code === 'not_file') {
            throw new Error(status.message);
        }

        await this.ensureAccessibleWithRecovery({
            targetPath: resolvedFilePath,
            targetType: 'file',
        });
    }

    /**
     * 在需要时引导用户恢复目标访问权限。
     *
     * 行为说明：
     * - 若当前已有恢复弹窗，则等待其结束后重新检查；
     * - 只有目标仍不可访问时，当前请求才会发起新的弹窗；
     * - 同一时刻仅保留一个恢复弹窗。
     *
     * @param request 访问恢复请求。
     */
    private async ensureAccessibleWithRecovery(request: {
        targetPath: string;
        targetType: StorageAccessTargetType;
    }): Promise<void> {
        let needsRecheck = true;
        while (needsRecheck) {
            const status = this.getAccessStatus(request.targetPath, request.targetType);
            if (status.available) {
                needsRecheck = false;
                continue;
            }

            if (status.code === 'not_directory' || status.code === 'not_file') {
                throw new Error(status.message);
            }

            if (this.activeRecoveryDialog) {
                await this.waitForRecoveryDialog();
                continue;
            }

            await this.openRecoveryDialog(request, status);
        }
    }

    /**
     * 等待当前恢复弹窗结束。
     */
    private async waitForRecoveryDialog(): Promise<void> {
        try {
            await this.activeRecoveryDialog;
        } catch {
            // 当前请求只负责等待既有弹窗结束，随后重新检查访问状态。
        }
    }

    /**
     * 打开恢复访问弹窗，并在关闭后完成状态收尾。
     * @param request 当前恢复请求。
     * @param status 当前访问状态。
     */
    private async openRecoveryDialog(
        request: { targetPath: string; targetType: StorageAccessTargetType },
        status: StorageAccessStatus,
    ): Promise<void> {
        const dialogTask = this.performRecoveryDialog(request, status);
        const dialogTaskWithCleanup = dialogTask.finally(() => {
            if (this.activeRecoveryDialog === dialogTaskWithCleanup) {
                this.activeRecoveryDialog = null;
            }
        });
        this.activeRecoveryDialog = dialogTaskWithCleanup;
        await dialogTask;
    }

    /**
     * 执行一次恢复访问弹窗。
     * @param request 当前恢复请求。
     * @param status 当前访问状态。
     */
    private async performRecoveryDialog(
        request: { targetPath: string; targetType: StorageAccessTargetType },
        status: StorageAccessStatus,
    ): Promise<void> {
        const result = await dialog.showOpenDialog({
            title: request.targetType === 'file'
                ? StorageDirectoryProviderImpl.RECOVER_FILE_DIALOG_TITLE
                : StorageDirectoryProviderImpl.RECOVER_DIRECTORY_DIALOG_TITLE,
            message: request.targetType === 'file'
                ? StorageDirectoryProviderImpl.RECOVER_FILE_DIALOG_MESSAGE
                : StorageDirectoryProviderImpl.RECOVER_DIRECTORY_DIALOG_MESSAGE,
            defaultPath: status.targetType === 'file' && !status.exists
                ? path.dirname(status.targetPath)
                : status.targetPath,
            properties: request.targetType === 'file'
                ? ['openFile', 'openDirectory']
                : ['openDirectory'],
        });

        if (result.canceled || result.filePaths.length === 0) {
            throw new Error(status.message);
        }

        const selectedPath = path.resolve(result.filePaths[0]);
        const selectedKind = this.getSelectedPathKind(selectedPath);

        if (!canRecoverAccessFromSelection(request.targetPath, selectedPath, selectedKind, request.targetType)) {
            throw new Error(request.targetType === 'file'
                ? StorageDirectoryProviderImpl.RECOVER_FILE_DIALOG_MESSAGE
                : StorageDirectoryProviderImpl.RECOVER_DIRECTORY_DIALOG_MESSAGE);
        }

        const recoveredStatus = this.getAccessStatus(request.targetPath, request.targetType);
        if (!recoveredStatus.available) {
            throw new Error(recoveredStatus.message);
        }
    }

    /**
     * 获取当前目标访问状态。
     * @param targetPath 目标路径。
     * @param targetType 目标类型。
     * @returns 当前访问状态。
     */
    private getAccessStatus(targetPath: string, targetType: StorageAccessTargetType): StorageAccessStatus {
        return targetType === 'file'
            ? getFileAccessStatus(targetPath)
            : getDirectoryAccessStatus(targetPath);
    }

    /**
     * 识别用户当前选择的是文件还是文件夹。
     * @param selectedPath 用户选择路径。
     * @returns 选择路径类型。
     */
    private getSelectedPathKind(selectedPath: string): 'file' | 'directory' {
        const stat = fsSync.statSync(selectedPath);
        return stat.isDirectory() ? 'directory' : 'file';
    }
}
