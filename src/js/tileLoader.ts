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

import { Observable, of as rxOf } from 'rxjs';
import { TileFactory, ITileProvider, TileConf } from './common/tile';
import { IFullActionControl, ViewUtils } from 'kombo';
import { GlobalComponents } from './views/global';
import { QueryFormModel } from './models/query';
import { AppServices } from './appServices';
import { Theme } from './common/theme';
import { LayoutManager } from './layout';
import { QueryType } from './common/query';
import { IAsyncKeyValueStore } from './common/types';
import { AnyTileConf, isExternalTileConf } from './conf';
import { EmptyTile } from './tiles/empty';

declare var require:any;

export interface DynamicTileModule {
    init:TileFactory.TileFactory<{}>;
    TILE_TYPE:string;
}

const importDependentTilesList = (...d:Array<string|Array<string>>):Array<string> => {
    const items = {};
    d.forEach(chunk => {
        if (chunk) {
            (typeof chunk === 'string' ? [chunk] : chunk).forEach(val => {
                items[val] = true;
            })
        }
    });
    return Object.keys(items);
};

const modContext = require.context('./tiles/', true, /index.ts$/);
const tileModules = {};
(modContext.keys().map(modContext) as Array<DynamicTileModule>).forEach(m => {
    if (tileModules[m.TILE_TYPE]) {
        throw new Error(`Tile type name collision. Value ${m.TILE_TYPE} cannot be used`);
    }
    tileModules[m.TILE_TYPE] = m.init;
});

export const mkTileFactory = (
    dispatcher:IFullActionControl,
    viewUtils:ViewUtils<GlobalComponents>,
    mainForm:QueryFormModel,
    appServices:AppServices,
    theme:Theme,
    layoutManager:LayoutManager,
    queryType:QueryType,
    lang1:string,
    lang2:string,
    tileIdentMap:{[ident:string]:number},
    cache:IAsyncKeyValueStore) => (
            confName:string,
            conf:AnyTileConf):ITileProvider|null => {

        const applyFactory = (initFn:TileFactory.TileFactory<{}>, conf:TileConf) => {
            console.log('applying factory ', conf.tileType, ' --> ', initFn)
            return initFn({
                tileId: tileIdentMap[confName],
                dispatcher: dispatcher,
                ut: viewUtils,
                mainForm: mainForm,
                appServices: appServices,
                lang1: lang1,
                lang2: lang2,
                waitForTiles: importDependentTilesList(conf.waitFor, conf.readSubqFrom).map(v => tileIdentMap[v]),
                subqSourceTiles: importDependentTilesList(conf.readSubqFrom).map(v => tileIdentMap[v]),
                widthFract: layoutManager.getTileWidthFract(queryType, tileIdentMap[confName]),
                theme: theme,
                conf: conf,
                isBusy: true,
                cache: cache
            });
        };
        if (conf.isDisabled || !layoutManager.isInCurrentLayout(queryType, tileIdentMap[confName])) {
            return new EmptyTile(tileIdentMap[confName]);

        } else {
            return applyFactory(tileModules[conf.tileType], conf);
        }
        /*
        if (conf.isDisabled || !layoutManager.isInCurrentLayout(queryType, tileIdentMap[confName])) {
            return rxOf(new EmptyTile(tileIdentMap[confName]));

        } else if (isExternalTileConf(conf)) {
            return loadDynamicTile(conf.tileType).pipe(
                concatMap(
                    (initModule) => applyFactory<ExternalTileConf>(initModule.init, conf)
                )
            );
        } else {
            switch (conf.tileType) {
                case 'ConcordanceTile':
                    return applyFactory<ConcordanceTileConf>(concInit, conf);
                case 'FreqBarTile':
                    return applyFactory<FreqBarTileConf>(freqInit, conf);
                case 'TimeDistribTile':
                    return applyFactory<TimeDistTileConf>(timeDistInit, conf);
                case 'CollocTile':
                    return applyFactory<CollocationsTileConf>(collocInit, conf);
                case 'TreqTile':
                    return applyFactory<TreqTileConf>(treqInit, conf);
                case 'TreqSubsetsTile':
                    return applyFactory<TreqSubsetsTileConf>(treqSubsetsInit, conf);
                case 'SyDTile':
                    return applyFactory<SyDTileConf>(sydInit, conf);
                case 'FreqPieTile':
                    return applyFactory<FreqPieTileConf>(freqPieInit, conf);
                case 'MergeCorpFreqTile':
                    return applyFactory<MergeCorpFreqTileConf>(MergeCorpFreqInit, conf);
                case 'WordFreqTile':
                    return applyFactory<WordFreqTileConf>(summaryInit, conf);
                case 'GeoAreasTile':
                    return applyFactory<GeoAreasTileConf>(geoAreasInit, conf);
                case 'ConcFilterTile':
                    return applyFactory<ConcFilterTileConf>(concFilterInit, conf);
                case 'WordFormsTile':
                    return applyFactory<WordFormsTileConf>(wordFormsInit, conf);
                case 'SpeechesTile':
                    return applyFactory<SpeechesTileConf>(speechesInit, conf);
                case 'DatamuseTile':
                    return applyFactory<DatamuseTileConf>(datamuseInit, conf);
                default:
                    throw new Error(`Tile factory error - unknown tile "${conf['tileType']}"`);
            }
        }
        */
};
