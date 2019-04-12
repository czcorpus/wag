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
import { ActionDispatcher, ViewUtils, BoundWithProps } from 'kombo';
import { GlobalComponents } from '../../views/global';
import { Theme } from '../../common/theme';
import { TileComponent, CoreTileComponentProps } from '../../common/types';
import { ConcFilterModel, ConcFilterModelState } from './model';
import { Line } from '../../common/api/abstract/concordance';

export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:ConcFilterModel):TileComponent {

    const globalCompontents = ut.getComponents();


    // ------------------ <FilteredLine /> --------------------------------------------

    const FilteredLine:React.SFC<{
        data:Line;

    }> = (props) => {
        return (
            <p className={`FilteredLine ${props.data.isHighlighted ? 'highlighted' : ''}`}>
                {props.data.Left.map((v, i) => v.class ?
                    <span key={`${props.data.toknum}:L${i}`} className={v.class}>{v.str}</span> :
                    <span key={`${props.data.toknum}:L${i}`}>{v.str}</span>)
                }
                {props.data.Kwic.map((v, i) => <span className="kwic" key={`${props.data.toknum}:K${i}`}>{v.str}</span>)}
                {props.data.Right.map((v, i) => v.class ?
                    <span key={`${props.data.toknum}:R${i}`} className={v.class}>{v.str}</span> :
                    <span key={`${props.data.toknum}:R${i}`}>{v.str}</span>)
                }
            </p>
        );
    };

    // ------------------ <CollocExamplesView /> --------------------------------------------

    class CollocExamplesView extends React.PureComponent<ConcFilterModelState & CoreTileComponentProps> {

        render() {
            return (
                <globalCompontents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.lines.size > 0}
                        sourceIdent={{corp: this.props.corpName}}>
                    <div className="CollocExamplesView">
                        <div className="sentences">
                            {this.props.lines.map((v, i) => <FilteredLine key={`${i}:${v.toknum}`} data={v} />)}
                        </div>
                    </div>
                </globalCompontents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, ConcFilterModelState>(CollocExamplesView, model);

}

