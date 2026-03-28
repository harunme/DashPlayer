import { StoragePathValidator } from '@/backend/application/services/StoragePathValidator';

/**
 * 外部媒体库存储目录类型。
 */
export enum LocationType {
    FAVORITE_CLIPS = 'favorite_clips',
    TEMP = 'temp',
    LOGS = 'logs',
    VIDEOS = 'videos',
    TEMP_OSS = 'temp_oss',
    DATA = 'data',
}

/**
 * 应用内部状态目录类型。
 */
export enum AppStateLocationType {
    DATA = 'data',
    LOGS = 'logs',
}

export enum ProgramType {
    FFMPEG = 'ffmpeg',
    FFPROBE = 'ffprobe',
    LIB = 'lib',
}

/**
 * 路径定位服务。
 */
export default interface LocationService extends StoragePathValidator {
    getDetailLibraryPath(type: LocationType): string;

    getBaseLibraryPath(): string;

    getBaseClipPath(): string;

    getAppStatePath(type: AppStateLocationType): string;

    getThirdLibPath(type: ProgramType): string;

    listCollectionPaths(): string[];
}
