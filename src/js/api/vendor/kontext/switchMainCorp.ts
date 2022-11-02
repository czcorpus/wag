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

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { HTTP } from 'cnc-tskit';
import { ajax$, encodeArgs } from '../../../page/ajax';
import { ISwitchMainCorpApi, SwitchMainCorpResponse } from '../../abstract/switchMainCorp';
import { IApiServices } from '../../../appServices';


export interface SwitchMainCorpArgs {
    concPersistenceID:string;
    align:string;
    maincorp:string;
    corpname:string;
}

interface HTTPResponse {
    conc_persistence_op_id:string;
    messages:Array<[string, string]>;
}

export class SwitchMainCorpApi implements ISwitchMainCorpApi {

    private readonly apiURL:string;

    private readonly apiServices:IApiServices;

    constructor(apiURL:string, apiServices:IApiServices) {
        this.apiURL = apiURL;
        this.apiServices = apiServices;
    }

    call(args:SwitchMainCorpArgs):Observable<SwitchMainCorpResponse> {

        return ajax$<HTTPResponse>(
            HTTP.Method.POST,
            this.apiURL + '/switch_main_corp?' +
                encodeArgs({
                    corpname: args.corpname,
                    maincorp: args.maincorp,
                    align: args.align,
                    q: '~' + args.concPersistenceID,
                    format:'json'
                }),
            {},
            {headers: this.apiServices.getApiHeaders(this.apiURL)}

        ).pipe(
            map(
                data => ({
                    concPersistenceID: data.conc_persistence_op_id
                })
            )
        );
    }


}

