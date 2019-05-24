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

import { SpeechLines, ExpandArgs, Expand } from './modelDomain';
import { Action } from 'kombo';


export interface SpeechDataPayload {
    tokenNum:number;
    data:SpeechLines|null;
    expandRightArgs:ExpandArgs|null;
    expandLeftArgs:ExpandArgs|null;
}


export enum ActionName {
    ExpandSpeech = 'SPEECH_EXPAND_SPEECH',
    ExpandSpeechDone = 'SPEECH_EXPAND_SPEECH_DONE'
}


export namespace Actions {

    export interface ExpandSpeech extends Action<{
        tileId:number;
        position:Expand;
    }> {
        name:ActionName.ExpandSpeech;
    }

}