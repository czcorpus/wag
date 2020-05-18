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

import { StatelessModel, IActionQueue } from 'kombo';
import { pipe, List, HTTP } from 'cnc-tskit';

import { IAppServices } from '../appServices';
import { Forms, MultiDict } from '../common/data';
import { SystemMessageType } from '../common/types';
import { AvailableLanguage } from '../common/hostPage';
import { QueryType, QueryMatch, QueryTypeMenuItem, matchesPos, SearchLanguage, RecognizedQueries, calcFreqBand } from '../common/query';
import { ActionName, Actions } from './actions';
import { HTTPAction } from '../server/routes/actions';
import { LayoutManager } from '../layout';


export interface QueryFormModelState {
    queries:Array<Forms.Input>;
    initialQueryType:QueryType;
    multiWordQuerySupport:{[k in QueryType]:number};
    queryType:QueryType;
    queryLanguage:string;
    queryLanguage2:string;
    searchLanguages:Array<SearchLanguage>;
    targetLanguages:{[k in QueryType]:Array<[string, string]>};
    queryTypesMenuItems:Array<QueryTypeMenuItem>;
    errors:Array<Error>;
    queryMatches:RecognizedQueries;
    isAnswerMode:boolean;
    uiLanguages:Array<AvailableLanguage>;
    maxCmpQueries:number;
    lemmaSelectorModalVisible:boolean;
    modalSelections:Array<number>;
}

export const findCurrQueryMatch = (queryMatches:Array<QueryMatch>):QueryMatch => {
    const srch = queryMatches.find(v => v.isCurrent);
    return srch ? srch : {
        lemma: undefined,
        word: undefined,
        pos: [],
        abs: -1,
        ipm: -1,
        arf: -1,
        flevel: null,
        isCurrent: true
    };
};

/**
 * QueryFormModel handles both user entered raw query and switching between already found lemmas.
 */
export class QueryFormModel extends StatelessModel<QueryFormModelState> {

    private readonly appServices:IAppServices;

    private readonly queryCheckRegexp:RegExp;

    private readonly hyphenChars:RegExp;

