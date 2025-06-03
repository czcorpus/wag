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
import { Theme } from '../../page/theme.js';
import { Actions as GlobalActions } from '../../models/actions.js';
import { GlobalComponents } from '../common/index.js';
import { Rect, WordCloudItemCalc, TooltipData, createWordCloud, MAX_WC_FONT_SIZE_MOBILE, MAX_WC_FONT_SIZE } from './calc.js';

import * as S from '../common/style.js';


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
    underlineWords?:Array<string>;
}


export function init<T>(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme):React.FC<WordCloudProps<T>> {

    // -------------------------- <Word /> -----------------------------------------

    const Word:React.FC<{
        rect:Rect;
        color:string;
        font:string;
        onMouseMove:(x:number, y:number, data:WordCloudItem)=>void;
        onMouseOver:(x:number, y:number, data:WordCloudItem)=>void;
        onMouseOut:(data:WordCloudItem)=>void;
        selectedText?:string;
        underline?:boolean;

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
                        fill={props.color} stroke={props.color} strokeWidth={10}
                        opacity={props.underline && props.rect.data.text === props.selectedText ? 1 : 0} />

                <text x={props.rect.x + props.rect.w/2}
                        y={props.rect.y + props.rect.h/2 + props.rect.fontSize/4}
                        fill={props.underline && props.rect.data.text === props.selectedText ? 'white' : props.color}
                        textDecoration={props.underline && props.rect.data.text !== props.selectedText ? "underline" : null}
                        pointerEvents="none"
                        textAnchor="middle"
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
                <S.WdgTooltip ref={this.elmRef} style={style}>
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
                </S.WdgTooltip>
            );
        }
    }

    // -------------------------- <WordCloud /> -----------------------------------------

    const WordCloud:React.FC<WordCloudProps<T>> = (props) => {


        const chartContainer:React.RefObject<HTMLDivElement> = React.useRef(null);

        const [currState, setState] = React.useState<{tooltipPos:[number, number], activeItem:WordCloudItem|undefined}>(
            {tooltipPos:[0, 0], activeItem: undefined}
        );

        const handleMouseMove = (x:number, y:number, data:WordCloudItem) => {
            setState({
                tooltipPos: [x, y],
                activeItem: currState.activeItem !== data ? data : currState.activeItem
            });
        };

        const handleMouseOver = (x:number, y:number, data:WordCloudItem) => {
            if (data !== currState.activeItem) {
                setState({
                    tooltipPos: [x, y],
                    activeItem: data
                });
                dispatcher.dispatch<typeof GlobalActions.SubqItemHighlighted>({
                    name: GlobalActions.SubqItemHighlighted.name,
                    payload: {
                        interactionId: data.interactionId,
                        text: data.text
                    }
                });
            }
        };

        const handleMouseOut = (data:WordCloudItem) => {
            setState({
                activeItem: null,
                tooltipPos: [0, 0]
            });
            dispatcher.dispatch<typeof GlobalActions.SubqItemDehighlighted>({
                name: GlobalActions.SubqItemDehighlighted.name,
                payload: {
                    interactionId: data.interactionId
                }
            });
        };


        const boxWidth = chartContainer.current ? chartContainer.current.offsetWidth : 200;
        const vboxAspectRatio = props.width / props.height;
        const wcloud = createWordCloud(
            props.data.map(props.dataTransform),
            boxWidth,
            boxWidth / vboxAspectRatio,
            props.isMobile,
            props.font
        );

        const style = {...props.style, width: '100%', height: '100%'};
        style['minHeight'] = `${2 * (props.isMobile ? MAX_WC_FONT_SIZE_MOBILE : MAX_WC_FONT_SIZE)}px`;
        const colors = props.colors ? props.colors : theme.scaleColorIndexed();
        return (
            <div ref={chartContainer} style={style}>
                <Tooltip x={currState.tooltipPos[0]} y={currState.tooltipPos[1]}
                        data={currState.activeItem ? currState.activeItem.tooltip : []} />
                <svg width="100%" height="100%" preserveAspectRatio="xMinYMid meet"
                        viewBox={`0 0 ${boxWidth} ${(boxWidth / vboxAspectRatio).toFixed()}`}>
                    <g transform={wcloud.transform}>
                        {wcloud.rectangles.map((r, i) =>
                            <Word key={`${r.x}:${r.y}:${r.w}:${r.h}`}
                                    color={r.data && r.data.color ? r.data.color : colors(i)} rect={r}
                                onMouseMove={handleMouseMove}
                                onMouseOut={handleMouseOut}
                                onMouseOver={handleMouseOver}
                                font={props.font}
                                selectedText={props.selectedText}
                                underline={props.underlineWords && props.underlineWords.includes(r.data.text)}/>
                        )}
                    </g>
                </svg>
            </div>
        );
    }

    return WordCloud;

}