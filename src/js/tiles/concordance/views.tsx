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
import { ActionDispatcher, BoundWithProps, ViewUtils } from 'kombo';
import * as React from 'react';

import { Line, LineElement, ViewMode } from '../../common/api/kontext/concordance';
import { CoreTileComponentProps, TileComponent } from '../../common/types';
import { GlobalComponents } from '../../views/global';
import { ActionName, Actions } from './actions';
import { ConcordanceTileModel, ConcordanceTileState } from './model';



export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>, model:ConcordanceTileModel):TileComponent {

    const globalCompontents = ut.getComponents();

    // ------------------ <Paginator /> --------------------------------------------

    const Paginator:React.SFC<{
        page:number;
        numPages:number;
        tileId:number;

    }> = (props) => {

        const handlePrevPage = () => {
            dispatcher.dispatch<Actions.LoadPrevPage>({
                name: ActionName.LoadPrevPage,
                payload: {
                    tileId: props.tileId
                }
            });
        };

        const handleNextPage = () => {
            dispatcher.dispatch<Actions.LoadNextPage>({
                name: ActionName.LoadNextPage,
                payload: {
                    tileId: props.tileId
                }
            });
        };

        return (
            <span className="Paginator">
                <a onClick={handlePrevPage} className={`${props.page === 1 ? 'disabled' : null}`}>
                    <img className="arrow" src={ut.createStaticUrl('triangle_left.svg')} />
                </a>
                <input className="page" type="text" readOnly={true} value={props.page} />
                <a onClick={handleNextPage} className={`${props.page === props.numPages ? 'disabled' : null}`}>
                    <img className="arrow" src={ut.createStaticUrl('triangle_right.svg')} />
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

    // ------------------ <Controls /> --------------------------------------------

    const Controls:React.SFC<{
        currPage:number;
        numPages:number;
        viewMode:ViewMode;
        viewModeEnabled:boolean;
        tileId:number;

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
                    <td className="left">{props.data.Left.map((s, i) => <RowItem key={`${props.data.toknum}:L${i}`} data={s} />)}</td>
                    <td className="kwic">{props.data.Kwic.map((s, i) => <RowItem key={`${props.data.toknum}:K${i}`} data={s} isKwic={true} />)}</td>
                    <td className="right">{props.data.Right.map((s, i) => <RowItem key={`${props.data.toknum}:R${i}`} data={s} />)}</td>
                </tr>
                {props.isParallel ?
                    <tr className="Row aligned">
                        <td className="left">{props.data.Align[0].Left.map((s, i) => <RowItem key={`${props.data.Align[0].toknum}:L${i}`} data={s} />)}</td>
                        <td className="kwic">{props.data.Align[0].Kwic.map((s, i) => <RowItem key={`${props.data.Align[0].toknum}:K${i}`} data={s} isKwic={true} />)}</td>
                        <td className="right">{props.data.Align[0].Right.map((s, i) => <RowItem key={`${props.data.Align[0].toknum}:R${i}`} data={s} />)}</td>
                    </tr> :
                    null
                }
            </>
        );
    }


    // ------------------ <ConcordanceTileView /> --------------------------------------------

    class ConcordanceTileView extends React.PureComponent<ConcordanceTileState & CoreTileComponentProps> {

        render() {

            const tableClasses = ['conc-lines'];
            if (this.props.viewMode === ViewMode.SENT || this.props.viewMode === ViewMode.ALIGN) {
                tableClasses.push('sent');
            }
            if (this.props.otherCorpname) {
                tableClasses.push('aligned');
            }

            return (
                <globalCompontents.TileWrapper isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.lines.size > 0}
                        sourceIdent={{corp: this.props.corpname, subcorp: this.props.subcDesc}}
                        backlink={this.props.backlink}>
                    <div className="ConcordanceTileView">
                        {this.props.isTweakMode ?
                            <div><Controls currPage={this.props.currPage} numPages={this.props.numPages}
                                    viewMode={this.props.viewMode} tileId={this.props.tileId}
                                    viewModeEnabled={!this.props.otherCorpname} /><hr /></div> :
                            null
                        }
                        <dl className="summary">
                            <dt>{ut.translate('concordance__num_matching_items')}:</dt>
                            <dd>{ut.formatNumber(this.props.concsize, 0)}</dd>
                            <dt>{ut.translate('concordance__ipm')}:</dt>
                            <dd>{ut.formatNumber(this.props.resultIPM, 2)}</dd>
                        </dl>
                        <table className={tableClasses.join(' ')}>
                            <tbody>
                                {this.props.lines.map(line => <Row key={`${line.toknum}`} data={line} isParallel={!!this.props.otherCorpname} />)}
                            </tbody>
                        </table>
                    </div>
                </globalCompontents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, ConcordanceTileState>(ConcordanceTileView, model);
}