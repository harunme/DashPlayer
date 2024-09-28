import ffmpeg from 'fluent-ffmpeg';
import Lock from '@/common/utils/Lock';
import TimeUtil from '@/common/utils/TimeUtil';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import LocationServiceImpl from '@/backend/services/impl/LocationServiceImpl';
import FileUtil from '@/backend/utils/FileUtil';
import { inject, injectable } from 'inversify';
import ChildProcessService from '@/backend/services/ChildProcessService';
import TYPES from '@/backend/ioc/types';
import FfmpegService from '@/backend/services/FfmpegService';

@injectable()
export default class FfmpegServiceImpl implements FfmpegService {
    @inject(TYPES.ChildProcessService)
    private childProcessService!: ChildProcessService;

    static {
        ffmpeg.setFfmpegPath(LocationServiceImpl.ffmpegPath());
        ffmpeg.setFfprobePath(LocationServiceImpl.ffprobePath());
    }

    /**
     * ffmpeg -y -ss {} -t {} -accurate_seek -i {} -codec copy  -avoid_negative_ts 1 {}
     *
     */
    public async splitVideo({
                                inputFile,
                                startSecond,
                                endSecond,
                                outputFile
                            }: {
        inputFile: string,
        startSecond: number,
        endSecond: number,
        outputFile: string
    }) {
        console.log('splitVideo', inputFile, startSecond, endSecond, outputFile);
        await Lock.sync('ffmpeg', async () => {
            await new Promise((resolve, reject) => {
                const ff = spawn(LocationServiceImpl.ffmpegPath(), [
                    '-y',
                    '-ss', TimeUtil.secondToTimeStrWithMs(startSecond),
                    '-t', (endSecond - startSecond).toString(),
                    '-accurate_seek',
                    '-i', inputFile,
                    '-codec', 'copy',
                    '-avoid_negative_ts', '1',
                    outputFile
                ]);


                ff.on('close', (code) => {
                    console.log(`child process exited with code ${code}`);
                    resolve(null);
                });

                ff.on('error', (error) => {
                    console.log('An error occurred while executing ffmpeg command:', error);
                    reject(error);
                });
            });
        });
    }

    /**
     * ffmpeg.exe -i "In.mp4" -f segment -segment_times 00:00:06.165,00:00:14.293 -c copy -map 0 "Out_%%02d.mp4"
     */
    public async splitVideoByTimes({
                                       inputFile,
                                       times,
                                       outputFolder,
                                       outputFilePrefix
                                   }: {
        inputFile: string,
        times: number[],
        outputFolder: string,
        outputFilePrefix: string
    }): Promise<string[]> {
        // 设置扩展名和输入相同
        const outputFormat = path.join(outputFolder, `${outputFilePrefix}_%03d${path.extname(inputFile)}`);
        return new Promise((resolve, reject) => {
            ffmpeg(inputFile)
                .outputOptions([
                    '-f', 'segment',
                    '-segment_times', times.map(t => TimeUtil.secondToTimeStr(t)).join(','),
                    '-c', 'copy',
                    '-map', '0',
                    '-reset_timestamps', '1'
                ])
                .output(outputFormat)
                .on('end', async () => {
                    try {
                        const files = await FileUtil.listFiles(outputFolder);
                        // Filter the files to start with the output file prefix
                        const outputFiles = files.filter(file => file.startsWith(outputFilePrefix))
                            .map(file => path.join(outputFolder, file));
                        resolve(outputFiles);
                    } catch (e) {
                        reject(e);
                    }
                })
                .on('error', reject)
                .run();
        });
    }

    public async duration(filePath: string): Promise<number> {
        return await Lock.sync<number>('ffprobe', async () => {
            return new Promise<number>((resolve, reject) => {
                ffmpeg.ffprobe(filePath, (err, metadata) => {
                    if (err) reject(err);
                    else resolve(metadata.format.duration ?? 0);
                });
            });
        });
    }


