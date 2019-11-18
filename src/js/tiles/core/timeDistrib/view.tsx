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
import * as Immutable from 'immutable';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { DataItemWithWCI, ActionName, Actions } from './common';
import { TimeDistribModel, TimeDistribModelState } from './model';
import { KeyCodes } from '../../../common/util';


const MIN_DATA_ITEMS_TO_SHOW = 2;

interface MultiChartItem {
    datetime:string;
    ipmInterval1:[number, number];
    ipmInterval2:[number, number];
}

function mergeDataSets(data1:Immutable.List<DataItemWithWCI>, data2:Immutable.List<DataItemWithWCI>):Array<MultiChartItem> {
    return data1.map(v => ({
        datetime: v.datetime,
        ipmInterval:[v.ipmInterval[0], v.ipmInterval[1]],
        src: 0
    })).concat(
        data2.map(v => ({
            datetime: v.datetime,
            ipmInterval:[v.ipmInterval[0], v.ipmInterval[1]],
            src: 1
        }))
    ).groupBy(v => v.datetime)
    .map(v => ({
        datetime: v.get(0).datetime,
        ipmInterval1: v.find(x => x.src === 0, null, {ipmInterval: [null, null], src: 0, datetime: null}).ipmInterval as [number, number],
        ipmInterval2: v.find(x => x.src === 1, null, {ipmInterval: [null, null], src: 1, datetime: null}).ipmInterval as [number, number]
    }))
    .sort((v1, v2) => parseInt(v1.datetime) - parseInt(v2.datetime))
    .toArray();

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
            dispatcher.dispatch<Actions.ChangeCmpWord>({
                name: ActionName.ChangeCmpWord,
                payload: {
                    tileId: this.props.tileId,
                    value: e.target.value
                }
            });
        }

        private handleInputKeyDown(e:React.KeyboardEvent) {
            if (e.keyCode === KeyCodes.ENTER && !e.shiftKey && !e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                dispatcher.dispatch<Actions.SubmitCmpWord>({
                    name: ActionName.SubmitCmpWord,
                    payload: {
                        tileId: this.props.tileId
                    }
                });
            }

        }

        private handleSubmit() {
            dispatcher.dispatch<Actions.SubmitCmpWord>({
                name: ActionName.SubmitCmpWord,
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

    const ChartLegend:React.SFC<{
        rcData:{payload:Array<{color:string; payload:{stroke:string; fill:string; name:string}}>};
        metric:string;

    }> = (props) => {

        const mkBoxStyle = (color:string):{[k:string]:string} => ({
            backgroundColor: color
        });

        return (
            <p className="ChartLegend" style={{textAlign: 'center'}}>
                {props.rcData.payload
                    .filter(pitem => pitem.payload.name)
                    .map((pitem, i) => (
                        <span className="item" key={`${pitem.payload.name}:${i}`}><span className="box" style={mkBoxStyle(pitem.color)} />{pitem.payload.name}</span>
                    ))
                }
                <br />({props.metric})
            </p>
        );
    }

    // -------------- <Chart /> ------------------------------------------------------

    const Chart:React.SFC<{
        wordCmp:string;
        word:string;
        data1:Immutable.List<DataItemWithWCI>;
        data2:Immutable.List<DataItemWithWCI>;
        size:[number, number];
        isPartial:boolean;
        isSmallWidth:boolean;

    }> = React.memo((props) => {
        const data = mergeDataSets(props.data1, props.data2);
        return (
            <ResponsiveContainer width={props.isSmallWidth ? '100%' : '90%'} height={props.size[1]}>
                <AreaChart data={data}
                        margin={{top: 10, right: 30, left: 0, bottom: 0}}>
                    <CartesianGrid strokeDasharray="1 1"/>
                    <XAxis dataKey="datetime" interval="preserveStartEnd" minTickGap={0} type="category" />
                    <YAxis />
                    <Tooltip isAnimationActive={false} />
                    <Area type="linear"
                            dataKey="ipmInterval1"
                            name={ut.translate('timeDistrib__estimated_interval_for_{word}', {word: props.word})}
                            stroke={props.isPartial ? '#dddddd' : theme.barColor(0)}
                            fill={props.isPartial ? '#eeeeee' : theme.barColor(0)}
                            strokeWidth={1}
                            isAnimationActive={false}
                            connectNulls={true} />
                    <Area type="linear"
                        dataKey="ipmInterval2"
                        name={props.wordCmp ? ut.translate('timeDistrib__estimated_interval_for_{word}', {word: props.wordCmp}): undefined}
                        stroke={props.isPartial ? '#dddddd' : theme.barColor(1)}
                        fill={props.isPartial ? '#eeeeee' : theme.barColor(1)}
                        strokeWidth={1}
                        isAnimationActive={false}
                        connectNulls={true} />
                    <Legend content={(props) => <ChartLegend metric={ut.translate('timeDistrib__ipm_human')} rcData={props} />} />
                </AreaChart>
            </ResponsiveContainer>
        );
    });

    // -------------- <TimeDistribTile /> ------------------------------------------------------

    const TimeDistribTile:React.SFC<TimeDistribModelState & CoreTileComponentProps> = (props) => {

        return (
            <globComponents.TileWrapper tileId={props.tileId} isBusy={props.isBusy} error={props.error}
                        hasData={props.data.size >= MIN_DATA_ITEMS_TO_SHOW}
                        sourceIdent={{corp: props.corpname, subcorp: props.subcDesc}}
                        supportsTileReload={props.supportsReloadOnError}
                        backlink={props.backlink}
                        issueReportingUrl={props.issueReportingUrl}>
                <div className="TimeDistribTile">
                    {props.isTweakMode ?
                        <div className="tweak-box">
                            <TweakControls wordCmp={props.wordCmpInput} tileId={props.tileId} />
                        </div> :
                        null
                    }
                    {props.wordCmp && props.dataCmp.size < MIN_DATA_ITEMS_TO_SHOW && !props.isBusy ?
                        <p className="message" style={{color: theme.barColor(1)}}>
                            {ut.translate('timeDistrib__no_data_found_for_{word}', {word: props.wordCmp})}
                        </p> :
                        ''
                    }
                    <Chart data1={props.data} data2={props.dataCmp}
                            size={[props.renderSize[0], 300]}
                            isPartial={props.isBusy}
                            word={props.wordMainLabel}
                            wordCmp={props.wordCmp}
                            isSmallWidth={props.isMobile || props.widthFract < 2} />
                </div>
            </globComponents.TileWrapper>
        );
    };


    return BoundWithProps(TimeDistribTile, model);

}