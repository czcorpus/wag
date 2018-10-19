export class MultiDict {

    constructor(data) {
        if (!data) {
            this.data = {};

        } else if (Array.isArray(data)) {
            //data.forEach(v => {[v[0], v[1]]);

        } else if (typeof data === 'object') {
            this.data = Object.keys(data).map(k => [k, data[k]]);

        } else {
            throw new Error('Invalid initial data for multidict');
        }
    }

    add(k, v) {
        if (!this.data.hasOwnProperty(k)) {
            this.data[k] = [];
        }
        this.data[k].push(v);
        return this;
    }

    set(k, v) {
        this.data[k] = [v];
        return this;
    }

    remove(k) {
        delete this.data[k];
        return this;
    }

    contains(k) {
        return this.data.hasOwnProperty(k);
    }

    toURIString() {
        Object.keys(this.data).map()
    }
}