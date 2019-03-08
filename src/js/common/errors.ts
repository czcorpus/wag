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

export enum ErrorType {
    BAD_REQUEST = 'BadRequest',
    INTERNAL_ERROR = 'InternalError'
}

/**
 * Return an HTTP status code based on error type. If there is no
 * mapping for the provided errType, code 500 (Internal Server Error)
 * is returned.
 */
export const mapToStatusCode = (errType:ErrorType|string):number => {
    return {
        [ErrorType.BAD_REQUEST]: 400,
        [ErrorType.INTERNAL_ERROR]: 500
    }[errType] || 500;
}

/**
 * A factory function for creating error with a defined name (see ErrorType).
 */
export const newError = (t:ErrorType, message:string):Error => {
    const err = new Error(message);
    err.name = t;
    return err;
}