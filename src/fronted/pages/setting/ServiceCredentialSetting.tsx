import React from 'react';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import { Book, Bot, CheckCircle2, Cpu, Download, Languages, ShieldCheck, TestTube, XCircle } from 'lucide-react';
import { Button } from '@/fronted/components/ui/button';
import { Input } from '@/fronted/components/ui/input';
import { Label } from '@/fronted/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/fronted/components/ui/select';
import { Progress } from '@/fronted/components/ui/progress';
import { Textarea } from '@/fronted/components/ui/textarea';
import SettingsPageShell from '@/fronted/pages/setting/components/form/SettingsPageShell';
import { ServiceCredentialSettingVO } from '@/common/types/vo/service-credentials-setting-vo';
import { WhisperModelStatusVO } from '@/common/types/vo/whisper-model-vo';
import { backendClient } from '@/fronted/application/bootstrap/backendClient';
import { useToast } from '@/fronted/components/ui/use-toast';
import { useTranslation as useI18nTranslation } from 'react-i18next';

const api = backendClient;

const ServiceCredentialSetting = () => {
    const { t } = useI18nTranslation('settings');
    const { toast } = useToast();
    const { data: settings, mutate, isLoading } = useSWR('settings/service-credentials/get', () =>
        api.call('settings/service-credentials/get'),
    );

    const { register, setValue, handleSubmit, watch, reset } = useForm<ServiceCredentialSettingVO>({
        defaultValues: {
            openai: { key: '', endpoint: 'https://api.openai.com', models: 'gpt-5.2' },
            tencent: { secretId: '', secretKey: '' },
            youdao: { secretId: '', secretKey: '' },
            whisper: { modelSize: 'base', enableVad: true, vadModel: 'silero-v6.2.0' },
        },
    });

    register('whisper.modelSize');
    register('openai.models');

    const [saving, setSaving] = React.useState(false);
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [testingOpenAi, setTestingOpenAi] = React.useState(false);
    const [testingTencent, setTestingTencent] = React.useState(false);
    const [testingYoudao, setTestingYoudao] = React.useState(false);
    const [testResults, setTestResults] = React.useState<Record<string, { success: boolean; message: string } | null>>({});
    const [whisperModelStatus, setWhisperModelStatus] = React.useState<WhisperModelStatusVO | null>(null);
    const [downloadingWhisperModel, setDownloadingWhisperModel] = React.useState(false);
    const [downloadingVadModel, setDownloadingVadModel] = React.useState(false);
    const [downloadProgressByKey, setDownloadProgressByKey] = React.useState<Record<string, { percent: number }>>({});

    const whisperModelSize = watch('whisper.modelSize');
    const openAiModelsText = watch('openai.models') ?? 'gpt-5.2';

    const refreshWhisperModelStatus = React.useCallback(async () => {
        const status = await api.call('whisper/models/status');
        setWhisperModelStatus(status);
    }, []);

    React.useEffect(() => {
        if (settings) {
            reset(settings);
        }
    }, [settings, reset]);

    React.useEffect(() => {
        refreshWhisperModelStatus().catch(() => null);
    }, [refreshWhisperModelStatus]);

    React.useEffect(() => {
        const handler = (evt: Event) => {
            const detail = (evt as CustomEvent).detail as { key: string; percent: number } | undefined;
            if (!detail?.key) return;
            setDownloadProgressByKey((prev) => ({
                ...prev,
                [detail.key]: { percent: detail.percent },
            }));

            if (detail.percent >= 100) {
                setTimeout(() => {
                    refreshWhisperModelStatus().catch(() => null);
                }, 300);
            }
        };

        window.addEventListener('whisper-model-download-progress', handler as EventListener);
        return () => {
            window.removeEventListener('whisper-model-download-progress', handler as EventListener);
        };
    }, [refreshWhisperModelStatus]);

    const onSave = handleSubmit(async (data) => {
        setSaving(true);
        try {
            await api.call('settings/service-credentials/update', data);
            await mutate();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('common.saveFailed'),
                description: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setSaving(false);
        }
    });

    React.useEffect(() => {
        const subscription = watch(() => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
            debounceRef.current = setTimeout(() => {
                onSave().catch(() => null);
            }, 500);
        });

        return () => {
            subscription.unsubscribe();
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
                debounceRef.current = null;
            }
        };
    }, [watch, onSave]);

    const testProvider = async (provider: 'openai' | 'tencent' | 'youdao') => {
        const setTesting = {
            openai: setTestingOpenAi,
            tencent: setTestingTencent,
            youdao: setTestingYoudao,
        }[provider];

        setTesting(true);
        setTestResults((prev) => ({ ...prev, [provider]: null }));
        try {
            const routeMap: Record<typeof provider, 'settings/service-credentials/test-openai' | 'settings/service-credentials/test-tencent' | 'settings/service-credentials/test-youdao'> = {
                openai: 'settings/service-credentials/test-openai',
                tencent: 'settings/service-credentials/test-tencent',
                youdao: 'settings/service-credentials/test-youdao',
            };
            const result = await api.call(routeMap[provider]);
            setTestResults((prev) => ({ ...prev, [provider]: result }));
        } catch (error) {
            setTestResults((prev) => ({
                ...prev,
                [provider]: { success: false, message: error instanceof Error ? error.message : String(error) },
            }));
        } finally {
            setTesting(false);
        }
    };

    const downloadSelectedWhisperModel = async () => {
        const size = whisperModelSize === 'large' ? 'large' : 'base';
        const key = `whisper:${size}`;
        setDownloadingWhisperModel(true);
        setDownloadProgressByKey((prev) => ({ ...prev, [key]: { percent: 0 } }));
        try {
            await api.call('whisper/models/download', { modelSize: size });
            toast({ title: t('common.downloadDone'), description: t('serviceCredentials.downloadWhisperDone', { size }) });
            await refreshWhisperModelStatus();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('common.downloadFailed'),
                description: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setDownloadingWhisperModel(false);
        }
    };

    const downloadSelectedVadModel = async () => {
        const key = 'vad:silero-v6.2.0';
        setDownloadingVadModel(true);
        setDownloadProgressByKey((prev) => ({ ...prev, [key]: { percent: 0 } }));
        try {
            await api.call('whisper/models/download-vad', { vadModel: 'silero-v6.2.0' });
            toast({ title: t('common.downloadDone'), description: t('serviceCredentials.downloadVadDone') });
            await refreshWhisperModelStatus();
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('common.downloadFailed'),
                description: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setDownloadingVadModel(false);
        }
    };

    return (
        <form
            className="w-full h-full min-h-0"
            onSubmit={(event) => {
                event.preventDefault();
                onSave().catch(() => null);
            }}
        >
            <SettingsPageShell
                title={t('serviceCredentials.title')}
                description={t('serviceCredentials.description')}
                contentClassName="space-y-6"
            >
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
                    {t('serviceCredentials.intro')}
                </div>

                {/* OpenAI */}
                <div className="rounded-xl border border-border/70 p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-semibold"><Bot className="w-4 h-4" />OpenAI</div>
                            <div className="text-xs text-muted-foreground mt-1">{t('serviceCredentials.openai.description')}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {testResults.openai && (
                                <span className={`flex items-center gap-1 text-xs ${testResults.openai.success ? 'text-green-600' : 'text-destructive'}`}>
                                    {testResults.openai.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                    {testResults.openai.success ? t('common.testSuccess') : testResults.openai.message}
                                </span>
                            )}
                            <Button type="button" variant="outline" size="sm" onClick={() => testProvider('openai').catch(() => null)} disabled={testingOpenAi}>
                                <TestTube className="w-4 h-4 mr-2" />
                                {testingOpenAi ? t('common.testing') : t('common.testConnection')}
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>API Key</Label>
                            <Input type="password" {...register('openai.key')} placeholder="sk-..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Endpoint</Label>
                            <Input {...register('openai.endpoint')} placeholder="https://api.openai.com" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>{t('serviceCredentials.openai.modelsLabel')}</Label>
                            <Textarea
                                value={openAiModelsText}
                                onChange={(event) => {
                                    setValue('openai.models', event.target.value, { shouldDirty: true });
                                }}
                                className="min-h-[120px]"
                                placeholder={'gpt-5.2\ngpt-4o\no3-mini'}
                            />
                            <div className="text-xs text-muted-foreground">{t('serviceCredentials.openai.modelsHint')}</div>
                        </div>
                    </div>
                </div>

                {/* Tencent */}
                <div className="rounded-xl border border-border/70 p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-semibold"><Languages className="w-4 h-4" />{t('serviceCredentials.tencent.title')}</div>
                            <div className="text-xs text-muted-foreground mt-1">{t('serviceCredentials.tencent.description')}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {testResults.tencent && (
                                <span className={`flex items-center gap-1 text-xs ${testResults.tencent.success ? 'text-green-600' : 'text-destructive'}`}>
                                    {testResults.tencent.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                    {testResults.tencent.success ? t('common.testSuccess') : testResults.tencent.message}
                                </span>
                            )}
                            <Button type="button" variant="outline" size="sm" onClick={() => testProvider('tencent').catch(() => null)} disabled={testingTencent}>
                                <TestTube className="w-4 h-4 mr-2" />
                                {testingTencent ? t('common.testing') : t('common.testConnection')}
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>SecretId</Label>
                            <Input {...register('tencent.secretId')} />
                        </div>
                        <div className="space-y-2">
                            <Label>SecretKey</Label>
                            <Input type="password" {...register('tencent.secretKey')} />
                        </div>
                    </div>
                </div>

                {/* YouDao */}
                <div className="rounded-xl border border-border/70 p-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2 text-sm font-semibold"><Book className="w-4 h-4" />{t('serviceCredentials.youdao.title')}</div>
                            <div className="text-xs text-muted-foreground mt-1">{t('serviceCredentials.youdao.description')}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {testResults.youdao && (
                                <span className={`flex items-center gap-1 text-xs ${testResults.youdao.success ? 'text-green-600' : 'text-destructive'}`}>
                                    {testResults.youdao.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                    {testResults.youdao.success ? t('common.testSuccess') : testResults.youdao.message}
                                </span>
                            )}
                            <Button type="button" variant="outline" size="sm" onClick={() => testProvider('youdao').catch(() => null)} disabled={testingYoudao}>
                                <TestTube className="w-4 h-4 mr-2" />
                                {testingYoudao ? t('common.testing') : t('common.testConnection')}
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('serviceCredentials.youdao.appId')}</Label>
                            <Input {...register('youdao.secretId')} />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('serviceCredentials.youdao.appKey')}</Label>
                            <Input type="password" {...register('youdao.secretKey')} />
                        </div>
                    </div>
                </div>

                {/* Whisper */}
                <div className="rounded-xl border border-border/70 p-5 space-y-4">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold"><Cpu className="w-4 h-4" />{t('serviceCredentials.whisper.title')}</div>
                        <div className="text-xs text-muted-foreground mt-1">{t('serviceCredentials.whisper.description')}</div>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('serviceCredentials.whisper.modelSize')}</Label>
                        <Select
                            value={watch('whisper.modelSize')}
                            onValueChange={(value: 'base' | 'large') => setValue('whisper.modelSize', value, { shouldDirty: true })}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="base">base</SelectItem>
                                <SelectItem value="large">large</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded-lg border border-border/60 divide-y divide-border/60 overflow-hidden">
                        {/* Whisper model row */}
                        <div className="px-4 py-3 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-sm font-medium">Whisper {whisperModelSize}</span>
                                    {whisperModelStatus?.whisper?.[whisperModelSize === 'large' ? 'large' : 'base']?.exists ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600">
                                            <CheckCircle2 className="w-3 h-3" />
                                            {t('common.ready')}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                            {t('common.notDownloaded')}
                                        </span>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadSelectedWhisperModel().catch(() => null)}
                                    disabled={downloadingWhisperModel}
                                >
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                    {downloadingWhisperModel ? t('common.downloading') : t('common.download')}
                                </Button>
                            </div>
                            {downloadingWhisperModel && (
                                <Progress value={downloadProgressByKey[`whisper:${whisperModelSize}`]?.percent ?? 0} className="h-1.5" />
                            )}
                        </div>

                        {/* VAD model row */}
                        <div className="px-4 py-3 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-sm font-medium">VAD silero-v6.2.0</span>
                                    {whisperModelStatus?.vad?.['silero-v6.2.0']?.exists ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600">
                                            <CheckCircle2 className="w-3 h-3" />
                                            {t('common.ready')}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                            {t('common.notDownloaded')}
                                        </span>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadSelectedVadModel().catch(() => null)}
                                    disabled={downloadingVadModel}
                                >
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                    {downloadingVadModel ? t('common.downloading') : t('common.download')}
                                </Button>
                            </div>
                            {downloadingVadModel && (
                                <Progress value={downloadProgressByKey['vad:silero-v6.2.0']?.percent ?? 0} className="h-1.5" />
                            )}
                        </div>
                    </div>
                </div>
            </SettingsPageShell>
        </form>
    );
};

export default ServiceCredentialSetting;
