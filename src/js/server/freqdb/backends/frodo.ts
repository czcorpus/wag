import { map, Observable, of as rxOf, tap } from "rxjs";
import { IApiServices, IAppServices } from "../../../appServices";
import { MainPosAttrValues } from "../../../conf";
import { IFreqDB } from "../freqdb";
import { calcFreqBand, QueryMatch } from "../../../query";
import { serverHttpRequest } from "../../request";
import { HTTP, List } from "cnc-tskit";
import { importQueryPosWithLabel } from "../../../postag";
import { SourceDetails } from "../../../types";
import urlJoin from 'url-join';


interface HTTPNgramDoc {
    _id:string;
    _rev:string;
    lemma:string;
    pos:string;
    upos:string;
    count:number;
    arf:number;
    forms:Array<{
        word:string;
        count:number;
        arf:number;
    }>;
}

interface HTTPNgramResponse {
    matches:Array<HTTPNgramDoc>;
    error:string|undefined;
}


export class FrodoClient implements IFreqDB {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    private readonly fcrit:string;

    private readonly ngramFcrit:string;

    private readonly normPath:string;

    private readonly sourceInfoApi:unknown;

    private readonly corpusSize:number;


    constructor(apiURL:string, corpusSize:number, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.corpusSize = corpusSize;
        this.apiServices = apiServices;
    }

    findQueryMatches(
        appServices:IAppServices,
        word:string,
        posAttr:MainPosAttrValues,
        minFreq:number
    ):Observable<Array<QueryMatch>> {
        return serverHttpRequest<HTTPNgramResponse>({
            url: urlJoin(this.apiURL, `querySuggestions`, word),
            method: HTTP.Method.GET,
            params: {}
        }).pipe(
            map(
                (resp) => {
                    return List.map<HTTPNgramDoc, QueryMatch>(
                        v => ({
                            word,
                            lemma: v.lemma,
                            pos: importQueryPosWithLabel(v.pos, 'pos', appServices),
                            upos: importQueryPosWithLabel(v.upos, 'upos', appServices),
                            abs: v.count,
                            ipm: v.count / this.corpusSize * 1e6,
                            flevel: calcFreqBand(v.count / this.corpusSize * 1e6),
                            arf: v.arf,
                            isCurrent: false
                        }),
                        resp.matches
                    )
                }
            )
        );
    }

    getSimilarFreqWords(
        appServices:IAppServices,
        lemma:string,
        pos:Array<string>,
        posAttr:MainPosAttrValues,
        rng:number
    ):Observable<Array<QueryMatch>> {
        return serverHttpRequest<HTTPNgramResponse>({
            url: urlJoin(this.apiURL, `similarARFWords`, lemma),
            method: HTTP.Method.GET,
            params: {}
        }).pipe(
            map(
                (resp) => {
                    return List.map<HTTPNgramDoc, QueryMatch>(
                        v => ({
                            word: lemma,
                            lemma: v.lemma,
                            pos: importQueryPosWithLabel(v.pos, 'pos', appServices),
                            upos: importQueryPosWithLabel(v.upos, 'upos', appServices),
                            abs: v.count,
                            ipm: v.count / this.corpusSize * 1e6,
                            flevel: calcFreqBand(v.count / this.corpusSize * 1e6),
                            arf: v.arf,
                            isCurrent: false
                        }),
                        resp.matches
                    )
                }
            )
        );
    }

    /**
     * Find words with similar frequency as the one specified by lemma and pos.
     * The 'pos' argument specifies possibly multi-word PoS information (that is why
     * we use array type).
     */
    getWordForms(
        appServices:IAppServices,
        lemma:string,
        pos:Array<string>,
        posAttr:MainPosAttrValues
    ):Observable<Array<QueryMatch>> {
        return rxOf([]);
    }

    getSourceDescription(uiLang:string, corpname:string):Observable<SourceDetails> {
        return rxOf({
            tileId: -1,
            title: 'Unknown resource',
            description: '',
            author: 'unknown',
            structure: {numTokens: 0}
        })
    }

}
