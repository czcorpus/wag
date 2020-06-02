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
import { QueryMatch } from '../../../common/query/index';
import { List, pipe, Strings } from 'cnc-tskit';
import { Actions, ActionName } from './actions';
import * as ReactDOM from 'react-dom';

const CHART_LABEL_MAX_LEN = 20;


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:MergeCorpFreqModel):TileComponent {

    const globComponents = ut.getComponents();

    function transformData(data:Array<Array<SourceMappedDataRow>>, queryMatches: Array<QueryMatch>):Array<{name:string; ipm:Array<number>; freq:Array<number>}> {
        return pipe(
            data,
            List.flatMap((v, i) => v ? v.map<[SourceMappedDataRow, number]>(v => [v, i]) : []),
            List.reduce((acc, [row, queryIdx]) => {
                const itemIndex = acc.findIndex(v => v.name === row.name);
                if (itemIndex < 0) {
                    const item = {
                        name: row.name,
                        ipm: List.map(_ => 0, queryMatches),
                        freq: List.map(_ => 0, queryMatches)
                    };
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
        queryMatches:Array<QueryMatch>;

    }> = (props) => {
        const transformedData = transformData(props.data, props.queryMatches)

        return (
            <table className="data">
                <thead>
                    { props.queryMatches.length > 1 ?
                        <tr>
                            <th />
                            {props.queryMatches.map((value, index) => <th key={value.lemma} colSpan={2}>{`[${index+1}] ${value.word}`}</th>)}
                        </tr> : null
                    }
                    <tr>
                        <th />
                        {props.queryMatches.map((lemma, idx) => (
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
                            {props.queryMatches.map((v, index) =>
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
        barCategoryGap:number;
        queryMatches:Array<QueryMatch>;
        isPartial:boolean;
        isMobile:boolean;
        tileId:number;
    }> = (props) => {
        const queries = props.queryMatches.length;
        const transformedData = transformData(props.data, props.queryMatches);
        const maxLabelLength = List.maxItem<string>(
            v => v.length,
            props.isMobile ?
                List.flatMap(item => [Strings.shortenText(item.name, CHART_LABEL_MAX_LEN)], transformedData) :
                List.map(v => v.name, transformedData)
        ).length;
        const colorFn = queries > 1 ?
                (idx:number) => theme.cmpCategoryColor(idx) :
                (idx:number) => theme.categoryColor(0);
        return (
            <div className="Chart" style={{height: '100%'}}>
                <ResponsiveContainer width={props.isMobile ? "100%" : "90%"} height="100%">
                    <BarChart data={transformedData} layout="vertical" barCategoryGap={props.barCategoryGap}
                        onMouseMove={e => {
                            e ? dispatcher.dispatch<Actions.ShowAreaTooltip>({
                                name: ActionName.ShowAreaTooltip,
                                payload: {
                                    dataId: e.activeTooltipIndex,
                                    tileId: props.tileId,
                                    tooltipX: e.chartX,
                                    tooltipY: e.chartY
                                }
                            }) : null}}
                        onMouseOut={d =>
                            dispatcher.dispatch<Actions.HideAreaTooltip>({
                                name: ActionName.HideAreaTooltip,
                                payload: {tileId: props.tileId}
                            })
                        }
                    >
                        <CartesianGrid />
                        {List.map(
                            (_, index) =>
                            <Bar
                                key={index}
                                dataKey={x => x.ipm[index]}
                                fill={props.isPartial ? theme.unfinishedChartColor: colorFn(index)}
                                isAnimationActive={false}
                                name={queries === 1 ? ut.translate('mergeCorpFreq_rel_freq') : props.queryMatches[index].word} />,
                            props.queryMatches
                        )}
                        <XAxis type="number" label={{value: queries > 1 ? ut.translate('mergeCorpFreq_rel_freq') : null, dy: 15}} />
                        <YAxis type="category" dataKey="name" width={Math.max(60, maxLabelLength * 7)}
                                tickFormatter={value => props.isMobile ? Strings.shortenText(value, CHART_LABEL_MAX_LEN) : value} />
                        <Legend wrapperStyle={{paddingTop: queries > 1 ? 15 : 0}}/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // -------------------------- <MergeCorpFreqBarTile /> --------------------------------------

    class MergeCorpFreqBarTile extends React.PureComponent<MergeCorpFreqModelState & CoreTileComponentProps> {

        render() {
            const backlinks = pipe(
                this.props.data,
                List.filter(x => x !== undefined),
                List.flatMap(v => v),
                List.groupBy(v => v.sourceId),
                List.map(([,v]) => v[0].backlink)
            ); // TODO
            const numCats = Math.max(0, ...this.props.data.map(v => v ? v.length : 0));
            const barCategoryGap = Math.max(10, 40 - this.props.pixelsPerCategory);
            const minHeight = 70 + numCats * (this.props.pixelsPerCategory + barCategoryGap);

            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={List.some(v => v && List.some(f => f.freq > 0, v), this.props.data)}
                        sourceIdent={pipe(
                            this.props.sources,
                            List.groupBy(v => v.corpname),
                            List.flatMap(([,v]) => v),
                            List.map(v => ({corp: v.corpname})))
                        }
                        backlink={backlinks}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <div style={{position: 'relative'}}>
                        {this.props.tooltipData !== null ?
                            <globComponents.ElementTooltip
                                x={this.props.tooltipData.tooltipX}
                                y={this.props.tooltipData.tooltipY}
                                visible={true}
                                values={this.props.tooltipData.data}
                                multiWord={this.props.queryMatches.length > 1}
                                theme={this.props.queryMatches.length > 1 ? theme : null}
                            /> : null}
                    </div>

                    <globComponents.ResponsiveWrapper render={(width:number, height:number) => {
                        return (
                        <div className="MergeCorpFreqBarTile" style={{minHeight: `${minHeight}px`, height: `${height}px`}}>
                            {this.props.isAltViewMode ?
                                <TableView data={this.props.data} queryMatches={this.props.queryMatches} /> :
                                <Chart tileId={this.props.tileId} data={this.props.data} barCategoryGap={barCategoryGap} queryMatches={this.props.queryMatches} isPartial={this.props.isBusy} isMobile={this.props.isMobile} />
                            }
                        </div>)}} />
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, MergeCorpFreqModelState>(MergeCorpFreqBarTile, model);
}