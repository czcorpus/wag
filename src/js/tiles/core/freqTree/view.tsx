/*
 * Copyright 2019 Martin Zimandl <martin.zimandl@gmail.com>
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
import * as Immutable from 'immutable';
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';

import { Theme } from '../../../common/theme';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { ActionName, Actions } from './actions';
import { FreqTreeModel, FreqTreeModelState } from './model';
import { findCurrLemmaVariant } from '../../../models/query';

type TreeData = {name: any; children:any[]}[];

export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:FreqTreeModel):TileComponent {

    const globComponents = ut.getComponents();

    const transformData = (data:Immutable.Map<string, any>):TreeData => {        
        return data.entrySeq().map(([k1, v1]) => ({
            name: k1,
            children: v1.entrySeq().map(([k2, v2]) => ({
                name: k2,
                children: v2.toJS().sort((a, b) => a.name > b.name ? 1 : -1)
            })).toArray().sort((a, b) => a.name > b.name ? 1 : -1)
        })).toArray()
    }

    // ------- <TreeWrapper /> ---------------------------------------------------

    // this is for rendering customized tree blocks
    class CustomizedContent extends React.PureComponent<{
        root?:{name:string; children:Array<any>};
        depth?:number;
        x?:number;
        y?:number;
        width?:number;
        height?:number;
        index?:number;
        payload?:any;
        colors?:Array<string>;
        rank?:number;
        name?:string;
    }> {
        render() {
            const {root, depth, x, y, width, height, index, payload, colors, rank, name} = this.props;
            // leaf rect needs to be filled with color in order to show tooltip on mouse over
            return (
                <g>
                    <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        style={{
                            fill: depth === 1 ? colors[index % colors.length] : 'white',
                            fillOpacity: depth > 1 ? 0 : 1,
                            stroke: '#fff',
                            strokeWidth: 2 / (depth + 1e-10),
                            strokeOpacity: 1 / (depth + 1e-10),
                        }} />
                    
                    {
                        name ?
                            depth === 1 && name.length * 6 < width ? (
                                <text x={x + width / 2} y={y + 20} textAnchor="middle" fill="rgb(60,60,60)" fontSize={14} fontWeight={900}>
                                    {name}
                                </text>
                            ) : depth === 2 && name.length * 4 < width ? (
                                <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="black" fontSize={10} fontWeight={600}>
                                    {name}
                                </text>
                            ) : null
                        : null
                    }
                </g>
            );
        }
    }

    const TreeWrapper:React.SFC<{
        data:TreeData;
        width:string|number;
        height:string|number;
        colors:Array<string>;
        isMobile:boolean;
    }> = (props) => {
        if (props.isMobile) {
            return (
                <Treemap data={props.data}
                        width={typeof props.width === 'string' ? parseInt(props.width) : props.width}
                        height={typeof props.height === 'string' ? parseInt(props.height) : props.height}
                        isAnimationActive={false}
                        content={<CustomizedContent colors={props.colors} />}>
                    {props.children}
                </Treemap>
            );

        } else {
            return (
                <ResponsiveContainer width={props.width} height={props.height}>
                    <Treemap data={props.data}
                            content={<CustomizedContent colors={props.colors} />}>
                        {props.children}
                    </Treemap>
                </ResponsiveContainer>
            );
        }
    }


    // -------------------------- <Tree /> --------------------------------------

    const Tree:React.SFC<{
        data:TreeData;
        width:string|number;
        height:string|number;
        isMobile:boolean;
        colors:Array<string>;
    }> = (props) => {
        return (
            <TreeWrapper data={props.data} isMobile={props.isMobile} width={props.width} height={props.height} colors={props.colors}>
                <Tooltip
                    cursor={false}
                    isAnimationActive={false}
                    separator=""
                    formatter={(value, name, props) => <span>{props.payload.root.name} <br/> -> {props.payload.name}: {(100*value/props.payload.root.value).toFixed(2)}% ({value})</span>} />
            </TreeWrapper>
        );
    };

    // -------------------------- <FreqTreeTile /> --------------------------------------

    class FreqTreeTile extends React.PureComponent<FreqTreeModelState & CoreTileComponentProps> {

        private chartsRef:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.chartsRef = React.createRef();
            this.handleScroll = this.handleScroll.bind(this);
            this.handleDotClick = this.handleDotClick.bind(this);
        }

        private handleScroll():void {
            dispatcher.dispatch<Actions.SetActiveBlock>({
                name: ActionName.SetActiveBlock,
                payload: {
                    idx: Math.round(this.chartsRef.current.scrollLeft / this.props.renderSize[0]),
                    tileId: this.props.tileId
                }
            });
        }

        private handleDotClick(idx:number) {
            if (this.chartsRef.current && this.props.isMobile) {
                this.chartsRef.current.scrollLeft = Math.round(this.props.renderSize[0] * 0.92 * idx);
            }
        }

        render() {
            const chartsViewBoxWidth = this.props.isMobile ? '100%' : `${100 / Math.min(this.props.frequencyTree.size, this.props.maxChartsPerLine)}%`;
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.frequencyTree.find(v => v.isReady) !== undefined}
                        sourceIdent={{corp: this.props.corpname}}
                        backlink={this.props.backlink}
                        supportsTileReload={this.props.supportsReloadOnError}>
                    <div className="FreqTreeTile">
                        <div className={`charts${this.props.isBusy ? ' incomplete' : ''}`} ref={this.chartsRef} onScroll={this.handleScroll} style={{flexWrap: this.props.isMobile ? 'nowrap' : 'wrap'}}>
                            {this.props.frequencyTree.filter(block => block.isReady).map(block => {
                                const chartWidth = this.props.isMobile ? (this.props.renderSize[0] * 0.9).toFixed() : "90%";
                                const transformedData = block.data.size > 0 ? transformData(block.data) : null;
                                return  (
                                    <div key={block.ident} style={{width: chartsViewBoxWidth, height: "100%"}}>
                                        <h3>{block.label}</h3>
                                        {
                                            this.props.lemmas.map(lemma => findCurrLemmaVariant(lemma).word).map(word => {
                                                if (transformedData) {
                                                    const lemmaData = transformedData.find(item => item.name === word).children;
                                                    if (lemmaData) {
                                                        return <div key={word}>
                                                            <p style={{textAlign: 'center'}}>{word}</p>
                                                            <Tree data={lemmaData} width={chartWidth} height={250}
                                                                isMobile={this.props.isMobile} colors={this.props.colors} />
                                                        </div>
                                                    }
                                                }
                                                return <p className="note" style={{textAlign: 'center'}}>No result</p>
                                            })
                                        }
                                    </div>
                                );
                            })}
                        </div>
                        {this.props.isMobile && this.props.frequencyTree.size > 1 ?
                            <globComponents.HorizontalBlockSwitch htmlClass="ChartSwitch"
                                    blockIndices={Immutable.List(this.props.frequencyTree.map((_, i) => i))}
                                    currentIdx={this.props.activeBlock}
                                    onChange={this.handleDotClick} /> :
                            null
                        }
                    </div>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, FreqTreeModelState>(FreqTreeTile, model);
}