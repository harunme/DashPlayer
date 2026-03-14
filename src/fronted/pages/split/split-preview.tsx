import { cn } from '@/fronted/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/fronted/components/ui/table';
import React from 'react';
import useSplit, { TaskChapterParseResult } from '@/fronted/hooks/useSplit';
import { ErrorBoundary } from 'react-error-boundary';
import FallBack from '@/fronted/components/shared/common/FallBack';
import StrUtil from '@/common/utils/str-util';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/fronted/components/ui/tooltip';
import TimeUtil from '@/common/utils/TimeUtil';
import { getRendererLogger } from '@/fronted/log/simple-logger';
import { useTranslation as useI18nTranslation } from 'react-i18next';

const logger = getRendererLogger('SplitRow');

const SplitRow = ({ line, shortDurationLabel }: { line: TaskChapterParseResult; shortDurationLabel: string }) => {
    logger.debug('Rendering split row', {
        timestampStart: line.timestampStart,
        timestampEnd: line.timestampEnd,
        title: line.title,
        isValid: line.timestampValid
    });
    const valid = (TimeUtil.parseDuration(line.timestampEnd) - TimeUtil.parseDuration(line.timestampStart)) > 60;
    return (
        <TableRow>
            <TableCell
                className={cn(
                    'font-mono text-xs',
                    !line.timestampValid && 'bg-red-100 dark:bg-red-950'
                )}
            >
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>{line.timestampStart}</TooltipTrigger>
                        <TooltipContent>
                            {valid ? TimeUtil.timeStrToChinese(line.timestampStart) : shortDurationLabel}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </TableCell>
            <TableCell
                className={cn(
                    'font-mono text-xs',
                    !line.timestampValid && 'bg-red-100 dark:bg-red-950'
                )}
            >
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>{line.timestampEnd}</TooltipTrigger>
                        <TooltipContent>
                            {valid ? TimeUtil.timeStrToChinese(line.timestampEnd) : shortDurationLabel}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </TableCell>
            <TableCell
                className={cn('text-sm', StrUtil.isBlank(line.title) && 'bg-red-100 dark:bg-red-950')}
            >{line.title}</TableCell>
        </TableRow>
    );
};

const SplitPreview = ({ className }: {
    className?: string;
}) => {
    const { t } = useI18nTranslation('pages');
    const lines = useSplit(s => s.parseResult);

    if (lines.length === 0) {
        return (
            <div className={cn('flex items-center justify-center py-16 text-sm text-muted-foreground', className)}>
                {t('sentenceSplitter.preview.empty')}
            </div>
        );
    }

    return (
        <Table className={cn('w-full', className)}>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-24">{t('sentenceSplitter.preview.startTime')}</TableHead>
                    <TableHead className="w-24">{t('sentenceSplitter.preview.endTime')}</TableHead>
                    <TableHead>{t('sentenceSplitter.preview.title')}</TableHead>
                </TableRow>
            </TableHeader>
            <ErrorBoundary fallback={<FallBack />}>
                <TableBody className="scrollbar-none">
                    {lines.map((line, idx) => (
                        <SplitRow
                            key={idx}
                            line={line}
                            shortDurationLabel={t('sentenceSplitter.preview.shortDuration')}
                        />
                    ))}
                </TableBody>
            </ErrorBoundary>
        </Table>
    );
};

SplitPreview.defaultProps = {
    className: ''
};

export default SplitPreview;
