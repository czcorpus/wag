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
import { List } from 'cnc-tskit';

import {
    TileFactory,
    ITileProvider,
    TileConf,
    TileFactoryArgs,
} from './tile.js';
import { GlobalComponents } from '../views/common/index.js';
import { IAppServices } from '../appServices.js';
import { Theme } from './theme.js';
import { LayoutManager } from './layout.js';
import { QueryType, RecognizedQueries } from '../query/index.js';
import { EmptyTile } from '../tiles/core/empty.js';

declare var require: any;

interface DynamicTileModule {
    init: TileFactory<{}>;
}

type TileFactoryMap = { [tileType: string]: TileFactory<{}> };

const tileFactories: TileFactoryMap = {};

const applyContext = (ctx: any, tfMap: TileFactoryMap) => {
    ctx.keys().forEach((path) => {
        const tileFolder = path.split('/').slice(-2)[0];
        const tileType =
            tileFolder[0].toUpperCase() + tileFolder.slice(1) + 'Tile';
        if (tfMap[tileType]) {
            throw new Error(
                `Tile type name collision. Value ${tileType} cannot be used`
            );
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
    dispatcher: IFullActionControl,
    viewUtils: ViewUtils<GlobalComponents>,
    queryMatches: RecognizedQueries,
    appServices: IAppServices,
    theme: Theme,
    layoutManager: LayoutManager,
    queryType: QueryType,
    translatLanguage: string
) => {
    const factoryObj = {
        createdTiles: {},

        create(confName: string, conf: TileConf): ITileProvider | null {
            if (
                conf.isDisabled ||
                !layoutManager.isInCurrentLayout(
                    layoutManager.getTileNumber(confName)
                )
            ) {
                return new EmptyTile(layoutManager.getTileNumber(confName));
            } else {
                const tileFactory = tileFactories[conf.tileType];
                if (typeof tileFactory === 'undefined') {
                    throw new Error(
                        `Cannot invoke tile init() for ${confName} - type ${conf.tileType} not found. Check your src/js/tiles/custom directory.`
                    );
                } else if (
                    typeof tileFactory.create !== 'function' ||
                    typeof tileFactory.sanityCheck !== 'function'
                ) {
                    throw new Error(
                        `Cannot invoke tile init() for ${confName} (type ${conf.tileType}). Expected type [function], got [${typeof tileFactory}].`
                    );
                }

                const tileId = layoutManager.getTileNumber(confName);
                const tileLayoutConf = layoutManager.getLayoutTileConf(tileId);

                // In the 'preview' mode, we need to make sure tiles supporting both 'single' and 'cmp' modes
                // get both single and cmp queries. For this matter we store information about each tile type
                // instantiation where for the first instance, we give the tile just a single word search while
                // for the second (and more) we provide multiple queries. This all applies just for the
                // preview mode and it is made to align with hardcoded layout of the preview result page.
                const queryMatchesAppl =
                    queryType === QueryType.PREVIEW &&
                    !factoryObj.createdTiles.hasOwnProperty(conf.tileType)
                        ? [queryMatches[0]]
                        : queryMatches;
                const args: TileFactoryArgs<{}> = {
                    tileId,
                    dispatcher,
                    ut: viewUtils,
                    queryMatches: queryMatchesAppl,
                    appServices,
                    queryType,
                    translatLanguage,
                    readDataFromTile: layoutManager.getTileNumber(
                        tileLayoutConf.readDataFrom
                    ),
                    widthFract: tileLayoutConf.width,
                    theme,
                    conf,
                    isBusy: true,
                    mainPosAttr: layoutManager.getLayoutMainPosAttr(),
                    dependentTiles: layoutManager.getDependentTiles(tileId),
                };
                const errs = tileFactory.sanityCheck(args);
                if (!List.empty(errs)) {
                    throw new Error(
                        'Tile sanity check: ' + List.head(errs).message
                    ); // TODO maybe we should join the errors?
                }
                factoryObj.createdTiles[conf.tileType] = factoryObj
                    .createdTiles[conf.tileType]
                    ? factoryObj.createdTiles[conf.tileType] + 1
                    : 1;
                return tileFactory.create(args);
            }
        },
    };

    return factoryObj;
};
