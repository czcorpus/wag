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

import { TileFactory, ITileProvider, TileConf } from './common/tile';
import { IFullActionControl, ViewUtils } from 'kombo';
import { GlobalComponents } from './views/global';
import { AppServices } from './appServices';
import { Theme } from './common/theme';
import { LayoutManager } from './layout';
import { QueryType, RecognizedQueries } from './common/query';
import { IAsyncKeyValueStore } from './common/types';
import { EmptyTile } from './tiles/core/empty';

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

type TileFactoryMap = {[tileType:string]:TileFactory.TileFactory<{}>};

const tileFactories:TileFactoryMap = {};

const applyContext = (ctx:any, tfMap:TileFactoryMap) => {
    (ctx.keys().map(ctx) as Array<DynamicTileModule>).forEach(m => {
        if (tfMap[m.TILE_TYPE]) {
            throw new Error(`Tile type name collision. Value ${m.TILE_TYPE} cannot be used`);
        }
        tfMap[m.TILE_TYPE] = m.init;
    });
};

// note: the 'require.context' is replaced by actual modules
// found during the build process by Webpack.
applyContext(require.context('./tiles/core', true, /\/index.ts$/), tileFactories);
applyContext(require.context('./tiles/custom', true, /\/index.ts$/), tileFactories);


export const mkTileFactory = (
    dispatcher:IFullActionControl,
    viewUtils:ViewUtils<GlobalComponents>,
    lemmas:RecognizedQueries,
    appServices:AppServices,
    theme:Theme,
    layoutManager:LayoutManager,
    queryType:QueryType,
    lang1:string,
    lang2:string,
    tileIdentMap:{[ident:string]:number},
    cache:IAsyncKeyValueStore) => (
            confName:string,
            conf:TileConf):ITileProvider|null => {

        if (conf.isDisabled || !layoutManager.isInCurrentLayout(queryType, tileIdentMap[confName])) {
            return new EmptyTile(tileIdentMap[confName]);

        } else {
            const initFn = tileFactories[conf.tileType];
            if (typeof initFn === 'undefined') {
                throw new Error(`Cannot invoke tile init() for ${confName} - type ${conf.tileType} not found. Check your src/js/tiles/custom directory.`);

            } else if (typeof initFn !== 'function') {
                throw new Error(`Cannot invoke tile init() for ${confName} (type ${conf.tileType}). Expected type [function], got [${typeof initFn}].`)
            }
            return initFn({
                tileId: tileIdentMap[confName],
                dispatcher: dispatcher,
                ut: viewUtils,
                lemmas: lemmas,
                appServices: appServices,
                lang1: lang1,
                lang2: lang2,
                queryType: queryType,
                waitForTiles: importDependentTilesList(conf.waitFor, conf.readSubqFrom).map(v => tileIdentMap[v]),
                waitForTilesTimeoutSecs: conf.waitForTimeoutSecs,
                subqSourceTiles: importDependentTilesList(conf.readSubqFrom).map(v => tileIdentMap[v]),
                widthFract: layoutManager.getTileWidthFract(queryType, tileIdentMap[confName]),
                theme: theme,
                conf: conf,
                isBusy: true,
                cache: cache
            });
        }
};
