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
import * as React from 'react';
import { Strings, List } from 'cnc-tskit';

import { IActionDispatcher, ViewUtils, BoundWithProps } from 'kombo';
import { GlobalComponents } from '../../../views/global';
import { Theme } from '../../../page/theme';
import { TileComponent, CoreTileComponentProps } from '../../../page/tile';
import { ConcFilterModel, ConcFilterModelState } from './model';
import { Line, LineElement } from '../../../api/abstract/concordance';
import { Actions as GlobalActions } from '../../../models/actions';
import { Actions } from './actions';

import * as S from './style';

export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>, theme:Theme, model:ConcFilterModel):TileComponent {

    const globalCompontents = ut.getComponents();

    // ------------------ <LineMetadata /> --------------------------------------------

    const LineMetadata:React.FC<{
        data:Array<{value:string; label:string}>;

    }> = (props) => {

        const handleClick = (e:React.MouseEvent) => {
            e.stopPropagation();
        };

        return (
            <S.LineMetadata onClick={handleClick}>
                <dl>
                    {List.map(
                        v => (
                            <React.Fragment key={v.label}>
                                <dt>{v.label}:</dt>
                                <dd>{/^https?:\/\//.exec(v.value) ? <a href={v.value} title={v.value} target="_blank" rel="noopener">{Strings.shortenText(v.value, 30)}</a> : v.value}</dd>
                            </React.Fragment>
                        ),
                        props.data
                    )}
                </dl>
            </S.LineMetadata>
        )
    }


    // ------------------ <FilteredLine /> --------------------------------------------

    const FilteredLine:React.FC<{
        data:Line;
        hasVisibleMetadata:boolean;
        isParallel:boolean;
        handleLineClick:(e:React.MouseEvent)=>void;

    }> = (props) => {

        const handleWordClick = (e:React.MouseEvent<HTMLAnchorElement>) => {
            const word = (e.target as Element).getAttribute('data-value');
            dispatcher.dispatch<typeof GlobalActions.ChangeQueryInput>({
                name: GlobalActions.ChangeQueryInput.name,
                payload: {
                    value: word,
                    queryIdx: 0
                }
            });
            dispatcher.dispatch<typeof GlobalActions.SubmitQuery>({
                name: GlobalActions.SubmitQuery.name
            });
        };

        const mkColloc = (side:'L'|'R') => (e:LineElement, i:number) => e.type === 'coll' ?
            <a key={`${props.data.toknum}:${side}${i}`} data-value={e.str} onClick={handleWordClick} className={e.type}
                    title={ut.translate('global__click_to_query_word')}>{e.str}</a> :
            <span key={`${props.data.toknum}:${side}${i}`} className={e.type}>{e.str}</span>;

        return (
            <S.FilteredLine>
                <div className={`flex${props.data.isHighlighted ? ' highlighted' : ''}`}>
                    <div>
                        {props.data.metadata.length > 0 ?
                            <>
                                <a className="info-click" onClick={props.handleLineClick}><img src={ut.createStaticUrl('info-icon.svg')} /></a>
                            </>
                            : null
                        }
                    </div>
                    <div>
                        <p>
                        {props.data.left.map(mkColloc('L'))}
                        {props.data.kwic.map((v, i) => <span className="kwic" key={`${props.data.toknum}:K${i}`}>{v.str}</span>)}
                        {props.data.right.map(mkColloc('R'))}
                        </p>
                        {props.isParallel ?
                            <p className="aligned">
                            {props.data.align[0].left.map(mkColloc('L'))}
                            {props.data.align[0].kwic.map((v, i) => <span className="kwic" key={`${props.data.toknum}:K${i}`}>{v.str}</span>)}
                            {props.data.align[0].right.map(mkColloc('R'))}
                            </p> :
                            null
                        }
                        {props.hasVisibleMetadata ? <LineMetadata data={props.data.metadata} /> : null}
                    </div>
                </div>
            </S.FilteredLine>
        );
    };

    // ------------------ <CollocExamplesView /> --------------------------------------------

    class CollocExamplesView extends React.PureComponent<ConcFilterModelState & CoreTileComponentProps> {

        constructor(props) {
            super(props);
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
            return (
                <globalCompontents.TileWrapper tileId={this.props.tileId} isBusy={this.props.isBusy} error={this.props.error}
                        hasData={this.props.lines.length > 0}
                        sourceIdent={{corp: this.props.corpName}}
                        supportsTileReload={this.props.supportsReloadOnError}
                        issueReportingUrl={this.props.issueReportingUrl}>
                    <div>
                        <S.Sentences>
                            {this.props.lines.map((v, i) =>
                                <FilteredLine key={`${i}:${v.toknum}`} data={v} hasVisibleMetadata={this.props.visibleMetadataLine === i}
                                        handleLineClick={this.handleLineClick(i)}
                                        isParallel={!!this.props.otherCorpname} />)
                            }
                        </S.Sentences>
                    </div>
                </globalCompontents.TileWrapper>
            );
        }
    }

    return BoundWithProps<CoreTileComponentProps, ConcFilterModelState>(CollocExamplesView, model);

}

