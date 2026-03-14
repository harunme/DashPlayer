/**
 * 服务凭据设置值对象。
 */
export type ServiceCredentialSettingVO = {
    openai: {
        /** OpenAI API Key。 */
        key: string;
        /** OpenAI 接口地址。 */
        endpoint: string;
        /** 用户在设置页输入的原始模型列表文本，允许保留逗号与换行。 */
        models: string;
    };
    tencent: {
        /** 腾讯云 SecretId。 */
        secretId: string;
        /** 腾讯云 SecretKey。 */
        secretKey: string;
    };
    youdao: {
        /** 有道应用 ID。 */
        secretId: string;
        /** 有道应用密钥。 */
        secretKey: string;
    };
    whisper: {
        /** Whisper 模型尺寸。 */
        modelSize: 'base' | 'large';
        /** 是否启用 VAD。 */
        enableVad: boolean;
        /** 当前选择的 VAD 模型标识。 */
        vadModel: 'silero-v5.1.2' | 'silero-v6.2.0';
    };
};
