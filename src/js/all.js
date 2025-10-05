
import './polyfills/index.js'
import './core/index.js'
const core = globalThis[Symbol.for('tjs.internal.core')];
core.__worker_bootstrap=()=>import('./worker/worker-bootstrap.js');
core.__run_main=()=>import('./run-main/index.js');
