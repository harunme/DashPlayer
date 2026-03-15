import * as React from 'react';
import SettingsPageShell from '@/fronted/pages/setting/components/form/SettingsPageShell';
import { Button } from '@/fronted/components/ui/button';
import { useRecordHotkeys } from 'react-hotkeys-hook';
import { DialogClose } from '@radix-ui/react-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/fronted/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/fronted/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/fronted/components/ui/tooltip';
import { Eraser, SquarePlus } from 'lucide-react';
import { SettingKeyObj } from '@/common/types/store_schema';
import { useForm, Controller } from 'react-hook-form';
import { backendClient } from '@/fronted/application/bootstrap/backendClient';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import { Input } from '@/fronted/components/ui/input';
import { Label } from '@/fronted/components/ui/label';
import { useAutoSaveSettingsForm } from '@/fronted/hooks/useAutoSaveSettingsForm';
import useSWR from 'swr';
import { ShortcutSettingDetailVO, ShortcutSettingSaveVO } from '@/common/types/vo/shortcut-setting-vo';

const api = backendClient;

const merge = (a: string, b: string) => {
    const aArr = a.split(',');
    const bArr = b.split(',');
    return Array.from(new Set([...aArr, ...bArr])).join(',');
};

/**
 * 将快捷键字段名转换为配置仓库里的 `shortcut.xxx` 键名。
 */
const toShortcutStoreKey = (key: ShortcutKey): ShortcutStoreKey => `shortcut.${key}`;

const RecordDialog = ({
    title,
    value,
    onChange,
    triggerRef,
    dialogTitle,
    dialogDescription,
    saveChangesLabel,
}: {
    title: string;
    value: string;
    onChange: (value: string) => void;
    triggerRef: React.RefObject<HTMLButtonElement>;
    dialogTitle: string;
    dialogDescription: string;
    saveChangesLabel: string;
}) => {
    const [keys, { start, stop }] = useRecordHotkeys();
    return (
        <Dialog onOpenChange={(open) => { if (!open) stop(); }}>
            <DialogTrigger asChild>
                <Button ref={triggerRef} className="hidden">Open</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{dialogTitle}</DialogTitle>
                    <DialogDescription>{dialogDescription}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Label htmlFor="shortcut-input">{title}</Label>
                    <Input
                        id="shortcut-input"
                        readOnly
                        onFocus={start}
                        onBlur={stop}
                        value={Array.from(keys).join(' + ')}
                        className="col-span-3"
                    />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            onClick={() => onChange(merge(value, Array.from(keys).join('+')))}
                            type="submit"
                        >
                            {saveChangesLabel}
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ShortcutSetting = () => {
    const { t } = useI18nTranslation('settings');
    const { data: shortcutValues } = useSWR<ShortcutSettingDetailVO>(
        'settings/shortcuts/detail',
        () => api.call('settings/shortcuts/detail'),
    );

    const form = useForm<ShortcutFormValues>();

    const { control } = form;
    const { ready, status: autoSaveStatus, error: autoSaveError, initialize, flush } = useAutoSaveSettingsForm<ShortcutFormValues>({
        form,
        onSave: async (values) => {
            await api.call('settings/shortcuts/update', values);
        },
    });

    React.useEffect(() => {
        if (!shortcutValues) {
            return;
        }
        initialize(shortcutValues);
    }, [initialize, shortcutValues]);

    const items: Array<{ key: ShortcutKey; title: string; description: string }> = [
        { key: 'previousSentence', title: t('shortcut.items.previousSentence.title'), description: t('shortcut.items.previousSentence.description') },
        { key: 'nextSentence', title: t('shortcut.items.nextSentence.title'), description: t('shortcut.items.nextSentence.description') },
        { key: 'repeatSentence', title: t('shortcut.items.repeatSentence.title'), description: t('shortcut.items.repeatSentence.description') },
        { key: 'playPause', title: t('shortcut.items.playPause.title'), description: t('shortcut.items.playPause.description') },
        { key: 'repeatSingleSentence', title: t('shortcut.items.repeatSingleSentence.title'), description: t('shortcut.items.repeatSingleSentence.description') },
        { key: 'autoPause', title: t('shortcut.items.autoPause.title'), description: t('shortcut.items.autoPause.description') },
        { key: 'toggleEnglishDisplay', title: t('shortcut.items.toggleEnglishDisplay.title'), description: t('shortcut.items.toggleEnglishDisplay.description') },
        { key: 'toggleChineseDisplay', title: t('shortcut.items.toggleChineseDisplay.title'), description: t('shortcut.items.toggleChineseDisplay.description') },
        { key: 'toggleBilingualDisplay', title: t('shortcut.items.toggleBilingualDisplay.title'), description: t('shortcut.items.toggleBilingualDisplay.description') },
        { key: 'toggleWordLevelDisplay', title: t('shortcut.items.toggleWordLevelDisplay.title'), description: t('shortcut.items.toggleWordLevelDisplay.description') },
        { key: 'nextTheme', title: t('shortcut.items.nextTheme.title'), description: t('shortcut.items.nextTheme.description') },
        { key: 'adjustBeginMinus', title: t('shortcut.items.adjustBeginMinus.title'), description: t('shortcut.items.adjustBeginMinus.description') },
        { key: 'adjustBeginPlus', title: t('shortcut.items.adjustBeginPlus.title'), description: t('shortcut.items.adjustBeginPlus.description') },
        { key: 'adjustEndMinus', title: t('shortcut.items.adjustEndMinus.title'), description: t('shortcut.items.adjustEndMinus.description') },
        { key: 'adjustEndPlus', title: t('shortcut.items.adjustEndPlus.title'), description: t('shortcut.items.adjustEndPlus.description') },
        { key: 'clearAdjust', title: t('shortcut.items.clearAdjust.title'), description: t('shortcut.items.clearAdjust.description') },
        { key: 'nextPlaybackRate', title: t('shortcut.items.nextPlaybackRate.title'), description: t('shortcut.items.nextPlaybackRate.description') },
        { key: 'aiChat', title: t('shortcut.items.aiChat.title'), description: t('shortcut.items.aiChat.description') },
        { key: 'toggleCopyMode', title: t('shortcut.items.toggleCopyMode.title'), description: t('shortcut.items.toggleCopyMode.description') },
        { key: 'addClip', title: t('shortcut.items.addClip.title'), description: t('shortcut.items.addClip.description') },
        { key: 'openControlPanel', title: t('shortcut.items.openControlPanel.title'), description: t('shortcut.items.openControlPanel.description') },
    ];

    return (
        <form
            className="w-full h-full min-h-0"
            onSubmit={(event) => {
                event.preventDefault();
                flush().catch(() => null);
            }}
        >
            <SettingsPageShell
                title={t('shortcut.title')}
                description={t('shortcut.description')}
            >
                {!ready && <div className="h-2" />}
                {autoSaveStatus === 'error' && autoSaveError && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                        {autoSaveError}
                    </div>
                )}
                <TooltipProvider delayDuration={300}>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40%]">{t('shortcut.tableHeader.action')}</TableHead>
                                <TableHead>{t('shortcut.tableHeader.keys')}</TableHead>
                                <TableHead className="w-20" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <Controller
                                    key={item.key}
                                    name={item.key}
                                    control={control}
                                    render={({ field }) => (
                                        <ShortcutRow
                                            title={item.title}
                                            description={item.description}
                                            value={field.value ?? ''}
                                            defaultValue={SettingKeyObj[toShortcutStoreKey(item.key)]}
                                            onChange={field.onChange}
                                            recordLabel={t('shortcut.record')}
                                            resetDefaultLabel={t('shortcut.resetDefault')}
                                            dialogTitle={t('shortcut.dialogTitle')}
                                            dialogDescription={t('shortcut.dialogDescription')}
                                            saveChangesLabel={t('shortcut.saveChanges')}
                                        />
                                    )}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TooltipProvider>
            </SettingsPageShell>
        </form>
    );
};

