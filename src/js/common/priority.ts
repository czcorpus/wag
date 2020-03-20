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

import { List } from 'cnc-tskit';


interface ValueWithPriority<T> {
    value:T;
    priority:[number, number];
}


export class PriorityValueFactory<T> {

    private readonly priorities:Array<number>;

    private readonly instances:Array<ValueWithPriority<T>>;

    private probLimit:number;

    constructor(priorities:Array<number>) {
        this.probLimit = 0;
        this.instances = [];
        const total = List.foldl((acc, curr) => acc + curr, 0, priorities);
        this.priorities = List.map(
            (v,) => v / total,
            priorities
        );
    }

    addInstance(i:number, v:T):void {
        const prior = this.priorities[i] || 0;
        this.instances.push({
            value: v,
            priority: [this.probLimit, this.probLimit + prior]
        });
        this.probLimit += prior;
    }

    getRandomValue():T {
        const v = Math.random();
        for (let i = 0; i < this.instances.length; i++) {
            if (v >= this.instances[i].priority[0] && v <= this.instances[i].priority[1]) {
                return this.instances[i].value;
            }
        }
        console.warn('Failed to fetch item by priority');
        return this.instances[0].value;
    }

}