//https://www.npmjs.com/package/compression-streams-polyfill?activeTab=code
///compression-streams-polyfill/esm/ponyfill.mjs+index.mjs


import { AsyncDeflate, Deflate, AsyncGzip, AsyncZlib, AsyncInflate, AsyncGunzip, AsyncUnzlib, Gzip, Zlib, Gunzip, Unzlib, Inflate } from './fflate.js';
const wrapSync = (Stream) => {
    class AsyncWrappedStream {
        constructor() {
            this.i = new Stream();
            this.i.ondata = (data, final) => {
                this.ondata(null, data, final);
            };
        }
        push(data, final) {
            try {
                this.queuedSize += data.length;
                this.i.push(data, final);
                this.queuedSize -= data.length;
                if (this.ondrain)
                    this.ondrain(data.length);
            }
            catch (err) {
                this.ondata(err, null, final || false);
            }
        }
    }
    return AsyncWrappedStream;
};
// Safari fix
let hasWorker = 1;
try {
    const test = new AsyncDeflate();
    test.terminate();
}
catch (err) {
    hasWorker = 0;
}
const compressors = hasWorker ? {
    'gzip': AsyncGzip,
    'deflate': AsyncZlib,
    'deflate-raw': AsyncDeflate
} : {
    'gzip': wrapSync(Gzip),
    'deflate': wrapSync(Zlib),
    'deflate-raw': wrapSync(Deflate)
};
const decompressors = hasWorker ? {
    'gzip': AsyncGunzip,
    'deflate': AsyncUnzlib,
    'deflate-raw': AsyncInflate
} : {
    'gzip': wrapSync(Gunzip),
    'deflate': wrapSync(Unzlib),
    'deflate-raw': wrapSync(Inflate)
};
const makeMulti = (TransformStreamBase, processors, name) => {
    class BaseCompressionStream extends TransformStreamBase {
        constructor(format) {
            if (!arguments.length) {
                throw new TypeError(`Failed to construct '${name}': 1 argument required, but only 0 present.`);
            }
            const Processor = processors[format];
            if (!Processor) {
                throw new TypeError(`Failed to construct '${name}': Unsupported compression format: '${format}'`);
            }
            let compressor = new Processor();
            let endCb;
            super({
                start: controller => {
                    compressor.ondata = (err, dat, final) => {
                        if (err)
                            controller.error(err);
                        else if (dat) {
                            controller.enqueue(dat);
                            if (final) {
                                if (endCb)
                                    endCb();
                                else
                                    controller.terminate();
                            }
                        }
                    };
                },
                transform: chunk => {
                    if (chunk instanceof ArrayBuffer)
                        chunk = new Uint8Array(chunk);
                    else if (ArrayBuffer.isView(chunk)) {
                        chunk = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
                    }
                    else {
                        throw new TypeError("The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
                    }
                    compressor.push(chunk);
                    // use fflate internal buffering to keep worker message channel fed
                    if (compressor.queuedSize >= 32768) {
                        return new Promise(resolve => {
                            compressor.ondrain = () => {
                                if (compressor.queuedSize < 32768)
                                    resolve();
                            };
                        });
                    }
                },
                flush: () => new Promise(resolve => {
                    endCb = resolve;
                    compressor.push(new Uint8Array(0), true);
                })
            }, {
                size: chunk => chunk.byteLength | 0,
                highWaterMark: 65536
            }, {
                size: chunk => chunk.byteLength | 0,
                highWaterMark: 65536
            });
        }
    }
    return BaseCompressionStream;
};
export function makeCompressionStream(TransformStreamBase) {
    return makeMulti(TransformStreamBase, compressors, 'CompressionStream');
}
export function makeDecompressionStream(TransformStreamBase) {
    return makeMulti(TransformStreamBase, decompressors, 'DecompressionStream');
}

const globals = typeof globalThis == 'undefined'
    ? typeof self == 'undefined'
        ? typeof global == 'undefined'
            ? {}
            : global
        : self
    : globalThis;
if (typeof globals.CompressionStream == 'undefined') {
    globals.CompressionStream = makeCompressionStream(TransformStream);
}
if (typeof globals.DecompressionStream == 'undefined') {
    globals.DecompressionStream = makeDecompressionStream(TransformStream);
}