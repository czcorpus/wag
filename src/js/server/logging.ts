/*
 * Copyright 2025 Tomas Machalek <tomas.machalek@gmail.com>
 * Copyright 2025 Institute of the Czech National Corpus,
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

import pino from 'pino';
import { ServerConf } from '../conf';

const errSerializer = (err:Error) => {
    return {
        type: err.constructor.name,
        message: err.message,
        stack: err.stack?.split('\n').map(line => line.trim())
    };
};

export function initLogging(
    serverConf:ServerConf,
    remapConsoleLog:boolean
):pino.Logger<"query", boolean> {

    const customLevels = {
        query: 35,  // between info (30) and warn (40),
    };

    const logger = pino(serverConf.logging.path ?
        {
            transport: {
                target: 'pino-roll',
                options: {
                    file: serverConf.logging.path,
                    size: '10m',
                    interval: '1d',
                    mkdir: true
                }
            },
            customLevels,
            timestamp: pino.stdTimeFunctions.isoTime,
            formatters: {
                level(label, number) {
                    return {level: number === 35 ? 'QUERY' : label.toUpperCase()}
                }
            },
            serializers: {
                err: errSerializer
            }
        }:
        {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss.l',
                    ignore: 'pid,hostname',
                    customLevels: {
                        trace: 10,
                        debug: 20,
                        info: 30,
                        warn: 40,
                        error: 50,
                        fatal: 60,
                        ...customLevels
                    },
                    customColors: {
                        default: 'white',
                        60: 'bgRed',
                        50: 'red',
                        40: 'yellow',
                        30: 'green',
                        35: 'blueBright',
                        20: 'blue',
                        10: 'gray',
                        message: 'cyan',
                        greyMessage: 'gray',
                        property: 'magenta'
                    }
                }
            },
            customLevels,
            timestamp: pino.stdTimeFunctions.isoTime,
            serializers: {
                err: errSerializer
            }
        }
    );

    if (remapConsoleLog) {
        console.info = (msg:string,...args:Array<any>) => logger.info(msg,...args);
        console.warn = (msg:string, ...args:Array<any>) => logger.warn(msg, ...args);
        console.error = (msg:string, ...args:Array<any>) => logger.error(msg, ...args);
    }

    return logger;
}
