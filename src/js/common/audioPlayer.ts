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

import { of as rxOf, Observable, Subscription } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import 'soundmanager2';
import { puid } from './util';


export enum AudioPlayerStatus {
    STOPPED = 'stop',
    PAUSED = 'pause',
    PLAYING = 'play',
    ERROR = 'error'
}

export interface ChunkPlayback {
    sessionId:string;
    idx:number;
    total:number;
    isPlaying:boolean;
}

interface ItemToPlay {
    path:string;
    idx:number;
    total:number;
}

/**
 *
 */
export class AudioPlayer {

    private soundManager:soundmanager.SoundManager;

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

    play(items:Array<string>):Observable<ChunkPlayback> {
        const sessionId = `playback:${puid()}`;
        const itemsToPlay:Array<ItemToPlay> = items.map((v, i) => ({
            path: v,
            idx: i,
            total: items.length
        }));
        return rxOf(...itemsToPlay).pipe(
            concatMap(
                (item) => new Observable<ChunkPlayback>((observer) => {
                    this.soundManager.createSound({
                        id: sessionId,
                        url: item.path,
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
                                total: item.total
                            });
                        },
                        onfinish: () => {
                            this.status = AudioPlayerStatus.STOPPED;
                            this.soundManager.destroySound(sessionId);
                            observer.next({
                                sessionId: sessionId,
                                isPlaying: false,
                                idx: item.idx,
                                total: item.total
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