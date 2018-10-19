import * as d3 from 'd3';
import {ServiceAPI} from './api';
import * as britecharts from 'britecharts';


export class Window1 {

    constructor(api, conf, target, onEvent) {
        this.api = api;
        this.conf = conf;
        this.target = target;
        this.onEvent = onEvent;
        this.svg = null;
    }

    run({query, lang}) {
        console.log(`window1 looking for ${query} (${lang}) `);
        this.onEvent('busy', this);
        this.api.call().then(
            (data) => {
                this.target.innerHTML = '';
                const d3target = d3.select(this.target);
                d3target.append('div');
                this.drawChart(d3target.select('div'), data);
            },
            (err) => {
                console.error(err);
            }
        );
    }

    drawChart(svg, data) {
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
    }
}


export const init = (conf, target, onEvent) => {
    return new Window1(new ServiceAPI(), conf, target, onEvent);
}