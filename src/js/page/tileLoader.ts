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

import { IFullActionControl, ViewUtils } from 'kombo';
import { List, Dict, pipe } from 'cnc-tskit';

import { TileFactory, ITileProvider, TileConf } from './tile.js';
import { GlobalComponents } from '../views/common/index.js';
import { IAppServices } from '../appServices.js';
import { Theme } from './theme.js';
import { LayoutManager } from './layout.js';
import { QueryType, RecognizedQueries } from '../query/index.js';
import { IAsyncKeyValueStore } from '../types.js';
import { EmptyTile } from '../tiles/core/empty.js';

declare var require:any;

interface DynamicTileModule {
    init:TileFactory<{}>;
}

const importDependentTilesList = (...d:Array<string|Array<string>>):Array<string> => {
    return pipe(
        d,
        List.filter(v => !!v),
        List.flatMap(v => typeof v === 'string' ? [v] : v),
        List.map<string, [string, boolean]>(v => [v, true]),
        Dict.fromEntries(),
        Dict.keys()
    );
};

type TileFactoryMap = {[tileType:string]:TileFactory<{}>};

const tileFactories:TileFactoryMap = {};

const applyContext = (ctx:any, tfMap:TileFactoryMap) => {
    ctx.keys().forEach(path => {
        const tileFolder = path.split('/').slice(-2)[0];
        const tileType = tileFolder[0].toUpperCase() + tileFolder.slice(1) + 'Tile';
        if (tfMap[tileType]) {
            throw new Error(`Tile type name collision. Value ${tileType} cannot be used`);
        }
        tfMap[tileType] = (ctx(path) as DynamicTileModule).init;
    });
};

// note: the 'require.context' is replaced by actual modules
// found during the build process by Webpack.
applyContext(
    require.context('../tiles/core', true, /\/index.ts$/),
    tileFactories
);
applyContext(
    require.context('../tiles/custom', true, /\/index.ts$/),
    tileFactories
);


export const mkTileFactory = (
    dispatcher:IFullActionControl,
    viewUtils:ViewUtils<GlobalComponents>,
    queryMatches:RecognizedQueries,
    appServices:IAppServices,
    theme:Theme,
    layoutManager:LayoutManager,
    queryType:QueryType,
    domain1:string,
    domain2:string,
    cache:IAsyncKeyValueStore) => (
            confName:string,
            conf:TileConf):ITileProvider|null => {
        if (conf.isDisabled || !layoutManager.isInCurrentLayout(queryType, layoutManager.getTileNumber(confName))) {
            return new EmptyTile(layoutManager.getTileNumber(confName));

        } else {
            const tileFactory = tileFactories[conf.tileType];
            if (typeof tileFactory === 'undefined') {
                throw new Error(`Cannot invoke tile init() for ${confName} - type ${conf.tileType} not found. Check your src/js/tiles/custom directory.`);

            } else if (typeof tileFactory.create !== 'function' || typeof tileFactory.sanityCheck !== 'function') {
                throw new Error(`Cannot invoke tile init() for ${confName} (type ${conf.tileType}). Expected type [function], got [${typeof tileFactory}].`);
            }
            const args = {
                tileId: layoutManager.getTileNumber(confName),
                dispatcher,
                ut: viewUtils,
                queryMatches,
                appServices,
                domain1: domain1,
                domain2: domain2,
                queryType,
                waitForTiles: List.map(
                    v => layoutManager.getTileNumber(v),
                    importDependentTilesList(
                        layoutManager.getTileWaitFor(queryType, layoutManager.getTileNumber(confName)),
                        layoutManager.getTileReadSubqFrom(queryType, layoutManager.getTileNumber(confName))
                    )
                ),
                waitForTilesTimeoutSecs: conf.waitForTimeoutSecs,
                subqSourceTiles: List.map(
                    v => {
                        if (!conf.compatibleSubqProviders || !conf.compatibleSubqProviders.includes(v)) {
                            console.warn(`Tile '${v}' not officially supported as subquery provider by '${confName}'`);
                        }
                        return layoutManager.getTileNumber(v);
                    },
                    importDependentTilesList(
                        layoutManager.getTileReadSubqFrom(queryType, layoutManager.getTileNumber(confName))
                    )
                ),
                widthFract: layoutManager.getTileWidthFract(queryType, layoutManager.getTileNumber(confName)),
                theme,
                conf,
                isBusy: true,
                cache,
                mainPosAttr: layoutManager.getLayoutMainPosAttr(queryType),
            };
            const errs = tileFactory.sanityCheck(args);
            if (!List.empty(errs)) {
                throw new Error('Tile sanity check: ' + List.head(errs).message); // TODO maybe we should join the errors?
            }
            return tileFactory.create(args);
        }
};
