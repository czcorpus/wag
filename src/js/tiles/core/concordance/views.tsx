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
import { IActionDispatcher, ViewUtils, useModel } from 'kombo';
import * as React from 'react';
import { Dict, List, pipe, Strings } from 'cnc-tskit';

import { CoreTileComponentProps, TileComponent } from '../../../page/tile.js';
import { GlobalComponents } from '../../../views/common/index.js';
import { Actions } from './actions.js';
import { Actions as GlobalActions } from '../../../models/actions.js';
import { ConcordanceTileModel } from './model.js';

import * as S from './style.js';
import { getKwicCtx, getLineLeftCtx, getLineRightCtx, Line, Token, ViewMode } from '../../../api/vendor/mquery/concordance/common.js';



export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, model:ConcordanceTileModel):TileComponent {

    const globalComponents = ut.getComponents();

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
        const handlePrevPage = () => {
            if (props.currPage > 1) {
                dispatcher.dispatch<typeof Actions.LoadPrevPage>({
                    name: Actions.LoadPrevPage.name,
                    payload: {
                        tileId: props.tileId
                    }
                });
            }
        };

        const handleNextPage = () => {
            if (props.currPage < props.numPages) {
                dispatcher.dispatch<typeof Actions.LoadNextPage>({
                    name: Actions.LoadNextPage.name,
                    payload: {
                        tileId: props.tileId
                    }
                });
            }
        };

        return (
            <S.Controls className="cnc-form tile-tweak">
                <fieldset>
                        <label>{ut.translate('concordance__page')}:{'\u00a0'}
                            <globalComponents.Paginator page={props.currPage} numPages={props.numPages} onNext={handleNextPage} onPrev={handlePrevPage} />
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
            </S.Controls>
        )
    };

    // ------------------ <RowItem /> --------------------------------------------

    const RowItem:React.FC<{
        data:Token;
        isKwic:boolean;
        isColl:boolean;

    }> = (props) => {
        const classes = [];
        if (props.isKwic) {
            classes.push('kwic');
        }
        if (props.isColl) {
            classes.push('coll');
        }
        return (
            <span className={classes.join(' ')}>
                {props.data.word}
            </span>
        );
    };

    // ------------------ <LineMetadata /> --------------------------------------------

    const LineMetadata:React.FC<{
        data:{[k:string]:string};

    }> = (props) => {

        const handleClick = (e:React.MouseEvent) => {
            e.stopPropagation();
        };

        return (
            <S.LineMetadata onClick={handleClick}>
                <dl>
                    {pipe(
                        props.data,
                        Dict.toEntries(),
                        List.sortAlphaBy(([label, ]) => label),
                        List.map(
                            ([label, value]) => (
                                <React.Fragment key={label}>
                                    <dt>{label}:</dt>
                                    <dd>
                                        {/^https?:\/\//.exec(value) ?
                                            <a href={value} title={value} target="_blank" rel="noopener">{Strings.shortenText(value, 30)}</a> :
                                            value
                                        }
                                    </dd>
                                </React.Fragment>
                            )
                        )
                    )}
                </dl>
            </S.LineMetadata>
        )
    }

    // ------------------ <SentRow /> --------------------------------------------

    const SentRow:React.FC<{
        data:Line;
        useSeparator:boolean;
        isParallel:boolean;
        hasVisibleMetadata:boolean;
        handleLineClick:(e:React.MouseEvent)=>void;

    }> = (props) => {
        const classes = [];
        if (props.data.highlighted) {
            classes.push('highlighted');
        }
        if (props.useSeparator) {
            classes.push('separator');
        }
        return (
            <S.SentRow className={classes.join(' ')}>
                    {props.isParallel ?
                        null :
                        <td rowSpan={props.isParallel ? 1 : 2}>
                            {props.hasVisibleMetadata ? <LineMetadata data={props.data.props} /> : null}
                        </td>
                    }
                    {!props.isParallel && !!props.data.props && !Dict.empty(props.data.props) ?
                        <td className="meta" rowSpan={2}>
                            <a className="info-click" onClick={props.handleLineClick}>
                                <img src={ut.createStaticUrl('info-icon.svg')} alt={ut.translate('global__img_alt_info_icon')} />
                            </a>
                        </td> :
                        null
                    }
                <td>
                    {List.map(
                        (s, i) => (
                            <React.Fragment key={`${props.data.ref}:L${i}`} >
                                {i > 0 ? <span> </span> : null}
                                <RowItem data={s} isKwic={s.matchType === 'kwic'} isColl={s.matchType === 'coll'} />
                            </React.Fragment>
                        ),
                        props.isParallel ? props.data.alignedText : props.data.text
                    )}
                </td>
            </S.SentRow>
        );
    };

    // ------------------ <KWICRow /> --------------------------------------------

    const KWICRow:React.FC<{
        data:Line;
        isParallel:boolean;
        hasVisibleMetadata:boolean;
        handleLineClick:(e:React.MouseEvent)=>void;

    }> = (props) => {

        return (
            <>
                <S.Row className={props.data.highlighted ? 'highlighted' : null}>
                    <td>
                        {props.hasVisibleMetadata ? <LineMetadata data={props.data.props} /> : null}
                    </td>
                    {!!props.data.props && !Dict.empty(props.data.props) ?
                        <td className="meta">
                            <a className="info-click" onClick={props.handleLineClick}>
                                <img src={ut.createStaticUrl('info-icon.svg')} alt={ut.translate('global__img_alt_info_icon')} />
                            </a>
                        </td> :
                        null
                    }
                    <td className="left">
                        {List.map(
                            (s, i) => (
                                <React.Fragment key={`${props.data.ref}:L${i}`} >
                                    {i > 0 ? <span> </span> : null}
                                    <RowItem data={s} isKwic={false} isColl={s.matchType === 'coll'} />
                                </React.Fragment>
                            ),
                            getLineLeftCtx(props.data)
                        )}
                    </td>
                    <td className="kwic">
                        {List.map(
                            (s, i) => <RowItem key={`${props.data.ref}:K${i}`} data={s} isKwic={true} isColl={false} />,
                            getKwicCtx(props.data)
                        )}
                    </td>
                    <td className="right">
                        {List.map(
                            (s, i) => (
                                <React.Fragment key={`${props.data.ref}:R${i}`}>
                                    {i > 0 ? <span> </span> : null}
                                    <RowItem data={s} isKwic={false} isColl={s.matchType === 'coll'} />
                                </React.Fragment>
                            ),
                            getLineRightCtx(props.data)
                        )}
                    </td>
                </S.Row>
            </>
        );
    }


    // ------------------ <ConcordanceTileView /> --------------------------------------------

    const ConcordanceTileView:React.FC<CoreTileComponentProps> = (props) => {

        const state = useModel(model);

        const handleQueryVariantClick = () => {
            dispatcher.dispatch<typeof GlobalActions.EnableTileTweakMode>({
                name: GlobalActions.EnableTileTweakMode.name,
                payload: {
                    ident: props.tileId
                }
            });
        };

        const handleLineClick = (idx:number) => {
            return (e:React.MouseEvent) => {
                if (state.visibleMetadataLine === idx) {
                    dispatcher.dispatch<typeof Actions.HideLineMetadata>({
                        name: Actions.HideLineMetadata.name,
                        payload: {
                            tileId: props.tileId
                        }
                    });

                } else {
                    dispatcher.dispatch<typeof Actions.ShowLineMetadata>({
                        name: Actions.ShowLineMetadata.name,
                        payload: {
                            tileId: props.tileId,
                            idx: idx
                        }
                    });
                }
                e.stopPropagation();
            }
        }

        const tableClasses = ['conc-lines'];
        if (state.viewMode === ViewMode.SENT || state.viewMode === ViewMode.ALIGN) {
            tableClasses.push('sent');
        }
        if (state.otherCorpname) {
            tableClasses.push('aligned');
        }

        const conc = state.concordances[state.visibleQueryIdx];

        return (
            <globalComponents.TileWrapper tileId={props.tileId} isBusy={state.isBusy} error={state.error}
                    hasData={state.concordances.some(conc => conc.lines.length > 0)}
                    sourceIdent={{corp: state.corpname, subcorp: state.subcDesc}}
                    backlink={state.backlinks}
                    supportsTileReload={props.supportsReloadOnError}
                    issueReportingUrl={props.issueReportingUrl}>
                <S.ConcordanceTileView>
                    {state.isTweakMode ?
                        <div className="tweak-box">
                                <Controls
                                    currPage={conc.currPage}
                                    numPages={conc.numPages}
                                    viewMode={state.viewMode}
                                    tileId={props.tileId}
                                    viewModeEnabled={!state.otherCorpname && !state.disableViewModes}
                                    queries={state.queries}
                                    currVisibleQueryIdx={state.visibleQueryIdx} />
                        </div> :
                        null
                    }
                    {
                        state.queries.length > 1 ?
                        <S.QueryInfo>
                            {ut.translate('concordance__showing_results_for')}:{'\u00a0'}
                            <a className="variant" onClick={handleQueryVariantClick}>
                                {`[${state.visibleQueryIdx + 1}] ${state.queries[state.visibleQueryIdx]}`}
                            </a>
                        </S.QueryInfo> :
                        null
                    }
                    {state.isExamplesMode ?
                        null :
                        <S.Summary>
                            <dt>{ut.translate('concordance__num_matching_items')}:</dt>
                            <dd>{ut.formatNumber(conc.concSize, 0)}</dd>
                            {conc.ipm > -1 ?
                                <>
                                    <dt>{ut.translate('concordance__ipm')}:</dt>
                                    <dd>{ut.formatNumber(conc.ipm, 2)}</dd>
                                </> :
                                null
                            }
                        </S.Summary>
                    }
                    <S.ConcLines>
                        <table className={tableClasses.join(' ')}>
                            <tbody>
                                {List.map(
                                    (line, i) => (
                                        state.viewMode === ViewMode.KWIC ?
                                            <KWICRow
                                                key={`${i}:${line.ref}`}
                                                data={line}
                                                isParallel={!!state.otherCorpname}
                                                hasVisibleMetadata={state.visibleMetadataLine === i}
                                                handleLineClick={handleLineClick(i)}
                                                /> :
                                            <React.Fragment key={`${i}:${line.ref}`}>
                                                <SentRow
                                                    data={line}
                                                    useSeparator={!state.otherCorpname}
                                                    isParallel={false}
                                                    hasVisibleMetadata={state.visibleMetadataLine === i}
                                                    handleLineClick={handleLineClick(i)}
                                                    />
                                                {!!state.otherCorpname ?
                                                    <SentRow
                                                        data={line}
                                                        useSeparator={true}
                                                        isParallel={true}
                                                        hasVisibleMetadata={state.visibleMetadataLine === i}
                                                        handleLineClick={handleLineClick(i)}
                                                    /> :
                                                    null
                                                }
                                            </React.Fragment>
                                    ),
                                    conc.lines
                                )}
                            </tbody>
                        </table>
                    </S.ConcLines>
                </S.ConcordanceTileView>
            </globalComponents.TileWrapper>
        );
    }

    return ConcordanceTileView;
}