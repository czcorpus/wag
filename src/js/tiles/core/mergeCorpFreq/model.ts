/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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
import { Action, StatelessModel, IActionQueue } from 'kombo';
import { forkJoin, Observable, throwError } from 'rxjs';
import { map, tap, flatMap } from 'rxjs/operators';

import { AppServices } from '../../../appServices';
import { APIResponse, BacklinkArgs, DataRow, FreqDistribAPI, SingleCritQueryArgs } from '../../../common/api/kontext/freqs';
import { callWithExtraVal } from '../../../common/api/util';
import { HTTPMethod } from '../../../common/types';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ConcLoadedPayload } from '../concordance/actions';
import { DataLoadedPayload } from './actions';
import { ConcApi, QuerySelector } from '../../../common/api/kontext/concordance';
import { LemmaVariant } from '../../../common/query';
import { ViewMode } from '../../../common/api/abstract/concordance';
import { createInitialLinesData } from '../../../common/models/concordance';



export interface ModelSourceArgs {

    corpname:string;

    corpusSize:number;

    fcrit:string;

    /**
     * In case 'fcrit' describes a positional
     * attribute we have to replace ann actual
     * value returned by freq. distrib. function
     * (which is equal to our query: e.g. for
     * the query 'house' the value will be 'house')
     * by something more specific (e.g. 'social media')
     */
    valuePlaceholder:string|null;

    flimit:number;

    freqSort:string;

    fpage:number;

    fttIncludeEmpty:boolean;

    backlinkTpl:Backlink;

    uuid:string;

    isSingleCategory:boolean;
}

export interface SourceMappedDataRow extends DataRow {
    sourceId:string;
    queryId:number;
    error?:Error;
    backlink:BacklinkWithArgs<BacklinkArgs>|null;
}

export interface MergeCorpFreqModelState {
    isBusy:boolean;
    isAltViewMode:boolean;
    error:string;
    data:Immutable.List<SourceMappedDataRow>;
    sources:Immutable.List<ModelSourceArgs>;
    pixelsPerItem:number;
    barGap:number;
    lemmas:Array<LemmaVariant>;
}

const sourceToAPIArgs = (src:ModelSourceArgs, concId:string):SingleCritQueryArgs => ({
    corpname: src.corpname,
    q: `~${concId}`,
    fcrit: src.fcrit,
    flimit: src.flimit,
    freq_sort: src.freqSort,
    fpage: src.fpage,
    ftt_include_empty: src.fttIncludeEmpty ? 1 : 0,
    format: 'json'
});


export class MergeCorpFreqModel extends StatelessModel<MergeCorpFreqModelState> {

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private waitingForTiles:Immutable.Map<number, {corpname:string; concId:string}>; // once not null for a key we know we can start to call freq

    private readonly concApi:ConcApi;

    private readonly freqApi:FreqDistribAPI;

    constructor(dispatcher:IActionQueue, tileId:number, waitForTiles:Array<number>, appServices:AppServices,
                    concApi:ConcApi, freqApi:FreqDistribAPI, initState:MergeCorpFreqModelState) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitingForTiles = Immutable.Map<number, {corpname:string; concId:string}>(waitForTiles.map(v => [v, null]));
        this.appServices = appServices;
        this.concApi = concApi;
        this.freqApi = freqApi;

