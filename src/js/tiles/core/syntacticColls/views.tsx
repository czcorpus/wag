/*
 * Copyright 2023 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2023 Institute of the Czech National Corpus,
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
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';

import { Theme } from '../../../page/theme';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile';
import { GlobalComponents } from '../../../views/common';
import { SyntacticCollsModel } from './model';
import { init as wordCloudViewInit } from '../../../views/wordCloud';

import * as S from './style';
import { SCollsDataRow, SyntacticCollsModelState } from '../../../models/tiles/syntacticColls';
import { List } from 'cnc-tskit';
import { SCollsQueryType } from '../../../api/vendor/mquery/syntacticColls';
import { WordCloudItemCalc } from '../../../views/wordCloud/calc';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:SyntacticCollsModel):TileComponent {

    const globalCompontents = ut.getComponents();
    const WordCloud = wordCloudViewInit<SCollsDataRow>(dispatcher, ut, theme);

    const dataTransform = (v:SCollsDataRow):WordCloudItemCalc => ({
        text: v.word,
        value: v.collWeight,
        tooltip: [{label: ut.translate('syntactic_colls__tooltip_score'), value: ut.formatNumber(v.collWeight, 5)}],
        interactionId: v.word,
    });

    // -------------- <SyntacticCollsTile /> -------------------------------------

    class SyntacticCollsTile extends React.PureComponent<SyntacticCollsModelState & CoreTileComponentProps> {

        constructor(props) {
            super(props);
        }

        renderWordCloud(qType:SCollsQueryType) {
            return <S.SCollsWordCloud key={`wordcloud:${qType}`}>
                <h2>{ut.translate(`syntactic_colls__heading_${qType}`)}</h2>
                {this.props.data[qType] ?
                    <globalCompontents.ResponsiveWrapper minWidth={this.props.isMobile ? undefined : 250}
                            key={qType} widthFract={this.props.widthFract} render={(width:number, height:number) => (
                        <WordCloud width={width} height={height} isMobile={this.props.isMobile}
                            data={this.props.data[qType]}
                            font={theme.infoGraphicsFont}
                            dataTransform={dataTransform}
                        />
                    )}/> :
                    null
                }
            </S.SCollsWordCloud>
        }

        renderTable(qType:SCollsQueryType) {
            return <S.SCollsTable key={`table:${qType}`}>
                <h2>{ut.translate(`syntactic_colls__heading_${qType}`)}</h2>
                {this.props.data[qType] ?
                    <globalCompontents.ResponsiveWrapper minWidth={this.props.isMobile ? undefined : 250}
                            key={qType} widthFract={this.props.widthFract} render={(width:number, height:number) => (
                        <table className='data'>
                            <tbody>
                                <tr>
                                    <th key="word">word</th>
                                    <th key="freq">freq</th>
                                    <th key="ipm">ipm</th>
                                    <th key="score">collWeight</th>
                                </tr>
                                {List.map((row, i) => <tr key={i}>
                                    <td key="word" className="word">{row.word}</td>
                                    <td key="freq" className="num">{ut.formatNumber(row.freq)}</td>
                                    <td key="ipm" className="num">{ut.formatNumber(row.ipm)}</td>
                                    <td key="score" className="num">{ut.formatNumber(row.collWeight, 5)}</td>
                                </tr>, this.props.data[qType])}
                            </tbody>
                        </table>
                    )}/> :
                    null
                }
            </S.SCollsTable>
        }

        render() {
            return (
                <globalCompontents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={true} sourceIdent={{corp: this.props.corpname}}
                        backlink={[]} supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <S.SyntacticColls>
                        {this.props.isAltViewMode ? [
                            this.renderWordCloud(SCollsQueryType.NOUN_MODIFIED_BY),
                            this.renderWordCloud(SCollsQueryType.MODIFIERS_OF),
                            this.renderWordCloud(SCollsQueryType.VERBS_OBJECT),
                            this.renderWordCloud(SCollsQueryType.VERBS_SUBJECT),
                        ]: [
                            this.renderTable(SCollsQueryType.NOUN_MODIFIED_BY),
                            this.renderTable(SCollsQueryType.MODIFIERS_OF),
                            this.renderTable(SCollsQueryType.VERBS_OBJECT),
                            this.renderTable(SCollsQueryType.VERBS_SUBJECT),
                        ]}
                    </S.SyntacticColls>
                </globalCompontents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, SyntacticCollsModelState>(SyntacticCollsTile, model);

}
