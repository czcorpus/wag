/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
 *                Faculty of Arts, Charles University
 *
 * .pipe()

 Licensed under the Apache License, Version 2.0 (the "License");
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

import { SEDispatcher, StatelessModel, IActionQueue } from 'kombo';
import { Observable } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { AppServices } from '../../../appServices';
import { Line, IConcordanceApi } from '../../../common/api/abstract/concordance';
import { ConcordanceMinState } from '../../../common/models/concordance';
import { HTTPMethod, SystemMessageType } from '../../../common/types';
import { isSubqueryPayload, RecognizedQueries } from '../../../common/query';
import { Backlink, BacklinkWithArgs } from '../../../common/tile';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { findCurrLemmaVariant } from '../../../models/query';
import { importMessageType } from '../../../notifications';
import { ActionName, Actions, ConcLoadedPayload } from './actions';
import { normalizeTypography } from '../../../common/models/concordance/normalize';
import { isCollocSubqueryPayload } from '../../../common/api/abstract/collocations';



export interface BacklinkArgs {
    corpname:string;
    usesubcorp:string;
    q:string;
}


export interface ConcordanceTileState extends ConcordanceMinState {
    isBusy:boolean;
    error:string|null;
    isTweakMode:boolean;
    isMobile:boolean;
    widthFract:number;
    lines:Array<Line>;
    currPage:number;
    concsize:number;
    numPages:number;
    resultARF:number;
    resultIPM:number;
    initialKwicLeftCtx:number;
    initialKwicRightCtx:number;
    backlink:BacklinkWithArgs<BacklinkArgs>;
    disableViewModes:boolean;
}


export interface ConcordanceTileModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    waitForTile:number;
    appServices:AppServices;
    service:IConcordanceApi<{}>;
    lemmas:RecognizedQueries;
    initState:ConcordanceTileState;
    backlink:Backlink;
}


export class ConcordanceTileModel extends StatelessModel<ConcordanceTileState> {

    private readonly service:IConcordanceApi<{}>;

    private readonly lemmas:RecognizedQueries;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    private readonly backlink:Backlink;

    private readonly waitForTile:number;

    public static readonly CTX_SIZES = [3, 3, 8, 12];