        this.addActionHandler<GlobalActions.EnableAltViewMode>(
            GlobalActionName.EnableAltViewMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = true;
                }
            }
        );

        this.addActionHandler<GlobalActions.DisableAltViewMode>(
            GlobalActionName.DisableAltViewMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isAltViewMode = false;
                }
            }
        );

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                this.waitingForTiles = this.waitingForTiles.map(() => null).toMap();
                state.isBusy = true;
                state.error = null;
            },
            (state, action, dispatch) => {
                this.suspend((action:Action) => {
                    if (action.name === GlobalActionName.TileDataLoaded && this.waitingForTiles.has(action.payload['tileId'])) {
                        if (action.error) {
                            dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                name: GlobalActionName.TileDataLoaded,
                                error: new Error(this.appServices.translate('global__failed_to_obtain_required_data')),
                                payload: {
                                    tileId: this.tileId,
                                    isEmpty: true,
                                    data: [],
                                    concId: null // TODO
                                }
                            });
                            return true;
                        }
                        const payload = (action as GlobalActions.TileDataLoaded<ConcLoadedPayload>).payload;

                        if (this.waitingForTiles.get(payload.tileId) === null) {
                            this.waitingForTiles = this.waitingForTiles.set(
                                payload.tileId,
                                {corpname: payload.corpusName, concId: payload.concPersistenceIDs[0]}
                            );
                        }
                        if (!this.waitingForTiles.findKey(v => v === null)) {
                            this.loadFreqs(state).subscribe(
                                (data) => {
                                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                        name: GlobalActionName.TileDataLoaded,
                                        payload: {
                                            tileId: this.tileId,
                                            isEmpty: data.every(v => v.freq === 0),
                                            data: data,
                                            concId: null // TODO
                                        }
                                    });
                                },
                                (err) => {
                                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                        name: GlobalActionName.TileDataLoaded,
                                        payload: {
                                            tileId: this.tileId,
                                            isEmpty: true,
                                            data: [],
                                            concId: null // TODO
                                        },
                                        error: err
                                    });
                                }
                            );
                            return true;
                        }
                    }
                    return false;
                });
            }
        );

        this.addActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.data = Immutable.List<SourceMappedDataRow>();
                        state.error = action.error.message;

                    } else if (action.payload.data.length === 0) {
                        state.data = Immutable.List<SourceMappedDataRow>();

                    } else {
                        state.data = Immutable.List<SourceMappedDataRow>(action.payload.data);
                    }
                }
            }
        );

        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            (state, action) => {},
            (state, action, dispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.freqApi.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), action.payload['corpusId'])
                    .subscribe(
                        (data) => {
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                payload: {
                                    data: data
                                }
                            });
                        },
                        (err) => {
                            console.error(err);
                            dispatch({
                                name: GlobalActionName.GetSourceInfoDone,
                                error: err

                            });
                        }
                    );
                }
            }
        );
    }

    private createBackLink(source:ModelSourceArgs, concId:string):BacklinkWithArgs<BacklinkArgs> {
        return source.backlinkTpl ?
            {
                url: source.backlinkTpl.url,
                method: source.backlinkTpl.method || HTTPMethod.GET,
                label: source.backlinkTpl.label,
                args: {
                    corpname: source.corpname,
                    usesubcorp: null,
                    q: `~${concId}`,
                    fcrit: [source.fcrit],
                    flimit: source.flimit,
                    freq_sort: source.freqSort,
                    fpage: source.fpage,
                    ftt_include_empty: source.fttIncludeEmpty ? 1 : 0
                }
            } :
            null;
    }

    private loadConcordances(state:MergeCorpFreqModelState) {
        return state.sources.flatMap(source =>
            state.lemmas.map((lemma, queryId) =>
                this.concApi.call(
                    this.concApi.stateToArgs(
                        {
                            querySelector: QuerySelector.CQL,
                            corpname: source.corpname,
                            otherCorpname: undefined,
                            subcname: null,
                            subcDesc: null,
                            kwicLeftCtx: -1,
                            kwicRightCtx: 1,
                            pageSize: 10,
                            shuffle: false,
                            attr_vmode: 'mouseover',
                            viewMode: ViewMode.KWIC,
                            tileId: this.tileId,
                            attrs: [],
                            metadataAttrs: [],
                            queries: [],
                            concordances: createInitialLinesData(state.lemmas.length),
                            posQueryGenerator: ["tag", "ppTagset"] // TODO configuration
                        },
                        lemma,
                        queryId,
                        null
                    )
                ).pipe(
                    flatMap(resp =>
                        callWithExtraVal(
                            this.freqApi,
                            sourceToAPIArgs(source, resp.concPersistenceID),
                            {
                                sourceId: source.uuid,
                                queryId: queryId
                            }
                        )
                    )
                )
            )
        ).toArray()
    }

    private loadFreqs(state:MergeCorpFreqModelState):Observable<Array<SourceMappedDataRow>> {
        let streams$;
        if (state.lemmas.length > 1) {
            streams$ = this.loadConcordances(state);
        } else {
            streams$ = state.sources.map<Observable<[APIResponse, {sourceId:string; queryId:number;}]>>(src => {
                const srchKey = this.waitingForTiles.findKey(v => v && v.corpname === src.corpname);
                return srchKey !== undefined ?
                    callWithExtraVal(
                        this.freqApi,
                        sourceToAPIArgs(src, this.waitingForTiles.get(srchKey).concId),
                        {
                            sourceId: src.uuid,
                            queryId: 0
                        }                        
                    ) :
                    throwError(new Error(`Cannot find concordance result for ${src.corpname}. Passing an empty stream.`));
            }).toArray();
        }        

        return forkJoin(...streams$).pipe(
            map((partials:Array<[APIResponse, {sourceId:string; queryId:number;}]>) => {
                return partials.reduce<Array<SourceMappedDataRow>>((acc, curr) => {
                    const [resp, args] = curr;
                    const srcConf = state.sources.find(v => v.uuid === args.sourceId);
                    const dataNorm:Array<DataRow> = srcConf.isSingleCategory ?
                        [resp.data.reduce(
                            (acc, curr) => ({
                                name: '',
                                freq: acc.freq + curr.freq,
                                ipm: undefined,
                                norm: undefined,
                                order: undefined

                            }),
                            {
                                name: '',
                                freq: 0,
                                ipm: undefined,
                                norm: undefined,
                                order: undefined
                            }
                        )] :
                        resp.data;
                    return acc.concat(
                        (dataNorm.length > 0 ?
                            dataNorm :
                            [{name: srcConf.valuePlaceholder, freq: 0, ipm: 0, norm: 0}]
                        ).map(
                            v => {
                                const name = srcConf.valuePlaceholder ?
                                srcConf.valuePlaceholder :
                                this.appServices.translateDbValue(resp.corpname, v.name);

                                return v.ipm ?
                                    {
                                        sourceId: srcConf.uuid,
                                        queryId: args.queryId,
                                        backlink: this.createBackLink(srcConf, resp.concId),
                                        freq: v.freq,
                                        ipm: v.ipm,
                                        norm: v.norm,
                                        name: name
                                    } :
                                    {
                                        sourceId: srcConf.uuid,
                                        queryId: args.queryId,
                                        backlink: this.createBackLink(srcConf, resp.concId),
                                        freq: v.freq,
                                        ipm: Math.round(v.freq / srcConf.corpusSize * 1e8) / 100,
                                        norm: v.norm,
                                        name: name
                                    };
                                }
                        ));
                    },
                    []
                );
            })
        );
    }
}
