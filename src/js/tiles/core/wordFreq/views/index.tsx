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
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';

import { CoreTileComponentProps, TileComponent } from '../../../../common/tile';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../../models/actions';
import { GlobalComponents } from '../../../../views/global';
import { SummaryModel, SummaryModelState } from '../model';
import { FreqDBRow } from '../api';
import { init as chartViewInit } from './chart';


export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, model:SummaryModel):TileComponent {

    const globalComponents = ut.getComponents();
    const Chart = chartViewInit(dispatcher, ut);



    // -------------------- <Stars /> -----------------------------------------------

    const Stars:React.SFC<{
        freqBand:number;

    }> = (props) => {
        return <span className="Stars">{[1, 2, 3, 4, 5].map(v =>
                <img key={`${v}`} src={ut.createStaticUrl(`star${v <= props.freqBand ? '' : '_grey'}.svg`)}
                            alt={ut.translate(v <= props.freqBand ? 'global__img_alt_star_icon' : 'global__img_alt_star_icon_grey')} />)}</span>
    };

    // -------------------- <SimilarFreqWords /> -----------------------------------------------

    const SimilarFreqWords:React.SFC<{
        data:Immutable.List<FreqDBRow>;

    }> = (props) => {

        const handleWordClick = (e:React.MouseEvent<HTMLAnchorElement>) => {
            const word = (e.target as Element).getAttribute('data-value');
            dispatcher.dispatch<GlobalActions.ChangeQueryInput>({
                name: GlobalActionName.ChangeQueryInput,
                payload: {
                    value: word
                }
            });
            dispatcher.dispatch<GlobalActions.SubmitQuery>({
                name: GlobalActionName.SubmitQuery
            });
        };

        return (
            <>
                <dt>{ut.translate('wordfreq__main_label')}:</dt>
                <dd className="word-list">
                {props.data.map((word, i) => (
                    <React.Fragment key={`w:${word.lemma}:${word.pos}`}>
                    {i > 0 ? ', ' : ''}
                    <a data-value={word.lemma} onClick={handleWordClick} title={ut.translate('global__click_to_query_word')}>{word.lemma}</a>
                    </React.Fragment>
                ))}
                </dd>
            </>
        );
    };

    // -------------------- <SrchWordInfo /> ---------------------------------------------------

    const SrchWordInfo:React.SFC<{
        data:FreqDBRow;

    }> = (props) => (
        <>
            <dt>{ut.translate('wordfreq_searched_form')}:</dt>
            <dd>{props.data.word}</dd>
            {props.data.pos.length > 0 ?
                <>
                    <dt>lemma:</dt>
                    <dd><strong>{props.data.lemma}</strong></dd>
                    <dt>{ut.translate('wordfreq__pos')}:</dt>
                    <dd>{props.data.pos.map(v => v.label).join(', ')}</dd>
                    <dt>{ut.translate('wordfreq__freq_bands')}:</dt>
                    <dd><Stars freqBand={props.data.flevel} /></dd>
                    <dt>{ut.translate('wordfreq__ipm')}:</dt>
                    <dd>{ut.formatNumber(props.data.ipm, 2)}</dd>
                </> :
                <>
                    <dt>{ut.translate('wordfreq__note')}:</dt>
                    <dd>{ut.translate('wordfreq__not_in_dict')}</dd>
                </>
            }
        </>
    );


    // -------------------- <WordFreqTileView /> -----------------------------------------------

    class WordFreqTileView extends React.PureComponent<SummaryModelState & CoreTileComponentProps> {

        render() {
            const srchWord = this.props.data.find(v => v.isSearched);
            const similarFreqWords = this.props.data.filter(v => !v.isSearched).toList();
            return (
                <globalComponents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.data.size > 0} sourceIdent={{corp: this.props.corpname}}
                        supportsTileReload={this.props.supportsReloadOnError}>
                    <div className={`WordFreqTileView${this.props.isMobile ? ' mobile' : ''}`}>
                        {!this.props.isMobile && this.props.widthFract > 1 ?
                            <div className="chart">
                            <Chart lemmaItems={this.props.data.filter(v => v.isSearched).toArray()} />
                            </div> :
                            null
                        }
                        <dl className="info">
                            {srchWord ? <SrchWordInfo data={srchWord} /> : null}
                            {similarFreqWords.size > 0 ? <SimilarFreqWords data={similarFreqWords} /> : null}
                        </dl>
                    </div>
                </globalComponents.TileWrapper>
            );
        }
    }

    return BoundWithProps(WordFreqTileView, model);
}
