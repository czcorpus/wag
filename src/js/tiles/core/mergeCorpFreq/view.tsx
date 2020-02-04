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

import * as React from 'react';
import { IActionDispatcher, ViewUtils, BoundWithProps } from 'kombo';
import { MergeCorpFreqModel, MergeCorpFreqModelState } from './model';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { SourceMappedDataRow } from '../../../common/api/kontext/freqs';
import { GlobalComponents } from '../../../views/global';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { Theme } from '../../../common/theme';
import { LemmaVariant } from '../../../common/query';
import { List, applyComposed } from '../../../common/collections';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:MergeCorpFreqModel):TileComponent {

    const globComponents = ut.getComponents();

    function transformData(data:Array<Array<SourceMappedDataRow>>, lemmas: Array<LemmaVariant>):Array<{name:string; ipm:Array<number>; freq:Array<number>}> {
        return applyComposed(
            data,
            List.flatMap((v, i) => v ? v.map<[SourceMappedDataRow, number]>(v => [v, i]) : []),
            List.reduce((acc, [row, queryIdx]) => {
                const itemIndex = acc.findIndex(v => v.name === row.name);
                if (itemIndex < 0) {
                    const item = {name: row.name, ipm: lemmas.map(_ => 0), freq: lemmas.map(_ => 0)};
                    item.ipm[queryIdx] = row.ipm;
                    item.freq[queryIdx] = row.freq;
                    acc.push(item);

                } else {
                    acc[itemIndex].ipm[queryIdx] = row.ipm;
                    acc[itemIndex].freq[queryIdx] = row.freq;
                }
                return acc
            },
            []
            )
        );
    }

    // -------------- <TableView /> -------------------------------------

    const TableView:React.SFC<{
        data:Array<Array<SourceMappedDataRow>>;
        lemmas:Array<LemmaVariant>;

    }> = (props) => {
        const transformedData = transformData(props.data, props.lemmas)

        return (
            <table className="data">
                <thead>
                    { props.lemmas.length > 1 ?
                        <tr>
                            <th />
                            {props.lemmas.map((value, index) => <th key={value.lemma} colSpan={2}>{`[${index+1}] ${value.word}`}</th>)}
                        </tr> : null
                    }
                    <tr>
                        <th />
                        {props.lemmas.map((lemma, idx) => (
                            <React.Fragment key={lemma.lemma}>
                                <th>{ut.translate('mergeCorpFreq_abs_freq')}</th>
                                <th>{ut.translate('mergeCorpFreq_rel_freq')}</th>
                            </React.Fragment>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {transformedData.map((row, i) => (
                        <tr key={`${i}:${row.name}`}>
                            <td className="word">{row.name}</td>
                            {props.lemmas.map((v, index) =>
                                <React.Fragment key={v.lemma}>
                                    <td className="num">{ut.formatNumber(row.freq[index])}</td>
                                    <td className="num">{ut.formatNumber(row.ipm[index])}</td>
                                </React.Fragment>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    }


    // -------------------------- <Chart /> --------------------------------------

    const Chart:React.SFC<{
        data:Array<Array<SourceMappedDataRow>>;
        barGap:number;
        lemmas:Array<LemmaVariant>;
        isPartial:boolean;
    }> = (props) => {
        const queries = props.lemmas.length;
        const transformedData = transformData(props.data, props.lemmas);
        return (
            <div className="Chart" style={{height: '100%'}}>
                <ResponsiveContainer width="90%" height="100%">
                    <BarChart data={transformedData} layout="vertical" barCategoryGap={props.barGap}>
                        <CartesianGrid />
                        {props.lemmas.map((_, index) =>
                            <Bar
                                key={index}
                                dataKey={x => x.ipm[index]}
                                fill={props.isPartial ? theme.unfinishedChartColor: theme.barColor(index)}
                                isAnimationActive={false}
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
            const backlinks = applyComposed(
                this.props.data,
                List.filter(x => x !== undefined),
                List.flatMap(v => v),
                List.groupBy(v => v.sourceId),
                List.map(([x,v]) => v[0].backlink)
            ); // TODO
            const numCats = Math.max(0, ...this.props.data.map(v => v ? v.length : 0));
            const minHeight = 70 + numCats * this.props.data.length * this.props.pixelsPerItem;
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.some(v => v && v.find(f => f.freq > 0))}
                        sourceIdent={applyComposed(this.props.sources, List.groupBy(v => v.corpname), List.flatMap(([,v]) => v), List.map(v => ({corp: v.corpname})))}
                        backlink={backlinks}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <globComponents.ResponsiveWrapper render={(width:number, height:number) => {
                        return (
                        <div className="MergeCorpFreqBarTile" style={{minHeight: `${minHeight}px`, height: `${height}px`}}>
                            {this.props.isAltViewMode ?
                                <TableView data={this.props.data} lemmas={this.props.lemmas} /> :
                                <Chart data={this.props.data} barGap={this.props.barGap} lemmas={this.props.lemmas} isPartial={this.props.isBusy} />
                            }
                        </div>)}} />
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, MergeCorpFreqModelState>(MergeCorpFreqBarTile, model);
}