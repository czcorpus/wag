/*
 * Copyright 2016 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2016 Institute of the Czech National Corpus,
 *                Faculty of Arts, Charles University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { of as rxOf, Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { Ident } from 'cnc-tskit';
import { Howl } from 'howler';



export enum AudioPlayerStatus {
    STOPPED = 'stop',
    PAUSED = 'pause',
    PLAYING = 'play',
    ERROR = 'error'
}

export interface ChunkPlayback<T> {
    sessionId:string;
    idx:number;
    total:number;
    isPlaying:boolean;
    item:T;
}

interface ItemToPlay<T> {
    idx:number;
    total:number;
    item:T;
}

/**
 *
 */
export class AudioPlayer {

    private status:AudioPlayerStatus;

    private sound:Howl;

    constructor() {
        this.status = AudioPlayerStatus.STOPPED;
    }

    play<T extends {url:string, format:string}>(items:Array<T>): Observable<ChunkPlayback<T>> {
        const sessionId = `playback:${Ident.puid()}`;
        const itemsToPlay:Array<ItemToPlay<T>> = items.map((v, i) => ({
            idx: i,
            total: items.length,
            item: v
        }));
        return rxOf(...itemsToPlay).pipe(
            concatMap(
                (item) => new Observable<ChunkPlayback<T>>((observer) => {
                    this.sound = new Howl({
                        src: [item.item.url],
                        volume: 1.0,
                        autoplay: false,
                        format: [item.item.format],
                        onload: () => {
                            this.status = AudioPlayerStatus.ERROR;
                        },
                        onplay: () => {
                            this.status = AudioPlayerStatus.PLAYING;
                            observer.next({
                                sessionId: sessionId,
                                isPlaying: true,
                                idx: item.idx,
                                total: item.total,
                                item: item.item
                            });
                        },
                        onend: () => {
                            this.status = AudioPlayerStatus.STOPPED;
                            observer.next({
                                sessionId: sessionId,
                                isPlaying: false,
                                idx: item.idx,
                                total: item.total,
                                item: item.item
                            });
                            observer.complete();
                        },
                        onloaderror: () => {
                            observer.error(new Error('Error during playback'));
                        },
                        onplayerror: () => {
                            observer.error(new Error('Error during playback'));
                        }
                    });
                    this.sound.play();
                })
            )
        );
    }

    pause():void {
        if (this.status === AudioPlayerStatus.PAUSED) {
            this.sound.play();
            this.status = AudioPlayerStatus.PLAYING;
        } else if (this.status === AudioPlayerStatus.PLAYING) {
            this.sound.pause();
            this.status = AudioPlayerStatus.PAUSED;
        }
    }

    stop():void {
        if (this.sound) {
            this.sound.stop();
            this.sound.unload();
        }
    }

    getStatus():AudioPlayerStatus {
        return this.status;
    }
}