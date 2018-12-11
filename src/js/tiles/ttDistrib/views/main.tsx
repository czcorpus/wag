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
import {ActionDispatcher, ViewUtils} from 'kombo';
import { TTDistribModel } from '../model';
import * as britecharts from 'britecharts';


export const drawChart = (svg, data) => {
    const barChart = britecharts.bar();
    barChart
        .margin({
            left: 100,
            right: 20,
            top: 10,
            bottom: 15
        })
        .percentageAxisToMaxRatio(1.3)
        .isHorizontal(true)
        .isAnimated(true)
        .yAxisPaddingBetweenChart(30)
        .colorSchema(britecharts.colors.colorSchemas.britecharts)
        .height(240)
        .width(350);
    svg.datum(data).call(barChart);
};

export function init(dispatcher:ActionDispatcher, ut:ViewUtils<{}>, model:TTDistribModel) {

    class ChartWrapper extends React.Component<{}> {

        private chartContainer:React.RefObject<SVGSVGElement>;

        constructor(props) {
            super(props);
            this.chartContainer = React.createRef();
        }

        componentDidMount() {

        }

        componentDidUpdate() {

        }

        shouldComponentUpdate() {
            return false;
        }

        render() {
            return (
                <div>
                HIT
                <svg ref={this.chartContainer} />
                </div>
            );
        }
    };


    class View extends React.Component<{}> {

        render() {
            return (
                <div>
                    <ChartWrapper />
                </div>
            )
        }
    }

    return {
        View:View
    };
}