    /**
     * 截取视频的缩略图
     *
     * input: eg:视频文件路径 /a/b/c.mp4
     * output: eg:缩略图文件路径 /a/b/c.jpg
     */
    public async thumbnail({
                               inputFile,
                               outputFileName,
                               outputFolder,
                               time
                           }: {
        inputFile: string,
        outputFileName: string,
        outputFolder: string,
        time: number
    }): Promise<void> {
        const totalDuration = await this.duration(inputFile);
        const timeStr = TimeUtil.secondToTimeStr(Math.min(time, totalDuration));
        console.log('timeStr', timeStr);
        if (!fs.existsSync(outputFolder)) {
            fs.mkdirSync(outputFolder, { recursive: true });
        }
        await Lock.sync('ffmpeg', async () => {
            await new Promise((resolve, reject) => {
                ffmpeg(inputFile)
                    .screenshots({
                        timestamps: [timeStr],
                        filename: outputFileName,
                        folder: outputFolder,
                        size: '320x?'
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
        });

    }


    /**
     * ffmpeg -i input.mp4 -vn -f segment -segment_time 600 -acodec libmp3lame -qscale:a 9 output%d.mp3
     * @param taskId
     * @param inputFile
     * @param outputFolder
     * @param segmentTime
     */
    public async splitToAudio({
                                  taskId,
                                  inputFile,
                                  outputFolder,
                                  segmentTime
                              }: {
        taskId: number,
        inputFile: string,
        outputFolder: string,
        segmentTime: number,
    }): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const outputFormat = path.join(outputFolder, 'output_%03d.mp3');
            const command = ffmpeg(inputFile)
                .outputOptions([
                    '-vn',
                    '-f', 'segment',
                    '-segment_time', `${segmentTime}`,
                    '-acodec', 'libmp3lame',
                    '-qscale:a', '9'
                ])
                .output(outputFormat)
                .on('end', () => {
                    // Get the list of files in the output directory
                    fs.readdir(outputFolder, (err, files) => {
                        if (err) {
                            reject(err);
                        } else {
                            // Filter the files to only include .mp3 files
                            const outputFiles = files.filter(file => path.extname(file) === '.mp3')
                                .map(file => path.join(outputFolder, file));
                            resolve(outputFiles);
                        }
                    });
                })
                .on('error', (err) => {
                    reject(err);
                });
            this.childProcessService.registerFfmpeg(taskId, [command]);
            command.run();
        });
    }

    /**
     * 视频转为mp4
     * ffmpeg -i input.mp4 -c:v libx264 -c:a aac output.mp4
     */
    public async toMp4({
                           inputFile,
                           onProgress
                       }: {
        inputFile: string,
        onProgress?: (progress: number) => void
    }): Promise<string> {
        const output = inputFile.replace(path.extname(inputFile), '.mp4');
        await Lock.sync('ffmpeg', async () => {
                await new Promise((resolve, reject) => {
                    ffmpeg(inputFile)
                        .output(output)
                        .on('progress', (progress) => {
                            if (progress.percent) {
                                console.log('progress', progress.percent);
                                if (onProgress) {
                                    onProgress(progress.percent);
                                }
                            }
                        })
                        .on('end', resolve)
                        .on('error', reject)
                        .run();
                });
            }
        );
        return output;
    }

    /**
     * mkv转mp4
     * ffmpeg -i "vid.mkv" -map 0 -c copy -c:a aac "MP4/vid.mp4"
     * ffmpeg -i output.mkv -map 0:v -map 0:a -c:v copy -c:a aac -ac 1 output.mp4
     */
    public async mkvToMp4({
                              taskId,
                              inputFile,
                              onProgress
                          }: {
        taskId: number,
        inputFile: string,
        onProgress?: (progress: number) => void
    }): Promise<string> {
        const output = inputFile.replace(path.extname(inputFile), '.mp4');
        await Lock.sync('ffmpeg', async () => {
                await new Promise((resolve, reject) => {
                    const command = ffmpeg(inputFile)
                        .outputOptions([
                            '-map', '0:v',
                            '-map', '0:a',
                            '-c:v', 'copy',
                            '-c:a', 'aac',
                            '-ac', '1'
                        ])
                        .output(output)
                        .on('progress', (progress) => {
                            if (progress.percent) {
                                console.log('progress', progress.percent);
                                if (onProgress) {
                                    onProgress(progress.percent);
                                }
                            }
                        })
                        .on('end', resolve)
                        .on('error', reject);
                    this.childProcessService.registerFfmpeg(taskId, [command]);
                    command
                        .run();
                });
            }
        );
        return output;
    }

    /**
     * 提取字幕
     * ffmpeg -i "vid.mkv" -map 0:s:m:language:eng? -map 0:s:0? -c:s srt "vid.srt"
     */
    public async extractSubtitles({
                                      taskId,
                                      inputFile,
                                      onProgress,
                                      en
                                  }: {
        taskId: number,
        inputFile: string,
        onProgress?: (progress: number) => void,
        en: boolean
    }): Promise<string> {
        const outputSubtitle = inputFile.replace(path.extname(inputFile), '.srt');
        await Lock.sync('ffmpeg', async () => {
                await new Promise((resolve, reject) => {
                    const mapSrt = en ? '0:s:m:language:eng?' : '0:s:0?';
                    const command = ffmpeg(inputFile)
                        .outputOptions([
                            '-map', mapSrt,
                            '-c:s', 'srt' // 输出格式为 srt
                        ])
                        .output(outputSubtitle)
                        .on('progress', (progress) => {
                            if (progress.percent) {
                                console.log('progress', progress.percent);
                                if (onProgress) {
                                    onProgress(progress.percent);
                                }
                            }
                        })
                        .on('end', resolve)
                        .on('error', reject);
                    this.childProcessService.registerFfmpeg(taskId, [command]);
                    command
                        .run();
                });
            }
        );
        return outputSubtitle;
    }

    /**
     * 截取视频的一部分并保存到指定路径。
     * @param {string} inputPath - 原视频文件的路径。
     * @param {number} startTime - 截取开始时间（秒）。
     * @param {number} endTime - 截取结束时间（秒）。
     * @param {string} outputPath - 输出视频文件的路径。
     */
    public async trimVideo(inputPath: string, startTime: number, endTime: number, outputPath: string) {
        const duration = endTime - startTime;
        await Lock.sync('ffmpeg', async () => {
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .setStartTime(startTime)
                    .setDuration(duration)
                    .audioChannels(1)
                    .videoCodec('libx265')
                    .audioCodec('aac')
                    .audioBitrate('64k')
                    .outputOptions(['-crf 28', '-vf scale=640:-1'])
                    .output(outputPath)
                    .on('start', function(commandLine) {
                        console.log('Spawned Ffmpeg with command: ' + commandLine);
                    })
                    .on('end', resolve)
                    .on('error', (err) => {
                        console.error('An error occurred while trimming video:', err);
                        reject(err);
                    })
                    .run();
            });
        });
    }

}

