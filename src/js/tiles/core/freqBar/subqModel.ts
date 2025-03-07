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
import { IActionQueue } from 'kombo';
import { Observable, merge } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { Dict, Ident, List, pipe } from 'cnc-tskit';

import { IAppServices } from '../../../appServices.js';
import { ConcApi } from '../../../api/vendor/kontext/concordance/v015/index.js';
import { ViewMode, ConcResponse } from '../../../api/abstract/concordance.js';
import { SubqueryModeConf } from '../../../models/tiles/freq.js';
import { isSubqueryPayload, SubqueryPayload, SubQueryItem } from '../../../query/index.js';
import { Backlink } from '../../../page/tile.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { Actions } from './actions.js';
import { FreqBarModel, FreqBarModelState } from './model.js';
import { callWithExtraVal } from '../../../api/util.js';
import { IMultiBlockFreqDistribAPI, APIBlockResponse } from '../../../api/abstract/freqs.js';
import { CorePosAttribute } from '../../../types.js';


export class SubqFreqBarModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTiles:Array<number>;
    waitForTilesTimeoutSecs:number;
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

    constructor({dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, subqSourceTiles, appServices,
            api, concApi, backlink, initState, subqConf}:SubqFreqBarModelArgs) {
        super({dispatcher, tileId, waitForTiles, waitForTilesTimeoutSecs, subqSourceTiles, appServices,
            api, backlink, initState});
        this.subqConf = subqConf;
        this.concApi = concApi;

        this.extendActionHandler<typeof Actions.TileDataLoaded>(
            Actions.TileDataLoaded.name,
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

        this.addActionHandler<typeof GlobalActions.RequestQueryResponse>(
            GlobalActions.RequestQueryResponse.name,
            null,
            (state, action, dispatch) => {
                this.waitForActionWithTimeout(
                    this.waitForTilesTimeoutSecs * 1000,
                    Dict.map(_ => true, this.waitForTiles),
                    (action, syncData) => {
                        if (action.name === GlobalActions.TileDataLoaded.name &&
                                Dict.hasKey(action.payload['tileId'].toFixed()) && isSubqueryPayload(action.payload), this.subqSourceTiles) {
                            const payload = action.payload as SubqueryPayload;
                            const subqueries:Array<{critIdx:number; v:SubQueryItem<string>}> = payload.subqueries
                                    .slice(0, this.subqConf.maxNumSubqueries)
                                    .map((v, i) => ({critIdx: i, v: v}));

                            merge(...subqueries.map(
                                subq => this.loadFreq(state, state.corpname, subq.v.value, subq.critIdx))

                            ).subscribe({
                                next: (data:FreqLoadResult) => {
                                        const block = data.resp.blocks[0];
                                        dispatch<typeof Actions.TileDataLoaded>({
                                            name: Actions.TileDataLoaded.name,
                                            payload: {
                                                tileId: this.tileId,
                                                isEmpty: !block,
                                                block: {
                                                    data: block ?
                                                            pipe(
                                                                block.data,
                                                                List.sortedBy(x => x.freq),
                                                                List.slice(0, state.maxNumCategories)
                                                             ) :
                                                            null
                                                },
                                                blockLabel: data.query,
                                                concId: null, // TODO do we need this?
                                                critIdx: data.critIdx
                                            }
                                        });
                                },
                                error: error => {
                                    dispatch<typeof Actions.TileDataLoaded>({
                                        name: Actions.TileDataLoaded.name,
                                        payload: {
                                            tileId: this.tileId,
                                            isEmpty: true,
                                            block: null,
                                            blockLabel: null,
                                            concId: null,
                                            critIdx: null
                                        },
                                        error
                                    });
                                    console.error(error);
                                }
                            });
                            const ans = {...syncData, ...{[payload.tileId.toFixed()]: false}};
                            return Dict.hasValue(true, ans) ? ans : null;
                        }
                        return syncData;
                    }
                );
            }
        );
    }

    private loadFreq(
        state:FreqBarModelState,
        corp:string,
        phrase:string,
        critIdx:number
    ):Observable<FreqLoadResult> {

        return this.concApi.call(this.tileId, {
            type: 'concQueryArgs',
            queries: [{
                corpname: corp,
                qtype: 'simple',
                query: phrase,
                queryParsed: [ [ [['word', phrase]], false] ],
                qmcase: true,
                pcq_pos_neg: 'pos',
                include_empty: false,
                default_attr: 'word',
                use_regexp: false
            }],
            maincorp: corp,
            usesubcorp: undefined,
            viewmode: ViewMode.KWIC,
            pagesize: 1,
            shuffle: 0,
            fromp: 1,
            attr_vmode: 'visible-all',
            attrs: [CorePosAttribute.WORD],
            ctxattrs: [],
            structs: [],
            refs: [],
            text_types: {},
            context: {
                fc_lemword_window_type: undefined,
                fc_lemword_wsize: 0,
                fc_lemword: undefined,
                fc_lemword_type: undefined,
                fc_pos_window_type: undefined,
                fc_pos_wsize: undefined,
                fc_pos: [],
                fc_pos_type: undefined
            },
            base_viewattr: 'word',
            kwicleftctx: -5,
            kwicrightctx: 5
        })
        .pipe(
            concatMap((v:ConcResponse) => callWithExtraVal(
                this.api,
                this.tileId,
                this.api.stateToArgs(state, v.concPersistenceID, 0), // in subq-mode we accept only a single crit.
                phrase
            )),
            map(v => ({
                resp: v[0],
                query: v[1],
                critIdx: critIdx
            }))
        );
    }
}

export const factory =
    (subqConf:SubqueryModeConf, concApi:ConcApi) =>
    (
        dispatcher:IActionQueue,
        tileId:number,
        waitForTiles:Array<number>,
        waitForTilesTimeoutSecs:number,
        subqSourceTiles:Array<number>,
        appServices:IAppServices,
        api:IMultiBlockFreqDistribAPI<{}>,
        backlink:Backlink|null,
        initState:FreqBarModelState
    ) => {
        return new SubqFreqBarModel({
            dispatcher,
            tileId,
            waitForTiles,
            waitForTilesTimeoutSecs,
            appServices,
            api,
            concApi,
            backlink,
            initState,
            subqConf,
            subqSourceTiles
        });

    };