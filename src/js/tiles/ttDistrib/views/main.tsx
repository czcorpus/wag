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
import * as d3 from 'd3';
import {ActionDispatcher, ViewUtils, Bound} from 'kombo';
import { TTDistribModel, TTDistribModelState } from '../model';
import * as britecharts from 'britecharts';
import { DataRow } from '../api';
import { GlobalComponents } from '../../../views/global';


export const drawChart = (container:HTMLElement, size:[number, number], data) => {
    const containerSel = d3.select(container);
    const barChart = britecharts.bar();
    barChart
        .margin({
            left: 0,
            right: 0,
            top: 0,
            bottom: 20
        })
        .percentageAxisToMaxRatio(1.3)
        .isHorizontal(true)
        .isAnimated(true)
        .yAxisPaddingBetweenChart(2)
        .enableLabels(true)
        .labelsNumberFormat('.0f')
        .colorSchema(britecharts.colors.colorSchemas.britecharts)
        .height(size[1] * 0.9)
        .width(size[0] * 0.95);
    containerSel.datum(data).call(barChart);
};


export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:TTDistribModel):React.ComponentClass {

    const globComponents = ut.getComponents();

    class ChartWrapper extends React.Component<{
        data:Immutable.List<DataRow>;
        size:[number, number];
    }> {

        private chartContainer:React.RefObject<HTMLDivElement>;

        constructor(props) {
            super(props);
            this.chartContainer = React.createRef();
        }

        componentDidMount() {
            drawChart(this.chartContainer.current, this.props.size, this.props.data.toArray());
        }

        componentDidUpdate() {
            drawChart(this.chartContainer.current, this.props.size, this.props.data.toArray());
        }

        render() {
            return (
                <div>
                    <div ref={this.chartContainer} />
                </div>
            );
        }
    };


    class View extends React.PureComponent<TTDistribModelState> {

        render() {
            if (this.props.isBusy) {
                return <div><globComponents.AjaxLoader /></div>

            } else if (this.props.data.size === 0) {
                return <div><globComponents.EmptySet fontSize="5em" /></div>

            } else {
                return (
                    <div>
                        <ChartWrapper data={this.props.data} size={this.props.renderFrameSize} />
                    </div>
                );
            }
        }
    }

    return Bound<TTDistribModelState>(View, model);
}