import { map, Observable, of as rxOf, tap } from 'rxjs';
import { IApiServices, IAppServices } from '../../../appServices.js';
import { MainPosAttrValues } from '../../../conf/index.js';
import { IFreqDB } from '../freqdb.js';
import {
    calcFreqBand,
    LemmatizationLevel,
    QueryMatch,
} from '../../../query/index.js';
import { serverHttpRequest } from '../../request.js';
import { HTTP, List, pipe } from 'cnc-tskit';
import { importQueryPosWithLabel } from '../../../postag.js';
import { SourceDetails } from '../../../types.js';
import urlJoin from 'url-join';
import { group } from 'd3';

interface Sublemma {
    value: string;
    count: number;
}

interface HTTPNgramDoc {
    _id: string;
    _rev: string;
    lemma: string;
    sublemmas: Array<Sublemma>;
    pos: string;
    datasetSize: number;
    upos: string;
    count: number;
    arf: number;
    ipm: number;
    is_pname: boolean;
    forms: Array<{
        word: string;
        sublemma?: string;
        count: number;
        ipm: number;
        arf: number;
    }>;
}

interface HTTPNgramResponse {
    matches: Array<HTTPNgramDoc>;
    error: string | undefined;
}

export class FrodoClient implements IFreqDB {
    private readonly apiURL: string;

    private readonly apiServices: IApiServices;

    private readonly fcrit: string;

    private readonly ngramFcrit: string;

    private readonly normPath: string;

    private readonly sourceInfoApi: unknown;

    private readonly corpusSize: number;

    constructor(apiURL: string, corpusSize: number, apiServices: IApiServices) {
        this.apiURL = apiURL;
        this.corpusSize = corpusSize;
        this.apiServices = apiServices;
    }

    findQueryMatches(
        appServices: IAppServices,
        word: string,
        freqLemLevel: LemmatizationLevel,
        posAttr: MainPosAttrValues,
        minFreq: number
    ): Observable<Array<QueryMatch>> {
        return serverHttpRequest<HTTPNgramResponse>({
            url: urlJoin(this.apiURL, `search`, word),
            method: HTTP.Method.GET,
            params: {},
        }).pipe(
            map((resp) => {
                return pipe(
                    resp.matches,
                    List.flatMap((v, i) =>
                        pipe(
                            v.forms,
                            List.groupBy((v2, i) =>
                                v2.sublemma ? v2.sublemma : v.lemma
                            ),
                            List.map(([subl, forms]) => {
                                const corpusSize =
                                    v.datasetSize ?? this.corpusSize;
                                const srchForm = List.find(
                                    (x) =>
                                        x.word === word && x.sublemma === subl,
                                    v.forms
                                );
                                const sublProps = List.find(
                                    (x) => x.value === subl,
                                    v.sublemmas
                                );
                                if (!sublProps) {
                                    throw new Error(
                                        `invalid data for sublemma ${subl}`
                                    );
                                }
                                return {
                                    localId: `${i}:${subl}`,
                                    word: srchForm ? word : subl,
                                    forms: List.map(
                                        ({ count, word, ipm }) => ({
                                            count,
                                            word,
                                            ipm,
                                        }),
                                        forms
                                    ),
                                    lemma: v.lemma,
                                    sublemma: subl,
                                    otherSublemmas: pipe(
                                        v.sublemmas,
                                        List.filter((v) => v.value !== subl),
                                        List.map((v) => v.value)
                                    ),
                                    pos: importQueryPosWithLabel(
                                        v.pos,
                                        'pos',
                                        appServices
                                    ),
                                    upos: v.upos
                                        ? importQueryPosWithLabel(
                                              v.upos,
                                              'upos',
                                              appServices
                                          )
                                        : importQueryPosWithLabel(
                                              v.pos,
                                              'upos',
                                              appServices
                                          ),
                                    abs:
                                        freqLemLevel === 'sublemma'
                                            ? sublProps.count
                                            : v.count,
                                    ipm:
                                        freqLemLevel === 'sublemma'
                                            ? (sublProps.count / corpusSize) *
                                              1e6
                                            : (v.count / corpusSize) * 1e6,
                                    flevel:
                                        freqLemLevel === 'sublemma'
                                            ? calcFreqBand(
                                                  (sublProps.count /
                                                      corpusSize) *
                                                      1e6
                                              )
                                            : calcFreqBand(
                                                  (v.count / corpusSize) * 1e6
                                              ),
                                    arf: v.arf, // TODO arf can be obtained just for lemma
                                    isCurrent: false,
                                    initialCap: v.is_pname,
                                };
                            })
                        )
                    )
                );
            })
        );
    }

    getSimilarFreqWords(
        appServices: IAppServices,
        lemma: string,
        pos: Array<string>,
        posAttr: MainPosAttrValues,
        rng: number
    ): Observable<Array<QueryMatch>> {
        return serverHttpRequest<HTTPNgramResponse>({
            url: urlJoin(
                this.apiURL,
                'similarARFWords',
                lemma,
                '?pos=' + encodeURIComponent(pos[0])
            ),
            method: HTTP.Method.GET,
            params: {},
        }).pipe(
            map((resp) => {
                return List.flatMap(
                    (dictEntry, i) =>
                        List.map((sublemma) => {
                            const corpusSize =
                                dictEntry.datasetSize ?? this.corpusSize;
                            return {
                                localId: `${i}:${sublemma.value}`,
                                word: sublemma.value,
                                forms: [], // no need to set in this case
                                lemma: dictEntry.lemma,
                                sublemma: sublemma.value,
                                otherSublemmas: [],
                                pos: importQueryPosWithLabel(
                                    dictEntry.pos,
                                    'pos',
                                    appServices
                                ),
                                upos: importQueryPosWithLabel(
                                    dictEntry.upos,
                                    'upos',
                                    appServices
                                ),
                                abs: dictEntry.count,
                                ipm: (dictEntry.count / corpusSize) * 1e6,
                                flevel: calcFreqBand(
                                    (dictEntry.count / corpusSize) * 1e6
                                ),
                                arf: dictEntry.arf,
                                isCurrent: false,
                                initialCap: dictEntry.is_pname,
                            };
                        }, dictEntry.sublemmas),
                    resp.matches
                );
            })
        );
    }

    /**
     * Find words with similar frequency as the one specified by lemma and pos.
     * The 'pos' argument specifies possibly multi-word PoS information (that is why
     * we use array type).
     */
    getWordForms(
        appServices: IAppServices,
        lemma: string,
        pos: Array<string>,
        posAttr: MainPosAttrValues
    ): Observable<Array<QueryMatch>> {
        return rxOf([]);
    }

    getSourceDescription(
        uiLang: string,
        corpname: string
    ): Observable<SourceDetails> {
        return rxOf({
            tileId: -1,
            title: 'Unknown resource',
            description: '',
            author: 'unknown',
            structure: { numTokens: 0 },
        });
    }
}
