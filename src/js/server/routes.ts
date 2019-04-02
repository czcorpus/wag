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
import { Observable, forkJoin } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';

import { AppServices } from '../appServices';
import { encodeArgs } from '../common/ajax';
import { ErrorType, mapToStatusCode, newError } from '../common/errors';
import { HostPageEnv, QueryType, LemmaVariant, importQueryPos, QueryPoS } from '../common/types';
import { mkRuntimeClientConf, UserConf } from '../conf';
import { defaultFactory as mainFormFactory } from '../models/query';
import { GlobalComponents } from '../views/global';
import { init as viewInit, LayoutProps } from '../views/layout';
import { ServerSideActionDispatcher } from './core';
import { emptyValue } from './toolbar/empty';
import { Services } from './actionServices';
import { getLemmas, getSimilarFreqWords } from './freqdb/freqdb';



const renderResult = (services:Services, toolbarData:HostPageEnv, lemmas:Array<LemmaVariant>, userConfig:UserConf, view:React.SFC<LayoutProps>):string => {
    const appString = renderToString(
        React.createElement<LayoutProps>(
            view,
            {
                config: mkRuntimeClientConf(services.clientConf, userConfig.query1Lang),
                userConfig: userConfig,
                hostPageEnv: toolbarData,
                lemmas: lemmas
            }
        )
    );
    return `<!DOCTYPE html>\n${appString}`;
};


const mainAction = (services:Services, answerMode:boolean, req:Request, res:Response, next:NextFunction) => {

    const userConfig:UserConf = {
        uiLang: 'cs-CZ',
        query1Lang: req.query['lang1'] || 'cs',
        query2Lang: req.query['lang2'] || 'en',
        queryType: req.query['queryType'] || 'single',
        queryPos: req.query['pos'],
        lemma1: req.query['lemma1'] || '',
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
        queryType: userConfig.queryType as QueryType,
        lemmas: [],
        isAnswerMode: answerMode
    });
    const view = viewInit(dispatcher, viewUtils, mainFormModel);

    forkJoin(
        new Observable<UserConf>(
            (observer) => {
                if (userConfig.queryType === QueryType.TRANSLAT_QUERY && userConfig.query1Lang === userConfig.query2Lang) {
                    userConfig.error = appServices.translate('global__src_and_dst_langs_must_be_different');
                }
                observer.next(userConfig);
                observer.complete();
            }
        ),
        services.toolbar.get(),
        getLemmas(services.db, appServices, userConfig.query1)
    )
    .subscribe(
        (ans) => {
            const [userSession, toolbar, lemmas] = ans;
            let currentFlagSolved = false;
            if (lemmas.length > 0) {
                if (userSession.queryPos) {
                    const srchIdx = lemmas.findIndex(v => v.pos === userSession.queryPos && (v.lemma === userSession.lemma1 || !userSession.lemma1));
                    if (srchIdx > -1) {
                        lemmas[srchIdx].isCurrent = true;
                    }
                    currentFlagSolved = true; // even if we do not set anything (error detected on client)
                }
                if (!currentFlagSolved) {
                    const numExact = lemmas.reduce((acc, curr) => curr.lemma === userSession.query1 ? acc + 1 : acc, 0);
                    if (numExact > 0) {
                        const exactMatchIdx = lemmas.findIndex(v => v.lemma === userSession.query1);
                        lemmas[exactMatchIdx].isCurrent = true;

                    } else {
                        lemmas[0].isCurrent = true;
                    }
                }
            }
            res.send(renderResult(services, toolbar, lemmas, userSession, view));
        },
        (err) => {
            console.log(err);
            userConfig.error = String(err);
            res.send(renderResult(services, emptyValue(), [], userConfig, view));
        }
    );
};



export const wdgRouter = (services:Services) => (app:Express) => {

    // host page generator with some React server rendering (testing phase)
    app.get('/', (req, res, next) => mainAction(services, false, req, res, next));

    app.get('/search/', (req, res, next) => mainAction(services, true, req, res, next));

    // Find words with similar frequency
    app.get('/similar-freq-words/', (req, res) => {

        const viewUtils = new ViewUtils<GlobalComponents>({
            uiLang: 'cs-CZ',
            translations: services.translations,
            staticUrlCreator: (path) => services.clientConf.rootUrl + 'assets/' + path,
            actionUrlCreator: (path, args) => services.clientConf.hostUrl + path + '?' + encodeArgs(args)
        });
        const appServices = new AppServices({
            notifications: null, // TODO
            uiLang: 'cs-CZ', // TODO
            translator: viewUtils,
            staticUrlCreator: viewUtils.createStaticUrl,
            actionUrlCreator: viewUtils.createActionUrl,
            dbValuesMapping: services.clientConf.dbValuesMapping || {},
            apiHeadersMapping: services.clientConf.apiHeaders || {}
        });

        new Observable<{word:string; lemma:string; pos:QueryPoS; rng:number}>((observer) => {
            if (isNaN(parseInt(req.query.srchRange))) {
                observer.error(
                    newError(ErrorType.BAD_REQUEST, `Invalid range provided, srchRange = ${req.query.srchRange}`));

            } else {
                observer.next({
                    word: req.query.word,
                    lemma: req.query.lemma,
                    pos: importQueryPos(req.query.pos),
                    rng: Math.min(req.query.srchRange, services.serverConf.auxServices.similarFreqWordsMaxCtx)
                });
                observer.complete();
            }
        }).pipe(
            concatMap(
                (data) => {
                    return getSimilarFreqWords(services.db, appServices, data.lemma, data.pos, data.rng);
                }
            ),
            map(
                (data) => data.sort((v1:LemmaVariant, v2:LemmaVariant) => {
                    if (v1.arf !== v2.arf) {
                        return v1.arf - v2.arf;
                    }
                    return v1.lemma.localeCompare(v2.lemma);
                })
            )
        )
        .subscribe(
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