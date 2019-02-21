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
import * as Rx from '@reactivex/rxjs';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import {init as viewInit, LayoutProps} from '../views/layout';
import {Database} from 'sqlite3';
import {Express} from 'express';
import {ServerConf, ClientConf, UserConf} from '../common/conf';
import { ViewUtils } from 'kombo';
import { GlobalComponents } from '../views/global';
import { encodeArgs } from '../common/ajax';



export interface Services {
    serverConf:ServerConf;
    clientConf:ClientConf;
    db:Database;
    translations:{[loc:string]:{[key:string]:string}};
}

export const wdgRouter = (services:Services) => (app:Express) => {

    // host page generator with some React server rendering (testing phase)
    app.get('/', (req, res) => {

        const lang1 = req.query['lang1'] || 'cs';
        const uiLang = 'cs-CZ'; // TODO

        const viewUtils = new ViewUtils<GlobalComponents>({
            uiLang: uiLang,
            translations: services.translations,
            staticUrlCreator: (path) => services.clientConf.rootUrl + 'assets/' + path,
            actionUrlCreator: (path, args) => services.clientConf.hostUrl + path + '?' + encodeArgs(args)
        });
        const view = viewInit(null, viewUtils);
        const appString = renderToString(React.createElement<LayoutProps>(view, {
            config: services.clientConf,
            userConfig: {
                uiLang: uiLang,
                query1Lang: lang1,
                query2Lang: req.query['lang2'] || 'en',
                queryType: req.query['queryType'] || 'single',
                query1: req.query['q1'] || '',
                query2: req.query['q2'] || '',
                tilesConf: services.clientConf.tiles[lang1],
                dbValuesMapping: services.clientConf.dbValuesMapping,
                colors: services.clientConf.colors
            }
        }));
        res.send(`<!DOCTYPE html>${appString}`);
    });

    // Find words with similar frequency
    app.get('/similar-freq-words/', (req, res) => {
        new Rx.Observable<{word:string, abs:number}>((observer) => {
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

        }).reduce(
            (acc, curr) => {
                acc.push(curr);
                return acc;
            },
            []
        ).subscribe(
            (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({result: data}));
            }
        )
    });
}