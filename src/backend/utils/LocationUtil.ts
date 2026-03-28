import { AppStateLocationType, LocationType } from '@/backend/application/services/LocationService';
import path from 'path';
import StrUtil from '@/common/utils/str-util';
import { storeGet } from '@/backend/infrastructure/settings/store';
import { app } from 'electron';
import { getEnvironmentSuffix } from '@/backend/utils/runtimeEnv';
import fs from 'fs';
import { StorageStatusVO } from '@/common/types/vo/StorageStatusVO';

export default class LocationUtil {
    /**
     * 获取外部媒体库子目录。
     * @param type 外部媒体库子目录名。
     * @returns 对应绝对路径。
     */
    public static staticGetStoragePath(type: LocationType | string) {
        const basePath = this.getStorageBasePath();
        return path.join(basePath, type);
    }

    /**
     * 获取应用内部状态子目录。
     * @param type 内部状态子目录名。
     * @returns 对应绝对路径。
     */
    public static staticGetAppStatePath(type: AppStateLocationType | string) {
        return path.join(this.getAppStateBasePath(), type);
    }

    /**
     * 获取外部媒体库根目录。
     * @returns 最终使用的媒体库根目录。
     */
    public static getStorageBasePath() {
        return this.resolveLibraryBasePath(storeGet('storage.path'));
    }

    /**
     * 获取应用内部状态根目录。
     * @returns Electron `userData` 目录。
     */
    public static getAppStateBasePath() {
        return app.getPath('userData');
    }

    /**
     * 根据原始配置值解析媒体库根目录。
     * @param configuredPath 用户保存的原始路径。
     * @returns 带环境后缀的最终媒体库目录。
     */
    public static resolveLibraryBasePath(configuredPath?: string | null): string {
        let p = configuredPath;
        if (StrUtil.isBlank(p)) {
            const documentsPath = app.getPath('documents');
            const folderName = 'DashPlayer';
            p = path.join(documentsPath, folderName);
        }
        const dirName = path.basename(p);
        const parentDir = path.dirname(p);

        const baseName = dirName.endsWith('-dev')
            ? dirName.slice(0, -4)
            : dirName;
        const finalName = `${baseName}${getEnvironmentSuffix()}`;

        if (finalName !== dirName) {
            return path.join(parentDir, finalName);
        }

        return p;
    }

    /**
     * 检查媒体库目录是否可访问。
     *
     * 行为说明：
     * - 空配置会解析为默认媒体库目录后再检查；
     * - 仅当目录存在、且同时可读可写时才视为可用；
     * - 不负责创建目录，避免静默修正用户配置。
     *
     * @param configuredPath 用户保存的原始路径。
     * @returns 可直接给前端展示的媒体库状态。
     */
    public static getLibraryStatus(configuredPath?: string): StorageStatusVO {
        const resolvedPath = this.resolveLibraryBasePath(configuredPath);
        const status: StorageStatusVO = {
            configuredPath: configuredPath ?? '',
            resolvedPath,
            exists: false,
            isDirectory: false,
            readable: false,
            writable: false,
            available: false,
            code: 'missing',
            message: `媒体库目录不存在：${resolvedPath}`,
        };

        try {
            const stat = fs.statSync(resolvedPath);
            status.exists = true;
            status.isDirectory = stat.isDirectory();
        } catch (error: unknown) {
            const errorCode = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined;
            if (errorCode !== 'ENOENT') {
                status.message = `无法访问媒体库目录：${resolvedPath}`;
            }
            return status;
        }

        if (!status.isDirectory) {
            status.code = 'not_directory';
            status.message = `媒体库路径不是目录：${resolvedPath}`;
            return status;
        }

        try {
            fs.accessSync(resolvedPath, fs.constants.R_OK);
            status.readable = true;
        } catch {
            status.code = 'not_readable';
            status.message = `媒体库目录不可读取：${resolvedPath}`;
            return status;
        }

        try {
            fs.accessSync(resolvedPath, fs.constants.W_OK);
            status.writable = true;
        } catch {
            status.code = 'not_writable';
            status.message = `媒体库目录不可写入：${resolvedPath}`;
            return status;
        }

        status.available = true;
        status.code = 'ok';
        status.message = `媒体库目录可用：${resolvedPath}`;
        return status;
    }

}
