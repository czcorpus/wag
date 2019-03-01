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
import {Observable} from 'rxjs';
import * as request from 'request';
import { IToolbarProvider, HostPageEnv } from '../../common/types';


interface ToolbarResponse {
    user:any; // TODO

    styles:{
        [ident:string]:{
            package:string;
            module:string;
            version:string;
            url:string;
        }
    };

    scripts:{
        main:string;
        depends:{
            [ident:string]:{
                package:string;
                module:string;
                version:string;
                url:string;
            }
        };
    }

    html:string;
}


export class UCNKToolbar implements IToolbarProvider {

    private readonly url:string;

    constructor(url:string) {
        this.url = url;
    }

    get():Observable<HostPageEnv> {
        return new Observable<HostPageEnv>((observer) => {
            request
                .get(
                    {
                        url: this.url,
                        json: true
                    },
                    (error, response, body:ToolbarResponse) => {
                        if (error) {
                            observer.error(error);

                        } else if (response.statusCode !== 200) {
                            observer.error(new Error(`Toolbar loading failed with error: ${response.statusMessage} (code ${response.statusCode})`));

                        } else {
                            observer.next({
                                styles: Object.keys(body.styles)
                                    .sort((x1, x2) => parseInt(x1) - parseInt(x2))
                                    .map(v => body.styles[v].url),
                                scripts: Object.keys(body.scripts)
                                    .sort((x1, x2) => parseInt(x1) - parseInt(x2))
                                    .map(v => body.scripts[v].url)
                                    .concat([body.scripts.main]),
                                html: body.html,
                                toolbarHeight: '50px'
                            });
                            observer.complete();
                        }
                    }
                );
            }
        );
    }
 }