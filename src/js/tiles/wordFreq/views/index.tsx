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
import * as Immutable from 'immutable';
import { ActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';

import { CoreTileComponentProps, TileComponent } from '../../../common/types';
import { GlobalComponents } from '../../../views/global';
import { SummaryModel, SummaryModelState } from '../model';
import { FreqDBRow } from '../api';
import { init as chartViewInit } from './chart';

/*
cx: 65
cy: 214.99979
dataKey: "ipm"
fill: "#fff"
height: 210
index: 0
key: "dot-0"
payload: {ipm: 0.01, flevel: 1, abs: null, lemma: null, pos: null}
r: 3
stroke: "#8884d8"
strokeWidth: 1
value: 0.01
width: 330
*/

interface ChartFreqDistItem {
    ipm:number;
    flevel:number;
    abs:number;
    lemma:string;
    pos:string;
    color:string;
}

export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:SummaryModel):TileComponent {

    const globalComponents = ut.getComponents();
    const Chart = chartViewInit(dispatcher, ut);


    // -------------------- <CustomTooltip /> -----------------------------------------------

    const CustomTooltip:React.SFC<{
        active:boolean;
        type:string;
        payload:Array<{payload:ChartFreqDistItem}>;
        label:string;

    }> = (props) => {
        if (!props.active) {
            return null;

        } else if (props.payload[0].payload.lemma) {
            return (
                <div className="FreqLevelCustomTooltip">
                    <strong>lemma:</strong>{'\u00a0'}
                    <span>{props.payload[0].payload.lemma}</span>
                    <br />
                    <strong>pos:</strong>{'\u00a0'}
                    <span>{props.payload[0].payload.pos}</span>
                    <br />
                    <strong>ipm:</strong>{'\u00a0'}
                    <span>{ut.formatNumber(props.payload[0].payload.ipm, 2)}</span>
                </div>
            );

        } else {
            return (
                <div className="FreqLevelCustomTooltip">
                    <strong>freq level:</strong>{'\u00a0'}
                    <span>{props.payload[0].payload.flevel}</span>
                    <br />
                    <strong>ipm:</strong>{'\u00a0'}
                    <span>{props.payload[0].payload.ipm}</span>
                </div>
            );
        }

    };

    // -------------------- <Stars /> -----------------------------------------------

    const Stars:React.SFC<{
        freqBand:number;

    }> = (props) => {
        return <span className="Stars">{[1, 2, 3, 4, 5, 6, 7].map(v =>
                <img key={`${v}`} src={ut.createStaticUrl(`star${v <= props.freqBand ? '' : '_grey'}.svg`)} />)}</span>
    };

    // -------------------- <SimilarFreqWords /> -----------------------------------------------

    const SimilarFreqWords:React.SFC<{
        data:Immutable.List<FreqDBRow>;

    }> = (props) => {

        return (
            <>
                <dt>{ut.translate('wordfreq__main_label')}:</dt>
                <dd className="word-list">
                {props.data.map((word, i) => (
                    <React.Fragment key={`w:${word.lemma}:${word.pos}`}>
                    {i > 0 ? ', ' : ''}
                    <span>{word.lemma}</span>
                    </React.Fragment>
                ))}
                </dd>
            </>
        );
    };

    // -------------------- <SrchWordInfo /> ---------------------------------------------------

    const SrchWordInfo:React.SFC<{
        data:FreqDBRow;

    }> = (props) => {
        return (
            <>
                <dt>{ut.translate('wordfreq_searched_form')}:</dt>
                <dd>{props.data.word}</dd>
                <dt>lemma:</dt>
                <dd><strong>{props.data.lemma}</strong></dd>
                <dt>{ut.translate('wordfreq__pos')}:</dt>
                <dd>{props.data.posLabel}</dd>
                <dt>{ut.translate('wordfreq__freq_bands')}:</dt>
                <dd><Stars freqBand={Math.round(props.data.flevel)} /></dd>
                <dt>{ut.translate('wordfreq__ipm')}:</dt>
                <dd>{ut.formatNumber(props.data.ipm, 2)}</dd>
            </>
        );
    };


    // -------------------- <WordFreqTileView /> -----------------------------------------------

    class WordFreqTileView extends React.PureComponent<SummaryModelState & CoreTileComponentProps> {

        render() {
            const srchWord = this.props.data.find(v => v.isSearched);

            return (
                <globalComponents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.size > 0} sourceIdent={{corp: this.props.corpname}}>
                    <div className={`WordFreqTileView${this.props.isMobile ? ' mobile' : ''}`}>
                        {!this.props.isMobile ?
                            <div className="chart">
                            <Chart lemmaItems={this.props.data.filter(v => v.isSearched).toArray()} />
                            </div> :
                            null
                        }
                        <dl className="info">
                            {srchWord ? <SrchWordInfo data={srchWord} /> : null}
                            <SimilarFreqWords data={this.props.data} />
                        </dl>
                    </div>
                </globalComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps(WordFreqTileView, model);
}
