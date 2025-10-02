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

export interface Input {
    value: string;
    isValid: boolean;
    isRequired: boolean;
    errorDesc?: string;
}

export class Forms {
    static updateFormInput(
        formValue: Input,
        data: { [P in keyof Input]?: Input[P] }
    ) {
        return {
            value: data.value !== undefined ? data.value : formValue.value,
            isValid:
                data.isValid !== undefined ? data.isValid : formValue.isValid,
            isRequired:
                data.isRequired !== undefined
                    ? data.isRequired
                    : formValue.isRequired,
            errorDesc:
                data.errorDesc !== undefined
                    ? data.errorDesc
                    : formValue.errorDesc,
        };
    }

    static newFormValue(v: string, isRequired: boolean): Input {
        return {
            value: v,
            isValid: true,
            isRequired: isRequired,
            errorDesc: undefined,
        };
    }

    static resetFormValue(formValue: Input, val: string = '') {
        return {
            value: val,
            isValid: true,
            isRequired: formValue.isRequired,
            errorDesc: undefined,
        };
    }
}
