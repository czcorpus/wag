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
import { Action, SEDispatcher, StatelessModel, IActionQueue } from 'kombo';

import { AppServices } from '../../../appServices';
import { SystemMessageType } from '../../../common/types';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { DataLoadedPayload } from './common';
import { RawHtmlAPI, WiktionaryHtmlAPI } from './service';
import { QueryFormModel, findCurrLemmaVariant } from '../../../models/query';
import * as sanitizeHtml from 'sanitize-html';


export interface HtmlModelArgs {
    dispatcher:IActionQueue;
    tileId:number;
    appServices:AppServices;
    service:RawHtmlAPI|WiktionaryHtmlAPI;
    maxTileHeight:string;
    initState:HtmlModelState;
    mainForm:QueryFormModel;
}

export interface HtmlModelState {
    isBusy:boolean;
    tileId:number;
    error:string|null;
    widthFract:number;
    data:string|null;
    args:{[key:string]:string};
    lemmaArg:string;
    styles:string;
    stylesPath:string;
}


export class HtmlModel extends StatelessModel<HtmlModelState> {
    private readonly mainForm:QueryFormModel;

    private readonly service:RawHtmlAPI|WiktionaryHtmlAPI;

    private readonly appServices:AppServices;

    private readonly tileId:number;

    readonly maxTileHeight:string;

    constructor({dispatcher, tileId, appServices, service, maxTileHeight, initState, mainForm}:HtmlModelArgs) {
        super(dispatcher, initState);
        this.maxTileHeight = maxTileHeight;
        this.tileId = tileId;
        this.appServices = appServices;
        this.service = service;
        this.mainForm = mainForm;
        this.actionMatch = {
            [GlobalActionName.RequestQueryResponse]: (state, action:GlobalActions.RequestQueryResponse)  => {
                const newState = this.copyState(state);
                newState.isBusy = true;
                newState.error = null;
                return newState;
            },
            [GlobalActionName.TileDataLoaded]: (state, action:GlobalActions.TileDataLoaded<DataLoadedPayload>) => {
                if (action.payload.tileId === this.tileId) {
                    const newState = this.copyState(state);
                    newState.isBusy = false;
                    if (action.error) {
                        newState.error = action.error.message;
                    } else {
                        newState.data = sanitizeHtml(action.payload.data, {
                            allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img' ])
                        });
                    }
                    return newState;
                }
                return state;
            }
        }
    }

    private requestData(state:HtmlModelState, variant:string, seDispatch:SEDispatcher):void {
        const additionalArgs = {}
        if (state.lemmaArg) {additionalArgs[state.lemmaArg] = variant}

        this.service.call({...state.args, ...additionalArgs}).subscribe(
            (data) => {
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: Boolean(data),
                        data: data,
                    }
                });
            },
            (err) => {
                this.appServices.showMessage(SystemMessageType.ERROR, err);
                seDispatch<GlobalActions.TileDataLoaded<DataLoadedPayload>>({
                    name: GlobalActionName.TileDataLoaded,
                    payload: {
                        tileId: this.tileId,
                        isEmpty: true,
                        data: null,
                    },
                    error: err
                });
            }
        );
    }

    sideEffects(state:HtmlModelState, action:Action, seDispatch:SEDispatcher):void {
        switch (action.name) {
            case GlobalActionName.RequestQueryResponse:
                const formState = this.mainForm.getState();
                const variant = findCurrLemmaVariant(formState.lemmas);
                this.requestData(state, variant.lemma, seDispatch);
            break;
        }
    }
}