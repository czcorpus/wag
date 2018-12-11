import {DummyAPI} from './api';
import {StatelessModel, ActionDispatcher, Action} from 'kombo';


export interface Window1Conf {
}

export interface TTDistribModelState {
    isBusy:boolean;
}

export class TTDistribModel extends StatelessModel<TTDistribModelState> {

    private api:DummyAPI;

    private conf:Window1Conf;

    constructor(dispatcher:ActionDispatcher, api:DummyAPI, conf:Window1Conf) {
        super(
            dispatcher,
            {
                isBusy:false
            }
        );
        this.api = api;
        this.conf = conf;
    }

    reduce(state:TTDistribModelState, action:Action):TTDistribModelState {
        return state;
    }

    run({query, lang}) {
        /*
        console.log(`window1 looking for ${query} (${lang}) `);
        this.onEvent('busy', this);
        this.api.call({}).subscribe(
            (data) => {
                this.target.innerHTML = '';
                const d3target = d3.select(this.target);
                d3target.append('div');
                this.drawChart(d3target.select('div'), data);
            },
            (err) => {
                console.error(err);
            }
        );
        */
    }


}


export const init = (dispatcher:ActionDispatcher, conf, target, onEvent) => {
    return new TTDistribModel(dispatcher, new DummyAPI(), conf);
}