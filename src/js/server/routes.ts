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
import { NextFunction } from 'connect';
import { Express, Request, Response } from 'express';
import { ViewUtils } from 'kombo';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { Observable } from 'rxjs';
import { reduce } from 'rxjs/operators';
import { Database } from 'sqlite3';

import { AppServices } from '../appServices';
import { encodeArgs } from '../common/ajax';
import { ErrorType, mapToStatusCode, newError } from '../common/errors';
import { HostPageEnv, IToolbarProvider, QueryType } from '../common/types';
import { ClientStaticConf, mkRuntimeClientConf, ServerConf, UserConf } from '../conf';
import { defaultFactory as mainFormFactory } from '../models/query';
import { GlobalComponents } from '../views/global';
import { init as viewInit, LayoutProps } from '../views/layout';
import { ServerSideActionDispatcher } from './core';
import { emptyValue } from './toolbar/empty';



export interface Services {
    serverConf:ServerConf;
    clientConf:ClientStaticConf;
    db:Database;
    toolbar:IToolbarProvider;
    translations:{[loc:string]:{[key:string]:string}};
}


const mainAction = (services:Services, answerMode:boolean, req:Request, res:Response, next:NextFunction) => {

    const userConfig:UserConf = {
        uiLang: 'cs-CZ',
        query1Lang: req.query['lang1'] || 'cs',
        query2Lang: req.query['lang2'] || 'en',
        queryType: req.query['queryType'] || 'single',
        query1: req.query['q1'] || '',
        query2: req.query['q2'] || '',
        answerMode: answerMode
    };

    const dispatcher = new ServerSideActionDispatcher();

    const viewUtils = new ViewUtils<GlobalComponents>({
        uiLang: userConfig.uiLang,
        translations: services.translations,
        staticUrlCreator: (path) => services.clientConf.rootUrl + 'assets/' + path,
        actionUrlCreator: (path, args) => services.clientConf.hostUrl + path + '?' + encodeArgs(args)
    });
    const appServices = new AppServices({
        notifications: null, // TODO
        uiLang: userConfig.uiLang,
        translator: viewUtils,
        staticUrlCreator: viewUtils.createStaticUrl,
        actionUrlCreator: viewUtils.createActionUrl,
        dbValuesMapping: services.clientConf.dbValuesMapping || {},
        apiHeadersMapping: services.clientConf.apiHeaders || {}
    });

    const mainFormModel = mainFormFactory({
        dispatcher: dispatcher,
        appServices: appServices,
        query1: userConfig.query1,
        query1Lang: userConfig.query1Lang || '',
        query2: userConfig.query2,
        query2Lang: userConfig.query2Lang || '',
        queryType: userConfig.queryType as QueryType
    })
    const view = viewInit(dispatcher, viewUtils, mainFormModel);

    const renderResult = (toolbarData:HostPageEnv) => {
        const appString = renderToString(React.createElement<LayoutProps>(view, {
            config: mkRuntimeClientConf(services.clientConf, userConfig.query1Lang),
            userConfig: userConfig,
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
        new Observable<{word:string, abs:number, arf:number, pos:string}>((observer) => {
            services.db.serialize(() => {
                if (isNaN(parseInt(req.query.srchRange))) {
                    throw newError(ErrorType.BAD_REQUEST, `Invalid range provided, srchRange = ${req.query.srchRange}`);
                }
                const lft = Math.max(-1 * parseInt(req.query.srchRange), services.serverConf.auxServices.similarFreqWordsMaxCtx[0]);
                const rgt = Math.min(parseInt(req.query.srchRange), services.serverConf.auxServices.similarFreqWordsMaxCtx[1]);
                services.db.each(
                    'SELECT col0, col1, col2, `count` AS abs, arf, ' +
                    '(SELECT idx FROM colcounts WHERE col0 = ?) AS srch ' +
                    'FROM colcounts ' +
                    'WHERE idx >= srch + ? AND idx <= srch + ? ORDER BY idx;',
                    [req.query.word, lft, rgt],
                    (err, row) => {
                        if (err) {
                            observer.error(err);

                        } else {
                            observer.next({
                                word: row['col0'],
                                abs: row['abs'],
                                arf: row['arf'],
                                pos: row['col2']
                            });
                        }
                    },
                    (err) => {
                        if (err) {
                            observer.error(err);

                        } else {
                            observer.complete();
                        }
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
            },
            (err:Error) => {
                res.status(mapToStatusCode(err.name)).send({
                    message: err.message
                });
            }
        )
    });
}