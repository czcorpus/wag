/*
 * Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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

import * as React from 'react';
import { ViewUtils } from 'kombo';
import { GlobalComponents } from './common/index.js';

import * as S from './style.js';


export interface ErrPageProps {
    error:[number, string]|null;
}

export function init(ut:ViewUtils<GlobalComponents>):React.FC<ErrPageProps> {

    const ErrPage:React.FC<ErrPageProps> = (props) => {
        return (
            <S.ErrPage>
                <div className="cnc-tile">
                    <header className="cnc-tile-header panel err">{ut.translate('global__server_error')}</header>
                    <div className="tile-body text">
                        <p><strong>{props.error[0]}:</strong> {props.error[1]}</p>
                        <p><a href={ut.createActionUrl('/')}>{ut.translate('global__go_to_main_page')}</a></p>
                    </div>
                </div>
            </S.ErrPage>
        );
    };

    return ErrPage;
}