const ShortcutRow = ({
    title,
    description,
    value,
    defaultValue,
    onChange,
    recordLabel,
    resetDefaultLabel,
    dialogTitle,
    dialogDescription,
    saveChangesLabel,
}: {
    title: string;
    description: string;
    value: string;
    defaultValue: string;
    onChange: (value: string) => void;
    recordLabel: string;
    resetDefaultLabel: string;
    dialogTitle: string;
    dialogDescription: string;
    saveChangesLabel: string;
}) => {
    const triggerRef = React.useRef<HTMLButtonElement>(null!);
    return (
        <TableRow className="group/row">
            <TableCell className="py-2">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="text-sm cursor-default">{title}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                        <p>{description}</p>
                    </TooltipContent>
                </Tooltip>
            </TableCell>
            <TableCell className="py-2">
                <KeyBadge keys={value} />
            </TableCell>
            <TableCell className="py-2">
                <div className="flex items-center gap-0.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/95 hover:text-foreground" onClick={() => triggerRef.current?.click()}>
                                <SquarePlus className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>{recordLabel}</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/95 hover:text-foreground" onClick={() => onChange(defaultValue)}>
                                <Eraser className="h-3.5 w-3.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top"><p>{resetDefaultLabel}</p></TooltipContent>
                    </Tooltip>
                </div>
                <RecordDialog
                    title={title}
                    value={value}
                    onChange={onChange}
                    triggerRef={triggerRef}
                    dialogTitle={dialogTitle}
                    dialogDescription={dialogDescription}
                    saveChangesLabel={saveChangesLabel}
                />
            </TableCell>
        </TableRow>
    );
};

export default ShortcutSetting;
type ShortcutKey = keyof ShortcutSettingSaveVO;
type ShortcutStoreKey = `shortcut.${ShortcutKey}`;

type ShortcutFormValues = ShortcutSettingSaveVO;

const KeyBadge = ({ keys }: { keys: string }) => {
    if (!keys) return <span className="text-muted-foreground text-xs">—</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {keys.split(',').filter(Boolean).map((key) => (
                <kbd
                    key={key}
                    className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground"
                >
                    {key.split('+').map((k) => k.charAt(0).toUpperCase() + k.slice(1)).join(' + ')}
                </kbd>
            ))}
        </div>
    );
};
