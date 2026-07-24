const RAPFI_BASE = 'https://cdn.jsdelivr.net/gh/gomocalc/gomocalc.github.io@master/build/';
const queuedCommands = [];

var Bridge = {
  ready: false,
  writeStdin() {},
  readStdout(text) {
    self.postMessage({ type: 'stdout', data: text });
  },
  setReady() {
    this.ready = true;
    self.postMessage({ type: 'ready' });
    while (queuedCommands.length) this.writeStdin(queuedCommands.shift());
  },
};

var Module = {
  preRun: [function () {
    const input = {
      str: '',
      index: 0,
      set(value) {
        this.str = value + '\n';
        this.index = 0;
      },
    };
    const output = {
      str: '',
      flush() {
        if (this.str) Bridge.readStdout(this.str);
        this.str = '';
      },
    };

    function stdin() {
      const value = input.str.charCodeAt(input.index++);
      return Number.isNaN(value) ? null : value;
    }

    function stdout(value) {
      if (!value || value === 10) output.flush();
      else output.str += String.fromCharCode(value);
    }

    FS.init(stdin, stdout, stdout);
    const loopOnce = Module.cwrap('gomocupLoopOnce', 'number', []);
    Bridge.writeStdin = function (command) {
      input.set(command);
      loopOnce();
    };
  }],
  onRuntimeInitialized() {
    Bridge.setReady();
  },
  locateFile(file) {
    return RAPFI_BASE + file;
  },
  mainScriptUrlOrBlob: RAPFI_BASE + 'rapfi-single.js',
  setStatus(status) {
    self.postMessage({ type: 'status', data: status });
  },
};

self.onmessage = function (event) {
  const message = event.data || {};
  const command = typeof message === 'string' ? message : message.data;
  if (!command || typeof command !== 'string') return;
  if (Bridge.ready) Bridge.writeStdin(command);
  else queuedCommands.push(command);
};

try {
  importScripts(RAPFI_BASE + 'rapfi-single.js');
} catch (error) {
  self.postMessage({
    type: 'error',
    data: error && error.message ? error.message : String(error),
  });
}