    constructor(dispatcher:IActionQueue, appServices:IAppServices, initialState:QueryFormModelState) {
        super(dispatcher, initialState);
        this.appServices = appServices;

        // these symbols are allowed and replaced by minus sign in query
        this.hyphenChars = new RegExp('[' + [
            '\u002D', // minus char
            '\u2010', // hyphen
            '\u2011', // non-breaking hyphen
            '\u2012' // figure dash
        ].join('') + ']', 'g');
        this.queryCheckRegexp = /^[\s0-9A-Za-z\u00AA\u00B5\u00BA\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0345\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05B0-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0657\u0659-\u065F\u066E-\u06D3\u06D5-\u06DC\u06E1-\u06E8\u06ED-\u06EF\u06FA-\u06FC\u06FF\u0710-\u073F\u074D-\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0817\u081A-\u082C\u0840-\u0858\u08A0-\u08B4\u08E3-\u08E9\u08F0-\u093B\u093D-\u094C\u094E-\u0950\u0955-\u0963\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD-\u09C4\u09C7\u09C8\u09CB\u09CC\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09F0\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3E-\u0A42\u0A47\u0A48\u0A4B\u0A4C\u0A51\u0A59-\u0A5C\u0A5E\u0A70-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD-\u0AC5\u0AC7-\u0AC9\u0ACB\u0ACC\u0AD0\u0AE0-\u0AE3\u0AF9\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D-\u0B44\u0B47\u0B48\u0B4B\u0B4C\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCC\u0BD0\u0BD7\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4C\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCC\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4C\u0D4E\u0D57\u0D5F-\u0D63\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E46\u0E4D\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0ECD\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F71-\u0F81\u0F88-\u0F97\u0F99-\u0FBC\u1000-\u1036\u1038\u103B-\u103F\u1050-\u1062\u1065-\u1068\u106E-\u1086\u108E\u109C\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135F\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1713\u1720-\u1733\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17B3\u17B6-\u17C8\u17D7\u17DC\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u1938\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A1B\u1A20-\u1A5E\u1A61-\u1A74\u1AA7\u1B00-\u1B33\u1B35-\u1B43\u1B45-\u1B4B\u1B80-\u1BA9\u1BAC-\u1BAF\u1BBA-\u1BE5\u1BE7-\u1BF1\u1C00-\u1C35\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1D00-\u1DBF\u1DE7-\u1DF4\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2019\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u24B6-\u24E9\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FD5\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA674-\uA67B\uA67F-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AD\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA827\uA840-\uA873\uA880-\uA8C3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA92A\uA930-\uA952\uA960-\uA97C\uA980-\uA9B2\uA9B4-\uA9BF\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA60-\uAA76\uAA7A\uAA7E-\uAABE\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF5\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC\U00010000-\U0001000B\U0001000D-\U00010026\U00010028-\U0001003A\U0001003C\U0001003D\U0001003F-\U0001004D\U00010050-\U0001005D\U00010080-\U000100FA\U00010140-\U00010174\U00010280-\U0001029C\U000102A0-\U000102D0\U00010300-\U0001031F\U00010330-\U0001034A\U00010350-\U0001037A\U00010380-\U0001039D\U000103A0-\U000103C3\U000103C8-\U000103CF\U000103D1-\U000103D5\U00010400-\U0001049D\U00010500-\U00010527\U00010530-\U00010563\U00010600-\U00010736\U00010740-\U00010755\U00010760-\U00010767\U00010800-\U00010805\U00010808\U0001080A-\U00010835\U00010837\U00010838\U0001083C\U0001083F-\U00010855\U00010860-\U00010876\U00010880-\U0001089E\U000108E0-\U000108F2\U000108F4\U000108F5\U00010900-\U00010915\U00010920-\U00010939\U00010980-\U000109B7\U000109BE\U000109BF\U00010A00-\U00010A03\U00010A05\U00010A06\U00010A0C-\U00010A13\U00010A15-\U00010A17\U00010A19-\U00010A33\U00010A60-\U00010A7C\U00010A80-\U00010A9C\U00010AC0-\U00010AC7\U00010AC9-\U00010AE4\U00010B00-\U00010B35\U00010B40-\U00010B55\U00010B60-\U00010B72\U00010B80-\U00010B91\U00010C00-\U00010C48\U00010C80-\U00010CB2\U00010CC0-\U00010CF2\U00011000-\U00011045\U00011082-\U000110B8\U000110D0-\U000110E8\U00011100-\U00011132\U00011150-\U00011172\U00011176\U00011180-\U000111BF\U000111C1-\U000111C4\U000111DA\U000111DC\U00011200-\U00011211\U00011213-\U00011234\U00011237\U00011280-\U00011286\U00011288\U0001128A-\U0001128D\U0001128F-\U0001129D\U0001129F-\U000112A8\U000112B0-\U000112E8\U00011300-\U00011303\U00011305-\U0001130C\U0001130F\U00011310\U00011313-\U00011328\U0001132A-\U00011330\U00011332\U00011333\U00011335-\U00011339\U0001133D-\U00011344\U00011347\U00011348\U0001134B\U0001134C\U00011350\U00011357\U0001135D-\U00011363\U00011480-\U000114C1\U000114C4\U000114C5\U000114C7\U00011580-\U000115B5\U000115B8-\U000115BE\U000115D8-\U000115DD\U00011600-\U0001163E\U00011640\U00011644\U00011680-\U000116B5\U00011700-\U00011719\U0001171D-\U0001172A\U000118A0-\U000118DF\U000118FF\U00011AC0-\U00011AF8\U00012000-\U00012399\U00012400-\U0001246E\U00012480-\U00012543\U00013000-\U0001342E\U00014400-\U00014646\U00016800-\U00016A38\U00016A40-\U00016A5E\U00016AD0-\U00016AED\U00016B00-\U00016B36\U00016B40-\U00016B43\U00016B63-\U00016B77\U00016B7D-\U00016B8F\U00016F00-\U00016F44\U00016F50-\U00016F7E\U00016F93-\U00016F9F\U0001B000\U0001B001\U0001BC00-\U0001BC6A\U0001BC70-\U0001BC7C\U0001BC80-\U0001BC88\U0001BC90-\U0001BC99\U0001BC9E\U0001D400-\U0001D454\U0001D456-\U0001D49C\U0001D49E\U0001D49F\U0001D4A2\U0001D4A5\U0001D4A6\U0001D4A9-\U0001D4AC\U0001D4AE-\U0001D4B9\U0001D4BB\U0001D4BD-\U0001D4C3\U0001D4C5-\U0001D505\U0001D507-\U0001D50A\U0001D50D-\U0001D514\U0001D516-\U0001D51C\U0001D51E-\U0001D539\U0001D53B-\U0001D53E\U0001D540-\U0001D544\U0001D546\U0001D54A-\U0001D550\U0001D552-\U0001D6A5\U0001D6A8-\U0001D6C0\U0001D6C2-\U0001D6DA\U0001D6DC-\U0001D6FA\U0001D6FC-\U0001D714\U0001D716-\U0001D734\U0001D736-\U0001D74E\U0001D750-\U0001D76E\U0001D770-\U0001D788\U0001D78A-\U0001D7A8\U0001D7AA-\U0001D7C2\U0001D7C4-\U0001D7CB\U0001E800-\U0001E8C4\U0001EE00-\U0001EE03\U0001EE05-\U0001EE1F\U0001EE21\U0001EE22\U0001EE24\U0001EE27\U0001EE29-\U0001EE32\U0001EE34-\U0001EE37\U0001EE39\U0001EE3B\U0001EE42\U0001EE47\U0001EE49\U0001EE4B\U0001EE4D-\U0001EE4F\U0001EE51\U0001EE52\U0001EE54\U0001EE57\U0001EE59\U0001EE5B\U0001EE5D\U0001EE5F\U0001EE61\U0001EE62\U0001EE64\U0001EE67-\U0001EE6A\U0001EE6C-\U0001EE72\U0001EE74-\U0001EE77\U0001EE79-\U0001EE7C\U0001EE7E\U0001EE80-\U0001EE89\U0001EE8B-\U0001EE9B\U0001EEA1-\U0001EEA3\U0001EEA5-\U0001EEA9\U0001EEAB-\U0001EEBB\U0001F130-\U0001F149\U0001F150-\U0001F169\U0001F170-\U0001F189\U00020000-\U0002A6D6\U0002A700-\U0002B734\U0002B740-\U0002B81D\U0002B820-\U0002CEA1\U0002F800-\U0002FA1D]+$/;

        this.addActionHandler<Actions.ChangeQueryInput>(
            ActionName.ChangeQueryInput,
            (state, action) => {
                state.errors = [];
                state.queries[action.payload.queryIdx] =
                    Forms.updateFormInput(state.queries[action.payload.queryIdx], {value: action.payload.value, isValid: true});
            }
        );

        this.addActionHandler<Actions.ChangeCurrQueryMatch>(
            ActionName.ChangeCurrQueryMatch,
            (state, action) => {
                const group = state.queryMatches[action.payload.queryIdx];
                state.queryMatches[action.payload.queryIdx] = group.map(v => ({
                    lemma: v.lemma,
                    word: v.word,
                    pos: v.pos,
                    abs: v.abs,
                    ipm: v.ipm,
                    arf: v.arf,
                    flevel: v.flevel,
                    isCurrent: matchesPos(v, action.payload.pos) && v.word == action.payload.word &&
                            v.lemma === action.payload.lemma ? true : false
                }));
            },
            (state, action, dispatch) => {
                this.submitCurrLemma(state);
            }
        );

        this.addActionHandler<Actions.ChangeTargetLanguage>(
            ActionName.ChangeTargetLanguage,
            (state, action) => {
                const prevLang2 = state.queryLanguage2;
                state.queryLanguage = action.payload.lang1;
                state.queryLanguage2 = action.payload.lang2;
                state.queryType = action.payload.queryType;
                if (state.isAnswerMode && state.queryType === QueryType.TRANSLAT_QUERY &&
                            prevLang2 !== action.payload.lang2) {
                    this.checkAndSubmitUserQuery(state);
                }
            }
        );

        this.addActionHandler<Actions.ChangeQueryType>(
            ActionName.ChangeQueryType,
            (state, action) => {
                state.queryType = action.payload.queryType;
                const hasMoreQueries = pipe(state.queries, List.slice(1), List.some(v => v.value !== ''));
                const allowsValidSingleQuery = state.queryType !== QueryType.CMP_QUERY && state.queries[0].value !== '';
                if (state.isAnswerMode && (allowsValidSingleQuery || hasMoreQueries)) {
                    this.checkAndSubmitUserQuery(state);
                }

                if (state.queryType === QueryType.SINGLE_QUERY || state.queryType === QueryType.TRANSLAT_QUERY) {
                    state.queries = state.queries.map(q => Forms.updateFormInput(q, {isRequired: false}));

                } else {
                    state.queries = state.queries.map(q => Forms.updateFormInput(q, {isRequired: true}));
                    if (state.queries.length === 1) {
                        state.queries.push(Forms.newFormValue('', true));
                    }
                }
            }
        );

        this.addActionHandler<Actions.SubmitQuery>(
            ActionName.SubmitQuery,
            (state, action) => {
                this.checkAndSubmitUserQuery(state);
            },
            (state, action, dispatch) => {
                state.errors.forEach(err => {
                    this.appServices.showMessage(SystemMessageType.ERROR, err.message);
                });
            }
        );

        this.addActionHandler<Actions.AddCmpQueryInput>(
            ActionName.AddCmpQueryInput,
            (state, action) => {
                if (state.queries.length < state.maxCmpQueries) {
                    state.queries.push(Forms.newFormValue('', true));
                }
            },
            (state, action, dispatch) => {
                if (state.queries.length >= state.maxCmpQueries) {
                    this.appServices.showMessage(SystemMessageType.INFO, this.appServices.translate('global__maximum_limit_of_compared_queries'));
                }
            }
        );

        this.addActionHandler(
            ActionName.RemoveCmpQueryInput,
            (state, action:Actions.RemoveCmpQueryInput) => {
                state.queries.splice(action.payload.queryIdx, 1);
            }
        );

        this.addActionHandler(
            ActionName.ShowQueryMatchModal,
            (state, action:Actions.ShowQueryMatchModal) => {
                state.lemmaSelectorModalVisible = true;
            }
        );

        this.addActionHandler(
            ActionName.HideQueryMatchModal,
            (state, action:Actions.HideQueryMatchModal) => {
                state.lemmaSelectorModalVisible = false;
            }
        );

        this.addActionHandler(
            ActionName.SelectModalQueryMatch,
            (state, action:Actions.SelectModalQueryMatch) => {
                state.modalSelections[action.payload.queryIdx] = action.payload.variantIdx;
            }
        );

        this.addActionHandler(
            ActionName.ApplyModalQueryMatchSelection,
            (state, action:Actions.ApplyModalQueryMatchSelection) => {
                state.lemmaSelectorModalVisible = false;
                state.modalSelections.forEach((sel, idx) => {
                    state.queryMatches[idx] = state.queryMatches[idx].map((v, i2) => ({
                        lemma: v.lemma,
                        word: v.word,
                        pos: v.pos,
                        abs: v.abs,
                        ipm: v.ipm,
                        arf: v.arf,
                        flevel: v.flevel,
                        isCurrent: i2 === sel
                    }))
                });
            },
            (state, action, dispatch) => {
                this.submitCurrLemma(state);
            }
        );
    }

