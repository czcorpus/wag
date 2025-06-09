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
import { MergeCorpFreqModel } from './model.js';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Legend, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { GlobalComponents } from '../../../views/common/index.js';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile.js';
import { Theme } from '../../../page/theme.js';
import { QueryMatch } from '../../../query/index.js';
import { List, pipe, Strings } from 'cnc-tskit';
import { Actions } from './actions.js';

import * as S from './style.js';
import { MergeCorpFreqModelState, SourceMappedDataRow } from './common.js';

// @ts-ignore
import SVGLink from '../../../../../assets/external-link.svg?inline';

const CHART_LABEL_MAX_LEN = 20;


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:MergeCorpFreqModel):TileComponent {

    const globComponents = ut.getComponents();

    function transformData(
        data:Array<Array<SourceMappedDataRow>>,
        queryMatches: Array<QueryMatch>,
    ):Array<{
        name:string;
        ipm:Array<number>;
        freq:Array<number>;
        uniqueColor:boolean;
        sourceIdx:number;
        isClickable:boolean;
    }> {
        return pipe(
            data,
            List.flatMap((v, i) => v ? v.map<[SourceMappedDataRow, number]>(v => [v, i]) : []),
            List.reduce((acc, [row, queryIdx]) => {
                const itemIndex = acc.findIndex(v => v.name === row.name);
                if (itemIndex < 0) {
                    const item = {
                        name: row.name,
                        ipm: List.map(_ => 0, queryMatches),
                        freq: List.map(_ => 0, queryMatches),
                        uniqueColor: row.uniqueColor,
                        sourceIdx: row.sourceIdx,
                        isClickable: !!row.viewInOtherWagUrl
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

    const TableView:React.FC<{
        tileId:number;
        data:Array<Array<SourceMappedDataRow>>;
        queryMatches:Array<QueryMatch>;

    }> = (props) => {
        const transformedData = transformData(props.data, props.queryMatches);

        return (
            <table className="data" id={`${props.tileId}-download-table`}>
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
                                <th>{ut.translate('mergeCorpFreq__abs_freq')}</th>
                                <th>{ut.translate('mergeCorpFreq__rel_freq')}</th>
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

    // ---------------------------- <CustomLabel /> --------------------------------

    const CustomLabel:React.FC<{
        x:number;
        y:number;
        width:number;
        height:number;
        payload:unknown;
        onClick:()=>void;
    }> = (props) => (
        typeof props.onClick === 'function' ?
            <g transform={`translate(${props.x + props.width + 10}, ${props.y + 1}) scale(2)`}>
                <SVGLink />
            </g> :
            null
    );


    // -------------------------- <Chart /> --------------------------------------

    const Chart:React.FC<{
        data:Array<Array<SourceMappedDataRow>>;
        barCategoryGap:number;
        queryMatches:Array<QueryMatch>;
        isPartial:boolean;
        isMobile:boolean;
        tileId:number;
        onBarClick:(barIdx:number) => () => void;
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
                (idx:number) => theme.cmpCategoryColor(idx, props.queryMatches.length) :
                (idx:number) => transformedData[idx].uniqueColor ?
                    theme.cmpCategoryColor(idx + 1, List.size(transformedData) + 1) :
                    theme.categoryColor(0);

        const colorHgltFn = queries > 1 ?
        (idx:number) => theme.cmpCategoryColorHighlighted(idx, props.queryMatches.length) :
        (idx:number) => transformedData[idx].uniqueColor ?
            theme.cmpCategoryColorHighlighted(idx + 1, List.size(transformedData) + 1) :
            theme.categoryColorHighlighted(0);

        const [hoveredIndex, setHoveredIndex] = React.useState(null);

        const handleMouseEnter = (data, index) => {
            setHoveredIndex(index);
        };

        const handleMouseLeave = () => {
            setHoveredIndex(null);
        };

        const legendFormatter = (value, payload) => {
            return <span style={{ color: 'black' }}>{value}</span>;
        };

        const CustomizedAxisTick = ({ x, y, stroke, payload }) => {
            const data = transformedData[payload.index];
            return (
                <g transform={`translate(${x},${y})`}>
                    {data['isClickable'] ?
                        <a onClick={props.onBarClick(payload.index)} style={{ cursor: 'pointer' }}>
                            <text x={0} y={0} dy={5} dx={-20} textAnchor="end">
                            {payload.value}
                            </text>
                            <g transform={`translate(-15, -8) scale(1.5)`}>
                                <SVGLink />
                            </g>
                        </a> :
                        <text x={0} y={0} dy={5} textAnchor="end">
                        {payload.value}
                        </text>
                    }
                </g>
            );
        };

        return (
            // 100% height makes parent ResponsiveWrapper
            // to change size gradually after rendering
            <ResponsiveContainer id={`${props.tileId}-download-figure`} width="100%" height="95%" minHeight={300} >
                <BarChart data={transformedData} layout="vertical" barCategoryGap={props.barCategoryGap}
                    onMouseMove={e => {
                        if (e && Array.isArray(e.activePayload)) {
                            dispatcher.dispatch<typeof Actions.ShowTooltip>({
                                name: Actions.ShowTooltip.name,
                                payload: {
                                    dataName: e.activeLabel,
                                    tileId: props.tileId,
                                    tooltipX: e.chartX,
                                    tooltipY: e.chartY,
                                    barIdx: e.activePayload[0]['payload']['sourceIdx']
                                }
                            })
                        }
                    }}
                    onMouseLeave={d =>
                        dispatcher.dispatch<typeof Actions.HideTooltip>({
                            name: Actions.HideTooltip.name,
                            payload: {tileId: props.tileId}
                        })
                    }
                >
                    <CartesianGrid />
                    {List.map(
                        (_, index) => {
                            const dfltFill = props.isPartial ? theme.unfinishedChartColor : colorFn(index);
                            const hgltFill = props.isPartial ? theme.unfinishedChartColor : colorHgltFn(index);
                            return (
                                <Bar key={index}
                                        dataKey={x => x.ipm[index]}
                                        fill={dfltFill}
                                        isAnimationActive={false}
                                        name={queries === 1 ? ut.translate('mergeCorpFreq__rel_freq') : props.queryMatches[index].word}
                                        onMouseEnter={handleMouseEnter}
                                        onMouseLeave={handleMouseLeave}
                                        >
                                    {List.map(
                                        (entry, i) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                cursor={entry.isClickable ? "pointer" : null}
                                                fill={hoveredIndex === i && entry.isClickable ? hgltFill : dfltFill}
                                                onClick={entry.isClickable ? props.onBarClick(entry.sourceIdx) : null}
                                            />
                                        ),
                                        transformedData)
                                    }
                                </Bar>
                            );
                        },
                        props.queryMatches
                    )}
                    <XAxis
                        type="number"
                        label={{value: queries > 1 ? ut.translate('mergeCorpFreq__rel_freq') : null, dy: 15}} />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={Math.max(60, maxLabelLength * 7)}
                        tickFormatter={value => props.isMobile ? Strings.shortenText(value, CHART_LABEL_MAX_LEN) : value}
                        tick={CustomizedAxisTick} />
                    <Legend wrapperStyle={{paddingTop: queries > 1 ? 15 : 0}} formatter={legendFormatter} />
                </BarChart>
            </ResponsiveContainer>
        );
    };

    // -------------------------- <MergeCorpFreqBarTile /> --------------------------------------

    const MergeCorpFreqBarTile:React.FC<MergeCorpFreqModelState & CoreTileComponentProps> = (props) => {

        const numCats = Math.max(0, ...props.data.map(v => v ? v.length : 0));
        const barCategoryGap = Math.max(10, 40 - props.pixelsPerCategory);
        const minHeight = 70 + numCats * (props.pixelsPerCategory + barCategoryGap);

        const handleBarClick = (barIdx:number) => () => {
            dispatcher.dispatch(
                Actions.ViewInOtherWag,
                {
                    barIdx,
                    tileId: props.tileId
                }
            );
        };

        return (
            <globComponents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                    hasData={List.some(v => v && List.some(f => f.freq > 0, v), props.data)}
                    sourceIdent={pipe(
                        props.sources,
                        List.groupBy(v => v.corpname),
                        List.flatMap(([,v]) => v),
                        List.map(v => ({corp: v.corpname, subcorp: v.subcname})))
                    }
                    backlink={props.backlinks}
                    supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}>
                <div style={{position: 'relative'}}>
                    {props.tooltipData !== null ?
                        <globComponents.ElementTooltip
                            x={props.tooltipData.tooltipX}
                            y={props.tooltipData.tooltipY}
                            visible={true}
                            caption={props.tooltipData.caption}
                            values={props.tooltipData.data}
                            multiWord={props.queryMatches.length > 1}
                            colors={props.queryMatches.length > 1 ?
                                idx => theme.cmpCategoryColor(idx, props.queryMatches.length) :
                                null}
                            customFooter={props.tooltipData.showClickTip ?
                                         <strong style={{fontSize: '1.2em'}}>
                                             {ut.translate('mergeCorpFreq__click_to_see_details')}
                                        </strong> :
                                        null}
                        /> : null}
                </div>

                <globComponents.ResponsiveWrapper render={(width:number, height:number) => {
                    return (
                        <S.MergeCorpFreqBarTile style={{minHeight: `${minHeight}px`, height: '100%'}}>
                            {props.isAltViewMode ?
                                <S.Tables>
                                    <TableView tileId={props.tileId} data={props.data} queryMatches={props.queryMatches} />
                                </S.Tables> :
                                <Chart tileId={props.tileId} data={props.data} barCategoryGap={barCategoryGap}
                                        queryMatches={props.queryMatches} isPartial={props.isBusy} isMobile={props.isMobile}
                                        onBarClick={handleBarClick} />
                            }
                        </S.MergeCorpFreqBarTile>
                    );
                }} />
            </globComponents.TileWrapper>
        );
    }

    return BoundWithProps<CoreTileComponentProps, MergeCorpFreqModelState>(MergeCorpFreqBarTile, model);
}