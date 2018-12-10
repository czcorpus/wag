import { ActionDispatcher } from 'kombo';
declare var require:(src:string)=>void;
require('../css/index.css'); // webpack


interface Conf {

}

class SearchModule {

    private conf:Conf;

    constructor(conf:Conf) {
        this.conf = conf;
    }

}

export const init = (conf) => {
    const dispatcher = new ActionDispatcher();
        const viewUtils = new ViewUtils<{}>('en_US', this.translations);
        const component = viewInit(dispatcher, viewUtils, model);
        ReactDOM.render(
            React.createElement(component.TodoTable),
            document.getElementById('root-mount')
        );
    const components = {
        srchInput: document.getElementById('search-query'),
        langSelect: document.getElementById('query-language'),
        submitBtn: document.getElementById('query-submit')
    };
    const sm = new SearchModule(conf, components);
    sm.registerBox(
        document.getElementById('window1-mount'),
        window1Init(
            conf,
            document.getElementById('window1-mount'),
            sm.eventHandler
        ),
        0
    );
    sm.registerBox(
        document.getElementById('window4-mount'),
        window4Init(
            conf,
            document.getElementById('window4-mount'),
            sm.eventHandler
        ),
        0
    );
    sm.init();
};