    private trimQueries(state:QueryFormModelState):void {
        state.queries = state.queries.map(
            formQuery => Forms.updateFormInput(formQuery, {value: formQuery.value.trim()}));
    }

    private submitCurrLemma(state:QueryFormModelState):void {
        const args = new MultiDict();
        args.set('pos', findCurrQueryMatch(state.queryMatches[0]).pos.map(v => v.value).join(' '));
        args.set('lemma', findCurrQueryMatch(state.queryMatches[0]).lemma);

        switch (state.queryType) {
            case QueryType.CMP_QUERY:
                state.queryMatches.slice(1).forEach(m => {
                    args.add('pos', findCurrQueryMatch(m).pos.map(v => v.value).join(' '));
                    args.add('lemma', findCurrQueryMatch(m).lemma);
                });
        }

        window.location.href = this.appServices.createActionUrl(this.buildQueryPath(state), args);
    }

    private checkAndSubmitUserQuery(state:QueryFormModelState):void {
        this.trimQueries(state);
        state.errors = [];
        this.validateQuery(state);
        if (state.errors.length === 0) { // we leave the page here, TODO: use some kind of routing
            window.location.href = this.appServices.createActionUrl(this.buildQueryPath(state));
        }
    }

    private buildQueryPath(state:QueryFormModelState):string {
        const action = (
            state.queryType === QueryType.SINGLE_QUERY ? HTTPAction.SEARCH :
            state.queryType === QueryType.CMP_QUERY ? HTTPAction.COMPARE :
            HTTPAction.TRANSLATE
        );
        
        const langs = [state.queryLanguage];
        if (state.queryType === QueryType.TRANSLAT_QUERY) {
            langs.push(state.queryLanguage2);
        }

        const queries = [state.queries[0].value.replace(this.hyphenChars, '-')];            
        if (state.queryType === QueryType.CMP_QUERY) {
            state.queries.slice(1).forEach(v => {
                queries.push(v.value.replace(this.hyphenChars, '-'));
            });
        }

        return [action, langs.join('--'), queries.join('--')].join('/');
    }

