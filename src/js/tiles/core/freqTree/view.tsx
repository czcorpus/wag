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
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';

import { Theme } from '../../../page/theme.js';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile.js';
import { GlobalComponents } from '../../../views/common/index.js';
import { Actions } from './actions.js';
import { FreqTreeModel, FreqTreeModelState } from './model.js';
import { Dict, pipe, List } from 'cnc-tskit';
import { FreqTreeDataFreqs } from '../../../models/tiles/freqTree.js';

import * as S from './style.js';

type TreeData = {name: any; children:any[]}[];

export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:FreqTreeModel):TileComponent {

    const globComponents = ut.getComponents();

    const transformData = (data:FreqTreeDataFreqs):TreeData => pipe(
        data,
        Dict.mapEntries(
            ([k1, v1]) => ({
                name: k1,
                children: pipe(
                    {...v1},
                    Dict.mapEntries(
                        ([k2, v2]) => ({
                            name: k2,
                            children: List.sorted((v3a, v3b) => v3a.name.localeCompare(v3b.name), [...v2])
                        })
                    ),
                    List.map(([,v]) => v),
                    List.sortedAlphaBy(v => v.name)
                )
            })
        ),
        List.map(([,v]) => v)
    );

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
        rank?:number;
        name?:string;
        handleZoom:(category:string) => void;
    }> {
        render() {
            const {root, depth, x, y, width, height, index, name, handleZoom} = this.props;
            // leaf rect needs to be filled with color in order to show tooltip on mouse over
            return (
                <g>
                    <rect
                        onDoubleClick={() => handleZoom(root.name)}
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        style={{
                            fill: depth === 1 ? theme.categoryColor(index) : 'white',
                            fillOpacity: depth > 1 ? 0 : 1,
                            stroke: '#fff',
                            strokeWidth: 2 / (depth + 1e-10),
                            strokeOpacity: 1 / (depth + 1e-10),
                        }} />

                    {
                        name ?
                            depth === 1 && name.length * 6 < width && height > 14 ? (
                                <text x={x + width / 2} y={y + 20} textAnchor="middle" fill="rgb(60,60,60)" fontSize={14} fontWeight={900} style={{userSelect: 'none'}}>
                                    {name}
                                </text>
                            ) : depth === 2 && name.length * 4 < width && height > 10 ? (
                                <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fill="black" fontSize={10} fontWeight={600} style={{userSelect: 'none'}}>
                                    {name}
                                </text>
                            ) : null
                        : null
                    }
                </g>
            );
        }
    }

    const TreeWrapper:React.FC<{
        data:TreeData;
        width:string|number;
        height:string|number;
        isMobile:boolean;
        handleZoom:(category:string) => void;
        children:React.ReactNode;
    }> = (props) => {
        if (props.isMobile) {
            return (
                <Treemap data={props.data}
                        width={typeof props.width === 'string' ? parseInt(props.width) : props.width}
                        height={typeof props.height === 'string' ? parseInt(props.height) : props.height}
                        isAnimationActive={false}
                        content={<CustomizedContent handleZoom={props.handleZoom}/>}>
                    {props.children}
                </Treemap>
            );

        } else {
            return (
                <ResponsiveContainer width={props.width} height={props.height}>
                    <Treemap data={props.data}
                            content={<CustomizedContent handleZoom={props.handleZoom}/>}>
                        {props.children}
                    </Treemap>
                </ResponsiveContainer>
            );
        }
    }


    // -------------------------- <Tree /> --------------------------------------

    const Tree:React.FC<{
        data:TreeData;
        width:string|number;
        height:string|number;
        isMobile:boolean;
        handleZoom:(category:string) => void;
    }> = (props) => {
        return (
            <TreeWrapper data={props.data} handleZoom={props.handleZoom} isMobile={props.isMobile} width={props.width} height={props.height}>
                <Tooltip
                    cursor={false}
                    isAnimationActive={false}
                    separator=""
                    formatter={(value, name, props):any =>
                        <span>
                            {props.payload.root.name}
                            <br/>{' -> '}
                            {props.payload.name}: {(100*parseInt(value)/(props.payload.root.value as number)).toFixed(2)} % ({value} ipm)
                        </span>
                    }
                    content={globComponents.AlignedRechartsTooltip} />
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
            dispatcher.dispatch<typeof Actions.SetActiveBlock>({
                name: Actions.SetActiveBlock.name,
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

        private handleZoom(blockId:number, variantId:number, category:string) {
            dispatcher.dispatch<typeof Actions.SetZoom>({
                name: Actions.SetZoom.name,
                payload: {
                    tileId: this.props.tileId,
                    blockId: blockId,
                    variantId: variantId,
                    category: category
                }
            });
        }

        render() {
            const chartsViewBoxWidth = this.props.isMobile ? '100%' : `${100 / Math.min(this.props.frequencyTree.length, this.props.maxChartsPerLine)}%`;
            return (
                <globComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.frequencyTree.find(v => v.isReady) !== undefined}
                        sourceIdent={{corp: this.props.corpname}}
                        backlink={this.props.backlink}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <S.FreqTreeTile>
                        <S.Charts incomplete={this.props.isBusy} isMobile={this.props.isMobile} ref={this.chartsRef} onScroll={this.handleScroll}>
                            {pipe(
                                this.props.frequencyTree,
                                List.filter(block => block.isReady),
                                List.map((block, blockId) => {
                                    const chartWidth = this.props.isMobile ? (this.props.renderSize[0] * 0.9).toFixed() : "90%";
                                    const transformedData = Dict.size(block.data) > 0 ? transformData(block.data) : null;
                                    return  (
                                        <div key={block.ident} style={{width: chartsViewBoxWidth, height: "100%"}}>
                                            <h3>{block.label}</h3>
                                            {
                                                pipe(
                                                    this.props.lemmaVariants,
                                                    List.map(lemma => lemma.word),
                                                    List.map((word, variantId) => {
                                                        if (transformedData) {
                                                            let variantData = List.find(item => item.name === word, transformedData).children;
                                                            if (variantData) {
                                                                // zooming category done by making children zero size
                                                                // this will keep the same category colors and make nice transition animations
                                                                const zoomCategory = this.props.zoomCategory[blockId][variantId];
                                                                if (zoomCategory) {
                                                                    variantData = variantData.map(item =>
                                                                        item.name === zoomCategory ? item :
                                                                        {name: item.name, children: item.children.map(child =>
                                                                            ({name: child.name, value: 0})
                                                                        )}
                                                                    );
                                                                }
                                                                return <div key={word}>
                                                                    <h4>{`[${variantId + 1}] ${word}`}</h4>
                                                                    <Tree
                                                                        data={variantData}
                                                                        width={chartWidth}
                                                                        height={250}
                                                                        handleZoom={(category) => this.handleZoom(blockId, variantId, category)}
                                                                        isMobile={this.props.isMobile} />
                                                                </div>
                                                            }
                                                        }
                                                        return <p key={`variant:${variantId}`} className="note" style={{textAlign: 'center'}}>
                                                            {ut.translate('freqTree__no_result')}
                                                        </p>
                                                    })
                                                )
                                            }
                                        </div>
                                    );
                                })
                            )}

                        </S.Charts>
                        {this.props.isMobile && this.props.frequencyTree.length > 1 ?
                            <globComponents.HorizontalBlockSwitch htmlClass="ChartSwitch"
                                    blockIndices={this.props.frequencyTree.map((_, i) => i)}
                                    currentIdx={this.props.activeBlock}
                                    onChange={this.handleDotClick} /> :
                            null
                        }
                    </S.FreqTreeTile>
                </globComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, FreqTreeModelState>(FreqTreeTile, model);
}