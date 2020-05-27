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
import { StatelessModel } from 'kombo';

import { QueryType } from '../../../common/query/index';
import { ITileProvider, TileComponent, TileConf, TileFactory, Backlink } from '../../../common/tile';
import { SpeechesModel } from './model';
import { init as viewInit } from './view';
import { LocalizedConfMsg } from '../../../common/types';
import { SpeechesApi } from './api';
import { createAudioUrlGeneratorInstance } from './impl';
import { pipe, Color, List } from 'cnc-tskit';


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


export class SpeechesTile implements ITileProvider {


    private readonly model:SpeechesModel;

    private readonly tileId:number;

    private view:TileComponent;

    private readonly label:string;

    private readonly widthFract:number;

    private readonly blockingTiles:Array<number>;

    private static readonly DEFAULT_MAX_NUM_SPEECHES = 8;

    constructor({dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, subqSourceTiles, ut,
                theme, appServices, widthFract, conf, isBusy, cache}:TileFactory.Args<SpeechesTileConf>) {
        this.tileId = tileId;
        this.widthFract = widthFract;
        this.label = appServices.importExternalMessage(conf.label);
        this.blockingTiles = waitForTiles;
        const colorGen = theme.categoryPalette(List.repeat(v => v, 10));
        this.model = new SpeechesModel({
            dispatcher,
            tileId,
            appServices,
            api: new SpeechesApi(cache, conf.apiURL, appServices.getApiHeaders(conf.apiURL)),
            backlink: conf.backlink || null,
            waitForTiles,
            waitForTilesTimeoutSecs,
            subqSourceTiles,
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
                speakerColors: pipe(
                    List.repeat(v => v, 10),
                    List.map(v => Color.importColor(0.9, colorGen(v)))
                ),
                wideCtxGlobals: [],
                speakerColorsAttachments: {},
                spkOverlapMode: (conf.speechOverlapAttr || [])[1] ? 'full' : 'simple',
                expandLeftArgs: [],
                expandRightArgs: [],
                data: [],
                availTokens: [],
                tokenIdx: 0,
                kwicNumTokens: 1,
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

    exposeModel():StatelessModel<{}>|null {
        return this.model;
    }

    getBlockingTiles():Array<number> {
        return this.blockingTiles;
    }

    supportsMultiWordQueries():boolean {
        return true;
    }

    getIssueReportingUrl():null {
        return null;
    }
}

export const init:TileFactory.TileFactory<SpeechesTileConf>  = (args) => new SpeechesTile(args);