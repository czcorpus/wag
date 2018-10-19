import {init as window1Init} from './ttDistrib/index';
import {init as window4Init} from './concordance/index';

require('../css/index.css'); // webpack


class SearchModule {

    constructor(conf, components) {
        this.conf = conf;
        this.components = components;
        this.boxes = [];
        this.eventHandler = this.eventHandler.bind(this);
    }

    init() {
        this.components.submitBtn.addEventListener('click', evt => {
            this.boxes.forEach(
                ({mountPoint, box, delay}) => {
                    window.setTimeout(() => {
                        box.run(this.fetchFormArgs());
                    }, delay);
                }
            );
        });
    }

    fetchFormArgs() {
        return {
            query: this.components.srchInput.value,
            lang: this.components.langSelect.value
        };
    }

    eventHandler(event, source) {
        const mount = this.findCallerMountPoint(source);
        switch (event) {
            case 'busy': {
                this.attachAjaxLoader(mount);
            }
            break;
            case 'loaded': {
                mount.innerHTML = '';
            }
            break;
            case 'error':
                console.error('box reports an error; source: ', mount);
            break;
            default:
                console.log('OTHER EVENT: ', event, source);
        }
    }

    attachAjaxLoader(mount) {
        mount.innerHTML = '';
        const elm = document.createElement('img');
        elm.setAttribute('src', './img/ajax-loader.gif');
        mount.appendChild(elm);
    }

    findCallerMountPoint(caller) {
        const srch = this.boxes.find(({box}) => box === caller);
        if (srch) {
            return srch.mountPoint;
        }
        throw new Error('caller not registered');
    }

    registerBox(mountPoint, box, delay) {
        this.boxes.push({mountPoint, box, delay});
    }
}

export const init = (conf) => {
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