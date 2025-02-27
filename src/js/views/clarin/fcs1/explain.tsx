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

import * as React from 'react';
import { FCS1ExplainResponse } from '../../../api/vendor/clarin/fcs1/explain.js';
import { IActionDispatcher, ViewUtils } from 'kombo';
import { GlobalComponents } from '../../common/index.js';

import * as S from '../../common/style.js';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>) {

    // ------------------ <IndicesList /> ----------------------------

    const IndicesList:React.FC<{
        data:Array<{name:string; title:string}>;

    }> = (props) => {
        return (
            <>
                {props.data.map((v, i) =>
                    <React.Fragment key={`${v.name}:${i}`}>{i > 0 ? ', ' : ''}<span title={v.title}>{v.name}</span></React.Fragment>
                )}
            </>
        );
    };


    // ------------------ <ExplainView /> ----------------------------

    const ExplainView:React.FC<{
        data:FCS1ExplainResponse;

    }> = (props) => {

        return (
            <S.SourceInfoBox className="ExplainView" $createStaticUrl={ut.createStaticUrl}>
                <dl>
                    <dt>{ut.translate('global__source_general_desc_label')}:</dt>
                    <dd>{ut.translate('global__clarin_fcs_endpoint_label')}</dd>
                    <dt>{ut.translate('global__source_desc_label')}:</dt>
                    <dd>{props.data.description}</dd>
                    {props.data.author ?
                        <>
                            <dt>author</dt>
                            <dd>{props.data.author}</dd>

                        </> : null
                    }
                    {props.data.supportedIndices.length > 0 ?
                        <>
                            <dt>{ut.translate('global__source_indices_label')}:</dt>
                            <dd><IndicesList data={props.data.supportedIndices} /></dd>
                        </> : null
                    }
                </dl>
            </S.SourceInfoBox>
        );
    };


    return {
        ExplainView: ExplainView
    };

}
