import * as Rx from '@reactivex/rxjs';
import { DataApi } from '../../abstract/types';


export interface DataRow {
    name:string;
    value:number;
}


export type DummyAPIResponse = Array<DataRow>;


export interface QueryArgs {

}

export class DummyAPI implements DataApi<QueryArgs, DummyAPIResponse> {

    private fakeData:Array<DataRow>;

    constructor() {
        this.fakeData = [
            {name: 'ADM', value: 3419},
            {name: 'LEI', value: 2811},
            {name: 'MEM', value: 831},
            {name: 'NEW', value: 17942},
            {name: 'NOW', value: 809},
            {name: 'POP', value: 11789}
        ];
    }


    call(args:QueryArgs):Rx.Observable<DummyAPIResponse> {
        return Rx.Observable.of(this.fakeData).delay(1500);
    }
}