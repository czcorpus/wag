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

import { IActionDispatcher, ViewUtils } from 'kombo';
import * as React from 'react';
import { QueryPoS } from '../../../../common/query';
import { GlobalComponents } from '../../../../views/global';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>) {

    // -------------------- <Stars /> -----------------------------------------------

    const Stars:React.SFC<{
        freqBand:number;

    }> = (props) => {
        return <span className="Stars">{[1, 2, 3, 4, 5].map(v =>
                <img key={`${v}`} src={ut.createStaticUrl(`star${v <= props.freqBand ? '' : '_grey'}.svg`)}
                            alt={ut.translate(v <= props.freqBand ? 'global__img_alt_star_icon' : 'global__img_alt_star_icon_grey')} />)}</span>
    };


    return {
        Stars: Stars
    };

}

