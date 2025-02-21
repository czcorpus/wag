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
import soundManager from '@vendor/SoundManager';



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

    private soundManager:typeof soundManager;

    private status:AudioPlayerStatus;

    constructor() {
        this.status = AudioPlayerStatus.STOPPED;
        this.soundManager = soundManager;
        this.soundManager.ontimeout = () => {
            console.error('Timeout error');
        };
        this.soundManager.setup({
            debugMode : false,
            preferFlash : false
        });
    }

    play<T extends {url:string}>(items:Array<T>):Observable<ChunkPlayback<T>> {
        const sessionId = `playback:${Ident.puid()}`;
        const itemsToPlay:Array<ItemToPlay<T>> = items.map((v, i) => ({
            idx: i,
            total: items.length,
            item: v
        }));
        return rxOf(...itemsToPlay).pipe(
            concatMap(
                (item) => new Observable<ChunkPlayback<T>>((observer) => {
                    this.soundManager.createSound({
                        id: sessionId,
                        url: item.item.url,
                        autoLoad: true,
                        autoPlay: false,
                        volume: 100,
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
                        onfinish: () => {
                            this.status = AudioPlayerStatus.STOPPED;
                            this.soundManager.destroySound(sessionId);
                            observer.next({
                                sessionId: sessionId,
                                isPlaying: false,
                                idx: item.idx,
                                total: item.total,
                                item: item.item
                            });
                            observer.complete();
                        },
                        onerror: () => {
                            observer.error(new Error('Error during playback'));
                        }
                    }).play();
                })
            )
        );

    }

    pause(sessionId:string):void {
        if (this.status === AudioPlayerStatus.PAUSED) {
            this.soundManager.play(sessionId);
            this.status = AudioPlayerStatus.PLAYING;

        } else if (this.status === AudioPlayerStatus.PLAYING) {
            this.soundManager.pause(sessionId);
            this.status = AudioPlayerStatus.PAUSED;
        }
    }

    stop(sessionId:string):void {
        this.soundManager.stop(sessionId);
        this.soundManager.destroySound(sessionId);
    }

    getStatus():AudioPlayerStatus {
        return this.status;
    }
}