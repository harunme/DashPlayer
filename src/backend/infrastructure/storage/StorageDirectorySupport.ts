import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { getEnvironmentSuffix } from '@/backend/utils/runtimeEnv';
import StrUtil from '@/common/utils/str-util';
import { StorageStatusVO } from '@/common/types/vo/StorageStatusVO';
import { StorageDirectoryTarget } from '@/backend/application/ports/gateways/storage/StorageDirectoryProvider';

const DEFAULT_STORAGE_FOLDER_NAME = 'DashPlayer';
const DEFAULT_COLLECTION = 'default';

/**
 * 解析外部存储根目录。
 * @param configuredPath 用户保存的原始路径。
 * @returns 带环境后缀的最终根目录。
 */
export function resolveStorageRootPath(configuredPath?: string | null): string {
    let rawPath = configuredPath;
    if (StrUtil.isBlank(rawPath)) {
        rawPath = path.join(app.getPath('documents'), DEFAULT_STORAGE_FOLDER_NAME);
    }

    const dirName = path.basename(rawPath);
    const parentDir = path.dirname(rawPath);
    const baseName = dirName.endsWith('-dev')
        ? dirName.slice(0, -4)
        : dirName;
    const finalName = `${baseName}${getEnvironmentSuffix()}`;

    if (finalName !== dirName) {
        return path.join(parentDir, finalName);
    }

    return rawPath;
}

/**
 * 获取外部存储根目录状态。
 * @param configuredPath 用户保存的原始路径。
 * @returns 可供前端展示的状态信息。
 */
export function getStorageRootStatus(configuredPath?: string): StorageStatusVO {
    const resolvedPath = resolveStorageRootPath(configuredPath);
    const status: StorageStatusVO = {
        configuredPath: configuredPath ?? '',
        resolvedPath,
        exists: false,
        isDirectory: false,
        readable: false,
        writable: false,
        available: false,
        code: 'missing',
        message: `当前存储目录暂时无法访问：${resolvedPath}`,
    };

    try {
        const stat = fs.statSync(resolvedPath);
        status.exists = true;
        status.isDirectory = stat.isDirectory();
    } catch (error: unknown) {
        const errorCode = error instanceof Error && 'code' in error
            ? (error as NodeJS.ErrnoException).code
            : undefined;
        if (errorCode !== 'ENOENT') {
            status.message = `当前存储目录暂时无法访问：${resolvedPath}`;
        }
        return status;
    }

    if (!status.isDirectory) {
        status.code = 'not_directory';
        status.message = `当前存储目录暂时无法访问：${resolvedPath}`;
        return status;
    }

    try {
        fs.accessSync(resolvedPath, fs.constants.R_OK);
        status.readable = true;
    } catch {
        status.code = 'not_readable';
        status.message = `当前存储目录暂时无法访问：${resolvedPath}`;
        return status;
    }

    try {
        fs.accessSync(resolvedPath, fs.constants.W_OK);
        status.writable = true;
    } catch {
        status.code = 'not_writable';
        status.message = `当前存储目录暂时无法访问：${resolvedPath}`;
        return status;
    }

    status.available = true;
    status.code = 'ok';
    status.message = `当前存储目录可用：${resolvedPath}`;
    return status;
}

/**
 * 解析指定目标目录。
 * @param rootPath 已确认的外部存储根目录。
 * @param target 目录目标。
 * @returns 对应目标目录。
 */
export function resolveStorageDirectory(rootPath: string, target: StorageDirectoryTarget): string {
    switch (target) {
        case StorageDirectoryTarget.LIBRARY_ROOT:
            return rootPath;
        case StorageDirectoryTarget.FAVORITE_CLIPS:
            return path.join(rootPath, 'favorite_clips');
        case StorageDirectoryTarget.FAVORITE_CLIPS_COLLECTION:
            return path.join(rootPath, 'favorite_clips', DEFAULT_COLLECTION);
        case StorageDirectoryTarget.WORD_VIDEO:
            return path.join(rootPath, 'favorite_clips', 'word_video');
        case StorageDirectoryTarget.VIDEOS:
            return path.join(rootPath, 'videos');
        case StorageDirectoryTarget.TEMP:
            return path.join(rootPath, 'temp');
        case StorageDirectoryTarget.TEMP_OSS:
            return path.join(rootPath, 'temp_oss');
        case StorageDirectoryTarget.MODELS:
            return path.join(rootPath, 'models');
        default:
            throw new Error(`未知的外部目录目标：${target satisfies never}`);
    }
}
