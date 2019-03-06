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
import {Observable} from 'rxjs';
import {reduce} from 'rxjs/operators';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import {init as viewInit, LayoutProps} from '../views/layout';
import {Database} from 'sqlite3';
import {Express, Request, Response} from 'express';
import {ServerConf, ClientConf} from '../common/conf';
import { ViewUtils } from 'kombo';
import { GlobalComponents } from '../views/global';
import { encodeArgs } from '../common/ajax';
import { defaultFactory as mainFormFactory} from '../models/query';
import { AppServices } from '../appServices';
import {ServerSideActionDispatcher} from './core';
import { IToolbarProvider, HostPageEnv } from '../common/types';
import { NextFunction } from 'connect';
import { emptyValue } from './toolbar/empty';



export interface Services {
    serverConf:ServerConf;
    clientConf:ClientConf;
    db:Database;
    toolbar:IToolbarProvider;
    translations:{[loc:string]:{[key:string]:string}};
}


const mainAction = (services:Services, answerMode:boolean, req:Request, res:Response, next:NextFunction) => {

    const uiLang = 'cs-CZ'; // TODO
    const query1Lang = req.query['lang1'] || 'cs';
    const query2Lang = req.query['lang2'] || 'en';
    const queryType = req.query['queryType'] || 'single';
    const query1 = req.query['q1'] || '';
    const query2 = req.query['q2'] || '';

    const dispatcher = new ServerSideActionDispatcher();

    const viewUtils = new ViewUtils<GlobalComponents>({
        uiLang: uiLang,
        translations: services.translations,
        staticUrlCreator: (path) => services.clientConf.rootUrl + 'assets/' + path,
        actionUrlCreator: (path, args) => services.clientConf.hostUrl + path + '?' + encodeArgs(args)
    });
    const appServices = new AppServices({
        notifications: null, // TODO
        uiLang: uiLang,
        translator: viewUtils,
        staticUrlCreator: viewUtils.createStaticUrl,
        actionUrlCreator: viewUtils.createActionUrl,
        dbValuesMapping: services.clientConf.dbValuesMapping || {},
        apiHeadersMapping: services.clientConf.apiHeaders || {}
    });

    const mainFormModel = mainFormFactory({
        dispatcher: dispatcher,
        appServices: appServices,
        query1: query1,
        query1Lang: query1Lang || '',
        query2: query2,
        query2Lang: query2Lang || '',
        queryType: queryType
    })
    const view = viewInit(dispatcher, viewUtils, mainFormModel);

    const renderResult = (toolbarData:HostPageEnv) => {
        const appString = renderToString(React.createElement<LayoutProps>(view, {
            config: services.clientConf,
            userConfig: {
                uiLang: uiLang,
                query1Lang: query1Lang,
                query2Lang: query2Lang,
                queryType: queryType,
                query1: query1,
                query2: query2,
                tilesConf: services.clientConf.tiles[query1Lang],
                answerMode: answerMode
            },
            hostPageEnv: toolbarData
        }));
        res.send(`<!DOCTYPE html>${appString}`);
    };

    services.toolbar.get().subscribe(
        (toolbarData) => {
            renderResult(toolbarData);
        },
        (err) => {
            console.log(err);
            renderResult(emptyValue());
        }
    );
};



export const wdgRouter = (services:Services) => (app:Express) => {

    // host page generator with some React server rendering (testing phase)
    app.get('/', (req, res, next) => mainAction(services, false, req, res, next));

    app.get('/search/', (req, res, next) => mainAction(services, true, req, res, next));

    // Find words with similar frequency
    app.get('/similar-freq-words/', (req, res) => {
        new Observable<{word:string, abs:number}>((observer) => {
            services.db.serialize(() => {
                services.db.each(
                    'SELECT value, `count` AS abs, (SELECT idx FROM postag WHERE value = ?) AS srch ' +
                    'FROM postag ' +
                    'WHERE idx >= srch + ? AND idx <= srch + ? AND idx <> srch ORDER BY idx;',
                    [
                        req.query.word,
                        services.serverConf.auxServices.similarFreqWordsCtx[0],
                        services.serverConf.auxServices.similarFreqWordsCtx[1]
                    ],
                    (err, row) => {
                        if (err) {
                            observer.error(err);

                        } else {
                            observer.next({
                                word: row['value'],
                                abs: row['abs']
                            });
                        }
                    },
                    () => {
                        observer.complete();
                    }
                );
            });

        }).pipe(
            reduce<{word:string; abs:number}>(
                (acc, curr) => {
                    acc.push(curr);
                    return acc;
                },
                []
            )
        ).subscribe(
            (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({result: data}));
            }
        )
    });
}