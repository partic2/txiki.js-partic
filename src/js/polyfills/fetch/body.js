function isDataView(obj) {
    return obj && isPrototypeOf(DataView.prototype, obj);
}

function consumed(body) {
    if (body._bodySize===0) {
        return;
    }

    if (body.bodyUsed) {
        return Promise.reject(new TypeError('Already read'));
    }

    body.bodyUsed = true;
}


function bufferClone(buf) {
    if (buf.slice) {
        return buf.slice(0);
    } else {
        const view = new Uint8Array(buf.byteLength);

        view.set(new Uint8Array(buf));

        return view.buffer;
    }
}

function isPrototypeOf(a, b) {
    return Object.prototype.isPrototypeOf.call(a, b);
}
export const BodyMixin = {
    get bodyUsed() {
        return this._bodyUsed === true;
    },

    _initBody(body) {
        this._bodyUsed = false;
        this._bodyInit = body;

        if (!body) {
            this._bodySize = 0;
            this._bodyReadable = ReadableStream.from([ new Uint8Array(0) ]);
        } else if (typeof body === 'string') {
            const bodyBuffer = new TextEncoder().encode(body);

            this._bodySize = bodyBuffer.byteLength;
            this._bodyReadable = ReadableStream.from([ bodyBuffer ]);
        } else if (isPrototypeOf(Blob.prototype, body)) {
            this._bodySize = body.size;
            this._bodyReadable = body.stream(); 
        } else if (isPrototypeOf(FormData.prototype, body)) {
            // formdata polyfill
            const bodyBuffer = body['_blob']();

            this._bodySize = bodyBuffer.byteLength;
            this._bodyReadable = ReadableStream.from([ bodyBuffer ]);
        } else if (isPrototypeOf(URLSearchParams.prototype, body)) {
            const textEncoder = new TextEncoder();
            const bodyBuffer = textEncoder.encode(body.toString());

            this._bodySize = bodyBuffer.byteLength;
            this._bodyReadable = ReadableStream.from([ bodyBuffer ]);
        } else if (isDataView(body)) {
            const bodyBuffer = new Uint8Array(bufferClone(body.buffer));

            this._bodySize = bodyBuffer.byteLength;
            this._bodyReadable = ReadableStream.from([ bodyBuffer ]);
        } else if (isPrototypeOf(ArrayBuffer.prototype, body) || ArrayBuffer.isView(body)) {
            const bodyBuffer = new Uint8Array(bufferClone(body.buffer));

            this._bodySize = bodyBuffer.byteLength;
            this._bodyReadable = ReadableStream.from([ bodyBuffer ]);
        } else if (isPrototypeOf(ReadableStream.prototype, body)) {
            this._bodySize = -1;
            this._bodyReadable = body;
        } else {
            const bodyBuffer = new TextEncoder().encode(body.toString());

            this._bodySize = bodyBuffer.byteLength;
            this._bodyReadable = ReadableStream.from([ bodyBuffer ]);
        }

        this.body = this._bodyReadable;

        if (!this.headers.get('content-type')) {
            if (typeof body === 'string') {
                this.headers.set('content-type', 'text/plain;charset=UTF-8');
            } else if (isPrototypeOf(Blob.prototype, body) && body.type) {
                this.headers.set('content-type', body.type);
            } else if (isPrototypeOf(URLSearchParams.prototype, body)) {
                this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
            }
        }
    },

    _setBody(readable) {
        this._bodyReadable = readable;
        this.body = readable;
    },

    _consumeBody() {
        if (this._bodyUsed) {
            throw new TypeError('Body has already been consumed.');
        }
        this._bodyUsed = true;
    },

    async blob() {
        this._consumeBody();

        if (!this._bodyReadable) {
            throw new Error('Unknown body type');
        }

        const parts = [];
        const reader = this._bodyReadable.getReader();

        try {
            for (;;) {
                const next = await reader.read();
                if (next.done) {
                    break;
                }
                parts.push(next.value);
            }
        } finally {
            reader.releaseLock();
        }

        return new Blob(parts);
    },

    async arrayBuffer() {
        // TODO: expose Blob.parts to reduce memory copy?
        return await (await this.blob()).arrayBuffer();
    },

    async text() {
        return new TextDecoder().decode(await this.arrayBuffer());
    },

    async formData() {
        return decode(await this.text());
    },

    async json() {
        return JSON.parse(await this.text());
    },
};

function decode(body) {
    const form = new FormData();

    body
        .trim()
        .split('&')
        .forEach(function(bytes) {
            if (bytes) {
                const split = bytes.split('=');
                const name = split.shift().replace(/\+/g, ' ');
                const value = split.join('=').replace(/\+/g, ' ');

                form.append(decodeURIComponent(name), decodeURIComponent(value));
            }
        });

    return form;
}
