// Order is important!

import './global.js';
import './timers.js';
import './dom-exception.js';
import './event-target-polyfill.js';
import './structured-clone.js';

import './abba.js';
import './text-encoding.js';
import './text-encode-transform.js';
import './url.js';

import './navigator.js';

import './blob.js';
import './file.js';
import './file-reader.js';
import './form-data.js';
import './abortcontroller-polyfill-only.js';
import './xhr.js';
import './fetch/polyfill.js';

import './console.js';
import './crypto.js';
import './performance.js';
import './storage.js';

import './ws.js';

import './web-streams-polyfill.js';
import './compression-streams-polyfill.js';

//Initial worker after compression-streams-polyfill.js, To prevent recursive worker constructor.
//FIXME: make worker avaiable for compression-streams-polyfill.js
import './worker.js';
