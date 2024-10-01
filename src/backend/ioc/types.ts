const TYPES = {
    ClipOssService: Symbol('ClipOssService'),
    FavouriteClips: Symbol('FavouriteClips'),
    Controller: Symbol('Controller'),
    WatchProject: Symbol('WatchProject'),
    DlVideo: Symbol('DlVideo'),
    TagService: Symbol('TagService'),
    SubtitleService: Symbol('SubtitleService'),
    SrtTimeAdjustService: Symbol('SubtitleTimestampAdjustmentService'),
    SystemService: Symbol('SystemService'),
    CacheService: Symbol('CacheService'),
    SettingService: Symbol('SettingService'),
    LocationService: Symbol('LocationService'),
    DpTaskService: Symbol('DpTaskService'),
    AiService: Symbol('AiService'),
    ChatService: Symbol('ChatService'),
    FfmpegService: Symbol('FfmpegService'),
    SplitVideoService: Symbol('SplitVideoService'),
    WhisperService: Symbol('WhisperService'),
    ConvertService: Symbol('ConvertService'),
    MediaService: Symbol('MediaService'),
    TranslateService: Symbol('TranslateService'),
    // Clients
    YouDaoClientProvider: Symbol('YouDaoClientProvider'),
    TencentClientProvider: Symbol('TencentClientProvider'),
    OpenAiClientProvider: Symbol('OpenAiClientProvider'),
};

export default TYPES;
