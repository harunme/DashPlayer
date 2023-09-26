import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels =
    | 'ipc-example'
    | 'update-progress'
    | 'trans-word'
    | 'query-progress'
    | 'batch-translate'
    | 'update-tenant-secret'
    | 'get-tenant-secret'
    | 'get-you-dao-secret'
    | 'update-you-dao-secret'
    | 'update-shortcut'
    | 'get-shortcut'
    | 'maximize'
    | 'unmaximize'
    | 'is-maximized'
    | 'is-full-screen'
    | 'show-button'
    | 'hide-button'
    | 'maximize-setting'
    | 'unmaximize-setting'
    | 'is-maximized-setting'
    | 'close-setting'
    | 'minimize-setting'
    | 'is-windows'
    | 'minimize'
    | 'close'
    | 'open-menu'
    | 'you-dao-translate'
    | 'pronounce'
    | 'get-audio'
    | 'open-data-dir'
    | 'query-cache-size'
    | 'clear-cache';

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        sendMessage(channel: Channels, args: unknown[]) {
            ipcRenderer.send(channel, args);
        },
        on(channel: Channels, func: (...args: unknown[]) => void) {
            const subscription = (
                _event: IpcRendererEvent,
                ...args: unknown[]
            ) => func(...args);
            ipcRenderer.on(channel, subscription);

            return () => {
                ipcRenderer.removeListener(channel, subscription);
            };
        },
        once(channel: Channels, func: (...args: unknown[]) => void) {
            ipcRenderer.once(channel, (_event, ...args) => func(...args));
        },
    },
});
