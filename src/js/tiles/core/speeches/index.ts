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
import * as Immutable from 'immutable';
import { StatelessModel } from 'kombo';

import { QueryType } from '../../../common/query';
import { ITileProvider, TileComponent, TileConf, TileFactory, SourceInfoComponent, Backlink } from '../../../common/tile';
import { SpeechesModel } from './model';
import { init as viewInit } from './view';
import { createSourceInfoApiInstance } from '../../../common/api/factory/concordance';
import { DataApi, RGBAColor, LocalizedConfMsg } from '../../../common/types';
import { SpeechesApi } from './api';
import { ExpandArgs } from './modelDomain';
import { createAudioUrlGeneratorInstance } from './impl';


declare var require:(src:string)=>void;  // webpack
require('./style.less');


export interface SpeechesTileConf extends TileConf {
    apiType:string;
    apiURL:string;
    corpname:string;
    subcname?:string;
    subcDesc?:LocalizedConfMsg;
    speakerIdAttr:[string, string];
    speechSegment:[string, string];
    speechOverlapAttr:[string, string];
    speechOverlapVal:string;
    backlink?:Backlink,
    audioPlaybackUrl?:string;
    maxNumSpeeches?:number;
}

const BASE_COLOR_SCHEME = [
    [ 31, 119, 180, 0.9],
    [255, 127,  14, 0.9],
    [ 44, 160,  44, 0.9],
    [214,  39,  40, 0.9],
    [148, 103, 189, 0.9],
    [140,  86,  75, 0.9],
    [227, 119, 194, 0.9],
    [127, 127, 127, 0.9],
    [188, 189,  34, 0.9],
    [ 23, 190, 207, 0.9]
];


export class SpeechesTile implements ITileProvider {


    private readonly model:SpeechesModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    private readonly blockingTiles:Array<number>;

    private static readonly DEFAULT_MAX_NUM_SPEECHES = 8;

    constructor({dispatcher, tileId, waitForTiles, ut,
                theme, appServices, widthFract, mainForm, conf, isBusy, cache}:TileFactory.Args<SpeechesTileConf>) {
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.label = appServices.importExternalMessage(conf.label);
        this.blockingTiles = waitForTiles;
        this.model = new SpeechesModel({
            dispatcher: dispatcher,
            tileId: tileId,
            appServices: appServices,
            api: new SpeechesApi(cache, conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            mainForm: mainForm,
            backlink: conf.backlink || null,
            waitForTile: Array.isArray(waitForTiles) ? waitForTiles[0] : waitForTiles,
            audioLinkGenerator: conf.audioPlaybackUrl ?
                    createAudioUrlGeneratorInstance(conf.apiType, conf.audioPlaybackUrl) :
                    null,
            initState: {
                isBusy: isBusy,
                isTweakMode: false,
                isMobile: appServices.isMobileMode(),
                error: null,
                corpname: conf.corpname,
                subcname: conf.subcname,
                subcDesc: conf.subcDesc ? appServices.importExternalMessage(conf.subcDesc) : '',
                concId: null,
                speakerIdAttr: [conf.speakerIdAttr[0], conf.speakerIdAttr[1]],
                speechSegment: [conf.speechSegment[0], conf.speechSegment[1]],
                speechOverlapAttr: [conf.speechOverlapAttr[0], conf.speechOverlapAttr[1]],
                speechOverlapVal: conf.speechOverlapVal,
                speakerColors: Immutable.List<RGBAColor>(BASE_COLOR_SCHEME),
                wideCtxGlobals: Immutable.List<[string, string]>(),
                speakerColorsAttachments: Immutable.Map<string, RGBAColor>(),
                spkOverlapMode: (conf.speechOverlapAttr || [])[1] ? 'full' : 'simple',
                expandLeftArgs: Immutable.List<ExpandArgs>(),
                expandRightArgs: Immutable.List<ExpandArgs>(),
                data: [],
                availTokens: Immutable.List<number>(),
                tokenIdx: 0,
                backlink: null,
                playback: null,
                maxNumSpeeches: conf.maxNumSpeeches || SpeechesTile.DEFAULT_MAX_NUM_SPEECHES
            }
        });
        this.view = viewInit(dispatcher, ut, theme, this.model);
    }

    getLabel():string {
        return this.label;
    }

    getIdent():number {
        return this.tileId;
    }

    getView():TileComponent {
        return this.view;
    }

    getSourceInfoComponent():null {
        return null;
    }

    /**
     */
    supportsQueryType(qt:QueryType, lang1:string, lang2?:string):boolean {
        return qt === QueryType.SINGLE_QUERY;
    }

    // TODO ??
    disable():void {
    }

    getWidthFract():number {
        return this.widthFract;
    }

    supportsTweakMode():boolean {
        return true;
    }

    supportsAltView():boolean {
        return false;
    }

    exposeModelForRetryOnError():StatelessModel<{}>|null {
        return this.model;
    }

    getBlockingTiles():Array<number> {
        return this.blockingTiles;
    }
}

export const TILE_TYPE = 'SpeechesTile';

export const init:TileFactory.TileFactory<SpeechesTileConf>  = (args) => new SpeechesTile(args);