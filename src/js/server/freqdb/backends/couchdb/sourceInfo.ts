/*
 * Copyright 2020 Tomas Machalek <tomas.machalek@gmail.com>
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

import { Observable, of as rxOf } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HTTP, List } from 'cnc-tskit';

import { serverHttpRequest, ServerHTTPRequestError } from '../../../request.js';
import { SourceDetails } from '../../../../types.js';
import { IApiServices } from '../../../../appServices.js';

interface HTTPSourceInfoDoc {
    _id: string;
    _rev: string;
    uiLang: string;
    data: {
        corpname: string;
        description: string;
        size: number;
        web_url: string;
        attrlist: Array<{ name: string; size: number }>;
        citationInfo: {
            article_ref: Array<string>;
            default_ref: string;
            other_bibliography: string;
        };
        structlist: Array<{ name: string; size: number }>;
        keywords: Array<{ name: string; color: string }>;
    };
}

interface HTTPSourceInfoResponse {
    total_rows: number;
    offset: number;
    rows: Array<{
        id: string;
        key: string;
        value: number;
        doc: HTTPSourceInfoDoc;
    }>;
}

function findStructSize(
    data: Array<{ name: string; size: number }>,
    name: string
): number | undefined {
    const ans = List.find((v) => v.name === name, data);
    return ans ? ans.size : undefined;
}

export class CouchStoredSourceInfo {
    private readonly sourceDbUrl: string;

    private readonly dbUser: string;

    private readonly dbPassword: string;

    private readonly apiServices: IApiServices;

    constructor(
        sourceDbUrl: string,
        dbUser: string,
        dbPassword: string,
        apiServices: IApiServices
    ) {
        this.sourceDbUrl = sourceDbUrl;
        this.dbUser = dbUser;
        this.dbPassword = dbPassword;
        this.apiServices = apiServices;
    }

    getSourceDescription(
        uiLang: string,
        corpname: string
    ): Observable<SourceDetails> {
        return this.sourceDbUrl
            ? serverHttpRequest<HTTPSourceInfoResponse>({
                  url: this.sourceDbUrl,
                  method: HTTP.Method.GET,
                  params: {
                      key: `"${uiLang}:${corpname}"`,
                      include_docs: true,
                  },
                  auth: {
                      username: this.dbUser,
                      password: this.dbPassword,
                  },
              }).pipe(
                  catchError((err) => {
                      throw new Error(
                          `Failed to fetch source information for ${uiLang}:${corpname}: ${err}`
                      );
                  }),
                  map((resp) => {
                      if (resp.rows.length > 0) {
                          return resp.rows[0].doc;
                      }
                      throw new ServerHTTPRequestError(
                          HTTP.Status.NotFound,
                          `Failed to find source information for ${corpname}`
                      );
                  }),
                  map((doc) => {
                      if (doc.data.structlist) {
                          return {
                              tileId: -1,
                              title: doc.data.corpname,
                              description: doc.data.description,
                              author: '', // TODO
                              href: doc.data.web_url,
                              citationInfo: {
                                  sourceName: doc.data.corpname,
                                  main: doc.data.citationInfo.default_ref,
                                  papers:
                                      doc.data.citationInfo.article_ref || [],
                                  otherBibliography:
                                      doc.data.citationInfo
                                          .other_bibliography || undefined,
                              },
                              structure: {
                                  numTokens: doc.data.size,
                              },
                              keywords: doc.data.keywords,
                          };
                      } else {
                          return {
                              tileId: -1,
                              title: corpname,
                              description: doc.data.description,
                              author: '',
                              citationInfo: {
                                  sourceName: doc.data.corpname,
                                  main: doc.data.citationInfo.default_ref,
                                  papers: doc.data.citationInfo.article_ref,
                                  otherBibliography:
                                      doc.data.citationInfo.other_bibliography,
                              },
                              structure: { numTokens: 0 },
                          };
                      }
                  })
              )
            : rxOf({
                  tileId: -1,
                  title: corpname,
                  description: 'No detailed information available',
                  author: 'not specified',
                  structure: { numTokens: 0 },
              });
    }
}
