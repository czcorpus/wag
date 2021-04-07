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
import { List, Strings } from 'cnc-tskit';

import { Line, LineElement, ViewMode } from '../../../api/abstract/concordance';
import { CoreTileComponentProps, TileComponent } from '../../../page/tile';
import { GlobalComponents } from '../../../views/global';
import { Actions } from './actions';
import { Actions as GlobalActions } from '../../../models/actions';
import { ConcordanceTileModel, ConcordanceTileState } from './model';



export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, model:ConcordanceTileModel):TileComponent {

    const globalCompontents = ut.getComponents();

    // ------------------ <Paginator /> --------------------------------------------

    const Paginator:React.FC<{
        page:number;
        numPages:number;
        tileId:number;

    }> = (props) => {

        const handlePrevPage = () => {
            if (props.page > 1) {
                dispatcher.dispatch<typeof Actions.LoadPrevPage>({
                    name: Actions.LoadPrevPage.name,
                    payload: {
                        tileId: props.tileId
                    }
                });
            }
        };

        const handleNextPage = () => {
            if (props.page < props.numPages) {
                dispatcher.dispatch<typeof Actions.LoadNextPage>({
                    name: Actions.LoadNextPage.name,
                    payload: {
                        tileId: props.tileId
                    }
                });
            }
        };

        return (
            <span className="Paginator">
                <a onClick={handlePrevPage} className={`${props.page === 1 ? 'disabled' : null}`}>
                    <img className="arrow" src={ut.createStaticUrl(props.page === 1 ? 'triangle_left_gr.svg' : 'triangle_left.svg')}
                        alt={ut.translate('global__img_alt_triable_left')} />
                </a>
                <input className="page" type="text" readOnly={true} value={props.page} />
                <a onClick={handleNextPage} className={`${props.page === props.numPages ? 'disabled' : null}`}>
                    <img className="arrow" src={ut.createStaticUrl(props.page === props.numPages ? 'triangle_right_gr.svg' : 'triangle_right.svg')}
                        alt={ut.translate('global__img_alt_triable_right')} />
                </a>
            </span>
        );
    };

    // ------------------ <ViewModeSwitch /> --------------------------------------------

    const ViewModeSwitch:React.FC<{
        mode:ViewMode;
        tileId:number;
        isEnabled:boolean;
    }> = (props) => {

        const handleChange = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            dispatcher.dispatch<typeof Actions.SetViewMode>({
                name: Actions.SetViewMode.name,
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

    const QueryIdxSwitch:React.FC<{
        tileId:number;
        currIdx:number;
        values:Array<string>;

    }> = (props) => {

        const handleChange = (evt:React.ChangeEvent<HTMLSelectElement>) => {
            dispatcher.dispatch<typeof Actions.SetVisibleQuery>({
                name: Actions.SetVisibleQuery.name,
                payload: {
                    tileId: props.tileId,
                    queryIdx: parseInt(evt.target.value)
                }
            });
        };

        return (
            <select value={props.currIdx} onChange={handleChange}>
                {List.map(
                    (v, i) => <option key={`${v}:${i}`} value={i}>{v}</option>,
                    props.values
                )}
            </select>
        );
    }

    // ------------------ <Controls /> --------------------------------------------

    const Controls:React.FC<{
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

    const RowItem:React.FC<{
        data:LineElement;
        isKwic?:boolean;

    }> = (props) => {
        return (
            <span className={props.isKwic ? 'kwic' : null} title={props.data.mouseover ? props.data.mouseover.join(', ') : null}>
                {props.data.str}
            </span>
        );
    };

    // ------------------ <LineMetadata /> --------------------------------------------

    const LineMetadata:React.FC<{
        data:Array<{value:string; label:string}>;

    }> = (props) => {

        const handleClick = (e:React.MouseEvent) => {
            e.stopPropagation();
        };

        return (
            <div className="LineMetadata" onClick={handleClick}>
                <dl>
                    {List.map(
                        v => (
                            <React.Fragment key={v.label}>
                                <dt>{v.label}:</dt>
                                <dd>
                                    {/^https?:\/\//.exec(v.value) ?
                                        <a href={v.value} title={v.value} target="_blank" rel="noopener">{Strings.shortenText(v.value, 30)}</a> :
                                        v.value
                                    }
                                </dd>
                            </React.Fragment>
                        ),
                        props.data
                    )}
                </dl>
            </div>
        )
    }

    // ------------------ <Row /> --------------------------------------------

    const Row:React.FC<{
        data:Line;
        isParallel:boolean;
        hasVisibleMetadata:boolean;
        handleLineClick:(e:React.MouseEvent)=>void;

    }> = (props) => {
        return (
            <>
                <tr className="Row">
                    <td>
                        {props.hasVisibleMetadata ? <LineMetadata data={props.data.metadata} /> : null}
                    </td>
                    {props.data.metadata && props.data.metadata.length > 0 ?
                        <td className="meta">
                            <a className="info-click" onClick={props.handleLineClick}>
                                <img src={ut.createStaticUrl('info-icon.svg')} alt={ut.translate('global__img_alt_info_icon')} />
                            </a>
                        </td> :
                        null
                    }
                    <td className="left">
                        {List.map(
                            (s, i) => <RowItem key={`${props.data.toknum}:L${i}`} data={s} />,
                            props.data.left
                        )}
                    </td>
                    <td className="kwic">
                        {List.map(
                            (s, i) => <RowItem key={`${props.data.toknum}:K${i}`} data={s} isKwic={true} />,
                            props.data.kwic
                        )}
                    </td>
                    <td className="right">
                        {List.map(
                            (s, i) => <RowItem key={`${props.data.toknum}:R${i}`} data={s} />,
                            props.data.right
                        )}
                    </td>
                </tr>
                {props.isParallel ?
                    <tr className="Row aligned">
                        <td colSpan={props.data.metadata.length > 0 ? 2 : 1} />
                        <td className="left">
                            {List.map(
                                (s, i) => <RowItem key={`${props.data.align[0].toknum}:L${i}`} data={s} />,
                                props.data.align[0].left
                            )}
                        </td>
                        <td className="kwic">
                            {List.map(
                                (s, i) => <RowItem key={`${props.data.align[0].toknum}:K${i}`} data={s} isKwic={true} />,
                                props.data.align[0].kwic
                            )}
                        </td>
                        <td className="right">
                            {List.map(
                                (s, i) => <RowItem key={`${props.data.align[0].toknum}:R${i}`} data={s} />,
                                props.data.align[0].right
                            )}
                        </td>
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
            this.handleLineClick = this.handleLineClick.bind(this);
        }

        handleQueryVariantClick() {
            dispatcher.dispatch<typeof GlobalActions.EnableTileTweakMode>({
                name: GlobalActions.EnableTileTweakMode.name,
                payload: {
                    ident: this.props.tileId
                }
            });
        }

        private handleLineClick(idx:number) {
            return (e:React.MouseEvent) => {
                if (this.props.visibleMetadataLine === idx) {
                    dispatcher.dispatch<typeof Actions.HideLineMetadata>({
                        name: Actions.HideLineMetadata.name,
                        payload: {
                            tileId: this.props.tileId
                        }
                    });

                } else {
                    dispatcher.dispatch<typeof Actions.ShowLineMetadata>({
                        name: Actions.ShowLineMetadata.name,
                        payload: {
                            tileId: this.props.tileId,
                            idx: idx
                        }
                    });
                }
                e.stopPropagation();
            }
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
                                {List.map(
                                    (line, i) => <Row key={`${i}:${line.toknum}`} data={line} isParallel={!!this.props.otherCorpname}
                                        hasVisibleMetadata={this.props.visibleMetadataLine === i} handleLineClick={this.handleLineClick(i)} />,
                                    conc.lines
                                )}
                            </tbody>
                        </table>
                    </div>
                </globalCompontents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, ConcordanceTileState>(ConcordanceTileView, model);
}