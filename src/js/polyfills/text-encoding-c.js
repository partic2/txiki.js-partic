
const core = globalThis[Symbol.for('tjs.internal.core')];

class TextEncoder{
    encode(s){
        return core.newUtf8BufferFromString(s);
    }
}

class TextDecoder{
    decode(b){
        if(b instanceof ArrayBuffer){
            b=new Uint8Array(b);
        }
        return core.newStringFromUtf8Buffer(b);
    }
}

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
