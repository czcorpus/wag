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

import * as React from 'react';
import { ViewUtils } from 'kombo';
import { GlobalComponents } from './global';
import { AvailableLanguage } from '../common/hostPage';
import { HTTPAction } from '../server/routes/actions';
import { List } from 'cnc-tskit';


export function init(ut:ViewUtils<GlobalComponents>) {

    class LangSwitchToolbar extends React.Component<{
        languages:Array<AvailableLanguage>;
        uiLang:string;
        returnUrl:string;
    }> {

        render() {
            return (
                <div className="LangSwitchToolbar">
                    <form method="POST" action={ut.createActionUrl(HTTPAction.SET_UI_LANG)}>
                        <input type="hidden" name="returnUrl" value={this.props.returnUrl} />
                        <ul>
                            {
                                List.map(v => (
                                    <li key={v.code}>
                                        <button className={v.code === this.props.uiLang ? 'current' : null} type="submit" name="lang" value={v.code}>
                                            {v.label}
                                        </button>
                                    </li>
                                    ),
                                    this.props.languages
                                )
                            }
                        </ul>
                    </form>
                </div>
            );
        }
    }


    return LangSwitchToolbar;

}