import * as jquery from 'jquery';


export class ServiceAPI {

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


    call() {
        const def = jquery.Deferred();
        window.setTimeout(() => {
            def.resolve(this.fakeData);
        }, 2000);
        return def.promise();
    }
}