import { BodyMixin } from './body.js';
import { Headers } from './headers.js';

const redirectStatuses = [ 301, 302, 303, 307, 308 ];

export class Response {
    constructor(bodyInit, options = {}) {
        Object.assign(this, BodyMixin);

        this.type = 'default';
        this.status = options.status === undefined ? 200 : options.status;

        if (this.status < 200 || this.status > 599) {
            throw new RangeError(`The status provided ${this.status} is outside the range [200, 599].`);
        }

        this.ok = this.status >= 200 && this.status < 300;
        this.statusText = options.statusText === undefined ? '' : '' + options.statusText;
        this.headers = new Headers(options.headers);
        this.url = options.url || '';

        this._initBody(bodyInit);
    }

    static error() {
        const response = new Response(null, { status: 200, statusText: '' });

        response.ok = false;
        response.status = 0;
        response.type = 'error';

        return response;
    }

    static redirect(url, status) {
        if (redirectStatuses.indexOf(status) === -1) {
            throw new RangeError('Invalid status code');
        }

        return new Response(null, { status: status, headers: { location: url } });
    }

    clone() {
        if (this.bodyUsed) {
            throw new TypeError('Cannot clone a Response whose body has already been used.');
        }

        let clonedBody;

        if (!this._bodyReadable) {
            clonedBody = null;
        } else if (typeof this._bodyReadable.tee === 'function') {
            const [ branch1, branch2 ] = this._bodyReadable.tee();

            this._setBody(branch1);

            clonedBody = branch2;
        } else {
            clonedBody = this._bodyReadable;
        }

        const clonedResponse = new Response(clonedBody, {
            status: this.status,
            statusText: this.statusText,
            headers: new Headers(this.headers),
            url: this.url
        });

        clonedResponse.type = this.type;
        clonedResponse.ok = this.ok;

        return clonedResponse;
    }
}