/*
 * Copyright 2019 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2019 Institute of the Czech National Corpus,
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

import { ExpandArgs, Expand, Segment } from './modelDomain.js';
import { Action } from 'kombo';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { MarkupToken, SpeechToken } from './api.js';


export interface SpeechDataPayload {
    tileId:number;
    isEmpty:boolean;
    availableTokens:Array<number>;
    concId:string|null;
    kwicNumTokens:number;
    data:Array<SpeechToken|MarkupToken>;
}


export class Actions {

    static ExpandSpeech:Action<{
        tileId:number;
        position:Expand;
    }> = {
        name: 'SPEECH_EXPAND_SPEECH'
    };

    static LoadAnotherSpeech:Action<{
        tileId:number;
    }> = {
        name: 'SPEECH_LOAD_ANOTHER_SPEECH'
    };

    static ClickAudioPlayer:Action<{
        tileId:number;
        lineIdx:number;
        segments:Array<Segment>;
    }> = {
        name: 'SPEECH_CLICK_AUDIO_PLAYER'
    };

    static ClickAudioPlayAll:Action<{
        tileId:number;
    }> = {
        name: 'SPEECH_CLICK_AUDIO_PLAY_ALL'
    };

    static AudioPlayerStarted:Action<{
        tileId:number;
        playbackSession:string;
    }> = {
        name: 'SPEECH_AUDIO_PLAYER_STARTED'
    }

    static AudioPlayerStopped:Action<{
        tileId:number;
    }> = {
        name: 'SPEECH_AUDIO_PLAYER_STOPPED'
    };

    static PlayedLineChanged:Action<{
        tileId:number;
        lineIdx:number;
    }> = {
        name: 'SPEECH_PLAYED_LINE_CHANGED'
    };

    static TileDataLoaded:Action<typeof GlobalActions.TileDataLoaded.payload & SpeechDataPayload> = {
        name: GlobalActions.TileDataLoaded.name
    };
}