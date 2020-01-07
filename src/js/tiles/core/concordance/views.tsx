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
import { IActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';

import { Line, LineElement, ViewMode } from '../../../common/api/abstract/concordance';
import { CoreTileComponentProps, TileComponent } from '../../../common/tile';
import { GlobalComponents } from '../../../views/global';
import { ActionName, Actions } from './actions';
import { ActionName as GlobalActionName, Actions as GlobalActions } from '../../../models/actions';
import { ConcordanceTileModel, ConcordanceTileState } from './model';



export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, model:ConcordanceTileModel):TileComponent {

    const globalCompontents = ut.getComponents();

    // ------------------ <Paginator /> --------------------------------------------

    const Paginator:React.SFC<{
        page:number;
        numPages:number;
        tileId:number;

    }> = (props) => {

        const handlePrevPage = () => {
            if (props.page > 1) {
                dispatcher.dispatch<Actions.LoadPrevPage>({
                    name: ActionName.LoadPrevPage,
                    payload: {
                        tileId: props.tileId
                    }
                });
            }
        };

        const handleNextPage = () => {
            if (props.page < props.numPages) {
                dispatcher.dispatch<Actions.LoadNextPage>({
                    name: ActionName.LoadNextPage,
                    payload: {
                        tileId: props.tileId
                    }
                });
            }
        };

        return (
            <span className="Paginator">
                <a onClick={handlePrevPage} className={`${props.page === 1 ? 'disabled' : null}`}>
                    <img className="arrow" src={ut.createStaticUrl(props.page === 1 ? 'triangle_left_gr.svg' : 'triangle_left.svg')} />
                </a>
                <input className="page" type="text" readOnly={true} value={props.page} />
                <a onClick={handleNextPage} className={`${props.page === props.numPages ? 'disabled' : null}`}>
                    <img className="arrow" src={ut.createStaticUrl(props.page === props.numPages ? 'triangle_right_gr.svg' : 'triangle_right.svg')} />
                </a>
            </span>
        );
    };

    // ------------------ <ViewModeSwitch /> --------------------------------------------

    const ViewModeSwitch:React.SFC<{
        mode:ViewMode;
        tileId:number;
        isEnabled:boolean;
    }> = (props) => {

        const handleChange = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            dispatcher.dispatch<Actions.SetViewMode>({
                name: ActionName.SetViewMode,
                payload: {
                    mode: evt.target.value as ViewMode,
                    tileId: props.tileId
                }
            });
        };

        return (
            <select value={props.mode} onChange={handleChange} disabled={!props.isEnabled}>
                <option value={ViewMode.KWIC}>{ut.translate('global__view_mode_kwic')}</option>
                <option value={ViewMode.SENT}>{ut.translate('global__view_mode_sent')}</option>
            </select>
        );
    };

    // ------------------ <QueryIdxSwitch /> --------------------------------------------

    const QueryIdxSwitch:React.SFC<{
        tileId:number;
        currIdx:number;
        values:Array<string>;

    }> = (props) => {

        const handleChange = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            dispatcher.dispatch<Actions.SetVisibleQuery>({
                name: ActionName.SetVisibleQuery,
                payload: {
                    tileId: props.tileId,
                    queryIdx: parseInt(evt.target.value)
                }
            });
        };

        return (
            <select value={props.currIdx} onChange={handleChange}>
                {props.values.map((v, i) => (<option key={`${v}:${i}`} value={i}>{v}</option>))}
            </select>
        );
    }

    // ------------------ <Controls /> --------------------------------------------

    const Controls:React.SFC<{
        currPage:number;
        numPages:number;
        viewMode:ViewMode;
        viewModeEnabled:boolean;
        tileId:number;
        queries:Array<string>;
        currVisibleQueryIdx:number;

    }> = (props) => {
        return (
            <form className="Controls cnc-form tile-tweak">
                <fieldset>
                        <label>{ut.translate('concordance__page')}:{'\u00a0'}
                        <Paginator page={props.currPage} numPages={props.numPages} tileId={props.tileId} />
                        </label>
                        <label title={props.viewModeEnabled ? null : ut.translate('global__func_not_avail')}>{ut.translate('concordance__view_mode')}:{'\u00a0'}
                            <ViewModeSwitch mode={props.viewMode} tileId={props.tileId} isEnabled={props.viewModeEnabled} />
                        </label>
                        {props.queries.length > 1 ?
                            <label>{ut.translate('concordance__sel_query')}:{'\u00a0'}
                                <QueryIdxSwitch tileId={props.tileId} values={props.queries} currIdx={props.currVisibleQueryIdx} />
                            </label> :
                            null
                        }
                </fieldset>
            </form>
        )
    };

    // ------------------ <RowItem /> --------------------------------------------

    const RowItem:React.SFC<{
        data:LineElement;
        isKwic?:boolean;

    }> = (props) => {
        return (
            <span className={props.isKwic ? 'kwic' : null} title={props.data.mouseover ? props.data.mouseover.join(', ') : null}>
                {props.data.str}
            </span>
        );
    };

    // ------------------ <Row /> --------------------------------------------

    const Row:React.SFC<{
        data:Line;
        isParallel:boolean;

    }> = (props) => {
        return (
            <>
                <tr className="Row">
                    <td className="left">{props.data.left.map((s, i) => <RowItem key={`${props.data.toknum}:L${i}`} data={s} />)}</td>
                    <td className="kwic">{props.data.kwic.map((s, i) => <RowItem key={`${props.data.toknum}:K${i}`} data={s} isKwic={true} />)}</td>
                    <td className="right">{props.data.right.map((s, i) => <RowItem key={`${props.data.toknum}:R${i}`} data={s} />)}</td>
                </tr>
                {props.isParallel ?
                    <tr className="Row aligned">
                        <td className="left">{props.data.align[0].left.map((s, i) => <RowItem key={`${props.data.align[0].toknum}:L${i}`} data={s} />)}</td>
                        <td className="kwic">{props.data.align[0].kwic.map((s, i) => <RowItem key={`${props.data.align[0].toknum}:K${i}`} data={s} isKwic={true} />)}</td>
                        <td className="right">{props.data.align[0].right.map((s, i) => <RowItem key={`${props.data.align[0].toknum}:R${i}`} data={s} />)}</td>
                    </tr> :
                    null
                }
            </>
        );
    }


    // ------------------ <ConcordanceTileView /> --------------------------------------------

    class ConcordanceTileView extends React.PureComponent<ConcordanceTileState & CoreTileComponentProps> {

        constructor(props) {
            super(props);
            this.handleQueryVariantClick = this.handleQueryVariantClick.bind(this);
        }

        handleQueryVariantClick() {
            dispatcher.dispatch<GlobalActions.EnableTileTweakMode>({
                name: GlobalActionName.EnableTileTweakMode,
                payload: {
                    ident: this.props.tileId
                }
            });
        }

        render() {

            const tableClasses = ['conc-lines'];
            if (this.props.viewMode === ViewMode.SENT || this.props.viewMode === ViewMode.ALIGN) {
                tableClasses.push('sent');
            }
            if (this.props.otherCorpname) {
                tableClasses.push('aligned');
            }

            const conc = this.props.concordances[this.props.visibleQueryIdx];

            return (
                <globalCompontents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.concordances.some(conc => conc.lines.length > 0)}
                        sourceIdent={{corp: this.props.corpname, subcorp: this.props.subcDesc}}
                        backlink={this.props.backlink}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <div className="ConcordanceTileView">
                        {this.props.isTweakMode ?
                            <div className="tweak-box">
                                    <Controls
                                        currPage={conc.currPage}
                                        numPages={conc.numPages}
                                        viewMode={this.props.viewMode}
                                        tileId={this.props.tileId}
                                        viewModeEnabled={!this.props.otherCorpname && !this.props.disableViewModes}
                                        queries={this.props.queries}
                                        currVisibleQueryIdx={this.props.visibleQueryIdx} />
                            </div> :
                            null
                        }
                        {
                            this.props.queries.length > 1 ?
                            <p className="query-info">
                                {ut.translate('concordance__showing_results_for')}:{'\u00a0'}
                                <a className="variant" onClick={this.handleQueryVariantClick}>
                                    {`[${this.props.visibleQueryIdx + 1}] ${this.props.queries[this.props.visibleQueryIdx]}`}
                                </a>
                            </p> :
                            null
                        }
                        <dl className="summary">
                            <dt>{ut.translate('concordance__num_matching_items')}:</dt>
                            <dd>{ut.formatNumber(conc.concsize, 0)}</dd>
                            {conc.resultIPM > -1 ?
                                <>
                                    <dt>{ut.translate('concordance__ipm')}:</dt>
                                    <dd>{ut.formatNumber(conc.resultIPM, 2)}</dd>
                                </> :
                                null
                            }
                            {conc.resultARF > -1 ?
                                <>
                                    <dt>{ut.translate('concordance__arf')}:</dt>
                                    <dd>{ut.formatNumber(conc.resultARF, 2)}</dd>
                                </> :
                                null
                            }
                        </dl>
                        <table className={tableClasses.join(' ')}>
                            <tbody>
                                {conc.lines.map(line => <Row key={`${line.toknum}`} data={line} isParallel={!!this.props.otherCorpname} />)}
                            </tbody>
                        </table>
                    </div>
                </globalCompontents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, ConcordanceTileState>(ConcordanceTileView, model);
}