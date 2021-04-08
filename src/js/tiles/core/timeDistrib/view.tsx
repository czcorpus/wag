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
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceArea } from 'recharts';

import { Theme } from '../../../page/theme';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile';
import { GlobalComponents } from '../../../views/global';
import { DataItemWithWCI, Actions } from './common';
import { TimeDistribModel, TimeDistribModelState, LoadingStatus } from './model';
import { List, pipe, Keyboard } from 'cnc-tskit';

import * as S from './style';


const MIN_DATA_ITEMS_TO_SHOW = 2;

interface MultiChartItem {
    datetime:string;
    ipmInterval1:[number, number];
    ipmInterval2:[number, number];
}

function mergeDataSets(data1:Array<DataItemWithWCI>, data2:Array<DataItemWithWCI>):Array<MultiChartItem> {
    return pipe(
        data1,
        List.map(v => ({
            datetime: v.datetime,
            ipmInterval:[v.ipmInterval[0], v.ipmInterval[1]],
            src: 0
        })),
        List.concat(
            pipe(
                data2,
                List.map(v => ({
                    datetime: v.datetime,
                    ipmInterval:[v.ipmInterval[0], v.ipmInterval[1]],
                    src: 1
                }))
            )
        ),
        List.groupBy(v => v.datetime),
        List.map(([,v]) => {
            const interv1 = v.find(x => x.src === 0);
            const interv2 = v.find(x => x.src === 1);
            return {
                datetime: v[0].datetime,
                ipmInterval1: (interv1 ? interv1 : {ipmInterval: [null, null], src: 0, datetime: null}).ipmInterval as [number, number],
                ipmInterval2: (interv2 ? interv2 : {ipmInterval: [null, null], src: 1, datetime: null}).ipmInterval as [number, number]
            }
        }),
        List.sortBy(v => parseInt(v.datetime))
    );
}


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:TimeDistribModel):TileComponent {

    const globComponents = ut.getComponents();


    // -------------------------- <TweakControls /> --------------------------------------

    class TweakControls extends React.Component<{
        tileId:number;
        wordCmp:string;

    }> {

        private ref:React.RefObject<HTMLInputElement>;

        constructor(props) {
            super(props);
            this.handleInputChange = this.handleInputChange.bind(this);
            this.handleSubmit = this.handleSubmit.bind(this);
            this.handleInputKeyDown = this.handleInputKeyDown.bind(this);
            this.ref = React.createRef();
        }

        private handleInputChange(e:React.ChangeEvent<HTMLInputElement>) {
            dispatcher.dispatch<typeof Actions.ChangeCmpWord>({
                name: Actions.ChangeCmpWord.name,
                payload: {
                    tileId: this.props.tileId,
                    value: e.target.value
                }
            });
        }

        private handleInputKeyDown(e:React.KeyboardEvent) {
            if (e.keyCode === Keyboard.Code.ENTER && !e.shiftKey && !e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                dispatcher.dispatch<typeof Actions.SubmitCmpWord>({
                    name: Actions.SubmitCmpWord.name,
                    payload: {
                        tileId: this.props.tileId
                    }
                });
            }

        }

        private handleSubmit() {
            dispatcher.dispatch<typeof Actions.SubmitCmpWord>({
                name: Actions.SubmitCmpWord.name,
                payload: {
                    tileId: this.props.tileId
                }
            });
        }

        componentDidMount() {
            if (this.ref.current) {
                this.ref.current.focus();
            }
        }

        render() {
            return (
                <form>
                    <label>
                        {ut.translate('timeDistrib__cmp_with_other_word')}:{'\u00a0'}
                        <input ref={this.ref} type="text" value={this.props.wordCmp} onChange={this.handleInputChange}
                                onKeyDown={this.handleInputKeyDown} />
                    </label>
                    {'\u00a0'}
                    <button type="button" className="cnc-button cnc-button-primary" onClick={this.handleSubmit}>
                        {ut.translate('timeDistrib__cmp_submit')}
                    </button>
                </form>
            );
        }
    }

    // -------------------------- <Chart /> --------------------------------------

    const ChartLegend:React.FC<{
        rcData:{payload?:Array<{color?:string; payload?:{name?:string; strokeDasharray?:React.ReactText;}}>};
        metric:string;

    }> = (props) => {

        const mkBoxStyle = (color:string):{[k:string]:string} => ({
            backgroundColor: color
        });

        return (
            <S.ChartLegend>
                {props.rcData.payload
                    .filter(pitem => pitem.payload.name)
                    .map((pitem, i) => (
                        <span className="item" key={`${pitem.payload.name}:${i}`}><span className="box" style={mkBoxStyle(pitem.color)} />{pitem.payload.name}</span>
                    ))
                }
                <br />({props.metric})
            </S.ChartLegend>
        );
    }

    // -------------- <Chart /> ------------------------------------------------------

    class Chart extends React.Component<{
        wordCmp:string;
        word:string;
        data1:Array<DataItemWithWCI>;
        data2:Array<DataItemWithWCI>;
        size:[number, number];
        loadingStatus:LoadingStatus;
        isSmallWidth:boolean;
        zoom:[number, number];
        refArea:[number, number];
        tileId:number;

    }> {
        constructor(props) {
            super(props);
            this.zoomMouseLeave = this.zoomMouseLeave.bind(this);
            this.zoomMouseDown = this.zoomMouseDown.bind(this);
            this.zoomMouseMove = this.zoomMouseMove.bind(this);
            this.zoomMouseUp = this.zoomMouseUp.bind(this);
            this.zoomReset = this.zoomReset.bind(this);
        }

        private zoomMouseLeave() {
            dispatcher.dispatch<typeof Actions.ZoomMouseLeave>({
                name: Actions.ZoomMouseLeave.name,
                payload: {
                    tileId: this.props.tileId
                }
            });
        }

        private zoomMouseDown(e) {
            if (e !== null) {
                dispatcher.dispatch<typeof Actions.ZoomMouseDown>({
                    name: Actions.ZoomMouseDown.name,
                    payload: {
                        tileId: this.props.tileId,
                        value: Number(e.activeLabel)
                    }
                });
            }
        }

        private zoomMouseMove(e) {
            if (this.props.refArea.some(v => v !== null)) {
                dispatcher.dispatch<typeof Actions.ZoomMouseMove>({
                    name: Actions.ZoomMouseMove.name,
                    payload: {
                        tileId: this.props.tileId,
                        value: Number(e.activeLabel)
                    }
                });
            }
        }

        private zoomMouseUp(e) {
            if (e === null) {
                this.zoomMouseLeave();
            } else {
                dispatcher.dispatch<typeof Actions.ZoomMouseUp>({
                    name: Actions.ZoomMouseUp.name,
                    payload: {
                        tileId: this.props.tileId,
                        value: Number(e.activeLabel)
                    }
                });
            }
        }

        private zoomReset() {
            dispatcher.dispatch<typeof Actions.ZoomReset>({
                name: Actions.ZoomReset.name,
                payload: {
                    tileId: this.props.tileId
                }
            });
        }

        render() {
            const data = mergeDataSets(this.props.data1, this.props.data2).filter(v => Boolean(v.datetime));
            return (
                <ResponsiveContainer width={this.props.isSmallWidth ? '100%' : '90%'} height={this.props.size[1]}>
                    <AreaChart
                        data={data.filter(v => this.props.zoom.every(v => v !== null) ? parseInt(v.datetime) >= this.props.zoom[0] && parseInt(v.datetime) <= this.props.zoom[1] : true)}
                        margin={{top: 50, right: 2, left: 0, bottom: 0}}
                        onMouseLeave = {this.zoomMouseLeave}
                        onMouseDown = {this.zoomMouseDown}
                        onMouseMove = {this.props.refArea[0] ? this.zoomMouseMove : null}
                        onMouseUp = {this.zoomMouseUp}
                    >
                        <CartesianGrid strokeDasharray="1 1"/>
                        <XAxis dataKey="datetime" interval="preserveStartEnd" minTickGap={0} type="category" />
                        <YAxis />
                        <Tooltip isAnimationActive={false}
                                formatter={(value, name, data) => (value.every(v => Boolean(v)) ? [value.join(' ~ '), name] : null)}
                                content={globComponents.AlignedRechartsTooltip} />
                        <Area type="linear"
                                dataKey="ipmInterval1"
                                name={ut.translate('timeDistrib__estimated_interval_for_{word}', {word: this.props.word})}
                                stroke={this.props.loadingStatus === LoadingStatus.BUSY_LOADING_MAIN ? theme.unfinishedChartColor : theme.categoryColor(0)}
                                fill={this.props.loadingStatus === LoadingStatus.BUSY_LOADING_MAIN ? theme.unfinishedChartColorLight : theme.categoryColor(0)}
                                strokeWidth={1}
                                isAnimationActive={false}
                                connectNulls={true} />
                        <Area type="linear"
                            dataKey="ipmInterval2"
                            name={this.props.wordCmp ? ut.translate('timeDistrib__estimated_interval_for_{word}', {word: this.props.wordCmp}): undefined}
                            stroke={this.props.loadingStatus === LoadingStatus.BUSY_LOADING_CMP ? theme.unfinishedChartColor : theme.categoryColor(1)}
                            fill={this.props.loadingStatus === LoadingStatus.BUSY_LOADING_CMP ? theme.unfinishedChartColorLight : theme.categoryColor(1)}
                            strokeWidth={1}
                            isAnimationActive={false}
                            connectNulls={true} />
                        {
                            (this.props.refArea[0] && this.props.refArea[1]) ?
                            <ReferenceArea x1={this.props.refArea[0]} x2={this.props.refArea[1]}  strokeOpacity={0.3} /> :
                            null
                        }
                        <Legend content={(props) => <ChartLegend metric={ut.translate('timeDistrib__ipm_human')} rcData={props} />} />
                        {this.props.zoom.every(v => v === null) ? null :
                            <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="30" y="20" viewBox="0 0 50 50" preserveAspectRatio="xMaxYMin meet">
                                <g fillOpacity="0" stroke="gray" strokeWidth="3">
                                    <circle cx="20" cy="20" r="14"/>
                                    <line x1="30" y1="30" x2="42" y2="42" strokeLinecap="round"/>
                                    <line x1="15" y1="15" x2="25" y2="25" strokeLinecap="round"/>
                                    <line x1="25" y1="15" x2="15" y2="25" strokeLinecap="round"/>
                                </g>
                                <rect onClick={this.zoomReset} x1="5" y1="5" width="40" height="40" fillOpacity="0"/>
                            </svg>
                        }
                    </AreaChart>
                </ResponsiveContainer>
            );
        }
    }

    // -------------- <TimeDistribTile /> ------------------------------------------------------

    const TimeDistribTile:React.FC<TimeDistribModelState & CoreTileComponentProps> = (props) => {

        return (
            <globComponents.TileWrapper tileId={props.tileId} isBusy={props.loadingStatus !== LoadingStatus.IDLE} error={props.error}
                        hasData={props.data.length >= MIN_DATA_ITEMS_TO_SHOW}
                        sourceIdent={{corp: props.corpname, subcorp: props.subcDesc}}
                        supportsTileReload={props.supportsReloadOnError}
                        backlink={props.backlink}
                        issueReportingUrl={props.issueReportingUrl}>
                <S.TimeDistribTile>
                    {props.isTweakMode ?
                        <div className="tweak-box">
                            <TweakControls wordCmp={props.wordCmpInput} tileId={props.tileId} />
                        </div> :
                        null
                    }
                    {props.wordCmp && props.dataCmp.length < MIN_DATA_ITEMS_TO_SHOW && props.loadingStatus === LoadingStatus.IDLE ?
                        <p className="message" style={{color: theme.categoryColor(1)}}>
                            {ut.translate('timeDistrib__no_data_found_for_{word}', {word: props.wordCmp})}
                        </p> :
                        ''
                    }
                    <Chart data1={props.data} data2={props.dataCmp}
                            size={[props.renderSize[0], 300]}
                            loadingStatus={props.loadingStatus}
                            word={props.wordMainLabel}
                            wordCmp={props.wordCmp}
                            isSmallWidth={props.isMobile || props.widthFract < 2}
                            zoom={props.zoom}
                            refArea={props.refArea}
                            tileId={props.tileId}/>
                </S.TimeDistribTile>
            </globComponents.TileWrapper>
        );
    };


    return BoundWithProps(TimeDistribTile, model);

}