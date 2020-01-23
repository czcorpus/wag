/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
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
import * as Immutable from 'immutable';
import * as React from 'react';
import { IActionDispatcher, ViewUtils, BoundWithProps} from 'kombo';
import { MergeCorpFreqModel, MergeCorpFreqModelState, SourceMappedDataRow} from './model';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { BacklinkArgs } from '../../../common/api/kontext/freqs';
import { GlobalComponents } from '../../../views/global';
import { CoreTileComponentProps, TileComponent, BacklinkWithArgs } from '../../../common/tile';
import { Theme } from '../../../common/theme';
import { LemmaVariant } from '../../../common/query';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:MergeCorpFreqModel):TileComponent {

    const globComponents = ut.getComponents();

    function transformData(data: Immutable.List<SourceMappedDataRow>, lemmas: Array<LemmaVariant>):Array<{name:string; ipm:Array<number>; freq:Array<number>}> {
        return data.reduce((acc, curr) => {
                const itemIndex = acc.findIndex(v => v.name === curr.name);
                if (itemIndex < 0) {
                    const item = {name: curr.name, ipm: lemmas.map(_ => 0), freq: lemmas.map(_ => 0)};
                    item.ipm[curr.queryId] = curr.ipm;
                    item.freq[curr.queryId] = curr.freq;
                    acc.push(item)
                } else {
                    acc[itemIndex].ipm[curr.queryId] = curr.ipm;
                    acc[itemIndex].freq[curr.queryId] = curr.freq;
                }
                return acc
            },
            []
        );
    }

    // -------------- <TableView /> -------------------------------------

    const TableView:React.SFC<{
        data:Immutable.List<SourceMappedDataRow>;
        lemmas:Array<LemmaVariant>;

    }> = (props) => {
        const transformedData = transformData(props.data, props.lemmas)

        return (
            <table className="data">
                <thead>
                    { props.lemmas.length > 1 ?
                        <tr>
                            <th />
                            {props.lemmas.map((value, index) => <th colSpan={2}>{`[${index+1}] ${value.word}`}</th>)}
                        </tr> : null
                    }
                    <tr>
                        <th />
                        {props.lemmas.flatMap(() => [
                            <th>{ut.translate('mergeCorpFreq_abs_freq')}</th>,
                            <th>{ut.translate('mergeCorpFreq_rel_freq')}</th>
                        ])}
                    </tr>
                </thead>
                <tbody>
                    {transformedData.map((row, i) => (
                        <tr key={`${i}:${row.name}`}>
                            <td className="word">{row.name}</td>
                            {props.lemmas.flatMap((_, index) => [
                                <td className="num">{ut.formatNumber(row.freq[index])}</td>,
                                <td className="num">{ut.formatNumber(row.ipm[index])}</td>
                            ])}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }


    // -------------------------- <Chart /> --------------------------------------

    const Chart:React.SFC<{
        data:Immutable.List<SourceMappedDataRow>;
        size:[number, number];
        barGap:number;
        lemmas:Array<LemmaVariant>;
    }> = (props) => {
        const queries = props.lemmas.length;
        const transformedData = transformData(props.data, props.lemmas);
        
        return (
            <div className="Chart">
                <ResponsiveContainer width="90%" height={props.size[1] / queries + 50}>
                    <BarChart data={transformedData} layout="vertical" barCategoryGap={props.barGap}>
                        <CartesianGrid />
                        {props.lemmas.map((_, index) => 
                            <Bar key={index} dataKey={x => x.ipm[index]} fill={theme.barColor(index)} isAnimationActive={false}
                            name={queries === 1 ? ut.translate('mergeCorpFreq_rel_freq') : `[${index + 1}] ${props.lemmas[index].word}`} />
                        )}                        
                        <XAxis type="number" label={{value: queries > 1 ? ut.translate('mergeCorpFreq_rel_freq') : null, dy: 15}} />
                        <YAxis type="category" dataKey="name" width={120} />
                        <Legend wrapperStyle={{paddingTop: queries > 1 ? 15 : 0}}/>
                        <Tooltip cursor={false} isAnimationActive={false} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // -------------------------- <MergeCorpFreqBarTile /> --------------------------------------

    class MergeCorpFreqBarTile extends React.PureComponent<MergeCorpFreqModelState & CoreTileComponentProps> {

        render() {
            const backlinks = this.props.data
                .groupBy(v => v.sourceId)
                .map(v => v.get(0))
                .map<BacklinkWithArgs<BacklinkArgs>>(v => v.backlink)
                .toArray();

            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.find(v => v.freq > 0) !== undefined}
                        sourceIdent={this.props.sources.groupBy(v => v.corpname).map(v => ({corp: v.first().corpname})).toArray()}
                        backlink={backlinks}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <div className="MergeCorpFreqBarTile">
                        {this.props.isAltViewMode ?
                            <TableView data={this.props.data} lemmas={this.props.lemmas} /> :
                            <Chart data={this.props.data} size={[this.props.renderSize[0], 70 + this.props.data.size * this.props.pixelsPerItem]}
                                    barGap={this.props.barGap} lemmas={this.props.lemmas} />
                        }
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, MergeCorpFreqModelState>(MergeCorpFreqBarTile, model);
}