    private validateNthQuery(state:QueryFormModelState, idx:number):boolean {
        let isValid = true;
        if (!this.queryCheckRegexp.exec(state.queries[idx].value) && !this.hyphenChars.exec(state.queries[idx].value)) {
            state.errors.push(new Error(this.appServices.translate('global__query_contains_unsupported_chars')));
            isValid = false;
        }
        const spaceMatch = state.queries[idx].value.match(/\s/g);
        const spaceCount = spaceMatch ? spaceMatch.length : 0;
        if (spaceCount+1 > state.multiWordQuerySupport[state.queryType]) {
            state.errors.push(new Error(this.appServices.translate('global__query_words_exceeded_{num_words}',
                {num_words: state.multiWordQuerySupport[state.queryType]})));
            isValid = false;
        }
        state.queries[idx] = Forms.updateFormInput(state.queries[idx], {isValid: isValid});
        return isValid;
    }

    private findEqualQueries(state:QueryFormModelState):Array<string> {
        return pipe(
            state.queries,
            List.groupBy(v => v.value),
            List.filter(([,v]) => v.length > 1),
            List.map(([k,]) => k)
        );
    }

    validateQuery(state:QueryFormModelState):void {
        if (state.queryType === QueryType.SINGLE_QUERY) {
            this.validateNthQuery(state, 0);

        } else if (state.queryType === QueryType.CMP_QUERY) {
            List.forEach(
                (_, idx) => {
                    this.validateNthQuery(state, idx);
                },
                state.queries
            );
            const eqQueries = this.findEqualQueries(state);
            if (eqQueries.length > 0) {
                state.errors.push(new Error(`Some of the entered queries are identical: ${eqQueries.join(', ')}`));
            }

        } else if (state.queryType === QueryType.TRANSLAT_QUERY) {
            this.validateNthQuery(state, 0);
            if (state.queryLanguage === state.queryLanguage2) {
                state.errors.push(new Error(this.appServices.translate('global__src_and_dst_langs_must_be_different')));
            }
        }
    }

