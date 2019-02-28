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
import {Observable, forkJoin} from 'rxjs';
import {map} from 'rxjs/operators';
import {SingleCritQueryArgs, FreqDistribAPI, DataRow, APIResponse, BacklinkArgs} from '../../common/api/kontextFreqs';
import {StatelessModel, ActionDispatcher, Action, SEDispatcher} from 'kombo';
import {ActionName as GlobalActionName, Actions as GlobalActions} from '../../models/actions';
import {ActionName as ConcActionName, Actions as ConcActions} from '../concordance/actions';
import {ActionName, Actions} from './actions';
import { AppServices } from '../../appServices';
import { BacklinkWithArgs, Backlink, HTTPMethod } from '../../common/types';


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
}

export interface SourceMappedDataRow extends DataRow {
    sourceId:string;
    backlink:BacklinkWithArgs<BacklinkArgs>|null;
}

export interface MergeCorpFreqModelState {
    isBusy:boolean;
    error:string;
    data:Immutable.List<SourceMappedDataRow>;
    sources:Immutable.List<ModelSourceArgs>;
    pixelsPerItem:number;
}

const sourceToAPIArgs = (src:ModelSourceArgs, concId:string):SingleCritQueryArgs => ({
    corpname: src.corpname,
    q: `~${concId}`,
    fcrit: src.fcrit,
    flimit: src.flimit.toString(),
    freq_sort: src.freqSort,
    fpage: src.fpage.toString(),
    ftt_include_empty: src.fttIncludeEmpty ? '1' : '0',
    req_id: src.uuid,
    format: 'json'
});


export class MergeCorpFreqModel extends StatelessModel<MergeCorpFreqModelState> {

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private waitingForTiles:Immutable.Map<number, {corpname:string; concId:string}>; // once not null for a key we know we can start to call freq

    private readonly api:FreqDistribAPI;

    constructor(dispatcher:ActionDispatcher, tileId:number, waitForTiles:Array<number>, appServices:AppServices,
                    api:FreqDistribAPI, initState:MergeCorpFreqModelState) {
        super(dispatcher, initState);
        this.tileId = tileId;
        this.waitingForTiles = Immutable.Map<number, {corpname:string; concId:string}>(waitForTiles.map(v => [v, null]));
        this.appServices = appServices;
        this.api = api;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse) => {
                this.waitingForTiles = this.waitingForTiles.map(() => null).toMap();
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [ActionName.LoadDataDone]: (state, action:Actions.LoadDataDone) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.data = Immutable.List<SourceMappedDataRow>();
                        newState.error = action.error.message;

                    } else if (action.payload.data.length === 0) {
                        newState.data = Immutable.List<SourceMappedDataRow>();

                    } else {
                        newState.data = Immutable.List<SourceMappedDataRow>(action.payload.data);
                    }
                    return newState;
                }
                return state;
            }
        }
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
                    flimit: source.flimit.toFixed(),
                    freq_sort: source.freqSort,
                    fpage: source.fpage.toFixed(),
                    ftt_include_empty: source.fttIncludeEmpty ? '1' : '0'
                }
            } :
            null;
    }

    private loadFreqs(state:MergeCorpFreqModelState):Observable<Array<SourceMappedDataRow>> {
        const streams$ = state.sources.map<Observable<APIResponse>>(src => {
            const srchKey = this.waitingForTiles.findKey(v => v && v.corpname === src.corpname);
            return srchKey !== undefined ?
                this.api.call(sourceToAPIArgs(src, this.waitingForTiles.get(srchKey).concId)) :
                Observable.throw(new Error(`Cannot find concordance result for ${src.corpname}. Passing an empty stream.`));
        }).toArray();

        return forkJoin(...streams$).pipe(
            map((partials:Array<APIResponse>) => {
                return partials.reduce<Array<SourceMappedDataRow>>((acc, curr) => {
                    const srcConf = state.sources.find(v => v.uuid === curr.reqId);
                    return acc.concat(
                        (curr.data.length > 0 ?
                            curr.data :
                            [{name: srcConf.valuePlaceholder, freq: 0, ipm: 0, norm: 0}]
                        ).map(
                            v => {
                                const name = srcConf.valuePlaceholder ?
                                srcConf.valuePlaceholder :
                                this.appServices.translateDbValue(curr.corpname, v.name);

                                return v.ipm ?
                                    {
                                        sourceId: srcConf.uuid,
                                        backlink: this.createBackLink(srcConf, curr.concId),
                                        freq: v.freq,
                                        ipm: v.ipm,
                                        norm: v.norm,
                                        name: name
                                    } :
                                    {
                                        sourceId: srcConf.uuid,
                                        backlink: this.createBackLink(srcConf, curr.concId),
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

    sideEffects(state:MergeCorpFreqModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend((action:Action) => {
                    if (action.name === ConcActionName.DataLoadDone && this.waitingForTiles.has(action.payload['tileId'])) {
                        if (action.error) {
                            dispatch<Actions.LoadDataDone>({
                                name: ActionName.LoadDataDone,
                                error: new Error(this.appServices.translate('global__failed_to_obtain_required_data')),
                                payload: {
                                    data: [],
                                    concId: null, // TODO
                                    tileId: this.tileId
                                }
                            });
                            return true;
                        }
                        const payload = (action as ConcActions.DataLoadDone).payload;

                        if (this.waitingForTiles.get(payload.tileId) === null) {
                            this.waitingForTiles = this.waitingForTiles.set(
                                payload.tileId,
                                {corpname: payload.data.corpname, concId: payload.data.conc_persistence_op_id}
                            );
                        }
                        if (!this.waitingForTiles.findKey(v => v === null)) {
                            this.loadFreqs(state).subscribe(
                                (data) => {
                                    dispatch({
                                        name: ActionName.LoadDataDone,
                                        payload: {
                                            data: data,
                                            concId: null, // TODO
                                            tileId: this.tileId
                                        }
                                    });
                                },
                                (err) => {
                                    dispatch({
                                        name: ActionName.LoadDataDone,
                                        payload: {
                                            data: [],
                                            concId: null, // TODO
                                            tileId: this.tileId
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
            break;
        }
    }

}
