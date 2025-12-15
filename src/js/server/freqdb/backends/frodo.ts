import { map, Observable, of as rxOf, tap } from 'rxjs';
import { IApiServices, IAppServices } from '../../../appServices.js';
import { MainPosAttrValues } from '../../../conf/index.js';
import { IFreqDB } from '../freqdb.js';
import { calcFreqBand, QueryMatch } from '../../../query/index.js';
import { serverHttpRequest } from '../../request.js';
import { HTTP, List, pipe } from 'cnc-tskit';
import { importQueryPosWithLabel } from '../../../postag.js';
import { SourceDetails } from '../../../types.js';
import urlJoin from 'url-join';

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
    upos: string;
    count: number;
    arf: number;
    forms: Array<{
        word: string;
        count: number;
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
                    List.flatMap((v) =>
                        List.map(
                            (subl) => ({
                                word,
                                lemma: v.lemma,
                                sublemma: subl.value,
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
                                abs: v.count,
                                ipm: (v.count / this.corpusSize) * 1e6,
                                flevel: calcFreqBand(
                                    (v.count / this.corpusSize) * 1e6
                                ),
                                arf: v.arf,
                                isCurrent: false,
                            }),
                            v.sublemmas
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
                    (dictEntry) =>
                        List.map(
                            (sublemma) => ({
                                word: '-',
                                lemma: dictEntry.lemma,
                                sublemma: sublemma.value,
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
                                ipm: (dictEntry.count / this.corpusSize) * 1e6,
                                flevel: calcFreqBand(
                                    (dictEntry.count / this.corpusSize) * 1e6
                                ),
                                arf: dictEntry.arf,
                                isCurrent: false,
                            }),
                            dictEntry.sublemmas
                        ),
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
