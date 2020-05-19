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

import { GlobalComponents } from './global';
import { SourceCitation } from '../common/api/abstract/sourceInfo';
import { List } from 'cnc-tskit';
import { CorpusDetails } from '../common/types';

export interface CorpusInfoBoxProps {
    data:CorpusDetails;
}

export function init(dispatcher:IActionDispatcher, ut:ViewUtils<GlobalComponents>):React.SFC<CorpusInfoBoxProps> {

    // ---------------------------- <ItemAndNumRow /> -----------------------------

    const ItemAndNumRow:React.SFC<{
        brackets:boolean;
        label:string;
        value:number;

    }> = (props) => {

        if (props.brackets) {
            return (
                <tr className="dynamic">
                    <th>&lt;{props.label}&gt;</th>
                    <td className="numeric">{ut.formatNumber(props.value, 0)}</td>
                </tr>
            );

        } else {
            return (
                <tr className="dynamic">
                    <th>{props.label}</th>
                    <td className="numeric">{ut.formatNumber(props.value, 0)}</td>
                </tr>
            );
        }
    };

    // ---------------------------- <AttributeList /> -----------------------------

    const AttributeList:React.SFC<{
        rows:Array<{name:string; size:number}>|{error:boolean};

    }> = (props) => {

        let values;

        if (Array.isArray(props.rows) && !props.rows['error']) {
            values = props.rows.map((row, i) =>
                    <ItemAndNumRow key={i} label={row.name} value={row.size} brackets={false} />);

        } else {
            values = <tr><td colSpan={2}>{ut.translate('failed to load')}</td></tr>;
        }

        return (
            <table className="attrib-list">
                <thead>
                    <tr>
                        <th colSpan={2} className="attrib-heading">
                            {ut.translate('global__attributes') }
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {values}
                </tbody>
            </table>
        );
    };

    // ---------------------------- <StructureList /> -----------------------------

    const StructureList:React.SFC<{
        rows:Array<{name:string; size:number}>;

    }> = (props) => {

        return (
            <table className="struct-list">
                <thead>
                    <tr>
                        <th colSpan={2} className="attrib-heading">{ut.translate('global__structures')}</th>
                    </tr>
                </thead>
                <tbody>
                    {props.rows.map((row, i) =>
                        <ItemAndNumRow key={i} brackets={true} label={row.name} value={row.size} />)
                    }
                </tbody>
            </table>
        );
    };

    // ---------------------- <CorpusReference /> ------------------------------------

    const CorpusReference:React.SFC<{
        data:SourceCitation;

    }> = (props) => {
        if (props.data.papers.length > 0 || props.data.main || props.data.otherBibliography) {
            return (
                <>
                    <h4>
                        {ut.translate('global__corpus_as_resource_{corpus}', {corpus: props.data.sourceName})}:
                    </h4>
                    <div className="html" dangerouslySetInnerHTML={{__html: props.data.main}} />
                    {props.data.papers.length > 0 ?
                        (<>
                            <h4>{ut.translate('global__references')}:</h4>
                            {List.map(
                                (item, i) => <div key={i} className="html" dangerouslySetInnerHTML={{__html: item }} />,
                                props.data.papers
                            )}
                        </>) :
                        null
                    }
                    {props.data.otherBibliography ?
                        (<>
                            <h4>{ut.translate('global__general_references')}:</h4>
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

    const CorpusInfoBox:React.SFC<CorpusInfoBoxProps> = (props) => {

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
            <div className="CorpusInfoBox source-info-box">
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
                            {ut.translate('global__corp_metadata')}
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
                            <dd>{ut.formatNumber(props.data.size, 0)} {ut.translate('global__positions')}
                            </dd>
                            <dt>{ut.translate('global__website')}:</dt>
                            <dd>{renderWebLink()}</dd>
                            <dt>{ut.translate('global__keywords')}:</dt>
                            <dd>{renderKeywords()}</dd>
                            <dt>{ut.translate('global__citation_info')}:</dt>
                            {props.data.citationInfo ?
                                <dd className="references">
                                    <CorpusReference data={props.data.citationInfo} />
                                </dd> :
                                null
                            }
                        </dl> :
                        <div>
                            <table className="structs-and-attrs">
                                <tbody>
                                    <tr>
                                        <td>
                                            <AttributeList rows={props.data.attrList} />
                                        </td>
                                        <td style={{paddingLeft: '4em'}}>
                                            <StructureList rows={props.data.structList} />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <p className="note">
                            <strong>{ut.translate('global__corp_info_attrs_remark_label')}: </strong>
                            {ut.translate('global__corp_info_attrs_remark_text')}
                            </p>
                        </div>
                    }
                </dl>
            </div>
        );
    };

    return CorpusInfoBox;

}