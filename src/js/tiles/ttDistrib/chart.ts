import * as d3 from 'd3';
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