import { DpTask, DpTaskState } from '@/backend/db/tables/dpTask';
import React, { useEffect } from 'react';

const api = window.electron;
const useDpTask = (taskId: number | null | undefined, interval: number) => {
    const [dpTask, setDpTask] = React.useState<DpTask | null>(null);

    let s = dpTask?.status ?? DpTaskState.INIT;
    const inProgress = s === DpTaskState.IN_PROGRESS || s === DpTaskState.INIT;
    useEffect(() => {
        if (!taskId || !inProgress) {
            return;
        }
        const fetchDpTask = async () => {
            const task = await api.dpTaskDetail(taskId);
            setDpTask(task);
        };
        fetchDpTask();
        const intervalFunc = setInterval(fetchDpTask, interval);
        return () => {
            clearInterval(intervalFunc);
        };
    }, [taskId, interval, inProgress]);

    return dpTask;
};
export default useDpTask;