    constructor({dispatcher, tileId, appServices, service, lemmas, initState, waitForTile, backlink}:ConcordanceTileModelArgs) {
        super(dispatcher, initState);
        this.service = service;
        this.lemmas = lemmas;
        this.appServices = appServices;
        this.tileId = tileId;
        this.backlink = backlink;
        this.waitForTile = waitForTile;

        this.addActionHandler<GlobalActions.SetScreenMode>(
            GlobalActionName.SetScreenMode,
            (state, action) => {
                if (action.payload.isMobile !== state.isMobile) {
                    state.isMobile = action.payload.isMobile;
                    if (action.payload.isMobile) {
                        state.kwicLeftCtx = ConcordanceTileModel.CTX_SIZES[0];
                        state.kwicRightCtx = ConcordanceTileModel.CTX_SIZES[0];

                    } else {
                        state.kwicLeftCtx = state.initialKwicLeftCtx;
                        state.kwicRightCtx = state.initialKwicRightCtx;
                    }
                }
            },
            (state, action, dispatch) => {
                if (state.lines.length > 0) {
                    this.reloadData(state, dispatch, null);
                }
            }
        );

        this.addActionHandler<GlobalActions.EnableTileTweakMode>(
            GlobalActionName.EnableTileTweakMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isTweakMode = true;
                }
            }
        );

        this.addActionHandler<GlobalActions.DisableTileTweakMode>(
            GlobalActionName.DisableTileTweakMode,
            (state, action) => {
                if (action.payload.ident === this.tileId) {
                    state.isTweakMode = false;
                }
            }
        );

        this.addActionHandler<GlobalActions.RequestQueryResponse>(
            GlobalActionName.RequestQueryResponse,
            (state, action) => {
                state.isBusy = true;
                state.error = null;
                state.concId = null;
            },
            (state, action, dispatch) => {
                if (this.waitForTile) {
                    this.suspend(
                        (action) => {
                            if (action.name === GlobalActionName.TileDataLoaded && action.payload['tileId'] === this.waitForTile) {
                                if (isCollocSubqueryPayload(action.payload)) {
                                    const cql = `[word="${action.payload.subqueries.map(v => v.value.value).join('|')}"]`; // TODO escape
                                    this.reloadData(state, dispatch, cql);

                                } else if (isSubqueryPayload(action.payload)) {
                                    const cql = `[word="${action.payload.subqueries.map(v => v.value).join('|')}"]`; // TODO escape
                                    this.reloadData(state, dispatch, cql);
                                }
                                return true;
                            }
                            return false;
                        }
                    );
                } else {
                    this.reloadData(state, dispatch, null);
                }
            }
        );

        this.addActionHandler<GlobalActions.TileDataLoaded<ConcLoadedPayload>>(
            GlobalActionName.TileDataLoaded,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = false;
                    if (action.error) {
                        state.error = action.error.message;

                    } else {
                        // debug:
                        action.payload.data.messages.forEach(msg => console.log(`${importMessageType(msg[0]).toUpperCase()}: conc - ${msg[1]}`));

                        state.lines = normalizeTypography(action.payload.data.lines);
                        state.concsize = action.payload.data.concsize; // TODO fullsize?
                        state.resultARF = action.payload.data.arf;
                        state.resultIPM = action.payload.data.ipm;
                        state.currPage = state.loadPage;
                        state.numPages = Math.ceil(state.concsize / state.pageSize);
                        state.backlink = this.createBackLink(state, action);
                        state.concId = action.payload.data.concPersistenceID;
                    }
                }
            }
        );

        this.addActionHandler<Actions.LoadNextPage>(
            ActionName.LoadNextPage,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = true;
                    state.error = null;
                    state.loadPage = state.currPage + 1;
                }
            },
            (state, action, dispatch) => {
                if (action.payload['tileId'] === this.tileId) {
                    this.reloadData(state, dispatch, null);
                }
            }
        ).sideEffectAlsoOn(
            ActionName.LoadPrevPage,
            ActionName.SetViewMode
        );

        this.addActionHandler<Actions.LoadPrevPage>(
            ActionName.LoadPrevPage,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    if (state.currPage - 1 > 0) {
                        state.isBusy = true;
                        state.error = null;
                        state.loadPage = state.currPage - 1;

                    } else {
                        this.appServices.showMessage(SystemMessageType.ERROR, 'Cannot load page < 1');
                    }
                }
            }
        );

        this.addActionHandler<Actions.SetViewMode>(
            ActionName.SetViewMode,
            (state, action) => {
                if (action.payload.tileId === this.tileId) {
                    state.isBusy = true;
                    state.error = null;
                    state.viewMode = action.payload.mode;
                }
            }
        );

        this.addActionHandler<GlobalActions.GetSourceInfo>(
            GlobalActionName.GetSourceInfo,
            null,
            (state, action, dispatch) => {
                if (action.payload.tileId === this.tileId) {
                    this.service.getSourceDescription(this.tileId, this.appServices.getISO639UILang(), state.corpname)
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
        )
    }

    private createBackLink(state:ConcordanceTileState, action:GlobalActions.TileDataLoaded<ConcLoadedPayload>):BacklinkWithArgs<BacklinkArgs> {
        return this.backlink ?
            {
                url: this.backlink.url,
                method: this.backlink.method || HTTPMethod.GET,
                label: this.backlink.label,
                args: {
                    corpname: state.corpname,
                    usesubcorp: state.subcname,
                    q: `~${action.payload.data.concPersistenceID}`
                }
            } :
            null;
    }

    private reloadData(state:ConcordanceTileState, dispatch:SEDispatcher, otherLangCql:string):void {
        new Observable<{}>((observer) => {
            try {
                observer.next(this.service.stateToArgs(state, state.concId ? null : findCurrLemmaVariant(this.lemmas[0]), otherLangCql));
                observer.complete();

            } catch (e) {
                observer.error(e);
            }

        }).pipe(
            concatMap(args => this.service.call(args))
        )
        .subscribe(
            (data) => {
                dispatch<GlobalActions.TileDataLoaded<ConcLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: data.lines.length === 0,
                        canBeAmbiguousResult: true,
                        data: data,
                        subqueries: data.lines.map(v => ({value: `${v.toknum}`, interactionId: v.interactionId})),
                        lang1: null,
                        lang2: null
                    }
                });
            },
            (err) => {
                console.error(err);
                dispatch<GlobalActions.TileDataLoaded<ConcLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    error: err,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        data: {
                            query: '',
                            corpName: state.corpname,
                            primaryCorp: '',
                            subcorpName: state.subcname,
                            lines: [],
                            concsize: 0,
                            arf: 0,
                            ipm: 0,
                            messages: [],
                            concPersistenceID: ''
                        },
                        subqueries: [],
                        lang1: null,
                        lang2: null
                    }
                });
            }
        );
    }
}