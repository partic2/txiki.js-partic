const core = globalThis[Symbol.for('tjs.internal.core')];

export const mbedtls = {};

if(core.mbedtls_sha1!=undefined){
    mbedtls.sha1=core.mbedtls_sha1
}

