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
import { IActionDispatcher, ViewUtils } from 'kombo';
import * as React from 'react';
import { Theme } from '../../common/theme';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../models/actions';
import { GlobalComponents } from '../../views/global';
import { Rect, WordCloudItemCalc, TooltipData, createWordCloud, MAX_WC_FONT_SIZE_MOBILE, MAX_WC_FONT_SIZE } from './calc';


export type WordCloudItem = WordCloudItemCalc;


export interface WordCloudProps<T> {
    style?:{[prop:string]:string};
    isMobile:boolean;
    width:number;
    height:number;
    font:string;
    data:Array<T>;
    dataTransform:(v:T)=>WordCloudItem;
    colors?:(i:number)=>string;
    selectedText?:string;
}
interface WordCloudState<T> {
    data:Array<T>;
    rects:Array<Rect>;
    transform:string;
    activeItem:WordCloudItem|null;
    tooltipPos:[number,number]|null;
}


export function init<T>(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme):React.ComponentClass<WordCloudProps<T>, {}> {

    // -------------------------- <Word /> -----------------------------------------

    const Word:React.SFC<{
        rect:Rect;
        color:string;
        font:string;
        onMouseMove:(x:number, y:number, data:WordCloudItem)=>void;
        onMouseOver:(x:number, y:number, data:WordCloudItem)=>void;
        onMouseOut:(data:WordCloudItem)=>void;
        selectedText?:string;

    }> = (props) => {

        const style = {
            fontWeight: 700,
            fontSize: `${props.rect.fontSize}px`,
            fontFamily: props.font
        };

        const handleMouseMove = (e:React.MouseEvent) => {
            props.onMouseMove(Math.max(e.pageX + 20, 0), Math.max(e.pageY - 50, 0), props.rect.data);
        };

        const handleMouseOver = (e:React.MouseEvent) => {
            props.onMouseOver(e.pageX, e.pageY, props.rect.data)
        };

        const handleMouseOut = () => {
            props.onMouseOut(props.rect.data);
        };

        return (
            <g pointerEvents="all"
                onMouseMove={handleMouseMove}
                onMouseOut={handleMouseOut}
                onMouseOver={handleMouseOver}>

                <rect x={props.rect.x} y={props.rect.y}
                        width={props.rect.w} height={props.rect.h}
                        fill='blue' opacity={props.rect.data.text === props.selectedText ? 0.05 : 0}/>
                <text x={props.rect.x}
                        y={props.rect.y + props.rect.fontSize}
                        fill={props.color}
                        pointerEvents="none"
                        style={style}>{props.rect.data.text}</text>
            </g>
        );
    };

    // -------------------------- <Tooltip /> -----------------------------------------

    class Tooltip extends React.PureComponent<{
        data:TooltipData;
        x:number;
        y:number;

    }> {

        private elmRef:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.elmRef = React.createRef();
        }

        private calcXPos():number {
            return this.elmRef.current ? Math.max(0, this.props.x - this.elmRef.current.getBoundingClientRect().width - 5) : this.props.x;
        }

        private calcYPos():number {
            return this.elmRef.current ? this.props.y + this.elmRef.current.getBoundingClientRect().height + 5 : this.props.y;
        }

        render() {
            const style:React.CSSProperties = {
                left: `${this.calcXPos()}px`,
                top: `${this.calcYPos()}px`,
                display: this.props.data && this.props.data.length > 0 ? 'block' : 'none',
                position: 'absolute'
            };
            const decimalSeparator = ut.formatNumber(0.1).slice(1, -1);

            return (
                <div ref={this.elmRef} className="wdg-tooltip" style={style}>
                    <table>
                        <tbody>
                            {(this.props.data || []).map((v, i) => {
                                if (typeof v.value === 'string') {
                                    return <tr key={`${v.label}:${i}`}>
                                        <td key="label" className="label">{v.label}</td>
                                        <td key="value" className="value" colSpan={3}>{v.value}</td>
                                    </tr>
                                } else {
                                    const [numWh, numDec] = ut.formatNumber(v.value, v.round).split(decimalSeparator);
                                    return <tr key={`${v.label}:${i}`}>
                                        <td key="label" className="label">{v.label}</td>
                                        <td key="valueWh" className="value numWh">{numWh}</td>
                                        <td key="valueDec" className="value numDec">{numDec ? decimalSeparator + numDec : null}</td>
                                        <td key="unit" className="value unit">{v.unit}</td>
                                    </tr>
                                }
                            })}
                        </tbody>
                    </table>
                </div>
            );
        }
    }

    // -------------------------- <WordCloud /> -----------------------------------------

    class WordCloud<T> extends React.Component<WordCloudProps<T>, WordCloudState<T>> {

        private readonly chartContainer:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.chartContainer = React.createRef();
            this.state = {
                data: this.props.data,
                rects: [],
                transform: '',
                activeItem: null,
                tooltipPos: [0, 0]
            };
            this.handleMouseMove = this.handleMouseMove.bind(this);
            this.handleMouseOver = this.handleMouseOver.bind(this);
            this.handleMouseOut = this.handleMouseOut.bind(this);
        }

        handleMouseMove(x:number, y:number, data:WordCloudItem) {
            this.setState({
                data: this.state.data,
                rects: this.state.rects,
                transform: this.state.transform,
                activeItem: this.state.activeItem !== data ? data : this.state.activeItem,
                tooltipPos: [x, y]
            });
        }

        handleMouseOver(x:number, y:number, data:WordCloudItem) {
            if (data !== this.state.activeItem) {
                this.setState({
                    data: this.state.data,
                    rects: this.state.rects,
                    transform: this.state.transform,
                    activeItem: data,
                    tooltipPos: [x, y]
                });
                dispatcher.dispatch<GlobalActions.SubqItemHighlighted>({
                    name: GlobalActionName.SubqItemHighlighted,
                    payload: {
                        interactionId: data.interactionId,
                        text: data.text
                    }
                });
            }
        }

        handleMouseOut(data:WordCloudItem) {
            this.setState({
                data: this.state.data,
                rects: this.state.rects,
                transform: this.state.transform,
                activeItem: null,
                tooltipPos: [0, 0]
            });
            dispatcher.dispatch<GlobalActions.SubqItemDehighlighted>({
                name: GlobalActionName.SubqItemDehighlighted,
                payload: {
                    interactionId: data.interactionId
                }
            });
        }

        // TODO (use memoize helper?, what about resize?)
        static getDerivedStateFromProps<T>(props:WordCloudProps<T>, state:WordCloudState<T>) {
            if (props.data !== state.data) {
                return {
                    data: props.data,
                    rects: [],
                    transform: state.transform,
                    activeItem: null,
                    tooltipPos: [0, 0]
                };
            }
            return null;
        }

        render() {
            const vboxAspectRatio = this.props.width / this.props.height;
            const wcloud = createWordCloud(
                this.props.data.map(this.props.dataTransform),
                200,
                200 / vboxAspectRatio,
                this.props.isMobile,
                this.props.font
            );

            const style = Object.assign({width: '100%'}, this.props.style);
            style['minHeight'] = `${2 * (this.props.isMobile ? MAX_WC_FONT_SIZE_MOBILE : MAX_WC_FONT_SIZE)}px`;
            const colors = this.props.colors ? this.props.colors : theme.scaleColorIndexed();
            return (
                <div ref={this.chartContainer} style={style}>
                    <Tooltip x={this.state.tooltipPos[0]} y={this.state.tooltipPos[1]}
                            data={this.state.activeItem ? this.state.activeItem.tooltip : []} />
                    <svg width="100%" height="100%" preserveAspectRatio="xMinYMid meet"
                            viewBox={`0 0 200 ${(200 / vboxAspectRatio).toFixed()}`}>
                        <g transform={wcloud.transform}>
                            {wcloud.rectangles.map((r, i) =>
                                <Word key={`${r.x}:${r.y}:${r.w}:${r.h}`}
                                        color={r.data && r.data.color ? r.data.color : colors(i)} rect={r}
                                    onMouseMove={this.handleMouseMove}
                                    onMouseOut={this.handleMouseOut}
                                    onMouseOver={this.handleMouseOver}
                                    font={this.props.font}
                                    selectedText={this.props.selectedText} />
                            )}
                        </g>
                    </svg>
                </div>
            );
        }
    }

    return WordCloud;

}