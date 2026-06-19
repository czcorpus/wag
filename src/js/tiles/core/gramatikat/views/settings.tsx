/*
 * Copyright 2026 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2026 Department of Linguistics,
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

import { IActionDispatcher, useModel, ViewUtils } from 'kombo';
import { Theme } from '../../../../page/theme.js';
import { GlobalComponents } from '../../../../views/common/index.js';
import { init as altViewSingleInit } from './advanced.js';
import { GramatikatModel, WordData } from '../model.js';
import * as React from 'react';
import { List } from 'cnc-tskit';
import * as S from './style.js';
import { Actions } from '../actions.js';

export function init(
    dispatcher: IActionDispatcher,
    ut: ViewUtils<GlobalComponents>,
    theme: Theme,
    model: GramatikatModel
): React.FC<{ tileId: number }> {
    const Settings: React.FC<{ tileId: number }> = ({ tileId }) => {
        const state = useModel(model);

        return (
            <S.Settings>
                <form>-- TODO --</form>
            </S.Settings>
        );
    };

    return Settings;
}
