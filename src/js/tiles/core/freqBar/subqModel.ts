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
import { Action, SEDispatcher, IActionQueue } from 'kombo';
import { Observable, merge } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { Dict, Ident } from 'cnc-tskit';

import { IAppServices } from '../../../appServices';
import { ConcApi, QuerySelector, RequestArgs } from '../../../common/api/kontext/concordance';
import { ViewMode, ConcResponse } from '../../../common/api/abstract/concordance';
import { stateToAPIArgs, SubqueryModeConf } from '../../../common/models/freq';
import { isSubqueryPayload, SubqueryPayload, SubQueryItem } from '../../../common/query';
import { Backlink } from '../../../common/tile';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { DataLoadedPayload } from './actions';
import { FreqBarModel, FreqBarModelState } from './model';
import { callWithExtraVal } from '../../../common/api/util';
import { IMultiBlockFreqDistribAPI, APIBlockResponse } from '../../../common/api/abstract/freqs';


export class SubqFreqBarModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTiles:Array<number>;
    appServices:IAppServices;
    api:IMultiBlockFreqDistribAPI<{}>;
    concApi:ConcApi;
    backlink:Backlink|null;
    initState:FreqBarModelState;
    subqConf:SubqueryModeConf;
    subqSourceTiles:Array<number>;
}


interface FreqLoadResult {
    resp: APIBlockResponse;
    query:string;
    critIdx:number
}


/**
 * SubqFreqBarModel is an extension of FreqBarModel
 * which produces its own concordances for provided
 * subqueries and then combines the results into
 * a single one (= multiple blocks/charts).
 *
 * To be able to use this tile there must exist at
 * least one other tile which generates 'TileDataLoaded'
 * action with 'SubqueryPayload'.
 */
export class SubqFreqBarModel extends FreqBarModel {

    private readonly subqConf:SubqueryModeConf;

    private readonly concApi:ConcApi;

    constructor({dispatcher, tileId, waitForTiles, subqSourceTiles, appServices, api, concApi, backlink, initState, subqConf}:SubqFreqBarModelArgs) {
        super({dispatcher, tileId, waitForTiles, subqSourceTiles, appServices, api, backlink, initState});
        this.subqConf = subqConf;
        this.concApi = concApi;
        this.extendActionHandler<GlobalActions.TileDataLoaded<DataLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload && isSubqueryPayload(action.payload) &&
                        Dict.hasKey(action.payload.tileId.toFixed(), this.subqSourceTiles)) {
                    state.blocks = action.payload.subqueries
                        .slice(0, this.subqConf.maxNumSubqueries)
                        .map(subq => ({
                            data: [],
                            ident: Ident.puid(),
                            label: subq.value,
                            isReady: false
                        }));
                }
            }
        );
    }


    private loadFreq(state:FreqBarModelState, corp:string, phrase:string, critIdx:number):Observable<FreqLoadResult> {
        return this.concApi.call({
            corpname: corp,
            kwicleftctx: '-1',
            kwicrightctx: '1',
            async: '1',
            pagesize: '5',
            fromp: '1',
            attr_vmode: 'mouseover', // TODO,
            attrs: 'word',
            viewmode: ViewMode.KWIC,
            shuffle: 0,
            queryselector: QuerySelector.PHRASE,
            phrase: phrase,
            format:'json'
        } as RequestArgs)
        .pipe(
            concatMap((v:ConcResponse) => callWithExtraVal(
                this.api,
                stateToAPIArgs(state, v.concPersistenceID, 0), // in subq-mode we accept only a single crit.
                phrase
            )),
            map(v => ({
                resp: v[0],
                query: v[1],
                critIdx: critIdx
            }))
        );
    }

    sideEffects(state:FreqBarModelState, action:Action, dispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                this.suspend(Dict.map(_ => true, this.waitForTiles), (action, syncData) => {
                    if (action.name === GlobalActionName.TileDataLoaded &&
                            Dict.hasKey(action.payload['tileId'].toFixed()) && isSubqueryPayload(action.payload), this.subqSourceTiles) {
                        const payload = action.payload as SubqueryPayload;
                        const subqueries:Array<{critIdx:number; v:SubQueryItem<string>}> = payload.subqueries
                                .slice(0, this.subqConf.maxNumSubqueries)
                                .map((v, i) => ({critIdx: i, v: v}));

                        merge(...subqueries.map(
                            subq => this.loadFreq(state, state.corpname, subq.v.value, subq.critIdx))

                        ).subscribe(
                            (data:FreqLoadResult) => {
                                    const block = data.resp.blocks[0];
                                    dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                        name: GlobalActionName.TileDataLoaded,
                                        payload: {
                                            tileId: this.tileId,
                                            isEmpty: !block,
                                            block: {
                                                data: block ?
                                                        block.data.sort(((x1, x2) => x1.freq - x2.freq)).slice(0, state.maxNumCategories) :
                                                        null
                                            },
                                            blockLabel: data.query,
                                            concId: null, // TODO do we need this?
                                            critIdx: data.critIdx
                                        }
                                    });
                            },
                            (err) => {
                                dispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                                    name: GlobalActionName.TileDataLoaded,
                                    payload: {
                                        tileId: this.tileId,
                                        isEmpty: true,
                                        block: null,
                                        blockLabel: null,
                                        concId: null,
                                        critIdx: null
                                    }
                                });
                                console.log('err: ', err);
                            }
                        );
                        const ans = {...syncData, ...{[payload.tileId.toFixed()]: false}};
                        return Dict.hasValue(true, ans) ? ans : null;
                    }
                    return syncData;
                });
            break;
        }
    }
}

export const factory =
    (subqConf:SubqueryModeConf, concApi:ConcApi) =>
    (
        dispatcher:IActionQueue,
        tileId:number,
        waitForTiles:Array<number>,
        subqSourceTiles:Array<number>,
        appServices:IAppServices,
        api:IMultiBlockFreqDistribAPI<{}>,
        backlink:Backlink|null,
        initState:FreqBarModelState
    ) => {
        return new SubqFreqBarModel({
            dispatcher: dispatcher,
            tileId: tileId,
            waitForTiles: waitForTiles,
            appServices: appServices,
            api: api,
            concApi: concApi,
            backlink: backlink,
            initState: initState,
            subqConf: subqConf,
            subqSourceTiles: subqSourceTiles
        });

    };