    getFirstQuery():string {
        return this.getState().queries[0].value;
    }

    getOtherQueries():Array<string> {
        return this.getState().queries.slice(1).map(v => v.value);
    }
}

export interface DefaultFactoryArgs {
    dispatcher:IActionQueue;
    appServices:IAppServices;
    query1Lang:string;
    query2Lang:string;
    queryType:QueryType;
    queryMatches:RecognizedQueries;
    isAnswerMode:boolean;
    uiLanguages:Array<AvailableLanguage>;
    searchLanguages:Array<SearchLanguage>;
    layout:LayoutManager;
    maxCmpQueries:number;
}

export const defaultFactory = ({dispatcher, appServices, query1Lang, query2Lang, queryType, queryMatches,
        isAnswerMode, uiLanguages, searchLanguages, layout, maxCmpQueries}:DefaultFactoryArgs) => {

    return new QueryFormModel(
        dispatcher,
        appServices,
        {
            queries: List.map(
                (v, i) => Forms.newFormValue(v[0].word || '', i === 0),
                queryMatches
            ),
            queryType: queryType,
            initialQueryType: queryType,
            queryTypesMenuItems: layout.getQueryTypesMenuItems(),
            queryLanguage: query1Lang,
            queryLanguage2: query2Lang,
            searchLanguages: searchLanguages,
            targetLanguages: layout.getTargetLanguages(),
            errors: [],
            queryMatches: queryMatches,
            isAnswerMode: isAnswerMode,
            uiLanguages: uiLanguages,
            multiWordQuerySupport: layout.getMultiWordQuerySupport(),
            maxCmpQueries: maxCmpQueries,
            lemmaSelectorModalVisible: false,
            modalSelections: List.map(
                v => v.findIndex(v2 => v2.isCurrent),
                queryMatches
            )
        }
    );
};
