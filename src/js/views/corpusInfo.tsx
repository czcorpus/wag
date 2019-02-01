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
import * as React from 'react';
import { ActionDispatcher, ViewUtils } from 'kombo';
import { GlobalComponents } from './global';

export interface CorpusInfoBoxProps {
    data:{
        corpname:string;
        size:number;
        description:string;
        structlist:Array<{name:string; size:number}>;
        attrlist:Array<{name:string; size:number}>;
        citation_info:any; // TODO
        web_url:string;
    }
}

export function init(dispatcher:ActionDispatcher, ut:ViewUtils<GlobalComponents>):React.SFC<CorpusInfoBoxProps> {

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
                <tbody>
                <tr>
                    <th colSpan={2} className="attrib-heading">
                        {ut.translate('global__attributes') }
                    </th>
                </tr>
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
                <tbody>
                <tr>
                    <th colSpan={2} className="attrib-heading">{ut.translate('global__structures')}</th>
                </tr>
                {props.rows.map((row, i) =>
                    <ItemAndNumRow key={i} brackets={true} label={row.name} value={row.size} />)}
                </tbody>
            </table>
        );
    };

    // ---------------------- <CorpusReference /> ------------------------------------

    const CorpusReference:React.SFC<{
        data:any; // TODO

    }> = (props) => {
        if (props.data['article_ref'].length > 0 || props.data['default_ref']
                || props.data['other_bibliography']) {
            return (
                <>
                    <h4>
                        {ut.translate('global__corpus_as_resource_{corpus}', {corpus: props.data.corpname})}:
                    </h4>
                    <div className="html" dangerouslySetInnerHTML={{__html: props.data.default_ref}} />
                    {props.data.article_ref.length > 0 ?
                        (<>
                            <h4>{ut.translate('global__references')}:</h4>
                            {props.data.article_ref.map((item, i) => {
                                return <div key={i} className="html" dangerouslySetInnerHTML={{__html: item }} />;
                            })}
                        </>) :
                        null}
                    {props.data.other_bibliography ?
                        (<>
                            <h4>{ut.translate('global__general_references')}:</h4>
                            <div className="html" dangerouslySetInnerHTML={{__html: props.data.other_bibliography}} />
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

        const renderWebLink = () => {
            if (props.data.web_url) {
                return <a href={props.data.web_url} target="_blank">{props.data.web_url}</a>;

            } else {
                return '-';
            }
        };
        return (
            <div className="CorpusInfoBox">
                <dl>
                    <dt>{ut.translate('global__description')}:</dt>
                    <dd>{props.data.description}</dd>
                    <dt>{ut.translate('global__size')}:</dt>
                    <dd>{ut.formatNumber(props.data.size, 0)} {ut.translate('global__positions')}
                    </dd>
                    <dt>{ut.translate('global__website')}:</dt>
                    <dd>{renderWebLink()}</dd>
                    <dt>{ut.translate('global__corpus_info_metadata_heading')}:</dt>
                    <dd>
                        <table className="structs-and-attrs">
                            <tbody>
                                <tr>
                                    <td>
                                        <AttributeList rows={props.data.attrlist} />
                                    </td>
                                    <td style={{paddingLeft: '4em'}}>
                                        <StructureList rows={props.data.structlist} />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <p className="note">
                        <strong>{ut.translate('global__corp_info_attrs_remark_label')}: </strong>
                        {ut.translate('global__corp_info_attrs_remark_text')}
                        </p>
                    </dd>
                    <dt>{ut.translate('global__citation_info')}:</dt>
                    <dd className="references">
                        <CorpusReference data={props.data.citation_info} />
                    </dd>
                </dl>
            </div>
        );
    };

    return CorpusInfoBox;

}