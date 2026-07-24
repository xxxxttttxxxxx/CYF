let engine = null;
let buildDir = '';

function post(type, data) {
  self.postMessage({ type, data });
}

function locateFile(url) {
  if (/^rapfi.*\.data$/.test(url)) return buildDir + 'rapfi.data';
  return buildDir + url;
}

self.onmessage = async (event) => {
  const { type, data } = event.data || {};

  if (type === 'init') {
    try {
      buildDir = new URL('./build/', self.location.href).href;
      importScripts(buildDir + 'rapfi-single.js');

      engine = await self.Rapfi({
        locateFile,
        onReceiveStdout: (line) => post('stdout', line),
        onReceiveStderr: (line) => post('stderr', line),
        onExit: (code) => post('exit', code),
        setStatus: (status) => post('status', status),
        wasmMemory: new WebAssembly.Memory({
          initial: 1024,
          maximum: 8192,
          shared: false,
        }),
      });

      post('ready', true);
    } catch (error) {
      post('error', error && error.message ? error.message : String(error));
    }
    return;
  }

  if (type === 'command' && engine && typeof data === 'string') {
    engine.sendCommand(data);
  }
};
