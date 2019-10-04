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
import * as Immutable from 'immutable';

import { IActionDispatcher, ViewUtils, BoundWithProps } from 'kombo';
import { GlobalComponents } from '../../../views/global';
import { WordFormsModel, WordFormsModelState } from './model';
import { TileComponent, CoreTileComponentProps } from '../../../common/tile';
import { init as wcloudViewInit } from '../../../views/wordCloud/index';
import { WordFormItem } from '../../../common/api/abstract/wordForms';
import { Theme } from '../../../common/theme';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:WordFormsModel):TileComponent {

    const globalComponents = ut.getComponents();
    const WordCloud = wcloudViewInit<WordFormItem>(dispatcher, ut, theme);


    // -------------- <TableView /> -------------------------------------

    const TableView:React.SFC<{
        roundToPos:number;
        data:Immutable.List<WordFormItem>;

    }> = (props) => {
        const extFormatNum = (x:number, pos:number) => {
            if (x < 10 ** -props.roundToPos) {
                return '~0';
            }
            return ut.formatNumber(x, pos);
        };
        return (
            <table className="data">
                <thead>
                    <tr>
                        <th>{ut.translate('wordforms__table_th_form')}</th>
                        <th>{ut.translate('wordforms__table_th_abs')}</th>
                        <th>{ut.translate('wordforms__table_th_share')}</th>
                    </tr>
                </thead>
                <tbody>
                    {props.data.sort((x1, x2) => x2.freq - x1.freq).map((row, i) => (
                        <tr key={`${i}:${row.value}`}>
                            <td>{row.value}</td>
                            <td className="num">{ut.formatNumber(row.freq)}</td>
                            <td className="num">{extFormatNum(row.ratio, props.roundToPos)}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    class WordFormsView extends React.PureComponent<WordFormsModelState & CoreTileComponentProps> {

        render() {

            const dataTransform = (v:WordFormItem) => ({
                text: v.value,
                value: v.freq,
                tooltip: [{
                    label: ut.translate('wordforms__item_ratio'),
                    value: `${ut.formatNumber(v.ratio, this.props.roundToPos)}%`}],
                interactionId: null
            });

            return (
                <globalComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.size > 0} sourceIdent={{corp: this.props.corpname}}
                        supportsTileReload={this.props.supportsReloadOnError}>
                    {this.props.isAltViewMode ?
                            <TableView data={this.props.data} roundToPos={this.props.roundToPos} /> :
                            <globalComponents.ResponsiveWrapper render={(width:number, height:number) => (
                                <WordCloud width={width} height={height} data={this.props.data} isMobile={this.props.isMobile}
                                        style={this.props.isMobile ? {height: `${this.props.data.size * 30}px`} :
                                                {height: `${this.props.data.size * 40}px`, width: '100%'}}
                                                font="Roboto Condensed"
                                                dataTransform={dataTransform} />
                                )} />
                        }

                </globalComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps(WordFormsView, model);
}