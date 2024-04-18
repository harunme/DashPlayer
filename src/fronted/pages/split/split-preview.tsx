import {cn} from "@/fronted/lib/utils";
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/fronted/components/ui/table";
import React from "react";
import {Button} from "@/fronted/components/ui/button";
import useSplit, {TaskChapterParseResult} from "@/fronted/hooks/useSplit";
import useDpTask from "@/fronted/hooks/useDpTask";

const SplitRow = ({line}: { line: TaskChapterParseResult }) => {
    const dpTask = useDpTask(line.taskId, 1000);
    const callSplit = useSplit(s => s.runSplitOne.bind(null, line));
    return (
        <TableRow>
            <TableCell
                className={cn(
                    !line.timestampStart.valid && 'text-red-500',
                    !line.timestampValid && 'bg-red-100'
                )}
            >{line.timestampStart.value}</TableCell>
            <TableCell
                className={cn(
                    !line.timestampStart.valid && 'text-red-500',
                    !line.timestampValid && 'bg-red-100'
                )}>{line.timestampEnd.value}</TableCell>
            <TableCell className={' w-20'}>{line.title}</TableCell>
            <TableCell>
                {dpTask?.progress??'未开始'}
            </TableCell>
            <TableCell>
                <Button
                    disabled={dpTask !== null}
                    onClick={async () => {
                        await callSplit();
                    }}
                >分割</Button></TableCell>
        </TableRow>
    )
}

const SplitPreview = ({className}: {
    className?: string;
}) => {
    const lines = useSplit(s => s.parseResult);
    return (
        <Table className={cn('w-full', className)}>
            <TableCaption>A list of your recent invoices.</TableCaption>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-20">开始时间</TableHead>
                    <TableHead className={'w-20'}>结束时间</TableHead>
                    <TableHead className={'w-60'}>标题</TableHead>
                    <TableHead className={'w-20'}>状态</TableHead>
                    <TableHead className={'w-20'}>操作</TableHead>
                    {/* <TableHead className="text-right">Amount</TableHead> */}
                </TableRow>
            </TableHeader>
            <TableBody
                className={'scrollbar-none'}
            >
                {lines.map((line, idx) => {
                    return (
                        <SplitRow key={idx} line={line}/>
                    );
                })}
            </TableBody>
        </Table>
    );
}

SplitPreview.defaultProps = {
    className: ''
}

export default SplitPreview;
