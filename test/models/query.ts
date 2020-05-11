/*
 * Copyright 2020 Martin Zimandl <martin.zimandl@gmail.com>
 * Copyright 2020 Institute of the Czech National Corpus,
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

import { TestModelWrapper } from '../framework';

import { restore } from 'sinon';
import { assert } from 'chai';
import { List } from 'cnc-tskit';

import { QueryFormModel, QueryFormModelState } from '../../src/js/models/query';
import { ActionName } from '../../src/js/models/actions';
import { QueryType, QueryMatch } from '../../src/js/common/query';
<<<<<<< HEAD
=======
import { PoSValues } from '../../src/js/common/postag';
>>>>>>> test fixes
import { Forms } from '../../src/js/common/data';
import { SystemMessageType } from '../../src/js/common/types';
import { PoSValues } from '../../src/js/common/postag';


describe('QueryFormModel', function () {
    function setupModel(initialStateOverrides = {}):TestModelWrapper<QueryFormModel, QueryFormModelState> {
        const initialQueryMatches = [[
            {word: 'test', lemma: 'test', pos: [], isCurrent: true} as QueryMatch,
            {word: 'test', lemma: 'test', pos: [{value: PoSValues.VERB, label:'verb'}], isCurrent: false} as QueryMatch
        ]];

        return new TestModelWrapper(
            (dispatcher, appServices) => new QueryFormModel(
                dispatcher,
                appServices,
                {
                    initialQueryType: QueryType.SINGLE_QUERY,
                    queryLanguage: 'cs',
                    queryLanguage2: 'en',
                    searchLanguages: [{
                        code: 'en',
                        label: 'English',
                        queryTypes: [QueryType.SINGLE_QUERY]
                    }],
                    targetLanguages: {
                        [QueryType.SINGLE_QUERY]: [],
                        [QueryType.CMP_QUERY]: [],
                        [QueryType.TRANSLAT_QUERY]: []
                    },
                    queries: List.map(
                        (v, i) => Forms.newFormValue(v[0].word || '', i === 0),
                        initialQueryMatches
                    ),
                    queryTypesMenuItems: [],
                    queryType: QueryType.SINGLE_QUERY,
                    errors: [],
                    uiLanguages: [],
                    maxCmpQueries: 10,
                    lemmaSelectorModalVisible: true,
                    modalSelections: [],
                    queryMatches: initialQueryMatches,
                    isAnswerMode: false,
                    multiWordQuerySupport: {
                        [QueryType.SINGLE_QUERY]: 1,
                        [QueryType.CMP_QUERY]: 2,
                        [QueryType.TRANSLAT_QUERY]: 1,
                    },
                    ...initialStateOverrides
                }
            ),
            {
                createActionUrl: 'query submitted'
            }
        );
    }

    this.beforeEach(function () {
        global['window'] = {location: {href: ''}};
    });

    this.afterEach(function () {
        restore();
    });

    describe('language change', function () {
        it('changes target language', function (done) {
            setupModel({queryLanguage: 'cs', queryLanguage2: 'en'})
            .checkState(
                {name: ActionName.ChangeTargetLanguage, payload: {lang1: 'sk', lang2: 'pl', queryType: QueryType.SINGLE_QUERY}},
                ActionName.ChangeTargetLanguage,
                state => {
                    assert.equal(state.queryLanguage, 'sk');
                    assert.equal(state.queryLanguage2, 'pl');
                    assert.equal(window.location.href, '')
                    done();
                }
            );
        });

        it('submits query if in translate query type and answer mode', function (done) {
            setupModel({queryLanguage: 'cs', queryLanguage2: 'en', isAnswerMode: true})
            .checkState(
                {name: ActionName.ChangeTargetLanguage, payload: {lang1: 'cs', lang2: 'pl', queryType: QueryType.TRANSLAT_QUERY}},
                ActionName.ChangeTargetLanguage,
                state => {
                    assert.equal(state.queryLanguage, 'cs');
                    assert.equal(state.queryLanguage2, 'pl');
                    assert.equal(window.location.href, 'query submitted');
                    assert.lengthOf(state.errors, 0);
                    done();
                }
            );
        });
    });

    describe('query input', function () {
        it('changes query type', function (done) {
            setupModel({queryType: QueryType.SINGLE_QUERY})
            .checkState(
                {name: ActionName.ChangeQueryType, payload: {queryType: QueryType.CMP_QUERY}},
                ActionName.ChangeQueryType,
                state => {
                    assert.equal(state.queryType, QueryType.CMP_QUERY);
                    done();
                }
            );
        });

        it('changes query input', function (done) {
            setupModel()
            .checkState(
                {name: ActionName.ChangeQueryInput, payload: {queryIdx: 0, value: 'query changed'}},
                ActionName.ChangeQueryInput,
                state => {
                    assert.equal(state.queries[0].value, 'query changed');
                    done();
                }
            );
        });

        describe('cmp query input', function () {
            it('adds input', function (done) {
                setupModel({maxCmpQueries: 5})
                .checkState(
                    {name: ActionName.AddCmpQueryInput},
                    ActionName.AddCmpQueryInput,
                    state => {
                        assert.lengthOf(state.queries, 2);
                        assert.equal(state.queries[1].value, '');
                        assert.isTrue(state.queries[1].isRequired);
                        done();
                    }
                );
            });

            it('exceedes max number of inputs', function (done) {
                setupModel({maxCmpQueries: 1})
                .checkState(
                    {name: ActionName.AddCmpQueryInput},
                    ActionName.AddCmpQueryInput,
                    (state, appServices) => {
                        assert.lengthOf(state.queries, 1);
                        assert.isTrue(appServices.showMessage.calledWith(SystemMessageType.INFO));
                        done();
                    }
                );
            });

            it('removes input', function (done) {
                setupModel({queries: [
                    {value: 'word1', isValid: true, isRequired: true},
                    {value: 'word2', isValid: true, isRequired: true},
                    {value: 'word3', isValid: true, isRequired: true}
                ]})
                .checkState(
                    {name: ActionName.RemoveCmpQueryInput, payload: {queryIdx: 1}},
                    ActionName.RemoveCmpQueryInput,
                    state => {
                        assert.deepEqual(
                            state.queries,
                            [
                                {value: 'word1', isValid: true, isRequired: true},
                                {value: 'word3', isValid: true, isRequired: true}
                            ]
                        )
                        done();
                    }
                );
            });
        });

        describe('submit', function () {
            it('submits query succesfully', function (done) {
                setupModel()
                .checkState(
                    {name: ActionName.SubmitQuery},
                    ActionName.SubmitQuery,
                    state => {
                        assert.equal(window.location.href, 'query submitted');
                        assert.lengthOf(state.errors, 0);
                        done();
                    }
                );
            });

            describe('query validation', function () {
                it('has unsupported character', function (done) {
                    setupModel({queryType: QueryType.SINGLE_QUERY, queries: [{value: '*', isValid: true}]})
                    .checkState(
                        {name: ActionName.SubmitQuery},
                        ActionName.SubmitQuery,
                        (state, appServices) => {
                            assert.equal(window.location.href, '');
                            assert.isFalse(state.queries[0].isValid);
                            assert.isAbove(state.errors.length, 0);
                            assert.isTrue(appServices.showMessage.calledWith(SystemMessageType.ERROR));
                            done();
                        }
                    );
                });

                it('has not multiword support', function (done) {
                    setupModel({queryType: QueryType.SINGLE_QUERY, queries: [{value: 'two words', isValid: true}]})
                    .checkState(
                        {name: ActionName.SubmitQuery},
                        ActionName.SubmitQuery,
                        (state, appServices) => {
                            assert.equal(window.location.href, '');
                            assert.isFalse(state.queries[0].isValid);
                            assert.isAbove(state.errors.length, 0);
                            assert.isTrue(appServices.showMessage.calledWith(SystemMessageType.ERROR));
                            done();
                        }
                    );
                });

                it('has multiword support', function (done) {
                    setupModel({queryType: QueryType.SINGLE_QUERY, queries: [{value: 'two words', isValid: true}], multiWordQuerySupport: {[QueryType.SINGLE_QUERY]: 2}})
                    .checkState(
                        {name: ActionName.SubmitQuery},
                        ActionName.SubmitQuery,
                        (state, appServices) => {
                            assert.equal(window.location.href, 'query submitted');
                            assert.isNotFalse(state.queries[0].isValid);
                            assert.lengthOf(state.errors, 0);
                            done();
                        }
                    );
                });

                it('has identical queries (cmp)', function (done) {
                    setupModel({queryType: QueryType.CMP_QUERY, queries: [{value: 'word', isValid: true}, {value: 'word', isValid: true}]})
                    .checkState(
                        {name: ActionName.SubmitQuery},
                        ActionName.SubmitQuery,
                        (state, appServices) => {
                            assert.equal(window.location.href, '');
                            assert.isAbove(state.errors.length, 0);
                            assert.isTrue(appServices.showMessage.calledWith(SystemMessageType.ERROR));
                            done();
                        }
                    );
                });

                it('has identical languages (translat)', function (done) {
                    setupModel({queryType: QueryType.TRANSLAT_QUERY, queryLanguage: 'cs', queryLanguage2: 'cs'})
                    .checkState(
                        {name: ActionName.SubmitQuery},
                        ActionName.SubmitQuery,
                        (state, appServices) => {
                            assert.equal(window.location.href, '');
                            assert.isAbove(state.errors.length, 0);
                            assert.isTrue(appServices.showMessage.calledWith(SystemMessageType.ERROR));
                            done();
                        }
                    );
                });
            });
        });
    });

    describe('query match', function () {
        it('shows modal', function (done) {
            setupModel({lemmaSelectorModalVisible: false})
            .checkState(
                {name: ActionName.ShowQueryMatchModal},
                ActionName.ShowQueryMatchModal,
                state => {
                    assert.isTrue(state.lemmaSelectorModalVisible);
                    done();
                }
            );
        });

        it('hides modal', function (done) {
            setupModel({lemmaSelectorModalVisible: true})
            .checkState(
                {name: ActionName.HideQueryMatchModal},
                ActionName.HideQueryMatchModal,
                state => {
                    assert.isFalse(state.lemmaSelectorModalVisible);
                    done();
                }
            );
        });

        it('selects match', function (done) {
            setupModel({modalSelections: [0]})
            .checkState(
                {name: ActionName.SelectModalQueryMatch, payload: {queryIdx: 0, variantIdx: 1}},
                ActionName.SelectModalQueryMatch,
                state => {
                    assert.equal(state.modalSelections[0], 1);
                    done();
                }
            );
        });

        it('applies match selection', function (done) {
            setupModel({lemmaSelectorModalVisible: true, modalSelections: [1]})
            .checkState(
                {name: ActionName.ApplyModalQueryMatchSelection},
                ActionName.ApplyModalQueryMatchSelection,
                state => {
                    assert.isFalse(state.queryMatches[0][0].isCurrent);
                    assert.isTrue(state.queryMatches[0][1].isCurrent);
                    assert.isFalse(state.lemmaSelectorModalVisible);
                    assert.equal(window.location.href, 'query submitted');
                    assert.lengthOf(state.errors, 0);
                    done();
                }
            );
        });

        it('changes query match and submits', function (done) {
            setupModel()
            .checkState(
                {name: ActionName.ChangeCurrQueryMatch, payload: {queryIdx: 0, word: 'test', lemma: 'test', pos: [PoSValues.VERB]}},
                ActionName.ChangeCurrQueryMatch,
                state => {
                    assert.isFalse(state.queryMatches[0][0].isCurrent);
                    assert.isTrue(state.queryMatches[0][1].isCurrent);
                    assert.equal(window.location.href, 'query submitted');
                    assert.lengthOf(state.errors, 0);
                    done();
                }
            );
        });
    });
});