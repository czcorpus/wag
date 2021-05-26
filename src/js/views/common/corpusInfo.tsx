/*
 * Copyright 2018 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2018 Institute of the Czech National Corpus,
 *                Faculty of Arts, Charles University
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apacut.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { IActionDispatcher, ViewUtils } from 'kombo';
import * as React from 'react';

import { GlobalComponents } from '.';
import { SourceCitation } from '../../api/abstract/sourceInfo';
import { List } from 'cnc-tskit';
import { CorpusDetails } from '../../types';

import * as S from './style';

export interface CorpusInfoBoxProps {
    data:CorpusDetails;
}

export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>):React.FC<CorpusInfoBoxProps> {


    // ---------------------- <CorpusReference /> ------------------------------------

    const CorpusReference:React.FC<{
        data:SourceCitation;

    }> = (props) => {
        if (props.data.papers.length > 0 || props.data.main || props.data.otherBibliography) {
            return (
                <>
                    <h2>
                        {ut.translate('global__corpus_as_resource_{corpus}', {corpus: props.data.sourceName})}:
                    </h2>
                    <div className="html" dangerouslySetInnerHTML={{__html: props.data.main}} />
                    {props.data.papers.length > 0 ?
                        (<>
                            <h2>{ut.translate('global__references')}:</h2>
                            {List.map(
                                (item, i) => <div key={i} className="html" dangerouslySetInnerHTML={{__html: item }} />,
                                props.data.papers
                            )}
                        </>) :
                        null
                    }
                    {props.data.otherBibliography ?
                        (<>
                            <h2>{ut.translate('global__general_references')}:</h2>
                            <div className="html" dangerouslySetInnerHTML={{__html: props.data.otherBibliography}} />
                        </>) :
                        null}
                </>
            );

        } else {
            return <div className="empty-citation-info">{ut.translate('global__no_citation_info')}</div>
        }
    };

    // ---------------------- <CorpusInfoBox /> ------------------------------------

    const CorpusInfoBox:React.FC<CorpusInfoBoxProps> = (props) => {

        const [state, setState] = React.useState({activeTab: 0});

        const renderWebLink = () => {
            if (props.data.href) {
                return <a href={props.data.href} target="_blank" rel="noopener">{props.data.href}</a>;

            } else {
                return '-';
            }
        };

        const renderKeywords = () => {
            if (props.data.keywords && props.data.keywords.length > 0) {
                return props.data.keywords.map(kw =>
                    <span key={kw.name} className="keyword" style={{backgroundColor: kw.color}}>{kw.name}</span>
                );
            } else {
                return '-';
            }
        };

        const handleTabClick = () => {
            setState({activeTab: Math.abs(state.activeTab - 1)});
        };

        return (
            <S.SourceInfoBox className="CorpusInfoBox" externalLinkImg={ut.createStaticUrl('external-link.png')}>
                <ul className="information-tab-sel">
                    <li>
                        <a className={state.activeTab === 0 ? 'current' : null}
                                onClick={handleTabClick}>
                            {ut.translate('global__corp_basic_info')}
                        </a>
                        <span className="separ">|</span>
                    </li>
                    <li>
                        <a className={state.activeTab === 1 ? 'current' : null}
                                onClick={handleTabClick}>
                            {ut.translate('global__corp_citation')}
                        </a>
                    </li>
                </ul>
                <dl>
                    {state.activeTab === 0 ?
                        <dl>
                            <dt>{ut.translate('global__source_name')}:</dt>
                            <dd>{props.data.title}</dd>
                            <dt>{ut.translate('global__description')}:</dt>
                            <dd>{props.data.description}</dd>
                            <dt>{ut.translate('global__size')}:</dt>
                            <dd>
                                <table className="struct-info">
                                    <tbody>
                                        <tr>
                                            <th>{ut.translate('global__positions')}:</th>
                                            <td className="num">{ut.formatNumber(props.data.structure.numTokens, 0)}</td>
                                        </tr>
                                        {props.data.structure.numSentences ?
                                            <tr><th>{ut.translate('global__num_sentences')}:</th><td className="num">{ut.formatNumber(props.data.structure.numSentences)}</td></tr> : null
                                        }
                                        {props.data.structure.numParagraphs ?
                                            <tr><th>{ut.translate('global__num_paragraphs')}:</th><td className="num">{ut.formatNumber(props.data.structure.numParagraphs)}</td></tr> : null
                                        }
                                        {props.data.structure.numDocuments ?
                                            <tr><th>{ut.translate('global__num_documents')}:</th><td className="num">{ut.formatNumber(props.data.structure.numDocuments)}</td></tr> : null
                                        }
                                    </tbody>
                                </table>
                            </dd>
                            {props.data.href ?
                                <>
                                    <dt>{ut.translate('global__website')}:</dt>
                                    <dd>{renderWebLink()}</dd>
                                </> :
                                null
                            }
                            {props.data.keywords && props.data.keywords.length > 0 ?
                                <>
                                    <dt>{ut.translate('global__keywords')}:</dt>
                                    <dd>{renderKeywords()}</dd>
                                </> :
                                null
                            }
                        </dl> :
                        <div className="citation">
                            {props.data.citationInfo ?
                                    <CorpusReference data={props.data.citationInfo} /> :
                                null
                            }
                        </div>
                    }
                </dl>
            </S.SourceInfoBox>
        );
    };

    return CorpusInfoBox;

}