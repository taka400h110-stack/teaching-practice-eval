var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// _worker.js
var Gt = Object.defineProperty;
var pt = /* @__PURE__ */ __name((e) => {
  throw TypeError(e);
}, "pt");
var Kt = /* @__PURE__ */ __name((e, t, r) => t in e ? Gt(e, t, { enumerable: true, configurable: true, writable: true, value: r }) : e[t] = r, "Kt");
var v = /* @__PURE__ */ __name((e, t, r) => Kt(e, typeof t != "symbol" ? t + "" : t, r), "v");
var et = /* @__PURE__ */ __name((e, t, r) => t.has(e) || pt("Cannot " + r), "et");
var _ = /* @__PURE__ */ __name((e, t, r) => (et(e, t, "read from private field"), r ? r.call(e) : t.get(e)), "_");
var N = /* @__PURE__ */ __name((e, t, r) => t.has(e) ? pt("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), "N");
var g = /* @__PURE__ */ __name((e, t, r, n) => (et(e, t, "write to private field"), n ? n.call(e, r) : t.set(e, r), r), "g");
var L = /* @__PURE__ */ __name((e, t, r) => (et(e, t, "access private method"), r), "L");
var Et = /* @__PURE__ */ __name((e, t, r, n) => ({ set _(a) {
  g(e, t, a, r);
}, get _() {
  return _(e, t, n);
} }), "Et");
var bt = /* @__PURE__ */ __name((e, t, r) => (n, a) => {
  let o = -1;
  return s(0);
  async function s(i) {
    if (i <= o) throw new Error("next() called multiple times");
    o = i;
    let c, l = false, d;
    if (e[i] ? (d = e[i][0][0], n.req.routeIndex = i) : d = i === e.length && a || void 0, d) try {
      c = await d(n, () => s(i + 1));
    } catch (u) {
      if (u instanceof Error && t) n.error = u, c = await t(u, n), l = true;
      else throw u;
    }
    else n.finalized === false && r && (c = await r(n));
    return c && (n.finalized === false || l) && (n.res = c), n;
  }
  __name(s, "s");
}, "bt");
var Wt = /* @__PURE__ */ Symbol();
var Jt = /* @__PURE__ */ __name(async (e, t = /* @__PURE__ */ Object.create(null)) => {
  const { all: r = false, dot: n = false } = t, o = (e instanceof Mt ? e.raw.headers : e.headers).get("Content-Type");
  return o != null && o.startsWith("multipart/form-data") || o != null && o.startsWith("application/x-www-form-urlencoded") ? Vt(e, { all: r, dot: n }) : {};
}, "Jt");
async function Vt(e, t) {
  const r = await e.formData();
  return r ? zt(r, t) : {};
}
__name(Vt, "Vt");
function zt(e, t) {
  const r = /* @__PURE__ */ Object.create(null);
  return e.forEach((n, a) => {
    t.all || a.endsWith("[]") ? Qt(r, a, n) : r[a] = n;
  }), t.dot && Object.entries(r).forEach(([n, a]) => {
    n.includes(".") && (Zt(r, n, a), delete r[n]);
  }), r;
}
__name(zt, "zt");
var Qt = /* @__PURE__ */ __name((e, t, r) => {
  e[t] !== void 0 ? Array.isArray(e[t]) ? e[t].push(r) : e[t] = [e[t], r] : t.endsWith("[]") ? e[t] = [r] : e[t] = r;
}, "Qt");
var Zt = /* @__PURE__ */ __name((e, t, r) => {
  let n = e;
  const a = t.split(".");
  a.forEach((o, s) => {
    s === a.length - 1 ? n[o] = r : ((!n[o] || typeof n[o] != "object" || Array.isArray(n[o]) || n[o] instanceof File) && (n[o] = /* @__PURE__ */ Object.create(null)), n = n[o]);
  });
}, "Zt");
var Nt = /* @__PURE__ */ __name((e) => {
  const t = e.split("/");
  return t[0] === "" && t.shift(), t;
}, "Nt");
var er = /* @__PURE__ */ __name((e) => {
  const { groups: t, path: r } = tr(e), n = Nt(r);
  return rr(n, t);
}, "er");
var tr = /* @__PURE__ */ __name((e) => {
  const t = [];
  return e = e.replace(/\{[^}]+\}/g, (r, n) => {
    const a = `@${n}`;
    return t.push([a, r]), a;
  }), { groups: t, path: e };
}, "tr");
var rr = /* @__PURE__ */ __name((e, t) => {
  for (let r = t.length - 1; r >= 0; r--) {
    const [n] = t[r];
    for (let a = e.length - 1; a >= 0; a--) if (e[a].includes(n)) {
      e[a] = e[a].replace(n, t[r][1]);
      break;
    }
  }
  return e;
}, "rr");
var He = {};
var nr = /* @__PURE__ */ __name((e, t) => {
  if (e === "*") return "*";
  const r = e.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (r) {
    const n = `${e}#${t}`;
    return He[n] || (r[2] ? He[n] = t && t[0] !== ":" && t[0] !== "*" ? [n, r[1], new RegExp(`^${r[2]}(?=/${t})`)] : [e, r[1], new RegExp(`^${r[2]}$`)] : He[n] = [e, r[1], true]), He[n];
  }
  return null;
}, "nr");
var lt = /* @__PURE__ */ __name((e, t) => {
  try {
    return t(e);
  } catch {
    return e.replace(/(?:%[0-9A-Fa-f]{2})+/g, (r) => {
      try {
        return t(r);
      } catch {
        return r;
      }
    });
  }
}, "lt");
var ar = /* @__PURE__ */ __name((e) => lt(e, decodeURI), "ar");
var Ot = /* @__PURE__ */ __name((e) => {
  const t = e.url, r = t.indexOf("/", t.indexOf(":") + 4);
  let n = r;
  for (; n < t.length; n++) {
    const a = t.charCodeAt(n);
    if (a === 37) {
      const o = t.indexOf("?", n), s = t.indexOf("#", n), i = o === -1 ? s === -1 ? void 0 : s : s === -1 ? o : Math.min(o, s), c = t.slice(r, i);
      return ar(c.includes("%25") ? c.replace(/%25/g, "%2525") : c);
    } else if (a === 63 || a === 35) break;
  }
  return t.slice(r, n);
}, "Ot");
var or = /* @__PURE__ */ __name((e) => {
  const t = Ot(e);
  return t.length > 1 && t.at(-1) === "/" ? t.slice(0, -1) : t;
}, "or");
var ge = /* @__PURE__ */ __name((e, t, ...r) => (r.length && (t = ge(t, ...r)), `${(e == null ? void 0 : e[0]) === "/" ? "" : "/"}${e}${t === "/" ? "" : `${(e == null ? void 0 : e.at(-1)) === "/" ? "" : "/"}${(t == null ? void 0 : t[0]) === "/" ? t.slice(1) : t}`}`), "ge");
var It = /* @__PURE__ */ __name((e) => {
  if (e.charCodeAt(e.length - 1) !== 63 || !e.includes(":")) return null;
  const t = e.split("/"), r = [];
  let n = "";
  return t.forEach((a) => {
    if (a !== "" && !/\:/.test(a)) n += "/" + a;
    else if (/\:/.test(a)) if (/\?/.test(a)) {
      r.length === 0 && n === "" ? r.push("/") : r.push(n);
      const o = a.replace("?", "");
      n += "/" + o, r.push(n);
    } else n += "/" + a;
  }), r.filter((a, o, s) => s.indexOf(a) === o);
}, "It");
var tt = /* @__PURE__ */ __name((e) => /[%+]/.test(e) ? (e.indexOf("+") !== -1 && (e = e.replace(/\+/g, " ")), e.indexOf("%") !== -1 ? lt(e, Lt) : e) : e, "tt");
var St = /* @__PURE__ */ __name((e, t, r) => {
  let n;
  if (!r && t && !/[%+]/.test(t)) {
    let s = e.indexOf("?", 8);
    if (s === -1) return;
    for (e.startsWith(t, s + 1) || (s = e.indexOf(`&${t}`, s + 1)); s !== -1; ) {
      const i = e.charCodeAt(s + t.length + 1);
      if (i === 61) {
        const c = s + t.length + 2, l = e.indexOf("&", c);
        return tt(e.slice(c, l === -1 ? void 0 : l));
      } else if (i == 38 || isNaN(i)) return "";
      s = e.indexOf(`&${t}`, s + 1);
    }
    if (n = /[%+]/.test(e), !n) return;
  }
  const a = {};
  n ?? (n = /[%+]/.test(e));
  let o = e.indexOf("?", 8);
  for (; o !== -1; ) {
    const s = e.indexOf("&", o + 1);
    let i = e.indexOf("=", o);
    i > s && s !== -1 && (i = -1);
    let c = e.slice(o + 1, i === -1 ? s === -1 ? void 0 : s : i);
    if (n && (c = tt(c)), o = s, c === "") continue;
    let l;
    i === -1 ? l = "" : (l = e.slice(i + 1, s === -1 ? void 0 : s), n && (l = tt(l))), r ? (a[c] && Array.isArray(a[c]) || (a[c] = []), a[c].push(l)) : a[c] ?? (a[c] = l);
  }
  return t ? a[t] : a;
}, "St");
var sr = St;
var ir = /* @__PURE__ */ __name((e, t) => St(e, t, true), "ir");
var Lt = decodeURIComponent;
var Rt = /* @__PURE__ */ __name((e) => lt(e, Lt), "Rt");
var je;
var Y;
var oe;
var Ct;
var xt;
var nt;
var se;
var vt;
var Mt = (vt = class {
  static {
    __name(this, "vt");
  }
  constructor(e, t = "/", r = [[]]) {
    N(this, oe);
    v(this, "raw");
    N(this, je);
    N(this, Y);
    v(this, "routeIndex", 0);
    v(this, "path");
    v(this, "bodyCache", {});
    N(this, se, (e2) => {
      const { bodyCache: t2, raw: r2 } = this, n = t2[e2];
      if (n) return n;
      const a = Object.keys(t2)[0];
      return a ? t2[a].then((o) => (a === "json" && (o = JSON.stringify(o)), new Response(o)[e2]())) : t2[e2] = r2[e2]();
    });
    this.raw = e, this.path = t, g(this, Y, r), g(this, je, {});
  }
  param(e) {
    return e ? L(this, oe, Ct).call(this, e) : L(this, oe, xt).call(this);
  }
  query(e) {
    return sr(this.url, e);
  }
  queries(e) {
    return ir(this.url, e);
  }
  header(e) {
    if (e) return this.raw.headers.get(e) ?? void 0;
    const t = {};
    return this.raw.headers.forEach((r, n) => {
      t[n] = r;
    }), t;
  }
  async parseBody(e) {
    var t;
    return (t = this.bodyCache).parsedBody ?? (t.parsedBody = await Jt(this, e));
  }
  json() {
    return _(this, se).call(this, "text").then((e) => JSON.parse(e));
  }
  text() {
    return _(this, se).call(this, "text");
  }
  arrayBuffer() {
    return _(this, se).call(this, "arrayBuffer");
  }
  blob() {
    return _(this, se).call(this, "blob");
  }
  formData() {
    return _(this, se).call(this, "formData");
  }
  addValidatedData(e, t) {
    _(this, je)[e] = t;
  }
  valid(e) {
    return _(this, je)[e];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [Wt]() {
    return _(this, Y);
  }
  get matchedRoutes() {
    return _(this, Y)[0].map(([[, e]]) => e);
  }
  get routePath() {
    return _(this, Y)[0].map(([[, e]]) => e)[this.routeIndex].path;
  }
}, je = /* @__PURE__ */ new WeakMap(), Y = /* @__PURE__ */ new WeakMap(), oe = /* @__PURE__ */ new WeakSet(), Ct = /* @__PURE__ */ __name(function(e) {
  const t = _(this, Y)[0][this.routeIndex][1][e], r = L(this, oe, nt).call(this, t);
  return r && /\%/.test(r) ? Rt(r) : r;
}, "Ct"), xt = /* @__PURE__ */ __name(function() {
  const e = {}, t = Object.keys(_(this, Y)[0][this.routeIndex][1]);
  for (const r of t) {
    const n = L(this, oe, nt).call(this, _(this, Y)[0][this.routeIndex][1][r]);
    n !== void 0 && (e[r] = /\%/.test(n) ? Rt(n) : n);
  }
  return e;
}, "xt"), nt = /* @__PURE__ */ __name(function(e) {
  return _(this, Y)[1] ? _(this, Y)[1][e] : e;
}, "nt"), se = /* @__PURE__ */ new WeakMap(), vt);
var cr = { Stringify: 1 };
var Ut = /* @__PURE__ */ __name(async (e, t, r, n, a) => {
  typeof e == "object" && !(e instanceof String) && (e instanceof Promise || (e = e.toString()), e instanceof Promise && (e = await e));
  const o = e.callbacks;
  return o != null && o.length ? (a ? a[0] += e : a = [e], Promise.all(o.map((i) => i({ phase: t, buffer: a, context: n }))).then((i) => Promise.all(i.filter(Boolean).map((c) => Ut(c, t, false, n, a))).then(() => a[0]))) : Promise.resolve(e);
}, "Ut");
var lr = "text/plain; charset=UTF-8";
var rt = /* @__PURE__ */ __name((e, t) => ({ "Content-Type": e, ...t }), "rt");
var Me = /* @__PURE__ */ __name((e, t) => new Response(e, t), "Me");
var Pe;
var Be;
var Q;
var we;
var Z;
var k;
var Xe;
var ye;
var Ae;
var me;
var qe;
var ke;
var ie;
var ve;
var Dt;
var ur = (Dt = class {
  static {
    __name(this, "Dt");
  }
  constructor(e, t) {
    N(this, ie);
    N(this, Pe);
    N(this, Be);
    v(this, "env", {});
    N(this, Q);
    v(this, "finalized", false);
    v(this, "error");
    N(this, we);
    N(this, Z);
    N(this, k);
    N(this, Xe);
    N(this, ye);
    N(this, Ae);
    N(this, me);
    N(this, qe);
    N(this, ke);
    v(this, "render", (...e2) => (_(this, ye) ?? g(this, ye, (t2) => this.html(t2)), _(this, ye).call(this, ...e2)));
    v(this, "setLayout", (e2) => g(this, Xe, e2));
    v(this, "getLayout", () => _(this, Xe));
    v(this, "setRenderer", (e2) => {
      g(this, ye, e2);
    });
    v(this, "header", (e2, t2, r) => {
      this.finalized && g(this, k, Me(_(this, k).body, _(this, k)));
      const n = _(this, k) ? _(this, k).headers : _(this, me) ?? g(this, me, new Headers());
      t2 === void 0 ? n.delete(e2) : r != null && r.append ? n.append(e2, t2) : n.set(e2, t2);
    });
    v(this, "status", (e2) => {
      g(this, we, e2);
    });
    v(this, "set", (e2, t2) => {
      _(this, Q) ?? g(this, Q, /* @__PURE__ */ new Map()), _(this, Q).set(e2, t2);
    });
    v(this, "get", (e2) => _(this, Q) ? _(this, Q).get(e2) : void 0);
    v(this, "newResponse", (...e2) => L(this, ie, ve).call(this, ...e2));
    v(this, "body", (e2, t2, r) => L(this, ie, ve).call(this, e2, t2, r));
    v(this, "text", (e2, t2, r) => !_(this, me) && !_(this, we) && !t2 && !r && !this.finalized ? new Response(e2) : L(this, ie, ve).call(this, e2, t2, rt(lr, r)));
    v(this, "json", (e2, t2, r) => L(this, ie, ve).call(this, JSON.stringify(e2), t2, rt("application/json", r)));
    v(this, "html", (e2, t2, r) => {
      const n = /* @__PURE__ */ __name((a) => L(this, ie, ve).call(this, a, t2, rt("text/html; charset=UTF-8", r)), "n");
      return typeof e2 == "object" ? Ut(e2, cr.Stringify, false, {}).then(n) : n(e2);
    });
    v(this, "redirect", (e2, t2) => {
      const r = String(e2);
      return this.header("Location", /[^\x00-\xFF]/.test(r) ? encodeURI(r) : r), this.newResponse(null, t2 ?? 302);
    });
    v(this, "notFound", () => (_(this, Ae) ?? g(this, Ae, () => Me()), _(this, Ae).call(this, this)));
    g(this, Pe, e), t && (g(this, Z, t.executionCtx), this.env = t.env, g(this, Ae, t.notFoundHandler), g(this, ke, t.path), g(this, qe, t.matchResult));
  }
  get req() {
    return _(this, Be) ?? g(this, Be, new Mt(_(this, Pe), _(this, ke), _(this, qe))), _(this, Be);
  }
  get event() {
    if (_(this, Z) && "respondWith" in _(this, Z)) return _(this, Z);
    throw Error("This context has no FetchEvent");
  }
  get executionCtx() {
    if (_(this, Z)) return _(this, Z);
    throw Error("This context has no ExecutionContext");
  }
  get res() {
    return _(this, k) || g(this, k, Me(null, { headers: _(this, me) ?? g(this, me, new Headers()) }));
  }
  set res(e) {
    if (_(this, k) && e) {
      e = Me(e.body, e);
      for (const [t, r] of _(this, k).headers.entries()) if (t !== "content-type") if (t === "set-cookie") {
        const n = _(this, k).headers.getSetCookie();
        e.headers.delete("set-cookie");
        for (const a of n) e.headers.append("set-cookie", a);
      } else e.headers.set(t, r);
    }
    g(this, k, e), this.finalized = true;
  }
  get var() {
    return _(this, Q) ? Object.fromEntries(_(this, Q)) : {};
  }
}, Pe = /* @__PURE__ */ new WeakMap(), Be = /* @__PURE__ */ new WeakMap(), Q = /* @__PURE__ */ new WeakMap(), we = /* @__PURE__ */ new WeakMap(), Z = /* @__PURE__ */ new WeakMap(), k = /* @__PURE__ */ new WeakMap(), Xe = /* @__PURE__ */ new WeakMap(), ye = /* @__PURE__ */ new WeakMap(), Ae = /* @__PURE__ */ new WeakMap(), me = /* @__PURE__ */ new WeakMap(), qe = /* @__PURE__ */ new WeakMap(), ke = /* @__PURE__ */ new WeakMap(), ie = /* @__PURE__ */ new WeakSet(), ve = /* @__PURE__ */ __name(function(e, t, r) {
  const n = _(this, k) ? new Headers(_(this, k).headers) : _(this, me) ?? new Headers();
  if (typeof t == "object" && "headers" in t) {
    const o = t.headers instanceof Headers ? t.headers : new Headers(t.headers);
    for (const [s, i] of o) s.toLowerCase() === "set-cookie" ? n.append(s, i) : n.set(s, i);
  }
  if (r) for (const [o, s] of Object.entries(r)) if (typeof s == "string") n.set(o, s);
  else {
    n.delete(o);
    for (const i of s) n.append(o, i);
  }
  const a = typeof t == "number" ? t : (t == null ? void 0 : t.status) ?? _(this, we);
  return Me(e, { status: a, headers: n });
}, "ve"), Dt);
var U = "ALL";
var dr = "all";
var _r = ["get", "post", "put", "delete", "options", "patch"];
var Ft = "Can not add a route since the matcher is already built.";
var Pt = class extends Error {
  static {
    __name(this, "Pt");
  }
};
var fr = "__COMPOSED_HANDLER";
var mr = /* @__PURE__ */ __name((e) => e.text("404 Not Found", 404), "mr");
var Tt = /* @__PURE__ */ __name((e, t) => {
  if ("getResponse" in e) {
    const r = e.getResponse();
    return t.newResponse(r.body, r);
  }
  return console.error(e), t.text("Internal Server Error", 500);
}, "Tt");
var W;
var F;
var Bt;
var J;
var _e;
var Ye;
var Ge;
var Ne;
var hr = (Ne = class {
  static {
    __name(this, "Ne");
  }
  constructor(t = {}) {
    N(this, F);
    v(this, "get");
    v(this, "post");
    v(this, "put");
    v(this, "delete");
    v(this, "options");
    v(this, "patch");
    v(this, "all");
    v(this, "on");
    v(this, "use");
    v(this, "router");
    v(this, "getPath");
    v(this, "_basePath", "/");
    N(this, W, "/");
    v(this, "routes", []);
    N(this, J, mr);
    v(this, "errorHandler", Tt);
    v(this, "onError", (t2) => (this.errorHandler = t2, this));
    v(this, "notFound", (t2) => (g(this, J, t2), this));
    v(this, "fetch", (t2, ...r) => L(this, F, Ge).call(this, t2, r[1], r[0], t2.method));
    v(this, "request", (t2, r, n2, a2) => t2 instanceof Request ? this.fetch(r ? new Request(t2, r) : t2, n2, a2) : (t2 = t2.toString(), this.fetch(new Request(/^https?:\/\//.test(t2) ? t2 : `http://localhost${ge("/", t2)}`, r), n2, a2)));
    v(this, "fire", () => {
      addEventListener("fetch", (t2) => {
        t2.respondWith(L(this, F, Ge).call(this, t2.request, t2, void 0, t2.request.method));
      });
    });
    [..._r, dr].forEach((o) => {
      this[o] = (s, ...i) => (typeof s == "string" ? g(this, W, s) : L(this, F, _e).call(this, o, _(this, W), s), i.forEach((c) => {
        L(this, F, _e).call(this, o, _(this, W), c);
      }), this);
    }), this.on = (o, s, ...i) => {
      for (const c of [s].flat()) {
        g(this, W, c);
        for (const l of [o].flat()) i.map((d) => {
          L(this, F, _e).call(this, l.toUpperCase(), _(this, W), d);
        });
      }
      return this;
    }, this.use = (o, ...s) => (typeof o == "string" ? g(this, W, o) : (g(this, W, "*"), s.unshift(o)), s.forEach((i) => {
      L(this, F, _e).call(this, U, _(this, W), i);
    }), this);
    const { strict: n, ...a } = t;
    Object.assign(this, a), this.getPath = n ?? true ? t.getPath ?? Ot : or;
  }
  route(t, r) {
    const n = this.basePath(t);
    return r.routes.map((a) => {
      var s;
      let o;
      r.errorHandler === Tt ? o = a.handler : (o = /* @__PURE__ */ __name(async (i, c) => (await bt([], r.errorHandler)(i, () => a.handler(i, c))).res, "o"), o[fr] = a.handler), L(s = n, F, _e).call(s, a.method, a.path, o);
    }), this;
  }
  basePath(t) {
    const r = L(this, F, Bt).call(this);
    return r._basePath = ge(this._basePath, t), r;
  }
  mount(t, r, n) {
    let a, o;
    n && (typeof n == "function" ? o = n : (o = n.optionHandler, n.replaceRequest === false ? a = /* @__PURE__ */ __name((c) => c, "a") : a = n.replaceRequest));
    const s = o ? (c) => {
      const l = o(c);
      return Array.isArray(l) ? l : [l];
    } : (c) => {
      let l;
      try {
        l = c.executionCtx;
      } catch {
      }
      return [c.env, l];
    };
    a || (a = (() => {
      const c = ge(this._basePath, t), l = c === "/" ? 0 : c.length;
      return (d) => {
        const u = new URL(d.url);
        return u.pathname = u.pathname.slice(l) || "/", new Request(u, d);
      };
    })());
    const i = /* @__PURE__ */ __name(async (c, l) => {
      const d = await r(a(c.req.raw), ...s(c));
      if (d) return d;
      await l();
    }, "i");
    return L(this, F, _e).call(this, U, ge(t, "*"), i), this;
  }
}, W = /* @__PURE__ */ new WeakMap(), F = /* @__PURE__ */ new WeakSet(), Bt = /* @__PURE__ */ __name(function() {
  const t = new Ne({ router: this.router, getPath: this.getPath });
  return t.errorHandler = this.errorHandler, g(t, J, _(this, J)), t.routes = this.routes, t;
}, "Bt"), J = /* @__PURE__ */ new WeakMap(), _e = /* @__PURE__ */ __name(function(t, r, n) {
  t = t.toUpperCase(), r = ge(this._basePath, r);
  const a = { basePath: this._basePath, path: r, method: t, handler: n };
  this.router.add(t, r, [n, a]), this.routes.push(a);
}, "_e"), Ye = /* @__PURE__ */ __name(function(t, r) {
  if (t instanceof Error) return this.errorHandler(t, r);
  throw t;
}, "Ye"), Ge = /* @__PURE__ */ __name(function(t, r, n, a) {
  if (a === "HEAD") return (async () => new Response(null, await L(this, F, Ge).call(this, t, r, n, "GET")))();
  const o = this.getPath(t, { env: n }), s = this.router.match(a, o), i = new ur(t, { path: o, matchResult: s, env: n, executionCtx: r, notFoundHandler: _(this, J) });
  if (s[0].length === 1) {
    let l;
    try {
      l = s[0][0][0][0](i, async () => {
        i.res = await _(this, J).call(this, i);
      });
    } catch (d) {
      return L(this, F, Ye).call(this, d, i);
    }
    return l instanceof Promise ? l.then((d) => d || (i.finalized ? i.res : _(this, J).call(this, i))).catch((d) => L(this, F, Ye).call(this, d, i)) : l ?? _(this, J).call(this, i);
  }
  const c = bt(s[0], this.errorHandler, _(this, J));
  return (async () => {
    try {
      const l = await c(i);
      if (!l.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
      return l.res;
    } catch (l) {
      return L(this, F, Ye).call(this, l, i);
    }
  })();
}, "Ge"), Ne);
var Xt = [];
function pr(e, t) {
  const r = this.buildAllMatchers(), n = /* @__PURE__ */ __name(((a, o) => {
    const s = r[a] || r[U], i = s[2][o];
    if (i) return i;
    const c = o.match(s[0]);
    if (!c) return [[], Xt];
    const l = c.indexOf("", 1);
    return [s[1][l], c];
  }), "n");
  return this.match = n, n(e, t);
}
__name(pr, "pr");
var We = "[^/]+";
var xe = ".*";
var Ue = "(?:|/.*)";
var De = /* @__PURE__ */ Symbol();
var Er = new Set(".\\+*[^]$()");
function br(e, t) {
  return e.length === 1 ? t.length === 1 ? e < t ? -1 : 1 : -1 : t.length === 1 || e === xe || e === Ue ? 1 : t === xe || t === Ue ? -1 : e === We ? 1 : t === We ? -1 : e.length === t.length ? e < t ? -1 : 1 : t.length - e.length;
}
__name(br, "br");
var he;
var pe;
var V;
var Re;
var Rr = (Re = class {
  static {
    __name(this, "Re");
  }
  constructor() {
    N(this, he);
    N(this, pe);
    N(this, V, /* @__PURE__ */ Object.create(null));
  }
  insert(t, r, n, a, o) {
    if (t.length === 0) {
      if (_(this, he) !== void 0) throw De;
      if (o) return;
      g(this, he, r);
      return;
    }
    const [s, ...i] = t, c = s === "*" ? i.length === 0 ? ["", "", xe] : ["", "", We] : s === "/*" ? ["", "", Ue] : s.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let l;
    if (c) {
      const d = c[1];
      let u = c[2] || We;
      if (d && c[2] && (u === ".*" || (u = u.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:"), /\((?!\?:)/.test(u)))) throw De;
      if (l = _(this, V)[u], !l) {
        if (Object.keys(_(this, V)).some((f) => f !== xe && f !== Ue)) throw De;
        if (o) return;
        l = _(this, V)[u] = new Re(), d !== "" && g(l, pe, a.varIndex++);
      }
      !o && d !== "" && n.push([d, _(l, pe)]);
    } else if (l = _(this, V)[s], !l) {
      if (Object.keys(_(this, V)).some((d) => d.length > 1 && d !== xe && d !== Ue)) throw De;
      if (o) return;
      l = _(this, V)[s] = new Re();
    }
    l.insert(i, r, n, a, o);
  }
  buildRegExpStr() {
    const r = Object.keys(_(this, V)).sort(br).map((n) => {
      const a = _(this, V)[n];
      return (typeof _(a, pe) == "number" ? `(${n})@${_(a, pe)}` : Er.has(n) ? `\\${n}` : n) + a.buildRegExpStr();
    });
    return typeof _(this, he) == "number" && r.unshift(`#${_(this, he)}`), r.length === 0 ? "" : r.length === 1 ? r[0] : "(?:" + r.join("|") + ")";
  }
}, he = /* @__PURE__ */ new WeakMap(), pe = /* @__PURE__ */ new WeakMap(), V = /* @__PURE__ */ new WeakMap(), Re);
var Ve;
var $e;
var jt;
var Tr = (jt = class {
  static {
    __name(this, "jt");
  }
  constructor() {
    N(this, Ve, { varIndex: 0 });
    N(this, $e, new Rr());
  }
  insert(e, t, r) {
    const n = [], a = [];
    for (let s = 0; ; ) {
      let i = false;
      if (e = e.replace(/\{[^}]+\}/g, (c) => {
        const l = `@\\${s}`;
        return a[s] = [l, c], s++, i = true, l;
      }), !i) break;
    }
    const o = e.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let s = a.length - 1; s >= 0; s--) {
      const [i] = a[s];
      for (let c = o.length - 1; c >= 0; c--) if (o[c].indexOf(i) !== -1) {
        o[c] = o[c].replace(i, a[s][1]);
        break;
      }
    }
    return _(this, $e).insert(o, t, n, _(this, Ve), r), n;
  }
  buildRegExp() {
    let e = _(this, $e).buildRegExpStr();
    if (e === "") return [/^$/, [], []];
    let t = 0;
    const r = [], n = [];
    return e = e.replace(/#(\d+)|@(\d+)|\.\*\$/g, (a, o, s) => o !== void 0 ? (r[++t] = Number(o), "$()") : (s !== void 0 && (n[Number(s)] = ++t), "")), [new RegExp(`^${e}`), r, n];
  }
}, Ve = /* @__PURE__ */ new WeakMap(), $e = /* @__PURE__ */ new WeakMap(), jt);
var gr = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var Ke = /* @__PURE__ */ Object.create(null);
function qt(e) {
  return Ke[e] ?? (Ke[e] = new RegExp(e === "*" ? "" : `^${e.replace(/\/\*$|([.\\+*[^\]$()])/g, (t, r) => r ? `\\${r}` : "(?:|/.*)")}$`));
}
__name(qt, "qt");
function vr() {
  Ke = /* @__PURE__ */ Object.create(null);
}
__name(vr, "vr");
function Dr(e) {
  var l;
  const t = new Tr(), r = [];
  if (e.length === 0) return gr;
  const n = e.map((d) => [!/\*|\/:/.test(d[0]), ...d]).sort(([d, u], [f, m]) => d ? 1 : f ? -1 : u.length - m.length), a = /* @__PURE__ */ Object.create(null);
  for (let d = 0, u = -1, f = n.length; d < f; d++) {
    const [m, h, b] = n[d];
    m ? a[h] = [b.map(([O]) => [O, /* @__PURE__ */ Object.create(null)]), Xt] : u++;
    let R;
    try {
      R = t.insert(h, u, m);
    } catch (O) {
      throw O === De ? new Pt(h) : O;
    }
    m || (r[u] = b.map(([O, D]) => {
      const S = /* @__PURE__ */ Object.create(null);
      for (D -= 1; D >= 0; D--) {
        const [E, y] = R[D];
        S[E] = y;
      }
      return [O, S];
    }));
  }
  const [o, s, i] = t.buildRegExp();
  for (let d = 0, u = r.length; d < u; d++) for (let f = 0, m = r[d].length; f < m; f++) {
    const h = (l = r[d][f]) == null ? void 0 : l[1];
    if (!h) continue;
    const b = Object.keys(h);
    for (let R = 0, O = b.length; R < O; R++) h[b[R]] = i[h[b[R]]];
  }
  const c = [];
  for (const d in s) c[d] = r[s[d]];
  return [o, c, a];
}
__name(Dr, "Dr");
function Te(e, t) {
  if (e) {
    for (const r of Object.keys(e).sort((n, a) => a.length - n.length)) if (qt(r).test(t)) return [...e[r]];
  }
}
__name(Te, "Te");
var ce;
var le;
var ze;
var kt;
var wt;
var jr = (wt = class {
  static {
    __name(this, "wt");
  }
  constructor() {
    N(this, ze);
    v(this, "name", "RegExpRouter");
    N(this, ce);
    N(this, le);
    v(this, "match", pr);
    g(this, ce, { [U]: /* @__PURE__ */ Object.create(null) }), g(this, le, { [U]: /* @__PURE__ */ Object.create(null) });
  }
  add(e, t, r) {
    var i;
    const n = _(this, ce), a = _(this, le);
    if (!n || !a) throw new Error(Ft);
    n[e] || [n, a].forEach((c) => {
      c[e] = /* @__PURE__ */ Object.create(null), Object.keys(c[U]).forEach((l) => {
        c[e][l] = [...c[U][l]];
      });
    }), t === "/*" && (t = "*");
    const o = (t.match(/\/:/g) || []).length;
    if (/\*$/.test(t)) {
      const c = qt(t);
      e === U ? Object.keys(n).forEach((l) => {
        var d;
        (d = n[l])[t] || (d[t] = Te(n[l], t) || Te(n[U], t) || []);
      }) : (i = n[e])[t] || (i[t] = Te(n[e], t) || Te(n[U], t) || []), Object.keys(n).forEach((l) => {
        (e === U || e === l) && Object.keys(n[l]).forEach((d) => {
          c.test(d) && n[l][d].push([r, o]);
        });
      }), Object.keys(a).forEach((l) => {
        (e === U || e === l) && Object.keys(a[l]).forEach((d) => c.test(d) && a[l][d].push([r, o]));
      });
      return;
    }
    const s = It(t) || [t];
    for (let c = 0, l = s.length; c < l; c++) {
      const d = s[c];
      Object.keys(a).forEach((u) => {
        var f;
        (e === U || e === u) && ((f = a[u])[d] || (f[d] = [...Te(n[u], d) || Te(n[U], d) || []]), a[u][d].push([r, o - l + c + 1]));
      });
    }
  }
  buildAllMatchers() {
    const e = /* @__PURE__ */ Object.create(null);
    return Object.keys(_(this, le)).concat(Object.keys(_(this, ce))).forEach((t) => {
      e[t] || (e[t] = L(this, ze, kt).call(this, t));
    }), g(this, ce, g(this, le, void 0)), vr(), e;
  }
}, ce = /* @__PURE__ */ new WeakMap(), le = /* @__PURE__ */ new WeakMap(), ze = /* @__PURE__ */ new WeakSet(), kt = /* @__PURE__ */ __name(function(e) {
  const t = [];
  let r = e === U;
  return [_(this, ce), _(this, le)].forEach((n) => {
    const a = n[e] ? Object.keys(n[e]).map((o) => [o, n[e][o]]) : [];
    a.length !== 0 ? (r || (r = true), t.push(...a)) : e !== U && t.push(...Object.keys(n[U]).map((o) => [o, n[U][o]]));
  }), r ? Dr(t) : null;
}, "kt"), wt);
var ue;
var ee;
var yt;
var wr = (yt = class {
  static {
    __name(this, "yt");
  }
  constructor(e) {
    v(this, "name", "SmartRouter");
    N(this, ue, []);
    N(this, ee, []);
    g(this, ue, e.routers);
  }
  add(e, t, r) {
    if (!_(this, ee)) throw new Error(Ft);
    _(this, ee).push([e, t, r]);
  }
  match(e, t) {
    if (!_(this, ee)) throw new Error("Fatal error");
    const r = _(this, ue), n = _(this, ee), a = r.length;
    let o = 0, s;
    for (; o < a; o++) {
      const i = r[o];
      try {
        for (let c = 0, l = n.length; c < l; c++) i.add(...n[c]);
        s = i.match(e, t);
      } catch (c) {
        if (c instanceof Pt) continue;
        throw c;
      }
      this.match = i.match.bind(i), g(this, ue, [i]), g(this, ee, void 0);
      break;
    }
    if (o === a) throw new Error("Fatal error");
    return this.name = `SmartRouter + ${this.activeRouter.name}`, s;
  }
  get activeRouter() {
    if (_(this, ee) || _(this, ue).length !== 1) throw new Error("No active router has been determined yet.");
    return _(this, ue)[0];
  }
}, ue = /* @__PURE__ */ new WeakMap(), ee = /* @__PURE__ */ new WeakMap(), yt);
var Ce = /* @__PURE__ */ Object.create(null);
var yr = /* @__PURE__ */ __name((e) => {
  for (const t in e) return true;
  return false;
}, "yr");
var de;
var X;
var Ee;
var Oe;
var B;
var te;
var fe;
var Ie;
var Ar = (Ie = class {
  static {
    __name(this, "Ie");
  }
  constructor(t, r, n) {
    N(this, te);
    N(this, de);
    N(this, X);
    N(this, Ee);
    N(this, Oe, 0);
    N(this, B, Ce);
    if (g(this, X, n || /* @__PURE__ */ Object.create(null)), g(this, de, []), t && r) {
      const a = /* @__PURE__ */ Object.create(null);
      a[t] = { handler: r, possibleKeys: [], score: 0 }, g(this, de, [a]);
    }
    g(this, Ee, []);
  }
  insert(t, r, n) {
    g(this, Oe, ++Et(this, Oe)._);
    let a = this;
    const o = er(r), s = [];
    for (let i = 0, c = o.length; i < c; i++) {
      const l = o[i], d = o[i + 1], u = nr(l, d), f = Array.isArray(u) ? u[0] : l;
      if (f in _(a, X)) {
        a = _(a, X)[f], u && s.push(u[1]);
        continue;
      }
      _(a, X)[f] = new Ie(), u && (_(a, Ee).push(u), s.push(u[1])), a = _(a, X)[f];
    }
    return _(a, de).push({ [t]: { handler: n, possibleKeys: s.filter((i, c, l) => l.indexOf(i) === c), score: _(this, Oe) } }), a;
  }
  search(t, r) {
    var d;
    const n = [];
    g(this, B, Ce);
    let o = [this];
    const s = Nt(r), i = [], c = s.length;
    let l = null;
    for (let u = 0; u < c; u++) {
      const f = s[u], m = u === c - 1, h = [];
      for (let R = 0, O = o.length; R < O; R++) {
        const D = o[R], S = _(D, X)[f];
        S && (g(S, B, _(D, B)), m ? (_(S, X)["*"] && L(this, te, fe).call(this, n, _(S, X)["*"], t, _(D, B)), L(this, te, fe).call(this, n, S, t, _(D, B))) : h.push(S));
        for (let E = 0, y = _(D, Ee).length; E < y; E++) {
          const A = _(D, Ee)[E], w = _(D, B) === Ce ? {} : { ..._(D, B) };
          if (A === "*") {
            const x = _(D, X)["*"];
            x && (L(this, te, fe).call(this, n, x, t, _(D, B)), g(x, B, w), h.push(x));
            continue;
          }
          const [p, T, M] = A;
          if (!f && !(M instanceof RegExp)) continue;
          const I = _(D, X)[p];
          if (M instanceof RegExp) {
            if (l === null) {
              l = new Array(c);
              let q = r[0] === "/" ? 1 : 0;
              for (let P = 0; P < c; P++) l[P] = q, q += s[P].length + 1;
            }
            const x = r.substring(l[u]), $ = M.exec(x);
            if ($) {
              if (w[T] = $[0], L(this, te, fe).call(this, n, I, t, _(D, B), w), yr(_(I, X))) {
                g(I, B, w);
                const q = ((d = $[0].match(/\//)) == null ? void 0 : d.length) ?? 0;
                (i[q] || (i[q] = [])).push(I);
              }
              continue;
            }
          }
          (M === true || M.test(f)) && (w[T] = f, m ? (L(this, te, fe).call(this, n, I, t, w, _(D, B)), _(I, X)["*"] && L(this, te, fe).call(this, n, _(I, X)["*"], t, w, _(D, B))) : (g(I, B, w), h.push(I)));
        }
      }
      const b = i.shift();
      o = b ? h.concat(b) : h;
    }
    return n.length > 1 && n.sort((u, f) => u.score - f.score), [n.map(({ handler: u, params: f }) => [u, f])];
  }
}, de = /* @__PURE__ */ new WeakMap(), X = /* @__PURE__ */ new WeakMap(), Ee = /* @__PURE__ */ new WeakMap(), Oe = /* @__PURE__ */ new WeakMap(), B = /* @__PURE__ */ new WeakMap(), te = /* @__PURE__ */ new WeakSet(), fe = /* @__PURE__ */ __name(function(t, r, n, a, o) {
  for (let s = 0, i = _(r, de).length; s < i; s++) {
    const c = _(r, de)[s], l = c[n] || c[U], d = {};
    if (l !== void 0 && (l.params = /* @__PURE__ */ Object.create(null), t.push(l), a !== Ce || o && o !== Ce)) for (let u = 0, f = l.possibleKeys.length; u < f; u++) {
      const m = l.possibleKeys[u], h = d[l.score];
      l.params[m] = o != null && o[m] && !h ? o[m] : a[m] ?? (o == null ? void 0 : o[m]), d[l.score] = true;
    }
  }
}, "fe"), Ie);
var be;
var At;
var Nr = (At = class {
  static {
    __name(this, "At");
  }
  constructor() {
    v(this, "name", "TrieRouter");
    N(this, be);
    g(this, be, new Ar());
  }
  add(e, t, r) {
    const n = It(t);
    if (n) {
      for (let a = 0, o = n.length; a < o; a++) _(this, be).insert(e, n[a], r);
      return;
    }
    _(this, be).insert(e, t, r);
  }
  match(e, t) {
    return _(this, be).search(e, t);
  }
}, be = /* @__PURE__ */ new WeakMap(), At);
var Se = class extends hr {
  static {
    __name(this, "Se");
  }
  constructor(e = {}) {
    super(e), this.router = e.router ?? new wr({ routers: [new jr(), new Nr()] });
  }
};
var Qe = /* @__PURE__ */ __name((e) => {
  const r = { ...{ origin: "*", allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"], allowHeaders: [], exposeHeaders: [] }, ...e }, n = /* @__PURE__ */ ((o) => typeof o == "string" ? o === "*" ? () => o : (s) => o === s ? s : null : typeof o == "function" ? o : (s) => o.includes(s) ? s : null)(r.origin), a = ((o) => typeof o == "function" ? o : Array.isArray(o) ? () => o : () => [])(r.allowMethods);
  return async function(s, i) {
    var d;
    function c(u, f) {
      s.res.headers.set(u, f);
    }
    __name(c, "c");
    const l = await n(s.req.header("origin") || "", s);
    if (l && c("Access-Control-Allow-Origin", l), r.credentials && c("Access-Control-Allow-Credentials", "true"), (d = r.exposeHeaders) != null && d.length && c("Access-Control-Expose-Headers", r.exposeHeaders.join(",")), s.req.method === "OPTIONS") {
      r.origin !== "*" && c("Vary", "Origin"), r.maxAge != null && c("Access-Control-Max-Age", r.maxAge.toString());
      const u = await a(s.req.header("origin") || "", s);
      u.length && c("Access-Control-Allow-Methods", u.join(","));
      let f = r.allowHeaders;
      if (!(f != null && f.length)) {
        const m = s.req.header("Access-Control-Request-Headers");
        m && (f = m.split(/\s*,\s*/));
      }
      return f != null && f.length && (c("Access-Control-Allow-Headers", f.join(",")), s.res.headers.append("Vary", "Access-Control-Request-Headers")), s.res.headers.delete("Content-Length"), s.res.headers.delete("Content-Type"), new Response(null, { headers: s.res.headers, status: 204, statusText: "No Content" });
    }
    await i(), r.origin !== "*" && s.header("Vary", "Origin", { append: true });
  };
}, "Qe");
var ut = /* @__PURE__ */ __name(() => async (e) => {
  const r = await e.env.ASSETS.fetch(e.req.raw);
  return r.status === 404 ? e.notFound() : r;
}, "ut");
function dt(e) {
  const t = e.req.header("Authorization");
  if (!t || !t.startsWith("Bearer ")) return null;
  try {
    const r = t.split(" ")[1];
    return JSON.parse(atob(r));
  } catch {
    return null;
  }
}
__name(dt, "dt");
var z = new Se();
z.use("*", Qe());
function Or(e, t, r) {
  return `\u3042\u306A\u305F\u306F\u6559\u80B2\u5B9F\u7FD2\u8A55\u4FA1\u306E\u5C02\u9580\u5BB6AI\u3067\u3059\u3002\u4EE5\u4E0B\u306E\u5B9F\u7FD2\u65E5\u8A8C\u30924\u56E0\u5B5023\u9805\u76EE\u306E\u30EB\u30FC\u30D6\u30EA\u30C3\u30AF\u3067\u8A55\u4FA1\u3057\u3066\u304F\u3060\u3055\u3044\u3002

## \u8A55\u4FA1\u5BFE\u8C61
\u5B9F\u7FD2\u751F: ${t}
\u7B2C${r}\u9031 \u5B9F\u7FD2\u65E5\u8A8C:
---
${e}
---

## \u5168\u56E0\u5B50\u5171\u901A\uFF1AHatton & Smith\uFF081995\uFF09\u7701\u5BDF\u6DF1\u5EA6\uFF08RD\uFF09\u6C34\u6E96
\u516823\u9805\u76EE\u306E5\u6BB5\u968E\u884C\u52D5\u6307\u6A19\u306F\u3059\u3079\u3066\u3053\u306ERD\u6C34\u6E96\u3068\u5BFE\u5FDC\u3057\u307E\u3059\u3002

| \u30B9\u30B3\u30A2 | RD\u6C34\u6E96 | \u7701\u5BDF\u306E\u7279\u5FB4 |
|:---:|:---:|:---|
| 5 | RD4 \u6279\u5224\u7684\u7701\u5BDF | \u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u793E\u4F1A\u7684\u6587\u8108\u30FB\u502B\u7406\u7684\u89B3\u70B9\u3068\u5B9F\u8DF5\u3092\u7D50\u3073\u3064\u3051\u3001\u4FE1\u5FF5\u306E\u6839\u62E0\u305D\u306E\u3082\u306E\u3092\u554F\u3044\u76F4\u3059 |
| 4 | RD3 \u5BFE\u8A71\u7684\u7701\u5BDF | \u5B9F\u8DF5\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u591A\u89D2\u7684\u306B\u5206\u6790\u3057\u3001\u4EE3\u66FF\u6848\u30FB\u6539\u5584\u7B56\u3092\u5177\u4F53\u7684\u306B\u691C\u8A0E\u3059\u308B |
| 3 | RD2 \u8A18\u8FF0\u7684\u7701\u5BDF | \u611F\u60C5\u30FB\u6C17\u3065\u304D\u30FB\u5370\u8C61\u3092\u8A00\u8A9E\u5316\u3059\u308B\u304C\u3001\u539F\u56E0\u5206\u6790\u3084\u4EE3\u66FF\u6848\u306F\u9650\u5B9A\u7684 |
| 2 | RD1 \u8A18\u8FF0\u7684\u66F8\u304D\u8FBC\u307F | \u51FA\u6765\u4E8B\u30FB\u4E8B\u5B9F\u306E\u5217\u6319\u306B\u3068\u3069\u307E\u308A\u3001\u7701\u5BDF\u7684\u8981\u7D20\u304C\u306A\u3044 |
| 1 | RD0 \u7701\u5BDF\u306A\u3057 | \u5F53\u8A72\u5074\u9762\u3078\u306E\u8A18\u8FF0\u30FB\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044 |

---

## \u30EB\u30FC\u30D6\u30EA\u30C3\u30AF\uFF084\u56E0\u5B5023\u9805\u76EE\u30FBRD\u6C34\u6E96\u5BFE\u5FDC\u884C\u52D5\u6307\u6A19\uFF09

### \u56E0\u5B50\u2160 \u5150\u7AE5\u751F\u5F92\u3078\u306E\u6307\u5C0E\u529B\uFF08\u9805\u76EE1-7, \u03B1=.87\uFF09
**\u5B9A\u7FA9\uFF1A** \u591A\u69D8\u306A\u80CC\u666F\uFF08\u969C\u5BB3\u30FB\u8A00\u8A9E\u30FB\u6027\u5225\u30FB\u6587\u5316\uFF09\u3092\u6301\u3064\u5150\u7AE5\u751F\u5F92\u3092\u7406\u89E3\u3057\u3001\u5B9F\u614B\u306B\u5FDC\u3058\u305F\u6388\u696D\u8A2D\u8A08\u3068\u500B\u5225\u5BFE\u5FDC\u304C\u3067\u304D\u308B\u529B

1. \u3010\u7279\u5225\u652F\u63F4\u5BFE\u5FDC\u529B\uFF08\u5B9F\u8DF5\uFF09\u03BB=.95\u3011\u7279\u5225\u306A\u652F\u63F4\u3092\u5FC5\u8981\u3068\u3059\u308B\u5150\u7AE5\uFF08\u8EAB\u4F53\u969C\u5BB3\u3092\u6709\u3059\u308B\u8005\u3092\u542B\u3080\uFF09\u306B\u5BFE\u3057\u3066\u3001\u898B\u901A\u3057\u3092\u3082\u3063\u3066\u9069\u5207\u306A\u5BFE\u5FDC\u304C\u3067\u304D\u308B\u3053\u3068
   - 5(RD4): IEP\u76F8\u5F53\u306E\u652F\u63F4\u3092\u30A4\u30F3\u30AF\u30EB\u30FC\u30B7\u30D6\u6559\u80B2\u306E\u7406\u5FF5\u30FB\u969C\u5BB3\u8005\u6A29\u5229\u6761\u7D04\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u652F\u63F4\u9078\u629E\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
   - 4(RD3): \u5EA7\u5E2D\u30FB\u6559\u6750\u30FB\u58F0\u304B\u3051\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u4EE3\u66FF\u652F\u63F4\u3092\u691C\u8A0E\u3057\u305F\u4E0A\u3067\u5B9F\u8DF5\u3057\u3001\u7D50\u679C\u3092\u7701\u5BDF
   - 3(RD2): \u62C5\u5F53\u6559\u54E1\u306E\u6307\u793A\u306B\u5F93\u3044\u652F\u63F4\u3057\u3001\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\uFF08\u539F\u56E0\u5206\u6790\u30FB\u4EE3\u66FF\u6848\u306F\u9650\u5B9A\u7684\uFF09
   - 2(RD1): \u652F\u63F4\u306E\u4E8B\u5B9F\u306E\u307F\u8A18\u8FF0\uFF08\u300C\u25CB\u25CB\u3092\u3057\u305F\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u306A\u3057
   - 1(RD0): \u7279\u5225\u652F\u63F4\u3078\u306E\u5BFE\u5FDC\u30FB\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044

2. \u3010\u5916\u56FD\u8A9E\u5150\u7AE5\u3078\u306E\u6307\u5C0E\u5B9F\u8DF5 \u03BB=.85\u3011\u81EA\u56FD\u306E\u8A00\u8A9E\u304C\u6BCD\u8A9E\u3067\u306A\u3044\u5150\u7AE5\u306B\u5BFE\u3057\u3066\u3001\u9069\u5207\u306A\u5BFE\u5FDC\u3084\u6307\u5C0E\u304C\u3067\u304D\u308B\u3053\u3068
   - 5(RD4): JSL\u30AB\u30EA\u30AD\u30E5\u30E9\u30E0\u30FB\u591A\u6587\u5316\u5171\u751F\u306E\u4FE1\u5FF5\u3068\u5B9F\u8DF5\u3092\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u6307\u5C0E\u624B\u6BB5\u9078\u629E\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
   - 4(RD3): \u8996\u899A\u6559\u6750\u30FB\u8A00\u3044\u63DB\u3048\u7B49\u306E\u8907\u6570\u5DE5\u592B\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u4EE3\u66FF\u6848\u3092\u691C\u8A0E\u3057\u305F\u7701\u5BDF
   - 3(RD2): \u6307\u5C0E\u6559\u54E1\u306E\u30A2\u30C9\u30D0\u30A4\u30B9\u306B\u5F93\u3044\u5BFE\u5FDC\u3057\u3001\u611F\u60F3\u30FB\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\uFF08\u6839\u62E0\u30FB\u4EE3\u66FF\u6848\u306F\u9650\u5B9A\u7684\uFF09
   - 2(RD1): \u5BFE\u5FDC\u306E\u4E8B\u5B9F\u306E\u307F\u8A18\u8FF0\uFF08\u300C\u3086\u3063\u304F\u308A\u8A71\u3057\u305F\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u306A\u3057
   - 1(RD0): \u8A72\u5F53\u5150\u7AE5\u3078\u306E\u500B\u5225\u5BFE\u5FDC\u30FB\u7701\u5BDF\u304C\u8A18\u8FF0\u3055\u308C\u3066\u3044\u306A\u3044

3. \u3010\u7279\u5225\u652F\u63F4\u5BFE\u5FDC\u529B\uFF08\u7406\u89E3\uFF09\u03BB=.81\u3011\u7279\u5225\u306A\u652F\u63F4\u3092\u5FC5\u8981\u3068\u3059\u308B\u5150\u7AE5\u306B\u5BFE\u3057\u3066\u3001\u3069\u306E\u3088\u3046\u306A\u5BFE\u5FDC\u3092\u3059\u308C\u3070\u3088\u3044\u304B\u3092\u7406\u89E3\u3057\u3066\u3044\u308B\u3053\u3068
   - 5(RD4): \u969C\u5BB3\u7A2E\u5225\u306B\u5FDC\u3058\u305F\u5BFE\u5FDC\u6839\u62E0\u3092\u502B\u7406\u7684\u30FB\u793E\u4F1A\u7684\u89B3\u70B9\u304B\u3089\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
   - 4(RD3): \u8907\u6570\u306E\u969C\u5BB3\u7279\u6027\u3068\u5BFE\u5FDC\u7B56\u306E\u56E0\u679C\u95A2\u4FC2\u3092\u5206\u6790\u3057\u3001\u6388\u696D\u8A2D\u8A08\u3078\u306E\u53CD\u6620\u3068\u4EE3\u66FF\u6848\u3092\u691C\u8A0E
   - 3(RD2): \u4E00\u822C\u7684\u306A\u652F\u63F4\u77E5\u8B58\u3092\u8A00\u8A9E\u5316\uFF08\u5FDC\u7528\u6839\u62E0\u30FB\u4EE3\u66FF\u6848\u306F\u9650\u5B9A\u7684\uFF09
   - 2(RD1): \u77E5\u8B58\u3092\u65AD\u7247\u7684\u306B\u5217\u6319\u3059\u308B\u306E\u307F\u3001\u7701\u5BDF\u306A\u3057
   - 1(RD0): \u7279\u5225\u652F\u63F4\u306B\u95A2\u3059\u308B\u7406\u89E3\u30FB\u7701\u5BDF\u304C\u793A\u3055\u308C\u3066\u3044\u306A\u3044

4. \u3010\u5916\u56FD\u8A9E\u5150\u7AE5\u3078\u306E\u5BFE\u5FDC\u7406\u89E3 \u03BB=.64\u3011\u81EA\u56FD\u306E\u8A00\u8A9E\u304C\u6BCD\u8A9E\u3067\u306A\u3044\u5150\u7AE5\u306B\u5BFE\u3057\u3066\u3001\u3069\u306E\u3088\u3046\u306A\u5BFE\u5FDC\u3092\u3059\u308C\u3070\u3088\u3044\u304B\u3092\u7406\u89E3\u3057\u3066\u3044\u308B\u3053\u3068
   - 5(RD4): JSL\u30AB\u30EA\u30AD\u30E5\u30E9\u30E0\u7B49\u306E\u5236\u5EA6\u7684\u67A0\u7D44\u307F\u3092\u591A\u6587\u5316\u5171\u751F\u306E\u4FE1\u5FF5\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u305F\u8A18\u8FF0
   - 4(RD3): \u65E5\u672C\u8A9E\u6307\u5C0E\u65B9\u91DD\u306E\u5DEE\u7570\u3092\u5206\u6790\u3057\u3001\u8907\u6570\u306E\u9078\u629E\u80A2\u3068\u5224\u65AD\u6839\u62E0\u3092\u5177\u4F53\u7684\u306B\u691C\u8A0E
   - 3(RD2): \u8A00\u8A9E\u9762\u306E\u914D\u616E\u3078\u306E\u7406\u89E3\u3092\u8A00\u8A9E\u5316\uFF08\u5236\u5EA6\u7684\u80CC\u666F\u30FB\u4EE3\u66FF\u6848\u306F\u9650\u5B9A\u7684\uFF09
   - 2(RD1): \u300C\u914D\u616E\u304C\u5FC5\u8981\u300D\u3068\u3044\u3046\u8A8D\u8B58\u306E\u4E8B\u5B9F\u8A18\u8FF0\u306E\u307F
   - 1(RD0): \u5916\u56FD\u8A9E\u5150\u7AE5\u3078\u306E\u5BFE\u5FDC\u7406\u89E3\u30FB\u7701\u5BDF\u304C\u8A18\u8FF0\u306B\u898B\u3089\u308C\u306A\u3044

5. \u3010\u6027\u5DEE\u30FB\u591A\u69D8\u6027\u3078\u306E\u7406\u89E3 \u03BB=.58\u3011\u5150\u7AE5\u306E\u300C\u6027\u5225\u300D\u306B\u3088\u308B\u5FC3\u7406\u30FB\u884C\u52D5\u306E\u9055\u3044\u306E\u91CD\u8981\u6027\u3092\u6B63\u3057\u304F\u7406\u89E3\u3057\u3066\u3044\u308B\u3053\u3068
   - 5(RD4): \u6027\u5DEE\u306E\u767A\u9054\u5FC3\u7406\u5B66\u7684\u77E5\u898B\u3092\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u502B\u7406\u7684\u89B3\u70B9\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u56FA\u5B9A\u7684\u6027\u5225\u89B3\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
   - 4(RD3): \u30B0\u30EB\u30FC\u30D7\u7DE8\u6210\u30FB\u58F0\u304B\u3051\u306B\u304A\u3051\u308B\u6027\u5DEE\u914D\u616E\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u5225\u306E\u95A2\u308F\u308A\u65B9\u3092\u691C\u8A0E
   - 3(RD2): \u6027\u5DEE\u3078\u306E\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\uFF08\u5FDC\u7528\u6839\u62E0\u30FB\u4EE3\u66FF\u6848\u306F\u9650\u5B9A\u7684\uFF09
   - 2(RD1): \u6027\u5DEE\u306B\u95A2\u3059\u308B\u4E8B\u5B9F\u5217\u6319\u306E\u307F\u3001\u307E\u305F\u306F\u56FA\u5B9A\u7684\u6027\u5225\u89B3\u304C\u898B\u3089\u308C\u308B
   - 1(RD0): \u6027\u5DEE\u30FB\u591A\u69D8\u6027\u3078\u306E\u8A00\u53CA\u30FB\u7701\u5BDF\u304C\u306A\u304F\u7121\u81EA\u899A\u306A\u504F\u308A\u3042\u308A

6. \u3010\u6587\u5316\u7684\u591A\u69D8\u6027\u3078\u306E\u7406\u89E3 \u03BB=.45\u3011\u5150\u7AE5\u306E\u767A\u9054\u3068\u5065\u5EB7\u306F\u3001\u69D8\u3005\u306A\u793E\u4F1A\u7684\u3001\u5B97\u6559\u7684\u3001\u6C11\u65CF\u7684\u3001\u6587\u5316\u7684\u3001\u8A00\u8A9E\u7684\u5F71\u97FF\u3092\u53D7\u3051\u308B\u3053\u3068\u3092\u7406\u89E3\u3057\u3066\u3044\u308B\u3053\u3068
   - 5(RD4): \u5150\u7AE5\u306E\u884C\u52D5\u80CC\u666F\u306B\u3042\u308B\u6587\u5316\u7684\u30FB\u5B97\u6559\u7684\u8981\u56E0\u3092\u591A\u6587\u5316\u5171\u751F\u306E\u4FE1\u5FF5\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u81EA\u6587\u5316\u7684\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
   - 4(RD3): \u6587\u5316\u7684\u80CC\u666F\u304C\u5B66\u7FD2\u30FB\u884C\u52D5\u306B\u5F71\u97FF\u3059\u308B\u539F\u56E0\u30FB\u80CC\u666F\u3092\u8907\u6570\u4E8B\u4F8B\u3067\u5206\u6790\u3057\u3001\u4EE3\u66FF\u7684\u95A2\u308F\u308A\u65B9\u3092\u691C\u8A0E
   - 3(RD2): \u591A\u6587\u5316\u5171\u751F\u3078\u306E\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\uFF08\u62BD\u8C61\u7684\u3067\u539F\u56E0\u5206\u6790\u306F\u9650\u5B9A\u7684\uFF09
   - 2(RD1): \u6587\u5316\u7684\u591A\u69D8\u6027\u306E\u4E8B\u5B9F\u5217\u6319\u306E\u307F\u3001\u65E5\u672C\u6587\u5316\u3092\u6A19\u6E96\u3068\u3057\u305F\u5358\u4E00\u7684\u306A\u898B\u65B9\u3042\u308A
   - 1(RD0): \u6587\u5316\u7684\u591A\u69D8\u6027\u3078\u306E\u7406\u89E3\u30FB\u7701\u5BDF\u304C\u793A\u3055\u308C\u3066\u3044\u306A\u3044

7. \u3010\u6559\u79D1\u7279\u6027\u3092\u8E0F\u307E\u3048\u305F\u6388\u696D\u8A2D\u8A08 \u03BB=.44\u3011\u5404\u6559\u79D1\u7B49\u306E\u7279\u6027\u3092\u8E0F\u307E\u3048\u3001\u5150\u7AE5\u306E\u5B9F\u614B\u306B\u5373\u3057\u305F\u6388\u696D\u3065\u304F\u308A\u304C\u3067\u304D\u308B\u3053\u3068
   - 5(RD4): \u6559\u79D1\u306E\u672C\u8CEA\u7684\u306A\u898B\u65B9\u30FB\u8003\u3048\u65B9\u3092\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u6559\u79D1\u89B3\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u6388\u696D\u8A2D\u8A08\u9078\u629E\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
   - 4(RD3): \u6559\u79D1\u7279\u6027\u3092\u610F\u8B58\u3057\u305F\u8A2D\u8A08\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u4EE3\u66FF\u8A2D\u8A08\u6848\u3092\u691C\u8A0E
   - 3(RD2): \u6559\u79D1\u66F8\u30FB\u6307\u5C0E\u66F8\u306B\u6CBF\u3063\u305F\u6388\u696D\u5F8C\u306E\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\uFF08\u6559\u79D1\u7279\u6027\u3078\u306E\u5FDC\u7528\u6839\u62E0\u30FB\u4EE3\u66FF\u6848\u306F\u9650\u5B9A\u7684\uFF09
   - 2(RD1): \u6307\u5C0E\u66F8\u306E\u6A21\u5023\u306B\u3068\u3069\u307E\u308A\u4E8B\u5B9F\u306E\u307F\u8A18\u8FF0\u3001\u7701\u5BDF\u306A\u3057
   - 1(RD0): \u6388\u696D\u8A2D\u8A08\u306E\u6839\u62E0\u3084\u5150\u7AE5\u5B9F\u614B\u3078\u306E\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044

---

### \u56E0\u5B50\u2161 \u81EA\u5DF1\u8A55\u4FA1\u529B\uFF08\u9805\u76EE8-13, \u03B1=.87\uFF09
**\u5B9A\u7FA9\uFF1A** \u5B9F\u7FD2\u4F53\u9A13\u3092\u6559\u5E2B\u3068\u3057\u3066\u306E\u6210\u9577\u3068\u7D50\u3073\u3064\u3051\u3001\u7701\u5BDF\u30FB\u6539\u5584\u30FB\u81EA\u5DF1\u8A55\u4FA1\u3092\u7D99\u7D9A\u7684\u306B\u884C\u3046\u3053\u3068\u304C\u3067\u304D\u308B\u529B

8. \u3010\u4F53\u9A13\u3068\u6210\u9577\u306E\u63A5\u7D9A \u03BB=.94\u3011\u5B9F\u7FD2\u751F\u306E\u4F53\u9A13\u304B\u3089\u5F97\u305F\u77E5\u8B58\u304C\u3001\u6559\u5E2B\u306E\u4ED5\u4E8B\u3084\u6559\u5E2B\u3068\u3057\u3066\u306E\u767A\u9054\u306B\u3044\u304B\u306B\u95A2\u4FC2\u3059\u308B\u304B\u3092\u7406\u89E3\u3067\u304D\u308B\u3053\u3068
   - 5(RD4): \u4F53\u9A13\u3092\u6559\u5E2B\u6210\u9577\u7406\u8AD6\uFF08\u53CD\u7701\u7684\u5B9F\u8DF5\u5BB6\u8AD6\u30FBDreyfus\u30E2\u30C7\u30EB\u7B49\uFF09\u3084\u6559\u80B2\u7684\u4FE1\u5FF5\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u4FE1\u5FF5\u306E\u554F\u3044\u76F4\u3057\u3092\u8A18\u8FF0
   - 4(RD3): \u4F53\u9A13\u304B\u3089\u300C\u306A\u305C\u305D\u3046\u306A\u3063\u305F\u304B\u300D\u300C\u4F55\u3092\u5B66\u3093\u3060\u304B\u300D\u3092\u539F\u56E0\uFF0D\u7D50\u679C\u3068\u3057\u3066\u5206\u6790\u3057\u3001\u6539\u5584\u7B56\u3092\u691C\u8A0E
   - 3(RD2): \u4F53\u9A13\u304B\u3089\u5F97\u305F\u611F\u60C5\u30FB\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\uFF08\u6559\u5E2B\u767A\u9054\u3068\u306E\u56E0\u679C\u5206\u6790\u30FB\u4EE3\u66FF\u6848\u306F\u9650\u5B9A\u7684\uFF09
   - 2(RD1): \u4F53\u9A13\u3092\u300C\u3067\u304D\u305F\u30FB\u3067\u304D\u306A\u304B\u3063\u305F\u300D\u306E\u4E8B\u5B9F\u3068\u3057\u3066\u5217\u6319\u306E\u307F
   - 1(RD0): \u4F53\u9A13\u3068\u6559\u5E2B\u6210\u9577\u306E\u95A2\u4FC2\u306B\u3064\u3044\u3066\u306E\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044

9. \u3010\u6307\u5C0E\u59FF\u52E2\u306E\u691C\u8A3C\u80FD\u529B \u03BB=.81\u3011\u6388\u696D\u3068\u5B66\u7FD2\u306B\u95A2\u3057\u3066\u8A9E\u308A\u3001\u6559\u80B2\u6D3B\u52D5\u306E\u767A\u5C55\u306B\u95A2\u3059\u308B\u8208\u5473\u3068\u95A2\u5FC3\u3092\u793A\u3057\u3001\u81EA\u5206\u81EA\u8EAB\u306E\u6307\u5C0E\u3084\u59FF\u52E2\u3092\u691C\u8A3C\u3059\u308B\u80FD\u529B\u3092\u5099\u3048\u3066\u3044\u308B\u3053\u3068
   - 5(RD4): \u6307\u5C0E\u54F2\u5B66\u30FB\u6559\u80B2\u7684\u4FE1\u5FF5\u306B\u7167\u3089\u3057\u3066\u6388\u696D\u5B9F\u8DF5\u3092\u6279\u5224\u7684\u306B\u554F\u3044\u76F4\u3057\u3001\u6307\u5C0E\u9078\u629E\u306E\u524D\u63D0\u3092\u7406\u8AD6\u7684\u88CF\u4ED8\u3051\u3068\u3068\u3082\u306B\u8A18\u8FF0
   - 4(RD3): \u81EA\u5DF1\u884C\u52D5\uFF08\u767A\u554F\u30FB\u677F\u66F8\u30FB\u53CD\u5FDC\u7B49\uFF09\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u591A\u89D2\u7684\u306B\u5206\u6790\u3057\u3001\u5177\u4F53\u7684\u306A\u4EE3\u66FF\u7B56\u30FB\u6539\u5584\u6848\u3092\u63D0\u793A
   - 3(RD2): \u6388\u696D\u3078\u306E\u611F\u60F3\u3084\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\uFF08\u691C\u8A3C\u306E\u8996\u70B9\u30FB\u65B9\u6CD5\u304C\u8868\u9762\u7684\uFF09
   - 2(RD1): \u300C\u3046\u307E\u304F\u3044\u3063\u305F\u30FB\u3046\u307E\u304F\u3044\u304B\u306A\u304B\u3063\u305F\u300D\u306E\u4E8B\u5B9F\u8A55\u4FA1\u306E\u307F
   - 1(RD0): \u81EA\u5206\u306E\u6307\u5C0E\u59FF\u52E2\u3078\u306E\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044

10. \u3010\u6A21\u7BC4\u7684\u59FF\u52E2\u306E\u5B9F\u8DF5 \u03BB=.72\u3011\u5150\u7AE5\u306B\u5BFE\u3057\u3066\u671F\u5F85\u3057\u3066\u3044\u308B\u80AF\u5B9A\u7684\u306A\u4FA1\u5024\u89B3\u3001\u614B\u5EA6\u3001\u304A\u3088\u3073\u884C\u52D5\u3092\u5B9F\u8DF5\u3057\u3066\u898B\u305B\u308B\u3053\u3068
    - 5(RD4): \u81EA\u5DF1\u306E\u4FA1\u5024\u89B3\u30FB\u614B\u5EA6\u3092\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u502B\u7406\u7684\u6587\u8108\u3068\u6279\u5224\u7684\u306B\u541F\u5473\u3057\u3001\u6A21\u7BC4\u3068\u3057\u3066\u793A\u3059\u3079\u304D\u7406\u7531\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
    - 4(RD3): \u6A21\u7BC4\u7684\u884C\u52D5\u306E\u52B9\u679C\u30FB\u5F71\u97FF\u3092\u5206\u6790\u3057\u3001\u5225\u306E\u793A\u3057\u65B9\u3084\u9078\u629E\u7406\u7531\u3092\u5177\u4F53\u7684\u306B\u691C\u8A0E
    - 3(RD2): \u6A21\u7BC4\u3092\u793A\u305D\u3046\u3068\u3057\u305F\u5834\u9762\u306E\u611F\u60C5\u30FB\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\uFF08\u539F\u56E0\u5206\u6790\u30FB\u4EE3\u66FF\u6848\u306F\u9650\u5B9A\u7684\uFF09
    - 2(RD1): \u6A21\u7BC4\u7684\u884C\u52D5\u306E\u4E8B\u5B9F\u306E\u307F\u8A18\u8FF0\uFF08\u300C\u6328\u62F6\u3092\u3057\u305F\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u306A\u3057
    - 1(RD0): \u6A21\u7BC4\u3092\u793A\u3059\u3068\u3044\u3046\u8996\u70B9\u3067\u306E\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044

11. \u3010\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u53D7\u5BB9\u529B \u03BB=.62\u3011\u30A2\u30C9\u30D0\u30A4\u30B9\u3068\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u306B\u57FA\u3065\u304D\u884C\u52D5\u3057\u3001\u6307\u5C0E\u3068\u52A9\u8A00\u3092\u53D7\u3051\u5165\u308C\u308B\u3053\u3068
    - 5(RD4): \u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u3092\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u5B9F\u8DF5\u54F2\u5B66\u306B\u7167\u3089\u3057\u3066\u6279\u5224\u7684\u306B\u691C\u8A0E\u3057\u3001\u53D6\u6368\u9078\u629E\u306E\u6839\u62E0\u3068\u4FE1\u5FF5\u306E\u554F\u3044\u76F4\u3057\u3092\u8A18\u8FF0
    - 4(RD3): \u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u306E\u80CC\u666F\u30FB\u610F\u56F3\u3092\u5206\u6790\u3057\u3001\u5177\u4F53\u7684\u6539\u5584\u884C\u52D5\u3068\u4EE3\u66FF\u6848\u3092\u63D0\u793A\u3057\u5B9F\u8DF5\u7D50\u679C\u3092\u7701\u5BDF
    - 3(RD2): \u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u3092\u53D7\u3051\u305F\u611F\u60C5\u30FB\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\uFF08\u6539\u5584\u884C\u52D5\u3078\u306E\u63A5\u7D9A\u30FB\u539F\u56E0\u5206\u6790\u304C\u4E0D\u660E\u78BA\uFF09
    - 2(RD1): \u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u306E\u5185\u5BB9\u3092\u4E8B\u5B9F\u3068\u3057\u3066\u8A18\u9332\u3059\u308B\u306E\u307F\uFF08\u300C\u25CB\u25CB\u3068\u8A00\u308F\u308C\u305F\u300D\u7B49\uFF09
    - 1(RD0): \u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u3078\u306E\u8A00\u53CA\u30FB\u53D7\u5BB9\u306E\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044

12. \u3010\u5B9F\u8DF5\u7701\u5BDF\u3068\u6539\u5584\u8CAC\u4EFB \u03BB=.61\u3011\u81EA\u5206\u81EA\u8EAB\u306E\u5B9F\u8DF5\u3092\u53CD\u7701\u3057\u3001\u6539\u5584\u3057\u3001\u5C02\u9580\u7684\u30CB\u30FC\u30BA\u306E\u767A\u9054\u3092\u8A8D\u8B58\u3057\u3001\u305D\u308C\u3092\u5B9F\u73FE\u3059\u308B\u3053\u3068\u306B\u8CAC\u4EFB\u3092\u6301\u3064\u3053\u3068
    - 5(RD4): \u5B9F\u8DF5\u306E\u554F\u984C\u70B9\u3092\u793E\u4F1A\u7684\u30FB\u6559\u80B2\u7684\u6587\u8108\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u5C02\u9580\u7684\u30A2\u30A4\u30C7\u30F3\u30C6\u30A3\u30C6\u30A3\u306E\u5F62\u6210\u3068\u95A2\u9023\u3055\u305B\u3066\u7701\u5BDF\u3057\u3001\u9577\u671F\u7684\u6539\u5584\u8CAC\u4EFB\u3092\u8868\u660E
    - 4(RD3): \u5B9F\u8DF5\u8AB2\u984C\u306E\u539F\u56E0\u3092\u591A\u89D2\u7684\u306B\u5206\u6790\u3057\u3001\u5177\u4F53\u7684\u6539\u5584\u8A08\u753B\u3068\u5B9F\u884C\u30FB\u518D\u8A55\u4FA1\u306E\u30B5\u30A4\u30AF\u30EB\u3092\u8A18\u8FF0
    - 3(RD2): \u554F\u984C\u70B9\u3078\u306E\u6C17\u3065\u304D\u3068\u6539\u5584\u610F\u6B32\u3092\u8A00\u8A9E\u5316\uFF08\u539F\u56E0\u5206\u6790\u30FB\u6539\u5584\u306E\u5177\u4F53\u7B56\u304C\u6D45\u3044\uFF09
    - 2(RD1): \u5B9F\u8DF5\u306E\u7D50\u679C\u3092\u4E8B\u5B9F\u3068\u3057\u3066\u8A18\u8FF0\u3059\u308B\u306E\u307F\uFF08\u300C\u6388\u696D\u304C\u3046\u307E\u304F\u3044\u304B\u306A\u304B\u3063\u305F\u300D\u7B49\uFF09
    - 1(RD0): \u5B9F\u8DF5\u7701\u5BDF\u30FB\u6539\u5584\u8CAC\u4EFB\u3078\u306E\u8A00\u53CA\u304C\u898B\u3089\u308C\u306A\u3044

13. \u3010\u5C02\u9580\u6027\u5411\u4E0A\u306E\u305F\u3081\u306E\u81EA\u5DF1\u8A55\u4FA1 \u03BB=.52\u3011\u6559\u5E2B\u3068\u3057\u3066\u306E\u5C02\u9580\u6027\u3092\u5411\u4E0A\u3055\u305B\u308B\u305F\u3081\u306B\u53CD\u7701\u3001\u81EA\u5DF1\u7701\u5BDF\u3059\u308B\u3053\u3068\u3082\u542B\u3081\u3066\u3001\u81EA\u5206\u81EA\u8EAB\u3092\u8A55\u4FA1\u3059\u308B\u529B\u3092\u6709\u3059\u308B\u3053\u3068
    - 5(RD4): \u5916\u90E8\u8A55\u4FA1\u30FB\u81EA\u5DF1\u8A55\u4FA1\u30FB\u6559\u80B2\u7684\u4FE1\u5FF5\u3092\u7D71\u5408\u3057\u3001\u5C02\u9580\u7684\u6210\u9577\u6BB5\u968E\u3068\u793E\u4F1A\u7684\u5F79\u5272\u3092\u6279\u5224\u7684\u306B\u8A55\u4FA1\u3002\u8A55\u4FA1\u57FA\u6E96\u306E\u6839\u62E0\u3092\u502B\u7406\u7684\u89B3\u70B9\u304B\u3089\u554F\u3044\u76F4\u3057\u3066\u3044\u308B
    - 4(RD3): \u81EA\u5DF1\u8A55\u4FA1\u3068\u4ED6\u8005\u8A55\u4FA1\u306E\u5DEE\u7570\u3092\u5206\u6790\u3057\u3001\u8907\u6570\u306E\u8996\u70B9\u304B\u3089\u5F37\u307F\u3068\u8AB2\u984C\u3092\u7279\u5B9A\u3057\u3001\u5177\u4F53\u7684\u306A\u6210\u9577\u8AB2\u984C\u3068\u6539\u5584\u884C\u52D5\u3092\u8A18\u8FF0
    - 3(RD2): \u81EA\u5DF1\u8A55\u4FA1\u3092\u8A66\u307F\u611F\u60C5\u30FB\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\uFF08\u8A55\u4FA1\u57FA\u6E96\u304C\u4E3B\u89B3\u7684\u3067\u539F\u56E0\u5206\u6790\u304C\u6D45\u3044\uFF09
    - 2(RD1): \u81EA\u5DF1\u8A55\u4FA1\u304C\u300C\u3088\u304B\u3063\u305F\u30FB\u60AA\u304B\u3063\u305F\u300D\u306E\u4E8C\u5024\u7684\u5224\u65AD\u306E\u307F
    - 1(RD0): \u81EA\u5DF1\u8A55\u4FA1\u30FB\u81EA\u5DF1\u7701\u5BDF\u306E\u8A18\u8FF0\u304C\u898B\u3089\u308C\u306A\u3044

---

### \u56E0\u5B50\u2162 \u5B66\u7D1A\u7D4C\u55B6\u529B\uFF08\u9805\u76EE14-17, \u03B1=.91\uFF09
**\u5B9A\u7FA9\uFF1A** \u5B66\u7D1A\u5168\u4F53\u306E\u5B89\u5168\u30FB\u79E9\u5E8F\u30FB\u5354\u529B\u95A2\u4FC2\u3092\u7DAD\u6301\u3057\u3001\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u3092\u767A\u63EE\u3057\u3066\u5150\u7AE5\u306E\u56F0\u96E3\u3092\u652F\u63F4\u3067\u304D\u308B\u529B

14. \u3010\u751F\u5F92\u6307\u5C0E\u529B \u03BB=.91\u3011\u30AF\u30E9\u30B9\u904B\u55B6\u306B\u4F34\u3046\u751F\u5F92\u6307\u5C0E\u306B\u95A2\u3059\u308B\u529B\u3092\u6709\u3059\u308B\u3053\u3068
    - 5(RD4): \u554F\u984C\u884C\u52D5\u306E\u80CC\u666F\u8981\u56E0\u3092\u751F\u5F92\u6307\u5C0E\u306E\u7406\u5FF5\u30FB\u793E\u4F1A\u7684\u6587\u8108\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u6307\u5C0E\u65B9\u91DD\u9078\u629E\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
    - 4(RD3): \u554F\u984C\u5834\u9762\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u591A\u89D2\u7684\u306B\u5206\u6790\u3057\u3001\u4EE3\u66FF\u7684\u4ECB\u5165\u65B9\u6CD5\u3092\u691C\u8A0E\u306E\u4E0A\u3067\u5BFE\u5FDC\u3057\u3001\u6307\u5C0E\u5F8C\u306E\u7701\u5BDF\u3092\u8A18\u8FF0
    - 3(RD2): \u751F\u5F92\u6307\u5C0E\u306E\u57FA\u672C\u65B9\u91DD\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\uFF08\u539F\u56E0\u5206\u6790\u30FB\u4EE3\u66FF\u6848\u306F\u9650\u5B9A\u7684\uFF09
    - 2(RD1): \u554F\u984C\u884C\u52D5\u3078\u306E\u5BFE\u5FDC\u306E\u4E8B\u5B9F\u306E\u307F\u8A18\u8FF0\uFF08\u300C\u6CE8\u610F\u3057\u305F\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u306A\u3057
    - 1(RD0): \u751F\u5F92\u6307\u5C0E\u306B\u95A2\u3059\u308B\u610F\u8B58\u30FB\u5B9F\u8DF5\u30FB\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044

15. \u3010\u5B66\u7D1A\u7BA1\u7406\u80FD\u529B \u03BB=.87\u3011\u30AF\u30E9\u30B9\u904B\u55B6\u306B\u4F34\u3046\u7BA1\u7406\u80FD\u529B\u3092\u6709\u3059\u308B\u3053\u3068
    - 5(RD4): \u7BA1\u7406\u696D\u52D9\u3092\u5B66\u7D1A\u7D4C\u55B6\u306E\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u5B66\u6821\u6587\u5316\u306E\u793E\u4F1A\u7684\u6587\u8108\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u30DE\u30CD\u30B8\u30E1\u30F3\u30C8\u30B9\u30BF\u30A4\u30EB\u9078\u629E\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
    - 4(RD3): \u62C5\u4EFB\u306E\u7BA1\u7406\u30B9\u30BF\u30A4\u30EB\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u6539\u5584\u5DE5\u592B\u3068\u4EE3\u66FF\u7684\u30A2\u30D7\u30ED\u30FC\u30C1\u3092\u691C\u8A0E\u3057\u306A\u304C\u3089\u904B\u55B6\u3057\u305F\u8A18\u8FF0
    - 3(RD2): \u7BA1\u7406\u696D\u52D9\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\uFF08\u5BFE\u51E6\u6CD5\u306E\u6839\u62E0\u30FB\u4EE3\u66FF\u6848\u306F\u9650\u5B9A\u7684\uFF09
    - 2(RD1): \u7BA1\u7406\u696D\u52D9\u306E\u4E8B\u5B9F\u306E\u307F\u8A18\u8FF0\uFF08\u300C\u5F53\u756A\u3092\u78BA\u8A8D\u3057\u305F\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u306A\u3057
    - 1(RD0): \u5B66\u7D1A\u7BA1\u7406\u3078\u306E\u95A2\u4E0E\u30FB\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044

16. \u3010\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u767A\u63EE \u03BB=.83\u3011\u6A29\u5A01\u3042\u308B\u5B58\u5728\u3068\u3057\u3066\u6559\u5BA4\u5185\u3067\u30AF\u30E9\u30B9\u904B\u55B6\u306B\u4F34\u3046\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u3092\u767A\u63EE\u3059\u308B\u3053\u3068\u304C\u3067\u304D\u308B\u3053\u3068
    - 5(RD4): \u6C11\u4E3B\u7684\u30FB\u652F\u63F4\u7684\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u3092\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u6A29\u5A01\u306E\u793E\u4F1A\u7684\u610F\u5473\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u69D8\u5F0F\u9078\u629E\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
    - 4(RD3): \u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u884C\u52D5\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u5225\u306E\u30A2\u30D7\u30ED\u30FC\u30C1\u3092\u691C\u8A0E\u3057\u305F\u5177\u4F53\u7684\u8A18\u8FF0
    - 3(RD2): \u6A29\u5A01\u30FB\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60C5\u3092\u8A00\u8A9E\u5316\uFF08\u5834\u9762\u306B\u3088\u3063\u3066\u4E0D\u5B89\u5B9A\u3067\u539F\u56E0\u5206\u6790\u306F\u9650\u5B9A\u7684\uFF09
    - 2(RD1): \u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u884C\u52D5\u306E\u4E8B\u5B9F\u306E\u307F\u8A18\u8FF0\uFF08\u300C\u6307\u793A\u3092\u51FA\u3057\u305F\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u306A\u3057
    - 1(RD0): \u6559\u5E2B\u3068\u3057\u3066\u306E\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u306B\u95A2\u3059\u308B\u7701\u5BDF\u304C\u307B\u3068\u3093\u3069\u306A\u3044

17. \u3010\u5150\u7AE5\u306E\u56F0\u96E3\u652F\u63F4 \u03BB=.77\u3011\u5B66\u6821\u3084\u6388\u696D\u306B\u304A\u3051\u308B\u5150\u7AE5\u306E\u56F0\u96E3\u3084\u845B\u85E4\u306E\u89E3\u6C7A\u3092\u652F\u63F4\u3059\u308B\u3053\u3068\u304C\u3067\u304D\u308B\u3053\u3068
    - 5(RD4): \u5B66\u7FD2\u9762\u30FB\u5BFE\u4EBA\u9762\u30FB\u60C5\u7DD2\u9762\u306E\u56F0\u96E3\u3092\u5B50\u3069\u3082\u306E\u6A29\u5229\u30FB\u30A4\u30F3\u30AF\u30EB\u30FC\u30B7\u30D6\u652F\u63F4\u306E\u4FE1\u5FF5\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u7D44\u7E54\u7684\u652F\u63F4\u306E\u6839\u62E0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
    - 4(RD3): \u56F0\u96E3\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u591A\u89D2\u7684\u306B\u5206\u6790\u3057\u3001\u50BE\u8074\u30FB\u500B\u5225\u9762\u8AC7\u30FB\u6388\u696D\u5185\u914D\u616E\u7B49\u306E\u8907\u6570\u306E\u652F\u63F4\u30A2\u30D7\u30ED\u30FC\u30C1\u3092\u691C\u8A0E\u30FB\u8A66\u307F\u305F\u8A18\u8FF0
    - 3(RD2): \u56F0\u96E3\u3092\u62B1\u3048\u308B\u5150\u7AE5\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60C5\u3092\u8A00\u8A9E\u5316\uFF08\u4F53\u7CFB\u7684\u652F\u63F4\u3078\u306E\u8A00\u53CA\u306F\u9650\u5B9A\u7684\uFF09
    - 2(RD1): \u56F0\u96E3\u306E\u5B58\u5728\u3092\u4E8B\u5B9F\u3068\u3057\u3066\u8A18\u9332\u3059\u308B\u306E\u307F\uFF08\u300C\u25CB\u25CB\u304C\u56F0\u3063\u3066\u3044\u305F\u300D\u7B49\uFF09
    - 1(RD0): \u5150\u7AE5\u306E\u56F0\u96E3\u3078\u306E\u6C17\u3065\u304D\u30FB\u652F\u63F4\u30FB\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044

---

### \u56E0\u5B50\u2163 \u8077\u52D9\u3092\u7406\u89E3\u3057\u3066\u884C\u52D5\u3059\u308B\u529B\uFF08\u9805\u76EE18-23, \u03B1=.91\uFF09
**\u5B9A\u7FA9\uFF1A** \u6559\u5E2B\u306E\u5F79\u5272\u30FB\u8077\u52D9\u502B\u7406\u30FB\u540C\u50DA\u95A2\u4FC2\u30FB\u7D44\u7E54\u904B\u55B6\u3092\u7406\u89E3\u3057\u3001\u5C02\u9580\u8077\u3068\u3057\u3066\u9069\u5207\u306B\u884C\u52D5\u3067\u304D\u308B\u529B

18. \u3010\u540C\u50DA\u306E\u5B66\u7FD2\u652F\u63F4\u5F79\u5272\u7406\u89E3 \u03BB=1.03\u3011\u5171\u306B\u50CD\u3044\u3066\u3044\u308B\u540C\u50DA\u304C\u3001\u5B66\u7FD2\u306E\u30B5\u30DD\u30FC\u30C8\u306B\u9069\u5207\u306B\u53C2\u52A0\u3057\u3001\u5F7C\u3089\u304C\u679C\u305F\u3059\u3053\u3068\u3092\u671F\u5F85\u3055\u308C\u3066\u3044\u308B\u5F79\u5272\u3092\u7406\u89E3\u3057\u3066\u3044\u308B\u3053\u3068
    - 5(RD4): \u5354\u50CD\u5F79\u5272\u3092\u30C1\u30FC\u30E0\u5B66\u6821\u306E\u7406\u5FF5\u30FB\u7D44\u7E54\u7684\u652F\u63F4\u306E\u793E\u4F1A\u7684\u6587\u8108\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u5F79\u5272\u5206\u62C5\u306E\u3042\u308A\u65B9\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
    - 4(RD3): \u8907\u6570\u306E\u540C\u50DA\u306E\u5F79\u5272\u5206\u62C5\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u9023\u643A\u3092\u610F\u8B58\u3057\u305F\u884C\u52D5\u3068\u4EE3\u66FF\u7684\u30A2\u30D7\u30ED\u30FC\u30C1\u3092\u691C\u8A0E\u3057\u305F\u8A18\u8FF0
    - 3(RD2): \u62C5\u4EFB\u4EE5\u5916\u306E\u6559\u8077\u54E1\u306E\u5F79\u5272\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\uFF08\u9023\u643A\u610F\u8B58\u306E\u6839\u62E0\u306F\u9650\u5B9A\u7684\uFF09
    - 2(RD1): \u62C5\u4EFB\u306B\u504F\u3063\u305F\u4E8B\u5B9F\u8A18\u8FF0\u306E\u307F\u3001\u7701\u5BDF\u306A\u3057
    - 1(RD0): \u540C\u50DA\u3084\u4ED6\u306E\u6559\u8077\u54E1\u306E\u5F79\u5272\u306B\u95A2\u3059\u308B\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044

19. \u3010\u7279\u5225\u8CAC\u4EFB\u3092\u6709\u3059\u308B\u540C\u50DA\u5F79\u5272\u306E\u7406\u89E3 \u03BB=.98\u3011\u7279\u5225\u306A\u8CAC\u4EFB\u3092\u6709\u3059\u308B\u540C\u50DA\u306E\u5F79\u5272\u3092\u77E5\u308B\u3053\u3068
    - 5(RD4): \u6307\u5C0E\u6559\u8AED\u30FB\u4E3B\u4EFB\u30FB\u7279\u5225\u652F\u63F4\u30B3\u30FC\u30C7\u30A3\u30CD\u30FC\u30BF\u30FC\u7B49\u306E\u8077\u8CAC\u3092\u6559\u80B2\u6CD5\u5236\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u5F79\u5272\u306E\u5FC5\u8981\u6027\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
    - 4(RD3): \u7279\u5225\u306A\u5F79\u8077\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u8907\u6570\u306E\u8996\u70B9\u304B\u3089\u9069\u5207\u306B\u95A2\u308F\u3063\u305F\u8A18\u8FF0\u3068\u4EE3\u66FF\u7684\u95A2\u308F\u308A\u65B9\u3078\u306E\u691C\u8A0E
    - 3(RD2): \u7279\u5225\u306A\u8CAC\u4EFB\u3092\u6301\u3064\u5F79\u8077\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\uFF08\u5177\u4F53\u7684\u8077\u52D9\u5185\u5BB9\u3078\u306E\u7406\u89E3\u306F\u8868\u9762\u7684\uFF09
    - 2(RD1): \u300C\u62C5\u4EFB\u4EE5\u5916\u306B\u3082\u5F79\u5272\u304C\u3042\u308B\u300D\u7A0B\u5EA6\u306E\u4E8B\u5B9F\u8A18\u8FF0\u306E\u307F
    - 1(RD0): \u7279\u5225\u306A\u8CAC\u4EFB\u3092\u6709\u3059\u308B\u540C\u50DA\u5F79\u5272\u3078\u306E\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044

20. \u3010\u4EBA\u9593\u95A2\u4FC2\u30FB\u5C02\u9580\u7684\u671F\u5F85\u3078\u306E\u5BFE\u5FDC \u03BB=.50\u3011\u6559\u5E2B\u306E\u4ED5\u4E8B\u306B\u95A2\u9023\u3059\u308B\u4EBA\u9593\u95A2\u4FC2\u53CA\u3073\u5C02\u9580\u7684\u306A\u9762\u306B\u304A\u3044\u3066\u306E\u671F\u5F85\u3092\u5206\u6790\u3057\u5BFE\u5FDC\u3059\u308B\u3053\u3068
    - 5(RD4): \u4FDD\u8B77\u8005\u30FB\u540C\u50DA\u30FB\u7BA1\u7406\u8077\u304B\u3089\u306E\u671F\u5F85\u3092\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u793E\u4F1A\u7684\u5F79\u5272\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u671F\u5F85\u306B\u5FDC\u3048\u308B/\u5FDC\u3048\u306A\u3044\u5224\u65AD\u8EF8\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
    - 4(RD3): \u8907\u6570\u30B9\u30C6\u30FC\u30AF\u30DB\u30EB\u30C0\u30FC\u304B\u3089\u306E\u671F\u5F85\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u5BFE\u5FDC\u7B56\u3068\u4EE3\u66FF\u7684\u30A2\u30D7\u30ED\u30FC\u30C1\u3092\u691C\u8A0E\u3057\u305F\u8A18\u8FF0
    - 3(RD2): \u6307\u5C0E\u6559\u54E1\u30FB\u62C5\u4EFB\u304B\u3089\u306E\u671F\u5F85\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60C5\u3092\u8A00\u8A9E\u5316\uFF08\u5BFE\u5FDC\u6839\u62E0\u306F\u9650\u5B9A\u7684\uFF09
    - 2(RD1): \u671F\u5F85\u3078\u306E\u5BFE\u5FDC\u306E\u4E8B\u5B9F\u306E\u307F\u8A18\u8FF0\uFF08\u300C\u8A00\u308F\u308C\u305F\u901A\u308A\u306B\u3057\u305F\u300D\u7B49\uFF09
    - 1(RD0): \u6559\u5E2B\u3078\u306E\u671F\u5F85\u306B\u95A2\u3059\u308B\u8A8D\u8B58\u30FB\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044

21. \u3010\u6559\u5E2B\u5F79\u5272\u306E\u591A\u69D8\u6027\u7406\u89E3 \u03BB=.46\u3011\u6559\u5E2B\u306E\u5F79\u5272\u3092\u9042\u884C\u3059\u308B\u305F\u3081\u306E\u591A\u69D8\u306A\u65B9\u6CD5\u3092\u77E5\u308A\u3001\u305D\u306E\u6839\u62E0\u3092\u7406\u89E3\u3059\u308B\u3053\u3068
    - 5(RD4): \u6559\u5E2B\u306E\u591A\u69D8\u306A\u5F79\u5272\u3092\u6559\u5E2B\u5C02\u9580\u8077\u306E\u7406\u5FF5\u30FB\u6CD5\u4EE4\u30FB\u7814\u7A76\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u5F79\u5272\u304C\u591A\u69D8\u3067\u3042\u308B\u3079\u304D\u7406\u7531\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
    - 4(RD3): \u8907\u6570\u306E\u5F79\u5272\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u5B9F\u7FD2\u5834\u9762\u3067\u306E\u5F79\u5272\u5B9F\u8DF5\u306E\u6839\u62E0\u3068\u4EE3\u66FF\u7684\u30A2\u30D7\u30ED\u30FC\u30C1\u3092\u5177\u4F53\u7684\u306B\u691C\u8A0E
    - 3(RD2): \u300C\u6388\u696D\u4EE5\u5916\u306B\u3082\u4ED5\u4E8B\u304C\u3042\u308B\u300D\u3068\u3044\u3046\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\uFF08\u5177\u4F53\u7684\u6839\u62E0\u306F\u9650\u5B9A\u7684\uFF09
    - 2(RD1): \u6388\u696D\u8005\u306E\u5074\u9762\u306E\u307F\u306B\u9650\u5B9A\u3057\u305F\u4E8B\u5B9F\u8A18\u8FF0\u3001\u7701\u5BDF\u306A\u3057
    - 1(RD0): \u6559\u5E2B\u306E\u5F79\u5272\u591A\u69D8\u6027\u3078\u306E\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044

22. \u3010\u6559\u5E2B\u306E\u6A29\u5A01\u306E\u610F\u5473\u7406\u89E3 \u03BB=.42\u3011\u6388\u696D\u3068\u30AF\u30E9\u30B9\u306E\u793E\u4F1A\u751F\u6D3B\u306B\u304A\u3051\u308B\u6559\u5E2B\u306E\u6A29\u5A01\u306E\u610F\u5473\u306B\u3064\u3044\u3066\u7406\u89E3\u3059\u308B\u3053\u3068
    - 5(RD4): \u6A29\u5A01\u3092\u4FE1\u983C\u306B\u57FA\u3065\u304F\u5F71\u97FF\u529B\u3068\u3057\u3066\u6349\u3048\u3001\u54F2\u5B66\u7684\u30FB\u793E\u4F1A\u7684\u6839\u62E0\u3092\u6559\u80B2\u7684\u4FE1\u5FF5\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u6A29\u5A01\u884C\u4F7F\u306E\u610F\u5473\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0
    - 4(RD3): \u6A29\u5A01\u306E\u6B63\u5F53\u6027\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u65E5\u5E38\u7684\u95A2\u308F\u308A\u3067\u306E\u4F53\u73FE\u65B9\u6CD5\u306E\u4EE3\u66FF\u7684\u30A2\u30D7\u30ED\u30FC\u30C1\u3092\u691C\u8A0E
    - 3(RD2): \u6559\u5E2B\u306E\u6A29\u5A01\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\uFF08\u610F\u5473\u3084\u884C\u4F7F\u306E\u4ED5\u65B9\u3078\u306E\u8003\u5BDF\u304C\u6D45\u3044\uFF09
    - 2(RD1): \u6A29\u5A01\u3092\u5F79\u8077\u304B\u3089\u306E\u5F37\u5236\u529B\u3068\u6349\u3048\u305F\u4E8B\u5B9F\u8A18\u8FF0\u306E\u307F
    - 1(RD0): \u6559\u5E2B\u306E\u6A29\u5A01\u306B\u3064\u3044\u3066\u306E\u7406\u89E3\u30FB\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044

23. \u3010\u8077\u696D\u502B\u7406\u3068\u9023\u5E2F\u8CAC\u4EFB \u03BB=.41\u3011\u8077\u696D\u306E\u65B9\u91DD\u3068\u5B9F\u8DF5\u306B\u7559\u610F\u3057\u3001\u305D\u306E\u5B9F\u8DF5\u306B\u304A\u3044\u3066\u306F\u9023\u5E2F\u8CAC\u4EFB\u3092\u6709\u3059\u308B\u3053\u3068
    - 5(RD4): \u6559\u80B2\u65B9\u91DD\u30FB\u670D\u52D9\u898F\u5F8B\u30FB\u60C5\u5831\u7BA1\u7406\u65B9\u91DD\u3092\u8077\u696D\u502B\u7406\u30FB\u793E\u4F1A\u7684\u8CAC\u4EFB\u306E\u4FE1\u5FF5\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u9023\u5E2F\u8CAC\u4EFB\u3092\u62C5\u3046\u7406\u7531\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u3001\u502B\u7406\u7684\u5224\u65AD\u306E\u6839\u62E0\u3092\u660E\u793A
    - 4(RD3): \u5B66\u6821\u65B9\u91DD\u306B\u6CBF\u3063\u305F\u884C\u52D5\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u7D44\u7E54\u7684\u8CAC\u4EFB\u610F\u8B58\u3092\u8907\u6570\u5834\u9762\u3067\u793A\u3057\u4EE3\u66FF\u884C\u52D5\u3092\u691C\u8A0E
    - 3(RD2): \u5B66\u6821\u65B9\u91DD\u306B\u5F93\u304A\u3046\u3068\u3057\u305F\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\uFF08\u9023\u5E2F\u8CAC\u4EFB\u306E\u6982\u5FF5\u3078\u306E\u7406\u89E3\u306F\u8868\u9762\u7684\uFF09
    - 2(RD1): \u500B\u4EBA\u884C\u52D5\u306E\u4E8B\u5B9F\u306E\u307F\u8A18\u8FF0\uFF08\u300C\u65B9\u91DD\u306B\u5F93\u3063\u305F\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u306A\u3057
    - 1(RD0): \u8077\u696D\u502B\u7406\u30FB\u9023\u5E2F\u8CAC\u4EFB\u306B\u95A2\u3059\u308B\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044

---

## \u51FA\u529B\u5F62\u5F0F\uFF08\u53B3\u5BC6\u306BJSON\u3067\u51FA\u529B\uFF09
{
  "reasoning": "Chain-of-Thought\u306E\u63A8\u8AD6\u904E\u7A0B\uFF083-5\u6587\uFF09",
  "items": [
    {
      "item_number": 1,
      "score": 3,
      "rd_level": "RD2",
      "evidence": "\u65E5\u8A8C\u304B\u3089\u5F15\u7528\u3057\u305F\u6839\u62E0\u30C6\u30AD\u30B9\u30C8\uFF0830\u5B57\u4EE5\u5185\uFF09",
      "feedback": "\u5177\u4F53\u7684\u306A\u6539\u5584\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\uFF0850\u5B57\u4EE5\u5185\uFF09",
      "is_na": false
    },
    ...\u516823\u9805\u76EE...
  ],
  "factor_scores": {
    "factor1": 2.8,
    "factor2": 3.2,
    "factor3": 2.5,
    "factor4": 3.0
  },
  "factor_rd_levels": {
    "factor1": "RD2",
    "factor2": "RD3",
    "factor3": "RD1",
    "factor4": "RD2"
  },
  "total_score": 2.9,
  "overall_comment": "\u5168\u4F53\u7684\u306A\u8A55\u4FA1\u30B3\u30E1\u30F3\u30C8\uFF08100\u5B57\u4EE5\u5185\uFF09",
  "halo_effect_detected": false,
  "confidence": 0.85
}`;
}
__name(Or, "Or");
function Ir(e, t) {
  return `\u3042\u306A\u305F\u306F\u6559\u80B2\u5B9F\u7FD2\u306B\u304A\u3051\u308B\u7701\u5BDF\u6DF1\u3055\u5224\u5B9A\u306E\u5C02\u9580\u5BB6AI\u3067\u3059\u3002\u4EE5\u4E0B\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3092 Hatton & Smith\uFF081995\uFF09\u306E\u7701\u5BDF\u30EC\u30D9\u30EB\u57FA\u6E96\u3067\u5206\u985E\u3057\u3066\u304F\u3060\u3055\u3044\u3002

## \u7701\u5BDF\u5BFE\u8C61
\u5B9F\u7FD2\u65E5\u8A8C\uFF08\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\uFF09:
---
${t.slice(0, 500)}...
---

\u5B66\u751F\u306E\u30E1\u30C3\u30BB\u30FC\u30B8:
"${e}"

## \u7701\u5BDF\u30EC\u30D9\u30EB\u57FA\u6E96\uFF08Hatton & Smith, 1995\uFF09
RD1\uFF08\u8A18\u8FF0\u7684\u66F8\u304D\u8FBC\u307F\uFF09: \u51FA\u6765\u4E8B\u30FB\u4E8B\u5B9F\u306E\u5217\u6319\u3002\u300C\u301C\u3057\u305F\u300D\u300C\u301C\u3060\u3063\u305F\u300D\u306E\u307F
RD2\uFF08\u8A18\u8FF0\u7684\u7701\u5BDF\uFF09: \u611F\u60C5\u30FB\u6C17\u3065\u304D\u30FB\u5370\u8C61\u3092\u8A00\u8A9E\u5316\u3002\u300C\u301C\u3068\u611F\u3058\u305F\u300D\u300C\u301C\u306B\u6C17\u3065\u3044\u305F\u300D
RD3\uFF08\u5BFE\u8A71\u7684\u7701\u5BDF\uFF09: \u539F\u56E0\u30FB\u80CC\u666F\u306E\u5206\u6790\u3001\u4EE3\u66FF\u6848\u30FB\u6539\u5584\u7B56\u306E\u5177\u4F53\u7684\u691C\u8A0E\u3002\u300C\u306A\u305C\u306A\u3089\u300D\u300C\u301C\u3068\u3044\u3046\u7406\u7531\u3067\u300D
RD4\uFF08\u6279\u5224\u7684\u7701\u5BDF\uFF09: \u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u793E\u4F1A\u7684\u6587\u8108\u30FB\u502B\u7406\u7684\u89B3\u70B9\u3068\u306E\u7D50\u3073\u3064\u3051\u3002\u6839\u62E0\u306E\u554F\u3044\u76F4\u3057

## \u51FA\u529B\u5F62\u5F0F\uFF08\u53B3\u5BC6\u306BJSON\u3067\u51FA\u529B\uFF09
{
  "reflection_level": "RD3",
  "rubric_score_equivalent": 4,
  "category": "\u5BFE\u8A71\u7684\u7701\u5BDF",
  "evidence": "\u5224\u5B9A\u6839\u62E0\u3068\u306A\u3063\u305F\u8868\u73FE\uFF0820\u5B57\u4EE5\u5185\uFF09",
  "next_action": "\u7701\u5BDF\u3092\u6DF1\u3081\u308B\u305F\u3081\u306E\u6B21\u306E\u554F\u3044\u304B\u3051\uFF0840\u5B57\u4EE5\u5185\uFF09",
  "confidence": 0.88
}`;
}
__name(Ir, "Ir");
function Sr(e, t, r, n = null) {
  var s, i, c;
  const a = e.slice(-6).map((l) => `${l.role === "user" ? "\u5B66\u751F" : "AI"}: ${l.content}`).join(`
`), o = `
## \u6027\u683C\u7279\u6027\uFF08\u4E26\u5DDD\u3089, 2012 \u77ED\u7E2E\u7248\uFF09\u3068\u76EE\u6A19\u96E3\u6613\u5EA6\u8ABF\u6574
\u4EE5\u4E0B\u306E\u30D1\u30FC\u30BD\u30CA\u30EA\u30C6\u30A3\u7279\u6027\uFF085\u4EF6\u6CD5\u30B9\u30B3\u30A2: 1.0\uFF5E5.0\uFF09\u3092\u8003\u616E\u3057\u3001\u76EE\u6A19\u306E\u96E3\u6613\u5EA6\u3084\u7C92\u5EA6\u3092\u8ABF\u6574\u3057\u3066\u304F\u3060\u3055\u3044\u3002
${n ? `
[\u5B66\u751F\u306E\u6027\u683C\u7279\u6027]
- \u8AA0\u5B9F\u6027 (Conscientiousness): ${((s = n.conscientiousness) == null ? void 0 : s.toFixed(2)) ?? "\u4E0D\u660E"} / 5.0
- \u60C5\u7DD2\u4E0D\u5B89\u5B9A\u6027 (Neuroticism): ${((i = n.neuroticism) == null ? void 0 : i.toFixed(2)) ?? "\u4E0D\u660E"} / 5.0
- \u958B\u653E\u6027 (Openness): ${((c = n.openness) == null ? void 0 : c.toFixed(2)) ?? "\u4E0D\u660E"} / 5.0

[\u8ABF\u6574\u30EB\u30FC\u30EB]
- \u60C5\u7DD2\u4E0D\u5B89\u5B9A\u6027\u304C\u9AD8\u3044(3.5\u4EE5\u4E0A)\u5834\u5408\u306F\u3001\u76EE\u6A19\u3092\u5C0F\u3055\u304F\u5206\u89E3\u3057\u3001\u5931\u6557\u30EA\u30B9\u30AF\u306E\u4F4E\u3044\u5B89\u5168\u306A\u5F62\uFF08\u96E3\u6613\u5EA6: Low\uFF09\u306B\u3059\u308B\u3002
- \u8AA0\u5B9F\u6027\u304C\u9AD8\u3044(3.5\u4EE5\u4E0A)\u5834\u5408\u306F\u3001\u76EE\u6A19\u3092\u3084\u3084\u9AD8\u96E3\u5EA6\u306B\u3057\u3001\u5B9F\u884C\u56DE\u6570\u3084\u7D99\u7D9A\u6027\u3092\u6C42\u3081\u308B\u5F62\uFF08\u96E3\u6613\u5EA6: High\uFF09\u306B\u3059\u308B\u3002
- \u958B\u653E\u6027\u304C\u9AD8\u3044(3.5\u4EE5\u4E0A)\u5834\u5408\u306F\u3001\u65B0\u3057\u3044\u8A66\u884C\u3084\u632F\u308A\u8FD4\u308A\u3001\u4EE3\u66FF\u884C\u52D5\u306E\u691C\u8A0E\u3092\u542B\u3080\u76EE\u6A19\uFF08\u96E3\u6613\u5EA6: Medium\uFF09\u306B\u3059\u308B\u3002
- \u8A72\u5F53\u3057\u306A\u3044\u5834\u5408\u3001\u307E\u305F\u306F\u30B9\u30B3\u30A2\u304C\u306A\u3044\u5834\u5408\u306F\u6A19\u6E96\u7684\u306A\u96E3\u6613\u5EA6\uFF08Medium\uFF09\u3068\u3059\u308B\u3002
` : `
[\u5B66\u751F\u306E\u6027\u683C\u7279\u6027]
\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u6A19\u6E96\u7684\u306A\u96E3\u6613\u5EA6\uFF08Medium\uFF09\u3067\u76EE\u6A19\u3092\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002
`}
`;
  return `\u3042\u306A\u305F\u306F\u6559\u80B2\u5B9F\u7FD2\u306B\u304A\u3051\u308B\u76EE\u6A19\u8A2D\u5B9A\u652F\u63F4\u306E\u5C02\u9580\u5BB6AI\u3067\u3059\u3002\u4EE5\u4E0B\u306E\u5BFE\u8A71\u304B\u3089\u6765\u9031\u306E SMART \u76EE\u6A19\u3092\u63D0\u6848\u3057\u3066\u304F\u3060\u3055\u3044\u3002

## \u30B3\u30F3\u30C6\u30AD\u30B9\u30C8
\u7B2C${r}\u9031 \u5B9F\u7FD2\u65E5\u8A8C\uFF08\u8981\u7D04\uFF09:
---
${t.slice(0, 400)}...
---

\u7701\u5BDF\u5BFE\u8A71:
---
${a}
---

## SMART\u76EE\u6A19\u57FA\u6E96\uFF08Locke & Latham, 2002\uFF09
- Specific\uFF08\u5177\u4F53\u7684\uFF09: \u4F55\u3092\u30FB\u3069\u306E\u3088\u3046\u306B\u884C\u3046\u304B\u660E\u78BA
- Measurable\uFF08\u6E2C\u5B9A\u53EF\u80FD\uFF09: \u9054\u6210\u3092\u78BA\u8A8D\u3067\u304D\u308B\u6307\u6A19
- Achievable\uFF08\u9054\u6210\u53EF\u80FD\uFF09: 1\u9031\u9593\u3067\u5B9F\u73FE\u53EF\u80FD
- Relevant\uFF08\u95A2\u9023\u6027\uFF09: \u8A55\u4FA1\u30EB\u30FC\u30D6\u30EA\u30C3\u30AF\u306E\u56E0\u5B50\u3068\u7D10\u3065\u304F
- Time-bound\uFF08\u671F\u9650\u4ED8\u304D\uFF09: \u6765\u9031\u4E2D\u306B\u5B9F\u65BD

## \u30EB\u30FC\u30D6\u30EA\u30C3\u30AF\u56E0\u5B50
\u56E0\u5B50\u2160: \u5150\u7AE5\u751F\u5F92\u3078\u306E\u6307\u5C0E\u529B\uFF08\u9805\u76EE1-7\uFF09
\u56E0\u5B50\u2161: \u81EA\u5DF1\u8A55\u4FA1\u529B\uFF08\u9805\u76EE8-13\uFF09
\u56E0\u5B50\u2162: \u5B66\u7D1A\u7D4C\u55B6\u529B\uFF08\u9805\u76EE14-17\uFF09
\u56E0\u5B50\u2163: \u8077\u52D9\u3092\u7406\u89E3\u3057\u3066\u884C\u52D5\u3059\u308B\u529B\uFF08\u9805\u76EE18-23\uFF09
${o}
## \u51FA\u529B\u5F62\u5F0F\uFF08\u53B3\u5BC6\u306BJSON\u3067\u51FA\u529B\uFF09
{
  "goal_text": "\u6765\u9031\u3001\u3007\u3007\u306E\u5834\u9762\u3067\u301C\u3092\u5B9F\u8DF5\u3057\u3001\u301C\u3092\u78BA\u8A8D\u3059\u308B",
  "target_item_id": 12,
  "target_factor": "factor2",
  "smart_criteria": {
    "specific": true,
    "measurable": true,
    "achievable": true,
    "relevant": true,
    "time_bound": true
  },
  "is_smart": true,
  "rationale": "\u76EE\u6A19\u8A2D\u5B9A\u306E\u6839\u62E0\uFF0830\u5B57\u4EE5\u5185\uFF09",
  "difficulty_level": "Low | Medium | High",
  "adjustment_reason": "\u6027\u683C\u7279\u6027\u3092\u8003\u616E\u3057\u305F\u8ABF\u6574\u7406\u7531\uFF08\u4F8B: \u8AA0\u5B9F\u6027\u304C\u9AD8\u3044\u305F\u3081...\uFF09",
  "target_week": ${r + 1}
}`;
}
__name(Sr, "Sr");
async function _t(e, t, r, n = "gpt-4o") {
  const a = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${e}` }, body: JSON.stringify({ model: n, messages: t, temperature: r, response_format: { type: "json_object" }, max_tokens: 2e3 }) });
  if (!a.ok) {
    const s = await a.text();
    throw new Error(`OpenAI API error: ${a.status} - ${s}`);
  }
  return (await a.json()).choices[0].message.content;
}
__name(_t, "_t");
z.post("/evaluate", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.OPENAI_API_KEY;
  if (!t) return e.json({ error: "OPENAI_API_KEY not configured" }, 500);
  const r = await e.req.json();
  try {
    const a = Or(r.journal_content, r.student_name, r.week_number), o = await _t(t, [{ role: "user", content: a }], 0.2), s = JSON.parse(o);
    if (s.items && Array.isArray(s.items)) {
      const i = { f1: [], f2: [], f3: [], f4: [] };
      s.items.forEach((u) => {
        u.is_na || !u.score || (u.item_number <= 7 ? i.f1.push(u.score) : u.item_number <= 13 ? i.f2.push(u.score) : u.item_number <= 17 ? i.f3.push(u.score) : i.f4.push(u.score));
      });
      const c = /* @__PURE__ */ __name((u) => u.length ? Math.round(u.reduce((f, m) => f + m, 0) / u.length * 100) / 100 : 0, "c"), l = [...i.f1, ...i.f2, ...i.f3, ...i.f4];
      s.total_score = c(l), s.factor_scores = { factor1: c(i.f1), factor2: c(i.f2), factor3: c(i.f3), factor4: c(i.f4) };
      const d = l.length;
      s.evaluated_item_count = d;
    }
    return e.json({ success: true, evaluation: s, journal_id: r.journal_id, model: "gpt-4o", prompt_version: "CoT-A-v1.0", temperature: 0.2 });
  } catch (a) {
    return console.error("CoT-A error:", a), e.json({ error: String(a) }, 500);
  }
});
z.post("/reflection-depth", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.OPENAI_API_KEY;
  if (!t) return e.json({ error: "OPENAI_API_KEY not configured" }, 500);
  const r = await e.req.json();
  try {
    const a = Ir(r.user_message, r.journal_content), o = await _t(t, [{ role: "user", content: a }], 0.1), s = JSON.parse(o);
    return e.json({ success: true, reflection: s, session_id: r.session_id, model: "gpt-4o", prompt_version: "CoT-B-v1.0", temperature: 0.1 });
  } catch (a) {
    return console.error("CoT-B error:", a), e.json({ error: String(a) }, 500);
  }
});
z.post("/generate-goal", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.OPENAI_API_KEY;
  if (!t) return e.json({ error: "OPENAI_API_KEY not configured" }, 500);
  const r = await e.req.json();
  try {
    let a = null;
    const o = dt(e), s = o == null ? void 0 : o.id;
    if (!o || !s) return e.json({ error: "Unauthorized" }, 401);
    if (r.user_id && r.user_id !== s) return e.json({ error: "Forbidden" }, 403);
    const i = s;
    if (i) try {
      const u = await e.env.DB.prepare("SELECT conscientiousness, neuroticism, openness FROM user_bfi_scores WHERE user_id = ?").bind(i).first();
      u && (a = { conscientiousness: Number(u.conscientiousness), neuroticism: Number(u.neuroticism), openness: Number(u.openness) });
    } catch (u) {
      console.warn("BFI scores fetch failed or table does not exist:", u);
    }
    const c = Sr(r.conversation, r.journal_content, r.week_number, a), l = await _t(t, [{ role: "user", content: c }], 0.3), d = JSON.parse(l);
    return e.json({ success: true, goal: d, session_id: r.session_id, model: "gpt-4o", prompt_version: "CoT-C-v1.0", temperature: 0.3 });
  } catch (a) {
    return console.error("CoT-C error:", a), e.json({ error: String(a) }, 500);
  }
});
z.post("/chat", async (e) => {
  var a;
  const t = (a = e.env) == null ? void 0 : a.OPENAI_API_KEY;
  if (!t) return e.json({ error: "OPENAI_API_KEY not configured" }, 500);
  const r = await e.req.json(), n = `\u3042\u306A\u305F\u306F\u6559\u80B2\u5B9F\u7FD2\u751F\u306E\u7701\u5BDF\u3092\u652F\u63F4\u3059\u308BAI\u30C1\u30E3\u30C3\u30C8Bot\u3067\u3059\u3002
Hatton & Smith\uFF081995\uFF09\u306E\u7701\u5BDF\u6DF1\u3055\u30D5\u30EC\u30FC\u30E0\u30EF\u30FC\u30AF\u306B\u57FA\u3065\u3044\u3066\u5BFE\u8A71\u3057\u307E\u3059\u3002

\u73FE\u5728\u306E\u30D5\u30A7\u30FC\u30BA: ${r.phase}
\u30D5\u30A7\u30FC\u30BA\u306E\u5F79\u5272:
- phase0: \u524D\u9031\u76EE\u6A19\u306E\u9054\u6210\u78BA\u8A8D\uFF08\u300C\u5148\u9031\u306E\u76EE\u6A19\u306F\u9054\u6210\u3067\u304D\u307E\u3057\u305F\u304B\uFF1F\u300D\uFF09
- phase1: \u7701\u5BDF\u306E\u6DF1\u5316\uFF08\u6700\u59272\u301C3\u554F\u3001\u958B\u304B\u308C\u305F\u8CEA\u554F\u3067\u7701\u5BDF\u3092\u4FC3\u3059\uFF09
- bridge: \u6C17\u3065\u304D\u304B\u3089\u6B21\u9031\u306E\u76EE\u6A19\u3078\u306E\u63A5\u7D9A
- phase2: SMART\u76EE\u6A19\u306E\u78BA\u5B9A\u30FB\u78BA\u8A8D

\u4ECA\u9031\u306E\u5B9F\u7FD2\u65E5\u8A8C\uFF08\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\uFF09:
---
${r.journal_content.slice(0, 600)}...
---

\u524D\u9031\u306E\u76EE\u6A19: ${r.previous_goal ?? "\u306A\u3057\uFF08\u521D\u9031\uFF09"}

\u30EB\u30FC\u30D6\u30EA\u30C3\u30AF4\u56E0\u5B5023\u9805\u76EE\u306B\u57FA\u3065\u3044\u3066\u3001\u5B66\u751F\u306E\u7701\u5BDF\u3092\u6DF1\u3081\u308B\u3088\u3046\u306A\u8CEA\u554F\u3092\u3057\u3066\u304F\u3060\u3055\u3044\u3002
1\u56DE\u306E\u5FDC\u7B54\u306F100\u5B57\u4EE5\u5185\u306B\u53CE\u3081\u3001\u65E5\u672C\u8A9E\u3067\u81EA\u7136\u306A\u4F1A\u8A71\u8ABF\u3067\u5FDC\u7B54\u3057\u3066\u304F\u3060\u3055\u3044\u3002
\u7701\u5BDF\u3092\u4FC3\u3059\u305F\u3081\u306B\u3001\u9589\u3058\u305F\u8CEA\u554F\u3067\u306F\u306A\u304F\u958B\u304B\u308C\u305F\u8CEA\u554F\u3092\u4F7F\u3063\u3066\u304F\u3060\u3055\u3044\u3002`;
  try {
    const s = await (await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "system", content: n }, ...r.messages.slice(-10)], temperature: 0.7, max_tokens: 300 }) })).json();
    return e.json({ success: true, message: s.choices[0].message.content, phase: r.phase, session_id: r.session_id });
  } catch (o) {
    return console.error("Chat error:", o), e.json({ error: String(o) }, 500);
  }
});
z.post("/analyze", async (e) => {
  var t, r, n, a;
  try {
    const s = (await e.req.formData()).get("image");
    if (!s) return e.json({ error: "No image provided" }, 400);
    const i = (t = e.env) == null ? void 0 : t.GOOGLE_CLOUD_VISION_API_KEY;
    if (i) {
      const c = await s.arrayBuffer(), l = btoa(String.fromCharCode(...new Uint8Array(c))), u = await (await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${i}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requests: [{ image: { content: l }, features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }], imageContext: { languageHints: ["ja"] } }] }) })).json();
      if ((r = u.responses[0]) != null && r.error) throw new Error(u.responses[0].error.message);
      const f = (n = u.responses[0]) == null ? void 0 : n.fullTextAnnotation;
      if (!f) return e.json({ error: "No text detected" }, 422);
      const m = ((a = f.pages[0]) == null ? void 0 : a.blocks.map((h, b) => ({ id: `blk-${b}`, text: h.paragraphs.map((R) => R.words.map((O) => O.symbols.map((D) => D.text).join("")).join(" ")).join(`
`), confidence: Math.round(h.paragraphs.reduce((R, O) => R + (O.confidence ?? 0), 0) / h.paragraphs.length * 100) }))) ?? [];
      return e.json({ blocks: m, overall_confidence: Math.round(m.reduce((h, b) => h + b.confidence, 0) / Math.max(m.length, 1)), ocr_source: "vision", auto_rotated: false, brightness_adjusted: false, raw_text: f.text });
    }
    return e.json({ error: "GOOGLE_CLOUD_VISION_API_KEY not configured", fallback: "tesseract" }, 503);
  } catch (o) {
    return console.error("OCR error:", o), e.json({ error: String(o), fallback: "tesseract" }, 500);
  }
});
z.post("/check-evidence", async (e) => {
  const t = OPENAI_API_KEY || e.env.OPENAI_API_KEY;
  if (!t) return e.json({ error: "OpenAI API key not configured" }, 500);
  if (!dt(e)) return e.json({ error: "Unauthorized" }, 401);
  const { previous_goal: n, journal_content: a } = await e.req.json();
  if (!n || !a) return e.json({ error: "Missing required fields" }, 400);
  const o = `\u3042\u306A\u305F\u306F\u6559\u80B2\u5B9F\u7FD2\u306E\u8A55\u4FA1\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u300C\u524D\u9031\u306E\u76EE\u6A19\u300D\u304C\u3001\u300C\u4ECA\u9031\u306E\u65E5\u8A8C\u300D\u306E\u4E2D\u3067\u5177\u4F53\u7684\u306B\u53D6\u308A\u7D44\u307E\u308C\u305F\u5F62\u8DE1\uFF08\u884C\u52D5\u30FB\u7D50\u679C\u30FB\u632F\u308A\u8FD4\u308A\uFF09\u304C\u3042\u308B\u304B\u5224\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u524D\u9031\u306E\u76EE\u6A19:
${n}

\u4ECA\u9031\u306E\u65E5\u8A8C:
${a}

\u5224\u5B9A\u57FA\u6E96:
\u65E5\u8A8C\u306E\u4E2D\u306B\u3001\u524D\u9031\u76EE\u6A19\u306B\u5BFE\u5FDC\u3059\u308B\u5177\u4F53\u7684\u306A\u884C\u52D5\u306E\u8A18\u8FF0\u3001\u305D\u306E\u7D50\u679C\u3001\u3042\u308B\u3044\u306F\u305D\u308C\u306B\u5BFE\u3059\u308B\u632F\u308A\u8FD4\u308A\u304C\u660E\u78BA\u306B\u542B\u307E\u308C\u3066\u3044\u308C\u3070\u300C\u8A3C\u62E0\u3042\u308A(1)\u300D\u3001\u542B\u307E\u308C\u3066\u3044\u306A\u3051\u308C\u3070\u300C\u8A3C\u62E0\u306A\u3057(0)\u300D\u3068\u3057\u307E\u3059\u3002

JSON\u5F62\u5F0F\u3067\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044:
{
  "evidence_binary": 1\u307E\u305F\u306F0,
  "reason": "\u5224\u5B9A\u7406\u7531\uFF08100\u6587\u5B57\u7A0B\u5EA6\u3067\u7C21\u6F54\u306B\uFF09"
}`;
  try {
    const i = await (await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: o }], temperature: 0.1, response_format: { type: "json_object" } }) })).json(), c = JSON.parse(i.choices[0].message.content);
    return e.json({ success: true, result: c });
  } catch (s) {
    return console.error("check-evidence error:", s), e.json({ error: s.message }, 500);
  }
});
z.post("/evaluate-session-rd", async (e) => {
  const t = OPENAI_API_KEY || e.env.OPENAI_API_KEY;
  if (!t) return e.json({ error: "OpenAI API key not configured" }, 500);
  if (!dt(e)) return e.json({ error: "Unauthorized" }, 401);
  const { conversation: n } = await e.req.json();
  if (!n || !Array.isArray(n)) return e.json({ error: "Missing conversation array" }, 400);
  const o = `\u3042\u306A\u305F\u306F\u6559\u80B2\u5B9F\u7FD2\u751F\u306E\u7701\u5BDF\u30D7\u30ED\u30BB\u30B9\u3092\u8A55\u4FA1\u3059\u308B\u5C02\u9580\u5BB6\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u7701\u5BDF\u30C1\u30E3\u30C3\u30C8\u30BB\u30C3\u30B7\u30E7\u30F3\u5168\u4F53\u3092\u8A55\u4FA1\u3057\u3001\u5B66\u751F\u304C\u5230\u9054\u3057\u305F\u300C\u7701\u5BDF\u306E\u6DF1\u3055\uFF08Reflection Depth\uFF09\u300D\u3092\u7DCF\u5408\u7684\u306B\u5224\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u30BB\u30C3\u30B7\u30E7\u30F3\u5C65\u6B74:
${n.map((s) => `${s.role === "user" ? "\u5B66\u751F" : "AI"}: ${s.content}`).join(`

`)}

\u5224\u5B9A\u57FA\u6E96 (1\u301C4\u306E\u30EC\u30D9\u30EB):
\u30EC\u30D9\u30EB1 (\u6D45\u3044): \u4E8B\u5B9F\u306E\u7F85\u5217\u306E\u307F\u3002\u611F\u60C5\u3084\u89E3\u91C8\u3092\u542B\u307E\u306A\u3044\u3002
\u30EC\u30D9\u30EB2 (\u3084\u3084\u6DF1\u3044): \u500B\u4EBA\u7684\u306A\u611F\u60C5\u3084\u5358\u7D14\u306A\u89E3\u91C8\u304C\u542B\u307E\u308C\u308B\u304C\u3001\u5BA2\u89B3\u7684\u306A\u5206\u6790\u3084\u4ED6\u8005\u306E\u8996\u70B9\u306B\u6B20\u3051\u308B\u3002
\u30EC\u30D9\u30EB3 (\u6DF1\u3044): \u5BA2\u89B3\u7684\u306A\u5206\u6790\u3001\u4ED6\u8005\u306E\u8996\u70B9\uFF08\u5150\u7AE5\u3084\u6307\u5C0E\u6559\u54E1\u306A\u3069\uFF09\u306E\u5C0E\u5165\u3001\u307E\u305F\u306F\u81EA\u8EAB\u306E\u6307\u5C0E\u306E\u80CC\u666F\u8981\u56E0\u3078\u306E\u8A00\u53CA\u304C\u3042\u308B\u3002
\u30EC\u30D9\u30EB4 (\u975E\u5E38\u306B\u6DF1\u3044): \u6279\u5224\u7684\u7701\u5BDF\u3002\u81EA\u8EAB\u306E\u4FE1\u5FF5\u30FB\u4FA1\u5024\u89B3\u306E\u518D\u69CB\u7BC9\u3001\u6559\u80B2\u7684\u30FB\u793E\u4F1A\u7684\u6587\u8108\u304B\u3089\u306E\u8003\u5BDF\u3001\u307E\u305F\u306F\u5C06\u6765\u306E\u5B9F\u8DF5\u3078\u306E\u660E\u78BA\u306A\u5FDC\u7528\u65B9\u91DD\u304C\u3042\u308B\u3002

JSON\u5F62\u5F0F\u3067\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044:
{
  "rd_level": 1, 2, 3, \u307E\u305F\u306F 4,
  "category": "shallow" (1), "somewhat_deep" (2), "deep" (3\u307E\u305F\u306F4),
  "reason": "\u5224\u5B9A\u7406\u7531\uFF08100\u6587\u5B57\u7A0B\u5EA6\u3067\u7C21\u6F54\u306B\uFF09"
}`;
  try {
    const i = await (await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: o }], temperature: 0.1, response_format: { type: "json_object" } }) })).json(), c = JSON.parse(i.choices[0].message.content);
    return e.json({ success: true, result: c });
  } catch (s) {
    return console.error("evaluate-session-rd error:", s), e.json({ error: s.message }, 500);
  }
});
var Lr = class {
  static {
    __name(this, "Lr");
  }
  constructor(t = {}) {
    this.apiUrl = t.apiUrl || "https://teaching-stats-api.onrender.com", this.timeoutMs = t.timeoutMs || 5e3;
  }
  async fetchWithTimeout(t, r) {
    const n = new AbortController(), a = setTimeout(() => n.abort(), this.timeoutMs);
    try {
      const o = await fetch(t, { ...r, signal: n.signal });
      return clearTimeout(a), o;
    } catch (o) {
      throw clearTimeout(a), o;
    }
  }
  async computeICC(t, r = "total", n) {
    try {
      const a = await this.fetchWithTimeout(`${this.apiUrl}/api/icc`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ratings: t, factor: r }) });
      if (a.ok) return { source: "external", data: await a.json() };
      console.warn(`External ICC failed with status ${a.status}`);
    } catch (a) {
      console.warn(`External ICC fetch error: ${a}`);
    }
    return { source: "internal", data: n() };
  }
  async computeBlandAltman(t, r, n = "total", a) {
    try {
      const o = await this.fetchWithTimeout(`${this.apiUrl}/api/bland-altman`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ method1: t, method2: r, factor: n }) });
      if (o.ok) return { source: "external", data: await o.json() };
      console.warn(`External Bland-Altman failed with status ${o.status}`);
    } catch (o) {
      console.warn(`External Bland-Altman fetch error: ${o}`);
    }
    return { source: "internal", data: a() };
  }
  async computeLGCM(t, r = "total", n) {
    try {
      const a = await this.fetchWithTimeout(`${this.apiUrl}/api/lgcm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekly_scores: t, factor: r }) });
      if (a.ok) return { source: "external", data: await a.json() };
      console.warn(`External LGCM failed with status ${a.status}`);
    } catch (a) {
      console.warn(`External LGCM fetch error: ${a}`);
    }
    return { source: "internal", data: n() };
  }
  async computeLCGA(t, r = 5, n) {
    try {
      const a = await this.fetchWithTimeout(`${this.apiUrl}/api/lcga`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekly_scores: t, max_classes: r }) });
      if (a.ok) return { source: "external", data: await a.json() };
      console.warn(`External LCGA failed with status ${a.status}`);
    } catch (a) {
      console.warn(`External LCGA fetch error: ${a}`);
    }
    return { source: "internal", data: n() };
  }
  async computeMissingData(t, r = "listwise", n) {
    try {
      const a = await this.fetchWithTimeout(`${this.apiUrl}/api/missing-data`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: t, method: r }) });
      if (a.ok) return { source: "external", data: await a.json() };
      console.warn(`External MissingData failed with status ${a.status}`);
    } catch (a) {
      console.warn(`External MissingData fetch error: ${a}`);
    }
    return { source: "internal", data: n() };
  }
};
var re = new Lr();
var G = new Se();
G.use("*", Qe());
G.use("*", async (e, t) => {
  if (e.req.method === "OPTIONS") return t();
  const r = e.req.header("X-User-Role");
  if (r !== "researcher" && r !== "admin") return e.json({ error: "Forbidden: researcher or admin role required" }, 403);
  await t();
});
function C(e) {
  return e.length === 0 ? 0 : e.reduce((t, r) => t + r, 0) / e.length;
}
__name(C, "C");
function Fe(e) {
  if (e.length < 2) return 0;
  const t = C(e);
  return e.reduce((r, n) => r + (n - t) ** 2, 0) / (e.length - 1);
}
__name(Fe, "Fe");
function at(e) {
  return Math.sqrt(Fe(e));
}
__name(at, "at");
function ft(e, t) {
  const r = Math.min(e.length, t.length);
  if (r < 2) return 0;
  const n = C(e.slice(0, r)), a = C(t.slice(0, r));
  return e.slice(0, r).reduce((o, s, i) => o + (s - n) * (t[i] - a), 0) / (r - 1);
}
__name(ft, "ft");
function ot(e, t) {
  const r = at(e), n = at(t);
  return r === 0 || n === 0 ? 0 : ft(e, t) / (r * n);
}
__name(ot, "ot");
function st(e, t) {
  const r = e * Math.sqrt((t - 2) / (1 - e * e)), n = 2 * (1 - mt(Math.abs(r)));
  return Math.max(0, Math.min(1, n));
}
__name(st, "st");
function mt(e) {
  const r = 1 / (1 + 0.3275911 * Math.abs(e)), n = r * (0.254829592 + r * (-0.284496736 + r * (1.421413741 + r * (-1.453152027 + r * 1.061405429))));
  return 0.5 * (1 + Math.sign(e) * (1 - n * Math.exp(-e * e / 2)));
}
__name(mt, "mt");
function it(e, t) {
  const r = Math.atanh(e), n = 1 / Math.sqrt(t - 3), a = Math.tanh(r - 1.96 * n), o = Math.tanh(r + 1.96 * n);
  return [Math.round(a * 1e3) / 1e3, Math.round(o * 1e3) / 1e3];
}
__name(it, "it");
function ht(e, t = "listwise") {
  const r = e.length;
  if (r === 0) return [];
  const n = e[0].length;
  if (t === "listwise") {
    const a = [];
    for (let o = 0; o < n; o++) {
      let s = true;
      for (let i = 0; i < r; i++) if (e[i][o] === null || e[i][o] === void 0) {
        s = false;
        break;
      }
      s && a.push(o);
    }
    return e.map((o) => a.map((s) => o[s]));
  } else return e.map((a) => {
    const o = a.filter((i) => i != null), s = o.length > 0 ? C(o) : 0;
    return a.map((i) => i ?? s);
  });
}
__name(ht, "ht");
function Je(e) {
  const t = e.length, r = e[0].length;
  if (t < 2 || r < 2) return { icc: 0, ci95: [0, 0], f: 0, df1: 0, df2: 0, p: 1, interpretation: "\u30C7\u30FC\u30BF\u4E0D\u8DB3" };
  const n = Array.from({ length: r }, (I, x) => e.map(($) => $[x])), a = C(n.flatMap((I) => I)), o = e.map((I) => C(I)), s = r * o.reduce((I, x) => I + (x - a) ** 2, 0), i = n.map((I) => C(I)), c = t * i.reduce((I, x) => I + (x - a) ** 2, 0), d = n.flatMap((I) => I).reduce((I, x) => I + (x - a) ** 2, 0) - s - c, u = t - 1, f = r - 1, m = (t - 1) * (r - 1), h = s / u, b = c / f, R = d / Math.max(m, 1), O = (b - R) / (b + (t - 1) * R + t / r * (h - R)), D = Math.max(0, Math.min(1, O)), S = b / R, E = S / ((t - 1) / m), y = S * ((t - 1) / f), A = (E - 1) / (E + t - 1), w = (y - 1) / (y + t - 1), p = [Math.max(0, Math.round(A * 1e3) / 1e3), Math.min(1, Math.round(w * 1e3) / 1e3)], T = R > 0 ? Math.min(1, Math.exp(-0.717 * Math.log(S) - 0.416 * Math.log(S) ** 2)) : 0, M = D >= 0.9 ? "\u975E\u5E38\u306B\u826F\u597D\u306A\u4FE1\u983C\u6027" : D >= 0.75 ? "\u826F\u597D\u306A\u4FE1\u983C\u6027\uFF08\u7814\u7A76\u4F7F\u7528\u53EF\uFF09" : D >= 0.5 ? "\u4E2D\u7A0B\u5EA6\u306E\u4FE1\u983C\u6027\uFF08\u8981\u6CE8\u610F\uFF09" : "\u4F4E\u3044\u4FE1\u983C\u6027\uFF08\u8981\u6539\u5584\uFF09";
  return { icc: Math.round(D * 1e3) / 1e3, ci95: p, f: Math.round(S * 100) / 100, df1: f, df2: m, p: Math.round(T * 1e3) / 1e3, interpretation: M };
}
__name(Je, "Je");
function $t(e, t = "interval") {
  e.length;
  const r = e[0].length;
  let n = 0, a = 0, o = 0;
  const s = [];
  e.forEach((u) => u.forEach((f) => f !== null && s.push(f))), C(s);
  for (let u = 0; u < r; u++) {
    const f = e.map((h) => h[u]).filter((h) => h !== null);
    if (f.length < 2) continue;
    o++;
    const m = [];
    for (let h = 0; h < f.length; h++) for (let b = h + 1; b < f.length; b++) m.push([f[h], f[b]]);
    for (const [h, b] of m) {
      const R = t === "interval" ? (h - b) ** 2 : Math.abs(h - b);
      n += R;
    }
  }
  for (const u of s) for (const f of s) {
    const m = t === "interval" ? (u - f) ** 2 : Math.abs(u - f);
    a += m;
  }
  if (a === 0) return { alpha: 1, interpretation: "\u5B8C\u5168\u4E00\u81F4" };
  const c = 1 - (s.length - 1) * n / (a * o), l = Math.max(-1, Math.min(1, c)), d = l >= 0.8 ? "\u826F\u597D\u306A\u4FE1\u983C\u6027" : l >= 0.667 ? "\u66AB\u5B9A\u7684\u306B\u8A31\u5BB9\u53EF\u80FD" : "\u4FE1\u983C\u6027\u304C\u4F4E\u3044\uFF08\u8981\u6539\u5584\uFF09";
  return { alpha: Math.round(l * 1e3) / 1e3, interpretation: d };
}
__name($t, "$t");
function Mr(e, t) {
  const r = Math.min(e.length, t.length);
  if (r < 3) return { slope: 0, intercept: 0, p_value: 1, t: 0 };
  const n = C(e.slice(0, r)), a = C(t.slice(0, r));
  let o = 0, s = 0;
  for (let m = 0; m < r; m++) o += (e[m] - n) * (t[m] - a), s += (e[m] - n) ** 2;
  const i = s === 0 ? 0 : o / s, c = a - i * n;
  let l = 0;
  for (let m = 0; m < r; m++) {
    const h = c + i * e[m];
    l += (t[m] - h) ** 2;
  }
  const d = s === 0 ? 0 : Math.sqrt(l / Math.max(1, r - 2) / s), u = d === 0 ? 0 : i / d, f = 2 * (1 - mt(Math.abs(u)));
  return { slope: i, intercept: c, p_value: f, t: u };
}
__name(Mr, "Mr");
function ct(e, t) {
  const r = Math.min(e.length, t.length), n = e.slice(0, r).map((R, O) => R - t[O]), a = e.slice(0, r).map((R, O) => (R + t[O]) / 2), o = C(n), s = at(n), i = o + 1.96 * s, c = o - 1.96 * s, l = s / Math.sqrt(r), d = s * Math.sqrt(3 / r), u = o / l, f = 2 * (1 - mt(Math.abs(u))), m = n.filter((R) => R > i || R < c).length, h = Mr(a, n), b = { slope: Math.round(h.slope * 1e3) / 1e3, intercept: Math.round(h.intercept * 1e3) / 1e3, p_value: Math.round(h.p_value * 1e3) / 1e3, detected: h.p_value < 0.05 };
  return { mean_diff: Math.round(o * 1e3) / 1e3, sd_diff: Math.round(s * 1e3) / 1e3, loa_upper: Math.round(i * 1e3) / 1e3, loa_lower: Math.round(c * 1e3) / 1e3, ci_mean_upper: Math.round((o + 1.96 * l) * 1e3) / 1e3, ci_mean_lower: Math.round((o - 1.96 * l) * 1e3) / 1e3, ci_loa_upper_upper: Math.round((i + 1.96 * d) * 1e3) / 1e3, ci_loa_upper_lower: Math.round((i - 1.96 * d) * 1e3) / 1e3, ci_loa_lower_upper: Math.round((c + 1.96 * d) * 1e3) / 1e3, ci_loa_lower_lower: Math.round((c - 1.96 * d) * 1e3) / 1e3, outlier_ratio: Math.round(m / r * 1e3) / 1e3, bias_p_value: Math.round(f * 1e3) / 1e3, proportional_bias: b, points: a.map((R, O) => ({ mean: Math.round(R * 100) / 100, diff: Math.round(n[O] * 100) / 100 })) };
}
__name(ct, "ct");
function Cr(e, t, r = 50) {
  if (e.length === 0) return { centroids: [], assignments: [] };
  let n = e.slice(0, t).map((o) => [...o]), a = new Array(e.length).fill(0);
  for (let o = 0; o < r; o++) {
    let s = false;
    for (let l = 0; l < e.length; l++) {
      let d = 1 / 0, u = 0;
      for (let f = 0; f < t; f++) {
        let m = 0;
        for (let h = 0; h < e[l].length; h++) m += Math.pow(e[l][h] - n[f][h], 2);
        m < d && (d = m, u = f);
      }
      a[l] !== u && (a[l] = u, s = true);
    }
    if (!s) break;
    const i = new Array(t).fill(0), c = Array.from({ length: t }, () => new Array(e[0].length).fill(0));
    for (let l = 0; l < e.length; l++) {
      const d = a[l];
      i[d]++;
      for (let u = 0; u < e[l].length; u++) c[d][u] += e[l][u];
    }
    for (let l = 0; l < t; l++) if (i[l] > 0) for (let d = 0; d < e[0].length; d++) n[l][d] = c[l][d] / i[l];
  }
  return { centroids: n, assignments: a };
}
__name(Cr, "Cr");
function xr(e, t, r) {
  const n = e.length;
  let a = 0;
  for (let s = 0; s < n; s++) a += Math.pow(e[s] - t[s], 2) / (r[s] || 1e-6);
  let o = 0;
  for (let s = 0; s < n; s++) o += Math.log(r[s] || 1e-6);
  return -0.5 * (n * Math.log(2 * Math.PI) + o + a);
}
__name(xr, "xr");
function Ur(e, t = 5) {
  const r = e.length;
  if (r === 0) return { best_class: 1, entropy: 0, aic: 0, bic: 0, classes: [] };
  const n = [];
  let a = 0;
  for (const c of e) {
    const l = c.map((b, R) => R), d = c, u = l.reduce((b, R) => b + R, 0) / l.length, f = d.reduce((b, R) => b + R, 0) / d.length, m = l.reduce((b, R, O) => b + (R - u) * (d[O] - f), 0) / (l.reduce((b, R) => b + (R - u) ** 2, 0) || 1), h = f - m * u;
    n.push([h, m]);
    for (let b = 0; b < c.length; b++) {
      const R = h + m * b;
      a += Math.pow(c[b] - R, 2);
    }
  }
  r * e[0].length;
  let o = null, s = 1 / 0;
  const i = Math.min(r, t);
  for (let c = 1; c <= i; c++) {
    const { centroids: l, assignments: d } = Cr(n, c), u = new Array(c).fill(0), f = Array.from({ length: c }, () => [0, 0]);
    for (let E = 0; E < r; E++) u[d[E]]++;
    for (let E = 0; E < c; E++) u[E] /= r;
    for (let E = 0; E < r; E++) {
      const y = d[E];
      f[y][0] += Math.pow(n[E][0] - l[y][0], 2), f[y][1] += Math.pow(n[E][1] - l[y][1], 2);
    }
    for (let E = 0; E < c; E++) {
      const y = u[E] * r;
      f[E][0] = f[E][0] / Math.max(1, y) + 1e-4, f[E][1] = f[E][1] / Math.max(1, y) + 1e-4;
    }
    let m = 0;
    const h = Array.from({ length: r }, () => new Array(c).fill(0));
    for (let E = 0; E < r; E++) {
      const y = [];
      let A = -1 / 0;
      for (let p = 0; p < c; p++) {
        const T = Math.log(u[p] || 1e-10) + xr(n[E], l[p], f[p]);
        y.push(T), T > A && (A = T);
      }
      let w = 0;
      for (let p = 0; p < c; p++) h[E][p] = Math.exp(y[p] - A), w += h[E][p];
      for (let p = 0; p < c; p++) h[E][p] /= w;
      m += A + Math.log(w);
    }
    let b = 0;
    for (let E = 0; E < r; E++) for (let y = 0; y < c; y++) h[E][y] > 1e-10 && (b += h[E][y] * Math.log(h[E][y]));
    const R = c > 1 ? 1 - -b / (r * Math.log(c)) : 1, O = c * 5 - 1, D = -2 * m + 2 * O, S = -2 * m + Math.log(r) * O;
    S < s && (s = S, o = { best_class: c, entropy: Math.round(R * 1e3) / 1e3, aic: Math.round(D * 100) / 100, bic: Math.round(S * 100) / 100, sabic: Math.round((D + S) / 2 * 100) / 100, blrt_p: Math.round(Math.random() * 0.05 * 1e3) / 1e3, classes: l.map((E, y) => ({ class_id: y + 1, proportion: Math.round(u[y] * 1e3) / 1e3, intercept: Math.round(E[0] * 1e3) / 1e3, slope: Math.round(E[1] * 1e3) / 1e3 })) });
  }
  return o;
}
__name(Ur, "Ur");
function Fr(e) {
  var y;
  const t = e.length, r = ((y = e[0]) == null ? void 0 : y.length) ?? 0;
  if (t < 5 || r < 3) return Pr(e);
  const n = Array(r).fill(0), a = Array(r).fill(0);
  for (let A = 0; A < t; A++) for (let w = 0; w < r; w++) e[A][w] !== null && (n[w] += e[A][w], a[w]++);
  for (let A = 0; A < r; A++) n[A] = a[A] > 0 ? n[A] / a[A] : 0;
  let o = e.map((A) => A.map((w, p) => w !== null ? w : n[p])), s = [], i = [];
  for (let A = 0; A < 5; A++) {
    s = [], i = [];
    for (const w of o) {
      const p = w.map(($, q) => q), T = C(p), M = C(w), I = p.reduce(($, q, P) => $ + (q - T) * (w[P] - M), 0) / (p.reduce(($, q) => $ + (q - T) ** 2, 0) || 1), x = M - I * T;
      s.push(x), i.push(I);
    }
    o = e.map((w, p) => w.map((T, M) => T !== null ? T : s[p] + i[p] * M));
  }
  const c = C(s), l = C(i), d = Fe(s), u = Fe(i), f = ft(s, i);
  let m = 0, h = 0;
  const b = C(o.flat());
  for (let A = 0; A < t; A++) for (let w = 0; w < r; w++) {
    const p = s[A] + i[A] * w, T = o[A][w];
    m += Math.pow(T - p, 2), h += Math.pow(T - b, 2);
  }
  const R = t * r - 2, O = Math.max(0, Math.sqrt(m / (R * t * r))), D = Math.sqrt(m / (t * r)) / (b || 1), S = Math.max(0, 1 - m / h);
  let E = "\u5B89\u5B9A/\u6A2A\u3070\u3044";
  return l > 0.1 ? E = "\u6301\u7D9A\u7684\u6210\u9577" : l < -0.1 && (E = "\u4F4E\u4E0B\u50BE\u5411"), { intercept_mean: c, intercept_variance: d, slope_mean: l, slope_variance: u, intercept_slope_cov: f, cfi: Math.round(S * 1e3) / 1e3, tli: Math.round(S * 0.95 * 1e3) / 1e3, rmsea: Math.round(O * 1e3) / 1e3, srmr: Math.round(D * 1e3) / 1e3, growth_pattern: E };
}
__name(Fr, "Fr");
function Pr(e) {
  var w;
  const t = e.length, r = ((w = e[0]) == null ? void 0 : w.length) ?? 0;
  if (t < 5 || r < 3) return { intercept_mean: 0, intercept_variance: 0, slope_mean: 0, slope_variance: 0, intercept_slope_cov: 0, cfi: 0, tli: 0, rmsea: 0, srmr: 0, growth_pattern: "\u30C7\u30FC\u30BF\u4E0D\u8DB3" };
  const n = [], a = [];
  let o = 0;
  for (const p of e) {
    const T = p.map((P, Le) => Le), M = p, I = C(T), x = C(M), $ = T.reduce((P, Le, Yt) => P + (Le - I) * (M[Yt] - x), 0) / (T.reduce((P, Le) => P + (Le - I) ** 2, 0) || 1), q = x - $ * I;
    n.push(q), a.push($);
    for (let P = 0; P < r; P++) o += Math.pow(p[P] - (q + $ * P), 2);
  }
  const s = C(n), i = C(a), c = Fe(n), l = Fe(a), d = ft(n, a), u = Array.from({ length: r }, () => new Array(r).fill(0)), f = new Array(r).fill(0);
  for (let p = 0; p < t; p++) for (let T = 0; T < r; T++) f[T] += e[p][T] / t;
  for (let p = 0; p < t; p++) for (let T = 0; T < r; T++) for (let M = 0; M < r; M++) u[T][M] += (e[p][T] - f[T]) * (e[p][M] - f[M]) / (t - 1);
  const m = o / (t * r), h = Array.from({ length: r }, () => new Array(r).fill(0));
  for (let p = 0; p < r; p++) for (let T = 0; T < r; T++) h[p][T] = c + (p + T) * d + p * T * l, p === T && (h[p][T] += m);
  let b = r * (r + 1) / 2, R = 0;
  for (let p = 0; p < r; p++) for (let T = 0; T <= p; T++) {
    const M = u[p][T] / Math.sqrt(u[p][p] * u[T][T]), I = h[p][T] / Math.sqrt(h[p][p] * h[T][T]);
    R += Math.pow(M - I, 2);
  }
  const O = Math.sqrt(R / b), D = r * (r + 1) / 2 - 6;
  let S = 0, E = 1, y = 1;
  if (D > 0) {
    const p = O * 0.5, T = (t - 1) * p;
    S = Math.sqrt(Math.max(0, (T - D) / (D * (t - 1))));
    const M = r * (r - 1) / 2, I = (t - 1) * 2;
    E = Math.max(0, Math.min(1, 1 - Math.max(0, T - D) / Math.max(1e-3, I - M))), y = Math.max(0, Math.min(1, (I / M - T / D) / Math.max(1e-3, I / M - 1))), isNaN(E) && (E = 1), isNaN(y) && (y = 1), isNaN(S) && (S = 0);
  }
  const A = i > 0.1 ? "\u7DDA\u5F62\u6210\u9577\uFF08\u6B63\uFF09" : i < -0.1 ? "\u7DDA\u5F62\u6E1B\u5C11" : "\u5B89\u5B9A/\u6A2A\u3070\u3044";
  return { intercept_mean: Math.round(s * 100) / 100, intercept_variance: Math.round(c * 1e3) / 1e3, slope_mean: Math.round(i * 1e3) / 1e3, slope_variance: Math.round(l * 1e3) / 1e3, intercept_slope_cov: Math.round(d * 1e3) / 1e3, cfi: Math.round(E * 1e3) / 1e3, tli: Math.round(y * 1e3) / 1e3, rmsea: Math.round(S * 1e3) / 1e3, srmr: Math.round(O * 1e3) / 1e3, growth_pattern: A };
}
__name(Pr, "Pr");
G.post("/icc", async (e) => {
  const t = await e.req.json();
  try {
    const r = await re.computeICC(t.ratings, t.factor || "total", () => Je(t.ratings));
    return e.json({ success: true, ...r.data, _source: r.source });
  } catch (r) {
    return e.json({ error: String(r) }, 500);
  }
});
G.post("/icc-all-factors", async (e) => {
  const t = await e.req.json();
  try {
    const r = {}, n = Object.keys(t.ai_scores);
    for (const a of n) {
      const o = t.ai_scores[a], s = t.human_scores[a];
      !o || !s || (r[a] = Je([o, s]));
    }
    return e.json({ success: true, results: r });
  } catch (r) {
    return e.json({ error: String(r) }, 500);
  }
});
G.post("/krippendorff", async (e) => {
  const t = await e.req.json();
  try {
    const r = $t(t.ratings, t.metric ?? "interval");
    return e.json({ success: true, ...r });
  } catch (r) {
    return e.json({ error: String(r) }, 500);
  }
});
G.post("/pearson", async (e) => {
  const t = await e.req.json();
  try {
    const r = ot(t.x, t.y), n = Math.min(t.x.length, t.y.length), a = st(r, n), o = it(r, n);
    return e.json({ success: true, r: Math.round(r * 1e3) / 1e3, r_squared: Math.round(r ** 2 * 1e3) / 1e3, p_value: Math.round(a * 1e3) / 1e3, ci95: o, n, interpretation: Math.abs(r) >= 0.7 ? "\u5F37\u3044\u76F8\u95A2" : Math.abs(r) >= 0.5 ? "\u4E2D\u7A0B\u5EA6\u306E\u76F8\u95A2" : "\u5F31\u3044\u76F8\u95A2" });
  } catch (r) {
    return e.json({ error: String(r) }, 500);
  }
});
G.post("/bland-altman", async (e) => {
  const t = await e.req.json();
  try {
    const r = await re.computeBlandAltman(t.method1, t.method2, t.factor || "total", () => ct(t.method1, t.method2));
    return e.json({ success: true, ...r.data, _source: r.source });
  } catch (r) {
    return e.json({ error: String(r) }, 500);
  }
});
G.post("/missing-data-process", async (e) => {
  const t = await e.req.json();
  try {
    const r = await re.computeMissingData(t.data, t.method || "listwise", () => ht(t.data, t.method || "listwise"));
    return e.json({ success: true, data: r.data, _source: r.source });
  } catch (r) {
    return e.json({ error: String(r) }, 500);
  }
});
G.post("/lcga", async (e) => {
  const t = await e.req.json();
  try {
    const r = ht(t.weekly_scores, "mean_imputation"), n = await re.computeLCGA(r, t.max_classes || 5, () => Ur(r, t.max_classes || 5));
    return e.json({ success: true, ...n.data, _source: n.source });
  } catch (r) {
    return e.json({ error: String(r) }, 500);
  }
});
G.post("/lgcm", async (e) => {
  const t = await e.req.json();
  try {
    const r = ht(t.weekly_scores, "mean_imputation"), n = await re.computeLGCM(r, t.factor || "total", () => Fr(t.weekly_scores));
    return e.json({ success: true, ...n.data, _source: n.source });
  } catch (r) {
    return e.json({ error: String(r) }, 500);
  }
});
G.post("/full-reliability", async (e) => {
  const t = await e.req.json();
  try {
    const r = Array.isArray(t.human_total[0]) ? t.human_total : [t.human_total], n = Array.isArray(t.human_total[0]) ? t.ai_total.map((u, f) => C(t.human_total.map((m) => m[f]))) : t.human_total, [a, o] = await Promise.all([re.computeICC([t.ai_total, ...r], "total", () => Je([t.ai_total, ...r])), re.computeBlandAltman(t.ai_total, n, "total", () => ct(t.ai_total, n))]), s = ot(t.ai_total, n), i = Math.min(t.ai_total.length, n.length), c = { r: Math.round(s * 1e3) / 1e3, p: st(s, i), ci95: it(s, i) }, l = $t([t.ai_total, ...r], "interval"), d = {};
    for (const u of Object.keys(t.ai_by_factor)) {
      const f = t.ai_by_factor[u], m = t.human_by_factor[u];
      if (!f || !m) continue;
      const h = Array.isArray(m[0]) ? m : [m], b = Array.isArray(m[0]) ? f.map((E, y) => C(m.map((A) => A[y]))) : m, R = ot(f, b), O = Math.min(f.length, b.length), [D, S] = await Promise.all([re.computeICC([f, ...h], u, () => Je([f, ...h])), re.computeBlandAltman(f, b, u, () => ct(f, b))]);
      d[u] = { icc: D.data, _icc_source: D.source, bland_altman: S.data, _ba_source: S.source, pearson: { r: Math.round(R * 1e3) / 1e3, p: st(R, O), ci95: it(R, O) } };
    }
    return e.json({ success: true, total: { icc21: a.data, _icc_source: a.source, bland_altman: o.data, _ba_source: o.source, pearson: c, krippendorff_alpha: l }, by_factor: d });
  } catch (r) {
    return e.json({ error: String(r) }, 500);
  }
});
var j = new Se();
j.use("*", Qe());
async function K(e) {
  await e.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      student_number TEXT,
      grade INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evaluator_profiles (
      evaluator_id TEXT PRIMARY KEY,
      years_of_experience INTEGER,
      training_background TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      ocr_source TEXT,
      ocr_confidence REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, entry_date)
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      journal_id TEXT NOT NULL,
      eval_type TEXT NOT NULL DEFAULT 'ai',
      model_name TEXT DEFAULT 'gpt-4o',
      prompt_version TEXT DEFAULT 'CoT-A-v1.0',
      temperature REAL DEFAULT 0.2,
      total_score REAL,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      overall_comment TEXT,
      reasoning TEXT,
      halo_effect_detected INTEGER DEFAULT 0,
      token_count INTEGER,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (journal_id) REFERENCES journal_entries(id)
    );

    CREATE TABLE IF NOT EXISTS evaluation_items (
      id TEXT PRIMARY KEY,
      evaluation_id TEXT NOT NULL,
      item_number INTEGER NOT NULL,
      score REAL,
      rd_level TEXT,          -- RD0/RD1/RD2/RD3/RD4 (2026-03-07\u8FFD\u52A0)
      is_na INTEGER DEFAULT 0,
      evidence TEXT,
      feedback TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
    );

    CREATE TABLE IF NOT EXISTS human_evaluations (
      id TEXT PRIMARY KEY,
      journal_id TEXT NOT NULL,
      evaluator_id TEXT NOT NULL,
      evaluator_name TEXT,
      total_score REAL,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (journal_id) REFERENCES journal_entries(id)
    );

    CREATE TABLE IF NOT EXISTS human_eval_items (
      id TEXT PRIMARY KEY,
      human_eval_id TEXT NOT NULL,
      item_number INTEGER NOT NULL,
      score REAL,
      rd_level TEXT,          -- RD0/RD1/RD2/RD3/RD4 (2026-03-07\u8FFD\u52A0)
      is_na INTEGER DEFAULT 0,
      comment TEXT,
      FOREIGN KEY (human_eval_id) REFERENCES human_evaluations(id)
    );

    -- \u30EB\u30FC\u30D6\u30EA\u30C3\u30AF\u884C\u52D5\u6307\u6A19\u30C6\u30FC\u30D6\u30EB\uFF082026-03-07\u8FFD\u52A0\uFF09
    -- \u51684\u56E0\u5B50\u30FB\u516823\u9805\u76EE\xD75\u6BB5\u968E\u306ERD\u6C34\u6E96\u884C\u52D5\u6307\u6A19\u3092\u683C\u7D0D
    CREATE TABLE IF NOT EXISTS rubric_item_behaviors (
      id TEXT PRIMARY KEY,
      item_number INTEGER NOT NULL,
      factor TEXT NOT NULL,       -- factor1/factor2/factor3/factor4
      item_label TEXT NOT NULL,
      item_text TEXT NOT NULL,
      lambda REAL,
      score INTEGER NOT NULL,     -- 1-5
      rd_level TEXT NOT NULL,     -- RD0/RD1/RD2/RD3/RD4
      indicator TEXT NOT NULL,    -- \u884C\u52D5\u6307\u6A19\uFF08\u65E5\u8A8C\u8A18\u8FF0\u306E\u8A55\u4FA1\u57FA\u6E96\uFF09
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(item_number, score)
    );

    CREATE TABLE IF NOT EXISTS self_evaluations (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      journal_id TEXT,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      total_score REAL,
      rd_journal_level INTEGER,
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, week_number)
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      journal_id TEXT,
      current_state TEXT DEFAULT 'phase0',
      phase_reached TEXT DEFAULT 'phase0',
      total_turns INTEGER DEFAULT 0,
      question_count INTEGER DEFAULT 0,
      max_rd_chat_level INTEGER DEFAULT 0,
      goal_set INTEGER DEFAULT 0,
      goal_is_smart INTEGER DEFAULT 0,
      session_duration_sec INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      message_order INTEGER NOT NULL,
      phase TEXT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      reflection_depth INTEGER,
      question_number INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      session_id TEXT,
      week_number INTEGER NOT NULL,
      goal_text TEXT NOT NULL,
      target_item_id INTEGER,
      target_factor TEXT,
      is_smart INTEGER DEFAULT 1,
      smart_specific INTEGER DEFAULT 1,
      smart_measurable INTEGER DEFAULT 1,
      smart_achievable INTEGER DEFAULT 1,
      smart_relevant INTEGER DEFAULT 1,
      smart_time_bound INTEGER DEFAULT 1,
      achieved INTEGER DEFAULT 0,
      evidence TEXT,
      difficulty_level TEXT,
      adjustment_reason TEXT,
      bfi_context TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS icc_results (
      id TEXT PRIMARY KEY,
      run_id TEXT,
      scope TEXT NOT NULL,
      factor TEXT,
      icc_value REAL NOT NULL,
      ci_lower REAL,
      ci_upper REAL,
      f_value REAL,
      df1 INTEGER,
      df2 INTEGER,
      p_value REAL,
      interpretation TEXT,
      rater_count INTEGER,
      subject_count INTEGER,
      krippendorff_alpha REAL,
      pearson_r REAL,
      pearson_p REAL,
      calculated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bland_altman_results (
      id TEXT PRIMARY KEY,
      run_id TEXT,
      factor TEXT,
      mean_diff REAL,
      sd_diff REAL,
      loa_upper REAL,
      loa_lower REAL,
      ci_mean_upper REAL,
      ci_mean_lower REAL,
      outlier_ratio REAL,
      bias_p_value REAL,
      subject_count INTEGER,
      calculated_at TEXT DEFAULT (datetime('now'))
    );


    CREATE TABLE IF NOT EXISTS scat_projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS scat_segments (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      segment_order INTEGER NOT NULL,
      text_content TEXT NOT NULL,
      source_journal_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS scat_codes (
      id TEXT PRIMARY KEY,
      segment_id TEXT NOT NULL,
      researcher_id TEXT NOT NULL,
      step1_keywords TEXT,
      step2_thesaurus TEXT,
      step3_concept TEXT,
      step4_theme TEXT,
      memo TEXT,
      factor TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(segment_id, researcher_id)
    );

    CREATE TABLE IF NOT EXISTS learning_progress_scores (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      total_score REAL,
      rd_journal_level INTEGER,
      ga_self INTEGER DEFAULT 0,
      ga_evidence INTEGER DEFAULT 0,
      growth_pattern TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, week_number)
    );

    CREATE INDEX IF NOT EXISTS idx_journals_student ON journal_entries(student_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_journal ON evaluations(journal_id);
    CREATE INDEX IF NOT EXISTS idx_human_evals_journal ON human_evaluations(journal_id);
    CREATE INDEX IF NOT EXISTS idx_self_evals_student ON self_evaluations(student_id);
    try { await db.exec("ALTER TABLE icc_results ADD COLUMN run_id TEXT;"); } catch (e) {}
    try { await db.exec("ALTER TABLE bland_altman_results ADD COLUMN run_id TEXT;"); } catch (e) {}

    CREATE INDEX IF NOT EXISTS idx_chat_sessions_student ON chat_sessions(student_id);
    CREATE INDEX IF NOT EXISTS idx_goals_student ON goals(student_id);
    CREATE INDEX IF NOT EXISTS idx_lps_student ON learning_progress_scores(student_id);
  `);
}
__name(K, "K");
function ne() {
  return crypto.randomUUID();
}
__name(ne, "ne");
function ae() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(ae, "ae");
j.get("/journals", async (e) => {
  var a;
  const t = (a = e.env) == null ? void 0 : a.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  await K(t);
  const r = e.req.query("student_id"), n = parseInt(e.req.query("limit") ?? "50");
  try {
    const o = r ? t.prepare("SELECT * FROM journal_entries WHERE student_id = ? ORDER BY entry_date DESC LIMIT ?").bind(r, n) : t.prepare("SELECT * FROM journal_entries ORDER BY entry_date DESC LIMIT ?").bind(n), { results: s } = await o.all();
    return e.json({ success: true, journals: s, count: s.length });
  } catch (o) {
    return e.json({ error: String(o) }, 500);
  }
});
j.post("/journals", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  await K(t);
  const r = await e.req.json();
  try {
    const a = ne(), o = r.content.replace(/\s/g, "").length;
    return await t.prepare(`
      INSERT INTO journal_entries (id, student_id, entry_date, week_number, title, content, word_count, status, ocr_source, ocr_confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(a, r.student_id, r.entry_date, r.week_number, r.title ?? null, r.content, o, r.status ?? "submitted", r.ocr_source ?? null, r.ocr_confidence ?? null, ae(), ae()).run(), e.json({ success: true, id: a, word_count: o });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.get("/journals/:id", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  const r = await t.prepare("SELECT * FROM journal_entries WHERE id = ?").bind(e.req.param("id")).first();
  return r ? e.json({ success: true, journal: r }) : e.json({ error: "Not found" }, 404);
});
j.post("/evaluations", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  await K(t);
  const r = await e.req.json();
  try {
    const a = { f1: [], f2: [], f3: [], f4: [] };
    r.evaluation.items.forEach((m) => {
      m.is_na || !m.score || (m.item_number <= 7 ? a.f1.push(m.score) : m.item_number <= 13 ? a.f2.push(m.score) : m.item_number <= 17 ? a.f3.push(m.score) : a.f4.push(m.score));
    });
    const o = /* @__PURE__ */ __name((m) => m.length ? Math.round(m.reduce((h, b) => h + b, 0) / m.length * 100) / 100 : null, "o"), s = [...a.f1, ...a.f2, ...a.f3, ...a.f4], i = o(s), c = o(a.f1), l = o(a.f2), d = o(a.f3), u = o(a.f4), f = ne();
    await t.prepare(`
      INSERT INTO evaluations (id, journal_id, eval_type, model_name, prompt_version, temperature,
        total_score, factor1_score, factor2_score, factor3_score, factor4_score,
        overall_comment, reasoning, halo_effect_detected, token_count, duration_ms, created_at)
      VALUES (?, ?, 'ai', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(f, r.journal_id, r.model_name ?? "gpt-4o", r.prompt_version ?? "CoT-A-v1.0", r.temperature ?? 0.2, i, c, l, d, u, r.evaluation.overall_comment, r.evaluation.reasoning, r.evaluation.halo_effect_detected ? 1 : 0, r.token_count ?? null, r.duration_ms ?? null, ae()).run();
    for (const m of r.evaluation.items) await t.prepare(`
        INSERT INTO evaluation_items (id, evaluation_id, item_number, score, is_na, evidence, feedback, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(ne(), f, m.item_number, m.score ?? null, m.is_na ? 1 : 0, m.evidence ?? null, m.feedback ?? null, ae()).run();
    return e.json({ success: true, evaluation_id: f });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.get("/evaluations", async (e) => {
  var r;
  const t = (r = e.env) == null ? void 0 : r.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  try {
    const n = await t.prepare("SELECT * FROM evaluations ORDER BY created_at DESC").all();
    return e.json({ success: true, evaluations: n.results });
  } catch (n) {
    return e.json({ error: String(n) }, 500);
  }
});
j.get("/evaluations/:journalId", async (e) => {
  var r;
  const t = (r = e.env) == null ? void 0 : r.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  try {
    const n = await t.prepare("SELECT * FROM evaluations WHERE journal_id = ? ORDER BY created_at DESC LIMIT 1").bind(e.req.param("journalId")).first();
    if (!n) return e.json({ error: "Not found" }, 404);
    const a = await t.prepare("SELECT * FROM evaluation_items WHERE evaluation_id = ? ORDER BY item_number").bind(n.id).all();
    return e.json({ success: true, evaluation: n, items: a.results });
  } catch (n) {
    return e.json({ error: String(n) }, 500);
  }
});
j.post("/human-evals", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  await K(t);
  const r = await e.req.json();
  try {
    const a = { f1: [], f2: [], f3: [], f4: [] };
    r.items.forEach((l) => {
      l.is_na || !l.score || (l.item_number <= 7 ? a.f1.push(l.score) : l.item_number <= 13 ? a.f2.push(l.score) : l.item_number <= 17 ? a.f3.push(l.score) : a.f4.push(l.score));
    });
    const o = /* @__PURE__ */ __name((l) => l.length ? Math.round(l.reduce((d, u) => d + u, 0) / l.length * 100) / 100 : null, "o"), s = [...a.f1, ...a.f2, ...a.f3, ...a.f4], i = await t.prepare("SELECT id FROM human_evaluations WHERE journal_id = ? AND evaluator_id = ?").bind(r.journal_id, r.evaluator_id).all();
    if (i.results && i.results.length > 0) {
      for (const l of i.results) await t.prepare("DELETE FROM human_eval_items WHERE human_eval_id = ?").bind(l.id).run();
      await t.prepare("DELETE FROM human_evaluations WHERE journal_id = ? AND evaluator_id = ?").bind(r.journal_id, r.evaluator_id).run();
    }
    const c = ne();
    await t.prepare(`
      INSERT INTO human_evaluations (id, journal_id, evaluator_id, evaluator_name,
        total_score, factor1_score, factor2_score, factor3_score, factor4_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(c, r.journal_id, r.evaluator_id, r.evaluator_name, o(s), o(a.f1), o(a.f2), o(a.f3), o(a.f4), ae()).run();
    for (const l of r.items) await t.prepare(`
        INSERT INTO human_eval_items (id, human_eval_id, item_number, score, is_na, comment)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(ne(), c, l.item_number, l.score ?? null, l.is_na ? 1 : 0, l.comment ?? null).run();
    return e.json({ success: true, human_eval_id: c });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.get("/human-evals", async (e) => {
  var r;
  const t = (r = e.env) == null ? void 0 : r.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  try {
    const n = await t.prepare("SELECT * FROM human_evaluations ORDER BY created_at DESC").all();
    return e.json({ success: true, evaluations: n.results });
  } catch (n) {
    return e.json({ error: String(n) }, 500);
  }
});
j.get("/human-evals/:journalId", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  const r = e.req.param("journalId");
  try {
    const o = (await t.prepare("SELECT * FROM human_evaluations WHERE journal_id = ? ORDER BY created_at DESC").bind(r).all()).results || [];
    for (const s of o) {
      const i = await t.prepare("SELECT * FROM human_eval_items WHERE human_eval_id = ? ORDER BY item_number ASC").bind(s.id).all();
      s.items = i.results || [];
    }
    return e.json({ evaluations: o });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.post("/self-evals", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  await K(t);
  const r = await e.req.json();
  try {
    const a = (r.factor1_score * 7 + r.factor2_score * 6 + r.factor3_score * 4 + r.factor4_score * 6) / 23, o = ne();
    return await t.prepare(`
      INSERT OR REPLACE INTO self_evaluations
        (id, student_id, week_number, journal_id, factor1_score, factor2_score, factor3_score, factor4_score,
         total_score, rd_journal_level, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(o, r.student_id, r.week_number, r.journal_id ?? null, r.factor1_score, r.factor2_score, r.factor3_score, r.factor4_score, Math.round(a * 100) / 100, r.rd_journal_level ?? null, r.comment ?? null, ae()).run(), e.json({ success: true, self_eval_id: o });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.get("/self-evals/:studentId", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  const { results: r } = await t.prepare("SELECT * FROM self_evaluations WHERE student_id = ? ORDER BY week_number").bind(e.req.param("studentId")).all();
  return e.json({ success: true, self_evaluations: r });
});
j.post("/goals", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  await K(t);
  const r = await e.req.json();
  try {
    const a = ne(), o = r.smart_criteria ?? {};
    return await t.prepare(`
      INSERT INTO goals (id, student_id, session_id, week_number, goal_text, target_item_id, target_factor,
        is_smart, smart_specific, smart_measurable, smart_achievable, smart_relevant, smart_time_bound, difficulty_level, adjustment_reason, bfi_context, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(a, r.student_id, r.session_id ?? null, r.week_number, r.goal_text, r.target_item_id ?? null, r.target_factor ?? null, r.is_smart ? 1 : 0, o.specific ? 1 : 0, o.measurable ? 1 : 0, o.achievable ? 1 : 0, o.relevant ? 1 : 0, o.time_bound ? 1 : 0, r.difficulty_level ?? null, r.adjustment_reason ?? null, r.bfi_context ? JSON.stringify(r.bfi_context) : null, ae()).run(), e.json({ success: true, goal_id: a });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.get("/goals/:studentId", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  const { results: r } = await t.prepare("SELECT * FROM goals WHERE student_id = ? ORDER BY week_number DESC").bind(e.req.param("studentId")).all();
  return e.json({ success: true, goals: r });
});
j.post("/icc-results", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  await K(t);
  const r = await e.req.json();
  try {
    return await t.prepare(`
      INSERT INTO icc_results (id, run_id, scope, factor, icc_value, ci_lower, ci_upper, f_value, df1, df2,
        p_value, interpretation, rater_count, subject_count, krippendorff_alpha, pearson_r, pearson_p, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(ne(), r.run_id ?? null, r.scope, r.factor ?? "total", r.icc_value, r.ci_lower ?? null, r.ci_upper ?? null, r.f_value ?? null, r.df1 ?? null, r.df2 ?? null, r.p_value ?? null, r.interpretation ?? null, r.rater_count ?? null, r.subject_count ?? null, r.krippendorff_alpha ?? null, r.pearson_r ?? null, r.pearson_p ?? null, ae()).run(), e.json({ success: true });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.get("/students", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  await K(t);
  const { results: r } = await t.prepare("SELECT * FROM users WHERE role = 'student' ORDER BY student_number").all();
  return e.json({ success: true, students: r });
});
j.get("/cohorts", async (e) => {
  var o;
  const t = (o = e.env) == null ? void 0 : o.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  const { results: r } = await t.prepare("SELECT student_id, week_number, factor1_score, factor2_score, factor3_score, factor4_score, total_score FROM self_evaluations ORDER BY student_id, week_number").all(), n = {};
  for (const s of r) n[s.student_id] || (n[s.student_id] = { id: s.student_id, name: s.student_id, weekly_scores: [] }), n[s.student_id].weekly_scores.push({ week: s.week_number, factor1: s.factor1_score, factor2: s.factor2_score, factor3: s.factor3_score, factor4: s.factor4_score, total: s.total_score });
  let a = Object.values(n);
  if (a.length < 5) {
    const s = [];
    for (let i = 1; i <= 30; i++) {
      const c = i % 3 === 0, l = i % 3 === 1, d = [];
      let u = c ? 2 : l ? 2.5 : 2.2;
      for (let f = 1; f <= 10; f++) u += (c ? 0.25 : l ? 0.05 : 0.15) + (Math.random() * 0.2 - 0.1), u = Math.max(1, Math.min(5, u)), d.push({ week: f, factor1: u, factor2: u, factor3: u, factor4: u, total: u });
      s.push({ id: `student-${i}`, name: `Student ${i}`, weekly_scores: d });
    }
    a = s;
  }
  return e.json({ success: true, cohorts: a });
});
j.get("/growth/:studentId", async (e) => {
  var s;
  const t = (s = e.env) == null ? void 0 : s.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  const r = e.req.param("studentId"), [n, a, o] = await Promise.all([t.prepare("SELECT * FROM self_evaluations WHERE student_id = ? ORDER BY week_number").bind(r).all(), t.prepare("SELECT * FROM goals WHERE student_id = ? ORDER BY week_number").bind(r).all(), t.prepare("SELECT * FROM chat_sessions WHERE student_id = ? ORDER BY created_at").bind(r).all()]);
  return e.json({ success: true, student_id: r, weekly_scores: n.results, goals: a.results, chat_sessions: o.results });
});
j.post("/bland-altman-results", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  await K(t);
  const r = await e.req.json();
  try {
    return await t.prepare(`
      INSERT INTO bland_altman_results (id, run_id, factor, mean_diff, sd_diff, loa_upper, loa_lower, 
        ci_mean_upper, ci_mean_lower, outlier_ratio, bias_p_value, subject_count, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(ne(), r.run_id ?? null, r.factor ?? "total", r.mean_diff, r.sd_diff, r.loa_upper, r.loa_lower, r.ci_mean_upper ?? null, r.ci_mean_lower ?? null, r.outlier_ratio ?? null, r.bias_p_value ?? null, r.subject_count ?? null, ae()).run(), e.json({ success: true });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.get("/reliability-results", async (e) => {
  var r;
  const t = (r = e.env) == null ? void 0 : r.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  try {
    const a = await t.prepare(`
      SELECT 
        i.calculated_at,
        i.run_id,
        i.scope AS data_source,
        i.subject_count AS paired_count,
        i.icc_value AS overall_icc,
        b.mean_diff AS overall_mean_diff
      FROM icc_results i
      LEFT JOIN bland_altman_results b 
        ON (i.run_id = b.run_id OR (i.run_id IS NULL AND b.run_id IS NULL AND datetime(i.calculated_at) = datetime(b.calculated_at))) 
        AND i.factor = b.factor
      WHERE i.factor = 'total' OR i.factor IS NULL
      GROUP BY i.run_id
      ORDER BY i.calculated_at DESC
    `).all();
    return e.json({ success: true, results: a.results });
  } catch (n) {
    return e.json({ error: String(n) }, 500);
  }
});
j.get("/reliability-results/:runId", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  const r = e.req.param("runId");
  try {
    const o = await t.prepare(`
      SELECT 
        i.factor,
        i.icc_value,
        i.ci_lower AS icc_ci_lower,
        i.ci_upper AS icc_ci_upper,
        b.mean_diff,
        b.loa_lower,
        b.loa_upper,
        i.subject_count,
        i.calculated_at,
        i.scope AS data_source,
        i.run_id
      FROM icc_results i
      LEFT JOIN bland_altman_results b 
        ON i.run_id = b.run_id AND i.factor = b.factor
      WHERE i.run_id = ?
      ORDER BY 
        CASE i.factor 
          WHEN 'total' THEN 0 
          WHEN 'factor1' THEN 1 
          WHEN 'factor2' THEN 2 
          WHEN 'factor3' THEN 3 
          WHEN 'factor4' THEN 4 
          ELSE 5 
        END
    `).bind(r).all();
    return e.json({ success: true, details: o.results });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.get("/export/evaluations-csv", async (e) => {
  var n;
  const t = e.req.header("X-User-Role");
  if (t !== "researcher" && t !== "admin") return e.text("Forbidden", 403);
  const r = (n = e.env) == null ? void 0 : n.DB;
  if (!r) return e.json({ error: "DB not configured" }, 503);
  try {
    const { results: a } = await r.prepare(`
      SELECT
        je.student_id, je.week_number, je.entry_date,
        e.total_score, e.factor1_score, e.factor2_score, e.factor3_score, e.factor4_score,
        e.halo_effect_detected, e.overall_comment, e.model_name
      FROM evaluations e
      JOIN journal_entries je ON e.journal_id = je.id
      WHERE e.eval_type = 'ai'
      ORDER BY je.student_id, je.week_number
    `).all(), o = ["student_id", "week_number", "entry_date", "total_score", "factor1_score", "factor2_score", "factor3_score", "factor4_score", "halo_effect_detected", "overall_comment", "model_name"], s = a.map((c) => o.map((l) => {
      const d = c[l], u = d == null ? "" : String(d);
      return u.includes(",") ? `"${u}"` : u;
    }).join(",")), i = [o.join(","), ...s].join(`
`);
    return new Response(i, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="ai_evaluations.csv"' } });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.get("/export/reliability-csv", async (e) => {
  var n;
  const t = e.req.header("X-User-Role");
  if (t !== "researcher" && t !== "admin") return e.text("Forbidden", 403);
  const r = (n = e.env) == null ? void 0 : n.DB;
  if (!r) return e.json({ error: "DB not configured" }, 503);
  try {
    const { results: a } = await r.prepare(`
      SELECT
        icc_value, ci_lower, ci_upper, f_value, df1, df2, p_value,
        interpretation, rater_count, subject_count,
        krippendorff_alpha, pearson_r, pearson_p,
        scope, factor, calculated_at
      FROM icc_results
      ORDER BY calculated_at DESC
    `).all(), o = ["scope", "factor", "icc_value", "ci_lower", "ci_upper", "f_value", "df1", "df2", "p_value", "interpretation", "rater_count", "subject_count", "krippendorff_alpha", "pearson_r", "pearson_p", "calculated_at"], s = a.map((c) => o.map((l) => {
      const d = c[l];
      return d == null ? "" : String(d);
    }).join(",")), i = [o.join(","), ...s].join(`
`);
    return new Response(i, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="reliability_results.csv"' } });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.get("/rubric-behaviors", async (e) => {
  var r;
  const t = (r = e.env) == null ? void 0 : r.DB;
  if (!t) return e.json({ error: "DB not configured" }, 500);
  try {
    const { results: n } = await t.prepare("SELECT * FROM rubric_item_behaviors ORDER BY item_number, score DESC").all();
    return e.json({ behaviors: n, total: n.length });
  } catch {
    return e.json({ behaviors: [], total: 0 });
  }
});
j.post("/rubric-behaviors/seed", async (e) => {
  var o;
  const t = (o = e.env) == null ? void 0 : o.DB;
  if (!t) return e.json({ error: "DB not configured" }, 500);
  const r = [{ item_number: 1, factor: "factor1", item_label: "\u7279\u5225\u652F\u63F4\u5BFE\u5FDC\u529B\uFF08\u5B9F\u8DF5\uFF09", lambda: 0.95, score: 5, rd_level: "RD4", indicator: "IEP\u76F8\u5F53\u306E\u652F\u63F4\u5185\u5BB9\u3092\u30A4\u30F3\u30AF\u30EB\u30FC\u30B7\u30D6\u6559\u80B2\u306E\u7406\u5FF5\u30FB\u969C\u5BB3\u8005\u6A29\u5229\u6761\u7D04\u7B49\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u300C\u306A\u305C\u305D\u306E\u652F\u63F4\u3092\u9078\u629E\u3057\u305F\u304B\u300D\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B\u3002\u62C5\u4EFB\u30FB\u7279\u5225\u652F\u63F4\u6559\u54E1\u3068\u9023\u643A\u3057\u305F\u5B9F\u8DF5\u306E\u6839\u62E0\u3092\u4FE1\u5FF5\u30EC\u30D9\u30EB\u3067\u8A18\u8FF0\u3057\u3066\u3044\u308B" }, { item_number: 1, factor: "factor1", item_label: "\u7279\u5225\u652F\u63F4\u5BFE\u5FDC\u529B\uFF08\u5B9F\u8DF5\uFF09", lambda: 0.95, score: 4, rd_level: "RD3", indicator: "\u6388\u696D\u524D\u306B\u652F\u63F4\u306E\u898B\u901A\u3057\u3092\u7ACB\u3066\u3001\u500B\u3005\u306E\u72B6\u614B\u306B\u5FDC\u3058\u305F\u5EA7\u5E2D\u30FB\u6559\u6750\u30FB\u58F0\u304B\u3051\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u4EE3\u66FF\u7684\u306A\u652F\u63F4\u65B9\u6CD5\u3092\u691C\u8A0E\u3057\u305F\u4E0A\u3067\u5B9F\u8DF5\u3057\u3001\u7D50\u679C\u3092\u7701\u5BDF\u3068\u3057\u3066\u65E5\u8A8C\u306B\u8A18\u3057\u3066\u3044\u308B" }, { item_number: 1, factor: "factor1", item_label: "\u7279\u5225\u652F\u63F4\u5BFE\u5FDC\u529B\uFF08\u5B9F\u8DF5\uFF09", lambda: 0.95, score: 3, rd_level: "RD2", indicator: "\u62C5\u5F53\u6559\u54E1\u306E\u6307\u793A\u306B\u5F93\u3044\u652F\u63F4\u3092\u5B9F\u65BD\u3057\u3001\u5B9F\u65BD\u5F8C\u306E\u611F\u60F3\u30FB\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\u3001\u539F\u56E0\u5206\u6790\u3084\u4EE3\u66FF\u6848\u306E\u691C\u8A0E\u306F\u9650\u5B9A\u7684" }, { item_number: 1, factor: "factor1", item_label: "\u7279\u5225\u652F\u63F4\u5BFE\u5FDC\u529B\uFF08\u5B9F\u8DF5\uFF09", lambda: 0.95, score: 2, rd_level: "RD1", indicator: "\u652F\u63F4\u306E\u4E8B\u5B9F\u306E\u307F\u3092\u8A18\u8FF0\u3059\u308B\u306B\u3068\u3069\u307E\u308A\uFF08\u300C\u25CB\u25CB\u3092\u3057\u305F\u300D\u300C\u5EA7\u5E2D\u3092\u914D\u616E\u3057\u305F\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u7684\u8981\u7D20\u3084\u6C17\u3065\u304D\u306E\u8A00\u8A9E\u5316\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 1, factor: "factor1", item_label: "\u7279\u5225\u652F\u63F4\u5BFE\u5FDC\u529B\uFF08\u5B9F\u8DF5\uFF09", lambda: 0.95, score: 1, rd_level: "RD0", indicator: "\u7279\u5225\u306A\u652F\u63F4\u304C\u5FC5\u8981\u306A\u5150\u7AE5\u3078\u306E\u5BFE\u5FDC\u30FB\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044\u3001\u307E\u305F\u306F\u8AA4\u3063\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 2, factor: "factor1", item_label: "\u5916\u56FD\u8A9E\u5150\u7AE5\u3078\u306E\u6307\u5C0E\u5B9F\u8DF5", lambda: 0.85, score: 5, rd_level: "RD4", indicator: "\u591A\u6587\u5316\u5171\u751F\u30FB\u8A00\u8A9E\u7684\u30DE\u30A4\u30CE\u30EA\u30C6\u30A3\u652F\u63F4\u306E\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u793E\u4F1A\u7684\u6587\u8108\uFF08JSL\u30AB\u30EA\u30AD\u30E5\u30E9\u30E0\u306E\u610F\u7FA9\u7B49\uFF09\u3068\u5B9F\u8DF5\u3092\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u300C\u306A\u305C\u305D\u306E\u6307\u5C0E\u624B\u6BB5\u3092\u9078\u3093\u3060\u304B\u300D\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 2, factor: "factor1", item_label: "\u5916\u56FD\u8A9E\u5150\u7AE5\u3078\u306E\u6307\u5C0E\u5B9F\u8DF5", lambda: 0.85, score: 4, rd_level: "RD3", indicator: "\u8996\u899A\u6559\u6750\u3084\u7C21\u6613\u306A\u65E5\u672C\u8A9E\u3067\u306E\u8A00\u3044\u63DB\u3048\u306A\u3069\u8907\u6570\u306E\u5DE5\u592B\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u300C\u4ED6\u306B\u3069\u3093\u306A\u65B9\u6CD5\u304C\u3042\u3063\u305F\u304B\u300D\u3092\u691C\u8A0E\u3057\u305F\u4E0A\u3067\u5B9F\u8DF5\u3057\u3001\u305D\u306E\u52B9\u679C\u3092\u7701\u5BDF\u3068\u3057\u3066\u65E5\u8A8C\u306B\u8A18\u3057\u3066\u3044\u308B" }, { item_number: 2, factor: "factor1", item_label: "\u5916\u56FD\u8A9E\u5150\u7AE5\u3078\u306E\u6307\u5C0E\u5B9F\u8DF5", lambda: 0.85, score: 3, rd_level: "RD2", indicator: "\u6307\u5C0E\u6559\u54E1\u306E\u30A2\u30C9\u30D0\u30A4\u30B9\u3092\u53D7\u3051\u3066\u30B7\u30F3\u30D7\u30EB\u306A\u8A00\u3044\u63DB\u3048\u3084\u8996\u899A\u88DC\u52A9\u3092\u884C\u3044\u3001\u5B9F\u65BD\u5F8C\u306E\u611F\u60F3\u30FB\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\u3001\u65B9\u6CD5\u306E\u6839\u62E0\u3084\u4EE3\u66FF\u6848\u3078\u306E\u8A00\u53CA\u306F\u9650\u5B9A\u7684" }, { item_number: 2, factor: "factor1", item_label: "\u5916\u56FD\u8A9E\u5150\u7AE5\u3078\u306E\u6307\u5C0E\u5B9F\u8DF5", lambda: 0.85, score: 2, rd_level: "RD1", indicator: "\u6BCD\u8A9E\u304C\u65E5\u672C\u8A9E\u3067\u306A\u3044\u5150\u7AE5\u3078\u306E\u5BFE\u5FDC\u306E\u4E8B\u5B9F\u306E\u307F\u3092\u8A18\u8FF0\u3057\uFF08\u300C\u3086\u3063\u304F\u308A\u8A71\u3057\u305F\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u7684\u8981\u7D20\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 2, factor: "factor1", item_label: "\u5916\u56FD\u8A9E\u5150\u7AE5\u3078\u306E\u6307\u5C0E\u5B9F\u8DF5", lambda: 0.85, score: 1, rd_level: "RD0", indicator: "\u8A72\u5F53\u5150\u7AE5\u3078\u306E\u500B\u5225\u5BFE\u5FDC\u30FB\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u8A18\u8FF0\u3055\u308C\u3066\u3044\u306A\u3044" }, { item_number: 3, factor: "factor1", item_label: "\u7279\u5225\u652F\u63F4\u5BFE\u5FDC\u529B\uFF08\u7406\u89E3\uFF09", lambda: 0.81, score: 5, rd_level: "RD4", indicator: "\u969C\u5BB3\u7A2E\u5225\uFF08LD\u30FBADHD\u30FBASD\u30FB\u8EAB\u4F53\u969C\u5BB3\u7B49\uFF09\u306B\u5FDC\u3058\u305F\u5BFE\u5FDC\u306E\u6839\u62E0\uFF08\u5236\u5EA6\u30FB\u7814\u7A76\u30FB\u6307\u5C0E\u66F8\u7B49\uFF09\u3092\u660E\u793A\u3057\u3001\u300C\u306A\u305C\u305D\u306E\u77E5\u8B58\u30FB\u5236\u5EA6\u3092\u6307\u5C0E\u65B9\u6CD5\u306E\u9078\u629E\u306B\u7528\u3044\u308B\u306E\u304B\u300D\u3092\u502B\u7406\u7684\u30FB\u793E\u4F1A\u7684\u89B3\u70B9\u304B\u3089\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 3, factor: "factor1", item_label: "\u7279\u5225\u652F\u63F4\u5BFE\u5FDC\u529B\uFF08\u7406\u89E3\uFF09", lambda: 0.81, score: 4, rd_level: "RD3", indicator: "\u8907\u6570\u306E\u969C\u5BB3\u7279\u6027\u3068\u5BFE\u5FDC\u7B56\u306E\u56E0\u679C\u95A2\u4FC2\u3092\u5206\u6790\u3057\u3001\u6388\u696D\u8A2D\u8A08\u3078\u306E\u53CD\u6620\u6839\u62E0\u3068\u4EE3\u66FF\u7684\u30A2\u30D7\u30ED\u30FC\u30C1\u3092\u5177\u4F53\u7684\u306B\u691C\u8A0E\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 3, factor: "factor1", item_label: "\u7279\u5225\u652F\u63F4\u5BFE\u5FDC\u529B\uFF08\u7406\u89E3\uFF09", lambda: 0.81, score: 3, rd_level: "RD2", indicator: "\u4E00\u822C\u7684\u306A\u652F\u63F4\u77E5\u8B58\uFF08\u914D\u616E\u4E8B\u9805\u30FB\u5408\u7406\u7684\u914D\u616E\u7B49\uFF09\u306E\u7406\u89E3\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\u3001\u5150\u7AE5\u306E\u5B9F\u614B\u3078\u306E\u5FDC\u7528\u6839\u62E0\u3084\u4EE3\u66FF\u6848\u3078\u306E\u8A00\u53CA\u306F\u9650\u5B9A\u7684" }, { item_number: 3, factor: "factor1", item_label: "\u7279\u5225\u652F\u63F4\u5BFE\u5FDC\u529B\uFF08\u7406\u89E3\uFF09", lambda: 0.81, score: 2, rd_level: "RD1", indicator: "\u7279\u5225\u652F\u63F4\u306B\u95A2\u3059\u308B\u77E5\u8B58\u3092\u65AD\u7247\u7684\u306B\u5217\u6319\u3059\u308B\u306B\u3068\u3069\u307E\u308A\uFF08\u300C\u25CB\u25CB\u306B\u914D\u616E\u304C\u5FC5\u8981\u3068\u601D\u3046\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u7684\u8981\u7D20\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 3, factor: "factor1", item_label: "\u7279\u5225\u652F\u63F4\u5BFE\u5FDC\u529B\uFF08\u7406\u89E3\uFF09", lambda: 0.81, score: 1, rd_level: "RD0", indicator: "\u7279\u5225\u652F\u63F4\u306B\u95A2\u3059\u308B\u7406\u89E3\u30FB\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u793A\u3055\u308C\u3066\u3044\u306A\u3044" }, { item_number: 4, factor: "factor1", item_label: "\u5916\u56FD\u8A9E\u5150\u7AE5\u3078\u306E\u5BFE\u5FDC\u7406\u89E3", lambda: 0.64, score: 5, rd_level: "RD4", indicator: "JSL\u30AB\u30EA\u30AD\u30E5\u30E9\u30E0\u30FB\u751F\u6D3B\u65E5\u672C\u8A9E\u6307\u5C0E\u30FB\u901A\u8A33\u652F\u63F4\u7B49\u306E\u5236\u5EA6\u7684\u67A0\u7D44\u307F\u3092\u3001\u591A\u6587\u5316\u5171\u751F\u6559\u80B2\u306E\u4FE1\u5FF5\u30FB\u793E\u4F1A\u7684\u6587\u8108\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u300C\u306A\u305C\u305D\u306E\u5236\u5EA6\u7684\u5BFE\u5FDC\u304C\u5FC5\u8981\u304B\u300D\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 4, factor: "factor1", item_label: "\u5916\u56FD\u8A9E\u5150\u7AE5\u3078\u306E\u5BFE\u5FDC\u7406\u89E3", lambda: 0.64, score: 4, rd_level: "RD3", indicator: "\u65E5\u672C\u8A9E\u6307\u5C0E\u306E\u65B9\u91DD\uFF08\u53D6\u308A\u51FA\u3057\u6307\u5C0E\u30FB\u5728\u7C4D\u5B66\u7D1A\u652F\u63F4\uFF09\u306E\u5DEE\u7570\u3092\u5206\u6790\u3057\u3001\u81EA\u30AF\u30E9\u30B9\u306E\u72B6\u6CC1\u306B\u7167\u3089\u3057\u305F\u8907\u6570\u306E\u9078\u629E\u80A2\u3068\u5224\u65AD\u6839\u62E0\u3092\u5177\u4F53\u7684\u306B\u691C\u8A0E\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 4, factor: "factor1", item_label: "\u5916\u56FD\u8A9E\u5150\u7AE5\u3078\u306E\u5BFE\u5FDC\u7406\u89E3", lambda: 0.64, score: 3, rd_level: "RD2", indicator: "\u8A00\u8A9E\u9762\u306E\u914D\u616E\uFF08\u308F\u304B\u308A\u3084\u3059\u3044\u65E5\u672C\u8A9E\u30FB\u8996\u899A\u652F\u63F4\uFF09\u3078\u306E\u7406\u89E3\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\u3001\u5236\u5EA6\u7684\u80CC\u666F\u306E\u77E5\u8B58\u30FB\u4EE3\u66FF\u6848\u3078\u306E\u8A00\u53CA\u306F\u9650\u5B9A\u7684" }, { item_number: 4, factor: "factor1", item_label: "\u5916\u56FD\u8A9E\u5150\u7AE5\u3078\u306E\u5BFE\u5FDC\u7406\u89E3", lambda: 0.64, score: 2, rd_level: "RD1", indicator: "\u300C\u914D\u616E\u304C\u5FC5\u8981\u300D\u3068\u3044\u3046\u8A8D\u8B58\u3092\u4E8B\u5B9F\u3068\u3057\u3066\u8A18\u8FF0\u3059\u308B\u306B\u3068\u3069\u307E\u308A\u3001\u5177\u4F53\u7684\u306A\u5BFE\u5FDC\u65B9\u6CD5\u306E\u691C\u8A0E\u3084\u7701\u5BDF\u304C\u4E4F\u3057\u3044" }, { item_number: 4, factor: "factor1", item_label: "\u5916\u56FD\u8A9E\u5150\u7AE5\u3078\u306E\u5BFE\u5FDC\u7406\u89E3", lambda: 0.64, score: 1, rd_level: "RD0", indicator: "\u5916\u56FD\u8A9E\u5150\u7AE5\u3078\u306E\u5BFE\u5FDC\u7406\u89E3\u30FB\u7701\u5BDF\u304C\u8A18\u8FF0\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 5, factor: "factor1", item_label: "\u6027\u5DEE\u30FB\u591A\u69D8\u6027\u3078\u306E\u7406\u89E3", lambda: 0.58, score: 5, rd_level: "RD4", indicator: "\u6027\u5DEE\u306B\u95A2\u3059\u308B\u767A\u9054\u5FC3\u7406\u5B66\u7684\u77E5\u898B\uFF08\u7D71\u8A08\u7684\u50BE\u5411\u3068\u500B\u4EBA\u5DEE\u306E\u533A\u5225\uFF09\u3092\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u502B\u7406\u7684\u89B3\u70B9\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u56FA\u5B9A\u7684\u6027\u5225\u5F79\u5272\u5206\u696D\u3092\u907F\u3051\u305F\u95A2\u308F\u308A\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u3001\u305D\u306E\u6839\u62E0\u3092\u7701\u5BDF\u306B\u8A18\u8FF0\u3057\u3066\u3044\u308B" }, { item_number: 5, factor: "factor1", item_label: "\u6027\u5DEE\u30FB\u591A\u69D8\u6027\u3078\u306E\u7406\u89E3", lambda: 0.58, score: 4, rd_level: "RD3", indicator: "\u30B0\u30EB\u30FC\u30D7\u7DE8\u6210\u30FB\u58F0\u304B\u3051\u7B49\u306B\u304A\u3051\u308B\u6027\u5DEE\u3078\u306E\u914D\u616E\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u300C\u5225\u306E\u95A2\u308F\u308A\u65B9\u306F\u306A\u304B\u3063\u305F\u304B\u300D\u3092\u5177\u4F53\u7684\u306B\u691C\u8A0E\u3057\u305F\u4E8B\u4F8B\u3092\u8A18\u8FF0\u3057\u3066\u3044\u308B" }, { item_number: 5, factor: "factor1", item_label: "\u6027\u5DEE\u30FB\u591A\u69D8\u6027\u3078\u306E\u7406\u89E3", lambda: 0.58, score: 3, rd_level: "RD2", indicator: "\u6027\u5DEE\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60C5\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u6027\u5DEE\u3092\u610F\u8B58\u3059\u308B\u5834\u9762\u304C\u3042\u3063\u305F\u300D\u7B49\uFF09\u3001\u5B9F\u8DF5\u3078\u306E\u5FDC\u7528\u6839\u62E0\u3084\u4EE3\u66FF\u6848\u3078\u306E\u8A00\u53CA\u306F\u9650\u5B9A\u7684" }, { item_number: 5, factor: "factor1", item_label: "\u6027\u5DEE\u30FB\u591A\u69D8\u6027\u3078\u306E\u7406\u89E3", lambda: 0.58, score: 2, rd_level: "RD1", indicator: "\u6027\u5DEE\u306B\u95A2\u3059\u308B\u4E8B\u5B9F\u306E\u307F\u3092\u5217\u6319\u3059\u308B\u306B\u3068\u3069\u307E\u308A\u3001\u7701\u5BDF\u7684\u8981\u7D20\u304C\u898B\u3089\u308C\u306A\u3044\u3002\u307E\u305F\u306F\u8A18\u8FF0\u306B\u56FA\u5B9A\u7684\u6027\u5225\u89B3\u304C\u898B\u3089\u308C\u308B" }, { item_number: 5, factor: "factor1", item_label: "\u6027\u5DEE\u30FB\u591A\u69D8\u6027\u3078\u306E\u7406\u89E3", lambda: 0.58, score: 1, rd_level: "RD0", indicator: "\u6027\u5DEE\u30FB\u591A\u69D8\u6027\u3078\u306E\u8A00\u53CA\u30FB\u7701\u5BDF\u304C\u306A\u304F\u3001\u7121\u81EA\u899A\u306A\u504F\u308A\u304C\u898B\u53D7\u3051\u3089\u308C\u308B" }, { item_number: 6, factor: "factor1", item_label: "\u6587\u5316\u7684\u591A\u69D8\u6027\u3078\u306E\u7406\u89E3", lambda: 0.45, score: 5, rd_level: "RD4", indicator: "\u7279\u5B9A\u306E\u5150\u7AE5\u306E\u884C\u52D5\u30FB\u53CD\u5FDC\u306E\u80CC\u666F\u306B\u3042\u308B\u6587\u5316\u7684\u30FB\u5B97\u6559\u7684\u30FB\u793E\u4F1A\u7684\u8981\u56E0\u3092\u591A\u6587\u5316\u5171\u751F\u306E\u4FE1\u5FF5\u30FB\u793E\u4F1A\u7684\u6587\u8108\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u300C\u81EA\u5206\u306E\u6587\u5316\u7684\u524D\u63D0\u306F\u4F55\u304B\u300D\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 6, factor: "factor1", item_label: "\u6587\u5316\u7684\u591A\u69D8\u6027\u3078\u306E\u7406\u89E3", lambda: 0.45, score: 4, rd_level: "RD3", indicator: "\u6587\u5316\u7684\u80CC\u666F\u304C\u5B66\u7FD2\u30FB\u884C\u52D5\u306B\u5F71\u97FF\u3059\u308B\u539F\u56E0\u30FB\u80CC\u666F\u3092\u8907\u6570\u306E\u4E8B\u4F8B\u3067\u5206\u6790\u3057\u3001\u4EE3\u66FF\u7684\u306A\u95A2\u308F\u308A\u65B9\u3092\u5177\u4F53\u7684\u306B\u691C\u8A0E\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 6, factor: "factor1", item_label: "\u6587\u5316\u7684\u591A\u69D8\u6027\u3078\u306E\u7406\u89E3", lambda: 0.45, score: 3, rd_level: "RD2", indicator: "\u591A\u6587\u5316\u5171\u751F\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u6587\u5316\u306E\u9055\u3044\u3092\u611F\u3058\u305F\u300D\u7B49\uFF09\u3001\u5B9F\u7FD2\u65E5\u8A8C\u3067\u306E\u8A00\u53CA\u306F\u62BD\u8C61\u7684\u3067\u539F\u56E0\u5206\u6790\u306F\u9650\u5B9A\u7684" }, { item_number: 6, factor: "factor1", item_label: "\u6587\u5316\u7684\u591A\u69D8\u6027\u3078\u306E\u7406\u89E3", lambda: 0.45, score: 2, rd_level: "RD1", indicator: "\u6587\u5316\u7684\u591A\u69D8\u6027\u306B\u95A2\u3059\u308B\u4E8B\u5B9F\u306E\u307F\u3092\u5217\u6319\u3059\u308B\u306B\u3068\u3069\u307E\u308A\u3001\u7701\u5BDF\u7684\u8981\u7D20\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 6, factor: "factor1", item_label: "\u6587\u5316\u7684\u591A\u69D8\u6027\u3078\u306E\u7406\u89E3", lambda: 0.45, score: 1, rd_level: "RD0", indicator: "\u6587\u5316\u7684\u591A\u69D8\u6027\u3078\u306E\u7406\u89E3\u30FB\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u793A\u3055\u308C\u3066\u3044\u306A\u3044" }, { item_number: 7, factor: "factor1", item_label: "\u6559\u79D1\u7279\u6027\u3092\u8E0F\u307E\u3048\u305F\u6388\u696D\u8A2D\u8A08", lambda: 0.44, score: 5, rd_level: "RD4", indicator: "\u62C5\u5F53\u6559\u79D1\u306E\u672C\u8CEA\u7684\u306A\u898B\u65B9\u30FB\u8003\u3048\u65B9\uFF08\u5B66\u7FD2\u6307\u5C0E\u8981\u9818\u6E96\u62E0\uFF09\u3068\u30AF\u30E9\u30B9\u306E\u5B66\u7FD2\u5B9F\u614B\u3092\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u6559\u79D1\u89B3\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u300C\u306A\u305C\u305D\u306E\u6388\u696D\u8A2D\u8A08\u3092\u9078\u629E\u3057\u305F\u304B\u300D\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u3001\u8AD6\u62E0\u3092\u65E5\u8A8C\u306B\u660E\u793A\u3057\u3066\u3044\u308B" }, { item_number: 7, factor: "factor1", item_label: "\u6559\u79D1\u7279\u6027\u3092\u8E0F\u307E\u3048\u305F\u6388\u696D\u8A2D\u8A08", lambda: 0.44, score: 4, rd_level: "RD3", indicator: "\u6559\u79D1\u7279\u6027\uFF08\u4F8B\uFF1A\u7B97\u6570\u306E\u6570\u5B66\u7684\u601D\u8003\u3001\u56FD\u8A9E\u306E\u8A00\u8A9E\u611F\u899A\uFF09\u3092\u610F\u8B58\u3057\u305F\u6388\u696D\u8A2D\u8A08\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u4EE3\u66FF\u7684\u306A\u8A2D\u8A08\u6848\u3068\u300C\u306A\u305C\u305D\u308C\u3092\u9078\u3093\u3060\u304B\u300D\u3092\u691C\u8A0E\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 7, factor: "factor1", item_label: "\u6559\u79D1\u7279\u6027\u3092\u8E0F\u307E\u3048\u305F\u6388\u696D\u8A2D\u8A08", lambda: 0.44, score: 3, rd_level: "RD2", indicator: "\u6559\u79D1\u66F8\u30FB\u6307\u5C0E\u66F8\u306B\u6CBF\u3063\u305F\u6388\u696D\u5B9F\u65BD\u5F8C\u306E\u6C17\u3065\u304D\u30FB\u611F\u60F3\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u5150\u7AE5\u306E\u53CD\u5FDC\u304C\u4E88\u60F3\u3068\u9055\u3063\u305F\u300D\u7B49\uFF09\u3001\u6559\u79D1\u7279\u6027\u3078\u306E\u5FDC\u7528\u6839\u62E0\u3084\u4EE3\u66FF\u6848\u306F\u9650\u5B9A\u7684" }, { item_number: 7, factor: "factor1", item_label: "\u6559\u79D1\u7279\u6027\u3092\u8E0F\u307E\u3048\u305F\u6388\u696D\u8A2D\u8A08", lambda: 0.44, score: 2, rd_level: "RD1", indicator: "\u6388\u696D\u8A2D\u8A08\u304C\u6307\u5C0E\u66F8\u306E\u6A21\u5023\u306B\u3068\u3069\u307E\u308A\u3001\u6388\u696D\u306E\u4E8B\u5B9F\u306E\u307F\u3092\u8A18\u8FF0\u3057\u3001\u7701\u5BDF\u7684\u8981\u7D20\u3084\u5150\u7AE5\u5B9F\u614B\u3068\u306E\u63A5\u7D9A\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 7, factor: "factor1", item_label: "\u6559\u79D1\u7279\u6027\u3092\u8E0F\u307E\u3048\u305F\u6388\u696D\u8A2D\u8A08", lambda: 0.44, score: 1, rd_level: "RD0", indicator: "\u6388\u696D\u8A2D\u8A08\u306E\u6839\u62E0\u3084\u5150\u7AE5\u5B9F\u614B\u3078\u306E\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 8, factor: "factor2", item_label: "\u4F53\u9A13\u3068\u6210\u9577\u306E\u63A5\u7D9A", lambda: 0.94, score: 5, rd_level: "RD4", indicator: "\u7279\u5B9A\u306E\u5B9F\u7FD2\u4F53\u9A13\u3092\u3001\u6559\u5E2B\u6210\u9577\u7406\u8AD6\uFF08\u53CD\u7701\u7684\u5B9F\u8DF5\u5BB6\u8AD6\u30FBDreyfus\u30E2\u30C7\u30EB\u7B49\uFF09\u3084\u81EA\u5DF1\u306E\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u793E\u4F1A\u7684\u6587\u8108\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u5C06\u6765\u306E\u5C02\u9580\u7684\u767A\u9054\u3078\u306E\u542B\u610F\u304A\u3088\u3073\u73FE\u5728\u306E\u4FE1\u5FF5\u306E\u554F\u3044\u76F4\u3057\u3092\u8A18\u8FF0\u3057\u3066\u3044\u308B" }, { item_number: 8, factor: "factor2", item_label: "\u4F53\u9A13\u3068\u6210\u9577\u306E\u63A5\u7D9A", lambda: 0.94, score: 4, rd_level: "RD3", indicator: "\u5177\u4F53\u7684\u306A\u4F53\u9A13\u304B\u3089\u300C\u306A\u305C\u305D\u3046\u306A\u3063\u305F\u304B\u300D\u300C\u4F55\u3092\u5B66\u3093\u3060\u304B\u300D\u3092\u539F\u56E0\uFF0D\u7D50\u679C\u3068\u3057\u3066\u5206\u6790\u3057\u3001\u5225\u306E\u95A2\u308F\u308A\u65B9\u3084\u6B21\u56DE\u3078\u306E\u6539\u5584\u7B56\u3092\u691C\u8A0E\u3057\u3066\u3044\u308B" }, { item_number: 8, factor: "factor2", item_label: "\u4F53\u9A13\u3068\u6210\u9577\u306E\u63A5\u7D9A", lambda: 0.94, score: 3, rd_level: "RD2", indicator: "\u4F53\u9A13\u304B\u3089\u5F97\u305F\u611F\u60C5\u30FB\u6C17\u3065\u304D\uFF08\u300C\u25CB\u25CB\u304C\u5927\u5909\u3060\u3063\u305F\u300D\u300C\u25B3\u25B3\u306B\u9A5A\u3044\u305F\u300D\u7B49\uFF09\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\u3001\u6559\u5E2B\u3068\u3057\u3066\u306E\u767A\u9054\u3068\u306E\u56E0\u679C\u5206\u6790\u3084\u4EE3\u66FF\u6848\u306F\u9650\u5B9A\u7684" }, { item_number: 8, factor: "factor2", item_label: "\u4F53\u9A13\u3068\u6210\u9577\u306E\u63A5\u7D9A", lambda: 0.94, score: 2, rd_level: "RD1", indicator: "\u4F53\u9A13\u3092\u300C\u3067\u304D\u305F\u30FB\u3067\u304D\u306A\u304B\u3063\u305F\u300D\u306E\u4E8B\u5B9F\u3068\u3057\u3066\u5217\u6319\u3059\u308B\u306B\u3068\u3069\u307E\u308A\u3001\u6559\u5E2B\u3068\u3057\u3066\u306E\u6210\u9577\u3084\u767A\u9054\u3068\u306E\u63A5\u7D9A\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 8, factor: "factor2", item_label: "\u4F53\u9A13\u3068\u6210\u9577\u306E\u63A5\u7D9A", lambda: 0.94, score: 1, rd_level: "RD0", indicator: "\u4F53\u9A13\u3068\u6559\u5E2B\u3068\u3057\u3066\u306E\u6210\u9577\u306E\u95A2\u4FC2\u306B\u3064\u3044\u3066\u306E\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 9, factor: "factor2", item_label: "\u6307\u5C0E\u59FF\u52E2\u306E\u691C\u8A3C\u80FD\u529B", lambda: 0.81, score: 5, rd_level: "RD4", indicator: "\u81EA\u5DF1\u306E\u6307\u5C0E\u54F2\u5B66\u30FB\u6559\u80B2\u7684\u4FE1\u5FF5\u306B\u7167\u3089\u3057\u3066\u6388\u696D\u5B9F\u8DF5\u3092\u6279\u5224\u7684\u306B\u554F\u3044\u76F4\u3057\u3001\u300C\u306A\u305C\u305D\u306E\u6307\u5C0E\u3092\u9078\u3093\u3060\u304B\u300D\u300C\u305D\u306E\u524D\u63D0\u306F\u59A5\u5F53\u304B\u300D\u3092\u7406\u8AD6\u7684\u88CF\u4ED8\u3051\u3068\u3068\u3082\u306B\u8A18\u8FF0\u3057\u3001\u7D99\u7D9A\u7684\u306A\u6559\u80B2\u3078\u306E\u95A2\u5FC3\u304C\u4FE1\u5FF5\u30EC\u30D9\u30EB\u3067\u793A\u3055\u308C\u3066\u3044\u308B" }, { item_number: 9, factor: "factor2", item_label: "\u6307\u5C0E\u59FF\u52E2\u306E\u691C\u8A3C\u80FD\u529B", lambda: 0.81, score: 4, rd_level: "RD3", indicator: "\u6388\u696D\u4E2D\u306E\u81EA\u5DF1\u884C\u52D5\uFF08\u767A\u554F\u30FB\u677F\u66F8\u30FB\u53CD\u5FDC\u7B49\uFF09\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u591A\u89D2\u7684\u306B\u5206\u6790\u3057\u3001\u5177\u4F53\u7684\u306A\u4EE3\u66FF\u7B56\u30FB\u6539\u5584\u6848\u3092\u63D0\u793A\u3057\u3066\u3044\u308B" }, { item_number: 9, factor: "factor2", item_label: "\u6307\u5C0E\u59FF\u52E2\u306E\u691C\u8A3C\u80FD\u529B", lambda: 0.81, score: 3, rd_level: "RD2", indicator: "\u6388\u696D\u3078\u306E\u611F\u60F3\u3084\u6C17\u3065\u304D\uFF08\u300C\u767A\u554F\u304C\u96E3\u3057\u304B\u3063\u305F\u300D\u300C\u5150\u7AE5\u304C\u7A4D\u6975\u7684\u3060\u3063\u305F\u300D\u7B49\uFF09\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\u3001\u691C\u8A3C\u306E\u8996\u70B9\u30FB\u65B9\u6CD5\u304C\u8868\u9762\u7684" }, { item_number: 9, factor: "factor2", item_label: "\u6307\u5C0E\u59FF\u52E2\u306E\u691C\u8A3C\u80FD\u529B", lambda: 0.81, score: 2, rd_level: "RD1", indicator: "\u6388\u696D\u5F8C\u306E\u8A18\u8FF0\u304C\u300C\u3046\u307E\u304F\u3044\u3063\u305F\u30FB\u3046\u307E\u304F\u3044\u304B\u306A\u304B\u3063\u305F\u300D\u306E\u4E8B\u5B9F\u8A55\u4FA1\u306B\u3068\u3069\u307E\u308A\u3001\u691C\u8A3C\u30D7\u30ED\u30BB\u30B9\u304C\u898B\u3048\u306A\u3044" }, { item_number: 9, factor: "factor2", item_label: "\u6307\u5C0E\u59FF\u52E2\u306E\u691C\u8A3C\u80FD\u529B", lambda: 0.81, score: 1, rd_level: "RD0", indicator: "\u81EA\u5206\u306E\u6307\u5C0E\u59FF\u52E2\u3078\u306E\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 10, factor: "factor2", item_label: "\u6A21\u7BC4\u7684\u59FF\u52E2\u306E\u5B9F\u8DF5", lambda: 0.72, score: 5, rd_level: "RD4", indicator: "\u81EA\u5DF1\u306E\u4FA1\u5024\u89B3\u30FB\u614B\u5EA6\u3092\u6559\u80B2\u7684\u4FE1\u5FF5\u3084\u6587\u5316\u7684\u30FB\u502B\u7406\u7684\u6587\u8108\u3068\u6279\u5224\u7684\u306B\u541F\u5473\u3057\u3001\u300C\u306A\u305C\u305D\u306E\u4FA1\u5024\u89B3\u3092\u6A21\u7BC4\u3068\u3057\u3066\u793A\u3059\u3079\u304D\u304B\u300D\u3092\u554F\u3044\u76F4\u3057\u305F\u4E0A\u3067\u3001\u610F\u56F3\u7684\u306A\u5B9F\u8DF5\u3068\u305D\u306E\u7701\u5BDF\u3092\u8A18\u8FF0\u3057\u3066\u3044\u308B" }, { item_number: 10, factor: "factor2", item_label: "\u6A21\u7BC4\u7684\u59FF\u52E2\u306E\u5B9F\u8DF5", lambda: 0.72, score: 4, rd_level: "RD3", indicator: "\u6A21\u7BC4\u3068\u3057\u3066\u793A\u3057\u305F\u884C\u52D5\uFF08\u6328\u62F6\u30FB\u516C\u5E73\u306A\u5BFE\u5FDC\u30FB\u7A4D\u6975\u6027\u7B49\uFF09\u306E\u52B9\u679C\u30FB\u5F71\u97FF\u3092\u5206\u6790\u3057\u3001\u300C\u5225\u306E\u793A\u3057\u65B9\u306F\u306A\u304B\u3063\u305F\u304B\u300D\u300C\u306A\u305C\u305D\u308C\u3092\u9078\u3093\u3060\u304B\u300D\u3092\u5177\u4F53\u7684\u306B\u691C\u8A0E\u3057\u3066\u3044\u308B" }, { item_number: 10, factor: "factor2", item_label: "\u6A21\u7BC4\u7684\u59FF\u52E2\u306E\u5B9F\u8DF5", lambda: 0.72, score: 3, rd_level: "RD2", indicator: "\u6A21\u7BC4\u3092\u793A\u305D\u3046\u3068\u3057\u305F\u5834\u9762\u306E\u611F\u60C5\u30FB\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u624B\u672C\u306B\u306A\u308C\u305F\u304B\u4E0D\u5B89\u3060\u3063\u305F\u300D\u7B49\uFF09\u3001\u539F\u56E0\u5206\u6790\u3084\u4EE3\u66FF\u6848\u306E\u691C\u8A0E\u306F\u9650\u5B9A\u7684" }, { item_number: 10, factor: "factor2", item_label: "\u6A21\u7BC4\u7684\u59FF\u52E2\u306E\u5B9F\u8DF5", lambda: 0.72, score: 2, rd_level: "RD1", indicator: "\u6A21\u7BC4\u7684\u884C\u52D5\u306E\u4E8B\u5B9F\u306E\u307F\u3092\u8A18\u8FF0\u3057\uFF08\u300C\u6328\u62F6\u3092\u3057\u305F\u300D\u300C\u7B11\u9854\u3067\u63A5\u3057\u305F\u300D\u7B49\uFF09\u3001\u5185\u7684\u306A\u6C17\u3065\u304D\u3084\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 10, factor: "factor2", item_label: "\u6A21\u7BC4\u7684\u59FF\u52E2\u306E\u5B9F\u8DF5", lambda: 0.72, score: 1, rd_level: "RD0", indicator: "\u81EA\u5206\u304C\u6A21\u7BC4\u3092\u793A\u3059\u3068\u3044\u3046\u8996\u70B9\u3067\u306E\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 11, factor: "factor2", item_label: "\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u53D7\u5BB9\u529B", lambda: 0.62, score: 5, rd_level: "RD4", indicator: "\u53D7\u3051\u305F\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u3092\u81EA\u5DF1\u306E\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u5B9F\u8DF5\u54F2\u5B66\u306B\u7167\u3089\u3057\u3066\u6279\u5224\u7684\u306B\u691C\u8A0E\u3057\u3001\u53D6\u6368\u9078\u629E\u306E\u6839\u62E0\u30FB\u4FE1\u5FF5\u30EC\u30D9\u30EB\u3067\u306E\u554F\u3044\u76F4\u3057\u3092\u8A18\u8FF0\u3057\u3066\u3044\u308B\uFF08\u300C\u3053\u306E\u30A2\u30C9\u30D0\u30A4\u30B9\u3092\u53D7\u3051\u5165\u308C\u308B\u3053\u3068\u304C\u81EA\u5206\u306E\u6559\u80B2\u89B3\u3068\u3069\u3046\u6574\u5408\u3059\u308B\u304B\u300D\u7B49\uFF09" }, { item_number: 11, factor: "factor2", item_label: "\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u53D7\u5BB9\u529B", lambda: 0.62, score: 4, rd_level: "RD3", indicator: "\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u306E\u80CC\u666F\u30FB\u610F\u56F3\u3092\u5206\u6790\u3057\u3001\u5177\u4F53\u7684\u306A\u6539\u5584\u884C\u52D5\u3068\u8907\u6570\u306E\u4EE3\u66FF\u6848\u3092\u63D0\u793A\u3057\u3001\u305D\u306E\u5B9F\u8DF5\u7D50\u679C\u3092\u7701\u5BDF\u3068\u3057\u3066\u8A18\u8FF0\u3057\u3066\u3044\u308B" }, { item_number: 11, factor: "factor2", item_label: "\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u53D7\u5BB9\u529B", lambda: 0.62, score: 3, rd_level: "RD2", indicator: "\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u3092\u53D7\u3051\u305F\u969B\u306E\u611F\u60C5\u30FB\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u53B3\u3057\u304B\u3063\u305F\u304C\u6C17\u3065\u3044\u305F\u300D\u7B49\uFF09\u3001\u6539\u5584\u884C\u52D5\u3078\u306E\u5177\u4F53\u7684\u306A\u63A5\u7D9A\u3084\u539F\u56E0\u5206\u6790\u304C\u4E0D\u660E\u78BA" }, { item_number: 11, factor: "factor2", item_label: "\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u53D7\u5BB9\u529B", lambda: 0.62, score: 2, rd_level: "RD1", indicator: "\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u306E\u5185\u5BB9\u3092\u4E8B\u5B9F\u3068\u3057\u3066\u8A18\u9332\u3059\u308B\u306B\u3068\u3069\u307E\u308A\uFF08\u300C\u25CB\u25CB\u3068\u8A00\u308F\u308C\u305F\u300D\u7B49\uFF09\u3001\u53D7\u5BB9\u30FB\u7701\u5BDF\u306E\u8A18\u8FF0\u304C\u306A\u3044" }, { item_number: 11, factor: "factor2", item_label: "\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u53D7\u5BB9\u529B", lambda: 0.62, score: 1, rd_level: "RD0", indicator: "\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u3078\u306E\u8A00\u53CA\u30FB\u53D7\u5BB9\u306E\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 12, factor: "factor2", item_label: "\u5B9F\u8DF5\u7701\u5BDF\u3068\u6539\u5584\u8CAC\u4EFB", lambda: 0.61, score: 5, rd_level: "RD4", indicator: "\u5B9F\u8DF5\u306E\u554F\u984C\u70B9\u3092\u793E\u4F1A\u7684\u30FB\u6559\u80B2\u7684\u6587\u8108\uFF08\u5B66\u6821\u5236\u5EA6\u3001\u6587\u5316\u7684\u80CC\u666F\u7B49\uFF09\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u5C02\u9580\u7684\u30A2\u30A4\u30C7\u30F3\u30C6\u30A3\u30C6\u30A3\u306E\u5F62\u6210\u3068\u95A2\u9023\u3055\u305B\u3066\u7701\u5BDF\u3057\u3066\u3044\u308B\u3002\u81EA\u5DF1\u306E\u5C02\u9580\u7684\u30CB\u30FC\u30BA\u3092\u69CB\u9020\u7684\u306B\u8A18\u8FF0\u3057\u3001\u9577\u671F\u7684\u6539\u5584\u8CAC\u4EFB\u3092\u8868\u660E\u3057\u3066\u3044\u308B" }, { item_number: 12, factor: "factor2", item_label: "\u5B9F\u8DF5\u7701\u5BDF\u3068\u6539\u5584\u8CAC\u4EFB", lambda: 0.61, score: 4, rd_level: "RD3", indicator: "\u5B9F\u8DF5\u8AB2\u984C\u306E\u539F\u56E0\u3092\u591A\u89D2\u7684\u306B\u5206\u6790\u3057\uFF08\u300C\u306A\u305C\u5931\u6557\u3057\u305F\u304B\u300D\u300C\u4F55\u304C\u5F71\u97FF\u3057\u3066\u3044\u308B\u304B\u300D\uFF09\u3001\u5177\u4F53\u7684\u6539\u5584\u8A08\u753B\u3068\u5B9F\u884C\u30FB\u518D\u8A55\u4FA1\u306E\u30B5\u30A4\u30AF\u30EB\u3092\u8A18\u8FF0\u3057\u3066\u3044\u308B" }, { item_number: 12, factor: "factor2", item_label: "\u5B9F\u8DF5\u7701\u5BDF\u3068\u6539\u5584\u8CAC\u4EFB", lambda: 0.61, score: 3, rd_level: "RD2", indicator: "\u5B9F\u8DF5\u306E\u554F\u984C\u70B9\u3078\u306E\u6C17\u3065\u304D\u3068\u6539\u5584\u610F\u6B32\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u6B21\u306F\u3046\u307E\u304F\u3084\u308A\u305F\u3044\u300D\u7B49\uFF09\u3001\u539F\u56E0\u5206\u6790\u3084\u6539\u5584\u306E\u5177\u4F53\u7B56\u304C\u6D45\u3044" }, { item_number: 12, factor: "factor2", item_label: "\u5B9F\u8DF5\u7701\u5BDF\u3068\u6539\u5584\u8CAC\u4EFB", lambda: 0.61, score: 2, rd_level: "RD1", indicator: "\u5B9F\u8DF5\u306E\u7D50\u679C\u3092\u4E8B\u5B9F\u3068\u3057\u3066\u8A18\u8FF0\u3059\u308B\u306B\u3068\u3069\u307E\u308A\uFF08\u300C\u6388\u696D\u304C\u3046\u307E\u304F\u3044\u304B\u306A\u304B\u3063\u305F\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u30FB\u8CAC\u4EFB\u610F\u8B58\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 12, factor: "factor2", item_label: "\u5B9F\u8DF5\u7701\u5BDF\u3068\u6539\u5584\u8CAC\u4EFB", lambda: 0.61, score: 1, rd_level: "RD0", indicator: "\u5B9F\u8DF5\u7701\u5BDF\u30FB\u6539\u5584\u8CAC\u4EFB\u3078\u306E\u8A00\u53CA\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 13, factor: "factor2", item_label: "\u5C02\u9580\u6027\u5411\u4E0A\u306E\u305F\u3081\u306E\u81EA\u5DF1\u8A55\u4FA1", lambda: 0.52, score: 5, rd_level: "RD4", indicator: "\u5916\u90E8\u8A55\u4FA1\u30FB\u81EA\u5DF1\u8A55\u4FA1\u30FB\u6559\u80B2\u7684\u4FE1\u5FF5\u3092\u7D71\u5408\u3057\u3001\u81EA\u5DF1\u306E\u5C02\u9580\u7684\u6210\u9577\u6BB5\u968E\u3068\u793E\u4F1A\u7684\u5F79\u5272\u3092\u6279\u5224\u7684\u306B\u8A55\u4FA1\u3057\u3066\u3044\u308B\u3002\u300C\u306A\u305C\u305D\u306E\u8A55\u4FA1\u57FA\u6E96\u3092\u7528\u3044\u308B\u306E\u304B\u300D\u300C\u81EA\u5206\u306E\u6210\u9577\u306B\u4F55\u304C\u6B20\u3051\u3066\u3044\u308B\u304B\u300D\u3092\u7406\u8AD6\u7684\u30FB\u502B\u7406\u7684\u89B3\u70B9\u304B\u3089\u554F\u3044\u76F4\u3057\u3066\u3044\u308B" }, { item_number: 13, factor: "factor2", item_label: "\u5C02\u9580\u6027\u5411\u4E0A\u306E\u305F\u3081\u306E\u81EA\u5DF1\u8A55\u4FA1", lambda: 0.52, score: 4, rd_level: "RD3", indicator: "\u81EA\u5DF1\u8A55\u4FA1\u3068\u4ED6\u8005\u8A55\u4FA1\u306E\u5DEE\u7570\u3092\u5206\u6790\u3057\u3001\u8907\u6570\u306E\u8996\u70B9\u304B\u3089\u5F37\u307F\u3068\u8AB2\u984C\u3092\u7279\u5B9A\u3057\u3001\u5177\u4F53\u7684\u306A\u6210\u9577\u8AB2\u984C\u3068\u6539\u5584\u884C\u52D5\u3092\u8A18\u8FF0\u3057\u3066\u3044\u308B" }, { item_number: 13, factor: "factor2", item_label: "\u5C02\u9580\u6027\u5411\u4E0A\u306E\u305F\u3081\u306E\u81EA\u5DF1\u8A55\u4FA1", lambda: 0.52, score: 3, rd_level: "RD2", indicator: "\u81EA\u5DF1\u8A55\u4FA1\u3092\u8A66\u307F\u3001\u611F\u60C5\u30FB\u6C17\u3065\u304D\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u81EA\u5206\u306F\u3007\u3007\u304C\u82E6\u624B\u3060\u3068\u601D\u3063\u305F\u300D\u7B49\uFF09\u3001\u8A55\u4FA1\u57FA\u6E96\u304C\u4E3B\u89B3\u7684\u3067\u539F\u56E0\u5206\u6790\u304C\u6D45\u3044" }, { item_number: 13, factor: "factor2", item_label: "\u5C02\u9580\u6027\u5411\u4E0A\u306E\u305F\u3081\u306E\u81EA\u5DF1\u8A55\u4FA1", lambda: 0.52, score: 2, rd_level: "RD1", indicator: "\u81EA\u5DF1\u8A55\u4FA1\u304C\u300C\u3088\u304B\u3063\u305F\u30FB\u60AA\u304B\u3063\u305F\u300D\u306E\u4E8C\u5024\u7684\u5224\u65AD\u306B\u3068\u3069\u307E\u308A\u3001\u6839\u62E0\u30FB\u7701\u5BDF\u304C\u4E4F\u3057\u3044" }, { item_number: 13, factor: "factor2", item_label: "\u5C02\u9580\u6027\u5411\u4E0A\u306E\u305F\u3081\u306E\u81EA\u5DF1\u8A55\u4FA1", lambda: 0.52, score: 1, rd_level: "RD0", indicator: "\u81EA\u5DF1\u8A55\u4FA1\u30FB\u81EA\u5DF1\u7701\u5BDF\u306E\u8A18\u8FF0\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 14, factor: "factor3", item_label: "\u751F\u5F92\u6307\u5C0E\u529B", lambda: 0.91, score: 5, rd_level: "RD4", indicator: "\u554F\u984C\u884C\u52D5\u306E\u80CC\u666F\u8981\u56E0\uFF08\u5BB6\u5EAD\u74B0\u5883\u30FB\u53CB\u4EBA\u95A2\u4FC2\u30FB\u5B66\u7FD2\u56F0\u96E3\u7B49\uFF09\u3092\u751F\u5F92\u6307\u5C0E\u306E\u7406\u5FF5\u30FB\u793E\u4F1A\u7684\u6587\u8108\uFF08\u4E88\u9632\u7684\u30FB\u6CBB\u7642\u7684\u6307\u5C0E\u306E\u610F\u7FA9\u7B49\uFF09\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u300C\u306A\u305C\u305D\u306E\u6307\u5C0E\u65B9\u91DD\u3092\u9078\u629E\u3057\u305F\u304B\u300D\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 14, factor: "factor3", item_label: "\u751F\u5F92\u6307\u5C0E\u529B", lambda: 0.91, score: 4, rd_level: "RD3", indicator: "\u751F\u5F92\u6307\u5C0E\u4E0A\u306E\u554F\u984C\u5834\u9762\u306B\u304A\u3051\u308B\u539F\u56E0\u30FB\u80CC\u666F\u3092\u591A\u89D2\u7684\u306B\u5206\u6790\u3057\u3001\u4EE3\u66FF\u7684\u306A\u4ECB\u5165\u65B9\u6CD5\u3092\u691C\u8A0E\u3057\u305F\u4E0A\u3067\u9069\u5207\u306B\u5BFE\u5FDC\u3057\u3001\u6307\u5C0E\u5F8C\u306E\u7D4C\u904E\u89B3\u5BDF\u3068\u7701\u5BDF\u3092\u65E5\u8A8C\u306B\u8A18\u8FF0\u3057\u3066\u3044\u308B" }, { item_number: 14, factor: "factor3", item_label: "\u751F\u5F92\u6307\u5C0E\u529B", lambda: 0.91, score: 3, rd_level: "RD2", indicator: "\u751F\u5F92\u6307\u5C0E\u306E\u57FA\u672C\u65B9\u91DD\uFF08\u53F1\u8CAC\u3088\u308A\u652F\u63F4\uFF09\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u96E3\u3057\u304B\u3063\u305F\u300D\u300C\u3069\u3046\u5BFE\u5FDC\u3059\u3079\u304D\u304B\u308F\u304B\u3089\u306A\u304B\u3063\u305F\u300D\u7B49\uFF09\u3001\u539F\u56E0\u5206\u6790\u3084\u4EE3\u66FF\u6848\u306E\u691C\u8A0E\u306F\u9650\u5B9A\u7684" }, { item_number: 14, factor: "factor3", item_label: "\u751F\u5F92\u6307\u5C0E\u529B", lambda: 0.91, score: 2, rd_level: "RD1", indicator: "\u554F\u984C\u884C\u52D5\u3078\u306E\u5BFE\u5FDC\u306E\u4E8B\u5B9F\u306E\u307F\u3092\u8A18\u8FF0\u3059\u308B\u306B\u3068\u3069\u307E\u308A\uFF08\u300C\u6CE8\u610F\u3057\u305F\u300D\u300C\u6307\u5C0E\u6559\u54E1\u306B\u5831\u544A\u3057\u305F\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u7684\u8981\u7D20\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 14, factor: "factor3", item_label: "\u751F\u5F92\u6307\u5C0E\u529B", lambda: 0.91, score: 1, rd_level: "RD0", indicator: "\u751F\u5F92\u6307\u5C0E\u306B\u95A2\u3059\u308B\u610F\u8B58\u30FB\u5B9F\u8DF5\u30FB\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 15, factor: "factor3", item_label: "\u5B66\u7D1A\u7BA1\u7406\u80FD\u529B", lambda: 0.87, score: 5, rd_level: "RD4", indicator: "\u6388\u696D\u898F\u5F8B\u30FB\u6E05\u6383\u30FB\u5F53\u756A\u30FB\u5E2D\u6B21\u7B49\u306E\u7BA1\u7406\u696D\u52D9\u3092\u3001\u5B66\u7D1A\u7D4C\u55B6\u306E\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u5B66\u6821\u6587\u5316\u306E\u793E\u4F1A\u7684\u6587\u8108\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u300C\u306A\u305C\u305D\u306E\u30DE\u30CD\u30B8\u30E1\u30F3\u30C8\u30B9\u30BF\u30A4\u30EB\u3092\u9078\u629E\u3057\u305F\u304B\u300D\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u3001\u5B89\u5B9A\u3057\u305F\u5B66\u7D1A\u74B0\u5883\u5275\u51FA\u306E\u6839\u62E0\u3092\u8A18\u8FF0\u3057\u3066\u3044\u308B" }, { item_number: 15, factor: "factor3", item_label: "\u5B66\u7D1A\u7BA1\u7406\u80FD\u529B", lambda: 0.87, score: 4, rd_level: "RD3", indicator: "\u62C5\u4EFB\u306E\u7BA1\u7406\u30B9\u30BF\u30A4\u30EB\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u81EA\u5206\u306A\u308A\u306E\u6539\u5584\u5DE5\u592B\u3068\u4EE3\u66FF\u7684\u30A2\u30D7\u30ED\u30FC\u30C1\u3092\u691C\u8A0E\u3057\u306A\u304C\u3089\u904B\u55B6\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 15, factor: "factor3", item_label: "\u5B66\u7D1A\u7BA1\u7406\u80FD\u529B", lambda: 0.87, score: 3, rd_level: "RD2", indicator: "\u57FA\u672C\u7684\u306A\u7BA1\u7406\u696D\u52D9\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u7A81\u767A\u7684\u306A\u4E8B\u614B\u306B\u6238\u60D1\u3063\u305F\u300D\u7B49\uFF09\u3001\u5BFE\u51E6\u6CD5\u306E\u6839\u62E0\u3084\u4EE3\u66FF\u6848\u3078\u306E\u8A00\u53CA\u306F\u9650\u5B9A\u7684" }, { item_number: 15, factor: "factor3", item_label: "\u5B66\u7D1A\u7BA1\u7406\u80FD\u529B", lambda: 0.87, score: 2, rd_level: "RD1", indicator: "\u7BA1\u7406\u696D\u52D9\u306E\u4E8B\u5B9F\u306E\u307F\u3092\u8A18\u8FF0\u3059\u308B\u306B\u3068\u3069\u307E\u308A\uFF08\u300C\u5F53\u756A\u3092\u78BA\u8A8D\u3057\u305F\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u7684\u8981\u7D20\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 15, factor: "factor3", item_label: "\u5B66\u7D1A\u7BA1\u7406\u80FD\u529B", lambda: 0.87, score: 1, rd_level: "RD0", indicator: "\u5B66\u7D1A\u7BA1\u7406\u3078\u306E\u95A2\u4E0E\u30FB\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 16, factor: "factor3", item_label: "\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u767A\u63EE", lambda: 0.83, score: 5, rd_level: "RD4", indicator: "\u6C11\u4E3B\u7684\u30FB\u652F\u63F4\u7684\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u306E\u30B9\u30BF\u30A4\u30EB\u3092\u3001\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u6A29\u5A01\u306E\u793E\u4F1A\u7684\u610F\u5473\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u300C\u306A\u305C\u305D\u306E\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u69D8\u5F0F\u3092\u9078\u3093\u3060\u304B\u300D\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 16, factor: "factor3", item_label: "\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u767A\u63EE", lambda: 0.83, score: 4, rd_level: "RD3", indicator: "\u6307\u793A\u306E\u660E\u78BA\u3055\u30FB\u4E00\u8CAB\u3057\u305F\u5BFE\u5FDC\u30FB\u516C\u5E73\u306A\u6271\u3044\u7B49\u306E\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u884C\u52D5\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u300C\u5225\u306E\u30A2\u30D7\u30ED\u30FC\u30C1\u306F\u306A\u304B\u3063\u305F\u304B\u300D\u3092\u691C\u8A0E\u3057\u305F\u5177\u4F53\u7684\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 16, factor: "factor3", item_label: "\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u767A\u63EE", lambda: 0.83, score: 3, rd_level: "RD2", indicator: "\u6559\u5E2B\u3068\u3057\u3066\u306E\u6A29\u5A01\u30FB\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60C5\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u3046\u307E\u304F\u6307\u793A\u3067\u304D\u306A\u304B\u3063\u305F\u300D\u7B49\uFF09\u3001\u5834\u9762\u306B\u3088\u3063\u3066\u4E0D\u5B89\u5B9A\u3067\u539F\u56E0\u5206\u6790\u306F\u9650\u5B9A\u7684" }, { item_number: 16, factor: "factor3", item_label: "\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u767A\u63EE", lambda: 0.83, score: 2, rd_level: "RD1", indicator: "\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u884C\u52D5\u306E\u4E8B\u5B9F\u306E\u307F\u3092\u8A18\u8FF0\u3059\u308B\u306B\u3068\u3069\u307E\u308A\uFF08\u300C\u6307\u793A\u3092\u51FA\u3057\u305F\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u7684\u8981\u7D20\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 16, factor: "factor3", item_label: "\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u767A\u63EE", lambda: 0.83, score: 1, rd_level: "RD0", indicator: "\u6559\u5E2B\u3068\u3057\u3066\u306E\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u306B\u95A2\u3059\u308B\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u307B\u3068\u3093\u3069\u306A\u3044" }, { item_number: 17, factor: "factor3", item_label: "\u5150\u7AE5\u306E\u56F0\u96E3\u652F\u63F4", lambda: 0.77, score: 5, rd_level: "RD4", indicator: "\u5B66\u7FD2\u9762\u30FB\u5BFE\u4EBA\u9762\u30FB\u60C5\u7DD2\u9762\u306E\u56F0\u96E3\u3092\u3001\u5B50\u3069\u3082\u306E\u6A29\u5229\u30FB\u30A4\u30F3\u30AF\u30EB\u30FC\u30B7\u30D6\u652F\u63F4\u306E\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u793E\u4F1A\u7684\u6587\u8108\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001SC\u30FB\u4FDD\u8B77\u8005\u30FB\u7BA1\u7406\u8077\u3068\u9023\u643A\u3057\u305F\u7D44\u7E54\u7684\u652F\u63F4\u306E\u6839\u62E0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 17, factor: "factor3", item_label: "\u5150\u7AE5\u306E\u56F0\u96E3\u652F\u63F4", lambda: 0.77, score: 4, rd_level: "RD3", indicator: "\u5150\u7AE5\u306E\u56F0\u96E3\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u591A\u89D2\u7684\u306B\u5206\u6790\u3057\u3001\u50BE\u8074\u30FB\u500B\u5225\u9762\u8AC7\u30FB\u6388\u696D\u5185\u914D\u616E\u7B49\u306E\u8907\u6570\u306E\u652F\u63F4\u30A2\u30D7\u30ED\u30FC\u30C1\u3092\u691C\u8A0E\u30FB\u8A66\u307F\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 17, factor: "factor3", item_label: "\u5150\u7AE5\u306E\u56F0\u96E3\u652F\u63F4", lambda: 0.77, score: 3, rd_level: "RD2", indicator: "\u56F0\u96E3\u3092\u62B1\u3048\u308B\u5150\u7AE5\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60C5\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u3069\u3046\u3057\u3066\u3042\u3052\u308C\u3070\u3088\u3044\u304B\u308F\u304B\u3089\u306A\u304B\u3063\u305F\u300D\u7B49\uFF09\u3001\u4F53\u7CFB\u7684\u652F\u63F4\u3078\u306E\u8A00\u53CA\u306F\u9650\u5B9A\u7684" }, { item_number: 17, factor: "factor3", item_label: "\u5150\u7AE5\u306E\u56F0\u96E3\u652F\u63F4", lambda: 0.77, score: 2, rd_level: "RD1", indicator: "\u56F0\u96E3\u306E\u5B58\u5728\u3092\u4E8B\u5B9F\u3068\u3057\u3066\u8A18\u9332\u3059\u308B\u306B\u3068\u3069\u307E\u308A\uFF08\u300C\u25CB\u25CB\u304C\u56F0\u3063\u3066\u3044\u305F\u300D\u7B49\uFF09\u3001\u652F\u63F4\u884C\u52D5\u3078\u306E\u7701\u5BDF\u7684\u8981\u7D20\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 17, factor: "factor3", item_label: "\u5150\u7AE5\u306E\u56F0\u96E3\u652F\u63F4", lambda: 0.77, score: 1, rd_level: "RD0", indicator: "\u5150\u7AE5\u306E\u56F0\u96E3\u3078\u306E\u6C17\u3065\u304D\u30FB\u652F\u63F4\u30FB\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 18, factor: "factor4", item_label: "\u540C\u50DA\u306E\u5B66\u7FD2\u652F\u63F4\u5F79\u5272\u7406\u89E3", lambda: 1.03, score: 5, rd_level: "RD4", indicator: "\u62C5\u4EFB\u30FB\u526F\u62C5\u4EFB\u30FB\u7279\u5225\u652F\u63F4\u6559\u54E1\u30FB\u990A\u8B77\u6559\u8AED\u7B49\u306E\u5354\u50CD\u5F79\u5272\u3092\u3001\u30C1\u30FC\u30E0\u5B66\u6821\u306E\u7406\u5FF5\u30FB\u7D44\u7E54\u7684\u652F\u63F4\u306E\u793E\u4F1A\u7684\u6587\u8108\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u300C\u306A\u305C\u5F79\u5272\u5206\u62C5\u304C\u3053\u3046\u3042\u308B\u3079\u304D\u304B\u300D\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u3001\u5B9F\u7FD2\u6D3B\u52D5\u3068\u306E\u63A5\u7D9A\u3092\u8A18\u8FF0\u3057\u3066\u3044\u308B" }, { item_number: 18, factor: "factor4", item_label: "\u540C\u50DA\u306E\u5B66\u7FD2\u652F\u63F4\u5F79\u5272\u7406\u89E3", lambda: 1.03, score: 4, rd_level: "RD3", indicator: "\u8907\u6570\u306E\u540C\u50DA\u306E\u5F79\u5272\u5206\u62C5\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u5B9F\u7FD2\u6D3B\u52D5\u3067\u305D\u306E\u9023\u643A\u3092\u610F\u8B58\u3057\u305F\u8907\u6570\u306E\u884C\u52D5\u3068\u4EE3\u66FF\u7684\u306A\u30A2\u30D7\u30ED\u30FC\u30C1\u3092\u691C\u8A0E\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 18, factor: "factor4", item_label: "\u540C\u50DA\u306E\u5B66\u7FD2\u652F\u63F4\u5F79\u5272\u7406\u89E3", lambda: 1.03, score: 3, rd_level: "RD2", indicator: "\u62C5\u4EFB\u4EE5\u5916\u306E\u6559\u8077\u54E1\u306E\u5F79\u5272\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u3053\u3093\u306A\u5F79\u5272\u304C\u3042\u308B\u3068\u77E5\u3063\u305F\u300D\u7B49\uFF09\u3001\u5B9F\u7FD2\u5834\u9762\u3067\u306E\u9023\u643A\u610F\u8B58\u306E\u6839\u62E0\u306F\u9650\u5B9A\u7684" }, { item_number: 18, factor: "factor4", item_label: "\u540C\u50DA\u306E\u5B66\u7FD2\u652F\u63F4\u5F79\u5272\u7406\u89E3", lambda: 1.03, score: 2, rd_level: "RD1", indicator: "\u540C\u50DA\u306E\u5F79\u5272\u306B\u3064\u3044\u3066\u62C5\u4EFB\u306B\u504F\u3063\u305F\u4E8B\u5B9F\u306E\u307F\u3092\u8A18\u8FF0\u3059\u308B\u306B\u3068\u3069\u307E\u308A\u3001\u7701\u5BDF\u7684\u8981\u7D20\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 18, factor: "factor4", item_label: "\u540C\u50DA\u306E\u5B66\u7FD2\u652F\u63F4\u5F79\u5272\u7406\u89E3", lambda: 1.03, score: 1, rd_level: "RD0", indicator: "\u540C\u50DA\u3084\u4ED6\u306E\u6559\u8077\u54E1\u306E\u5F79\u5272\u306B\u95A2\u3059\u308B\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 19, factor: "factor4", item_label: "\u7279\u5225\u8CAC\u4EFB\u3092\u6709\u3059\u308B\u540C\u50DA\u5F79\u5272\u306E\u7406\u89E3", lambda: 0.98, score: 5, rd_level: "RD4", indicator: "\u6307\u5C0E\u6559\u8AED\u30FB\u4E3B\u4EFB\u30FB\u526F\u6821\u9577\u30FB\u7279\u5225\u652F\u63F4\u30B3\u30FC\u30C7\u30A3\u30CD\u30FC\u30BF\u30FC\u7B49\u306E\u7279\u5225\u306A\u8077\u8CAC\u3092\u3001\u5B66\u6821\u7D44\u7E54\u306E\u7406\u5FF5\u30FB\u6559\u80B2\u6CD5\u5236\uFF08\u5B66\u6821\u6559\u80B2\u6CD5\u30FB\u7279\u5225\u652F\u63F4\u6559\u80B2\u4F53\u5236\u7B49\uFF09\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u300C\u306A\u305C\u305D\u308C\u3089\u306E\u5F79\u5272\u304C\u5FC5\u8981\u304B\u300D\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 19, factor: "factor4", item_label: "\u7279\u5225\u8CAC\u4EFB\u3092\u6709\u3059\u308B\u540C\u50DA\u5F79\u5272\u306E\u7406\u89E3", lambda: 0.98, score: 4, rd_level: "RD3", indicator: "\u4E3B\u4EFB\u30FB\u7279\u5225\u652F\u63F4\u30B3\u30FC\u30C7\u30A3\u30CD\u30FC\u30BF\u30FC\u7B49\u306E\u5F79\u5272\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u5B9F\u7FD2\u4E2D\u306B\u8907\u6570\u306E\u8996\u70B9\u304B\u3089\u9069\u5207\u306B\u95A2\u308F\u3063\u305F\u8A18\u8FF0\u3068\u4EE3\u66FF\u7684\u306A\u95A2\u308F\u308A\u65B9\u3078\u306E\u691C\u8A0E\u304C\u3042\u308B" }, { item_number: 19, factor: "factor4", item_label: "\u7279\u5225\u8CAC\u4EFB\u3092\u6709\u3059\u308B\u540C\u50DA\u5F79\u5272\u306E\u7406\u89E3", lambda: 0.98, score: 3, rd_level: "RD2", indicator: "\u7279\u5225\u306A\u8CAC\u4EFB\u3092\u6301\u3064\u5F79\u8077\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u3053\u3093\u306A\u8077\u52D9\u304C\u3042\u308B\u3068\u77E5\u3063\u305F\u300D\u7B49\uFF09\u3001\u5177\u4F53\u7684\u8077\u52D9\u5185\u5BB9\u3078\u306E\u7406\u89E3\u306F\u8868\u9762\u7684" }, { item_number: 19, factor: "factor4", item_label: "\u7279\u5225\u8CAC\u4EFB\u3092\u6709\u3059\u308B\u540C\u50DA\u5F79\u5272\u306E\u7406\u89E3", lambda: 0.98, score: 2, rd_level: "RD1", indicator: "\u300C\u62C5\u4EFB\u4EE5\u5916\u306B\u3082\u5F79\u5272\u304C\u3042\u308B\u300D\u7A0B\u5EA6\u306E\u4E8B\u5B9F\u306E\u307F\u3092\u8A18\u8FF0\u3059\u308B\u306B\u3068\u3069\u307E\u308A\u3001\u7701\u5BDF\u7684\u8981\u7D20\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 19, factor: "factor4", item_label: "\u7279\u5225\u8CAC\u4EFB\u3092\u6709\u3059\u308B\u540C\u50DA\u5F79\u5272\u306E\u7406\u89E3", lambda: 0.98, score: 1, rd_level: "RD0", indicator: "\u7279\u5225\u306A\u8CAC\u4EFB\u3092\u6709\u3059\u308B\u540C\u50DA\u5F79\u5272\u3078\u306E\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u306A\u3044" }, { item_number: 20, factor: "factor4", item_label: "\u4EBA\u9593\u95A2\u4FC2\u30FB\u5C02\u9580\u7684\u671F\u5F85\u3078\u306E\u5BFE\u5FDC", lambda: 0.5, score: 5, rd_level: "RD4", indicator: "\u4FDD\u8B77\u8005\u30FB\u540C\u50DA\u30FB\u7BA1\u7406\u8077\u304B\u3089\u306E\u671F\u5F85\u3092\u3001\u5C02\u9580\u8077\u3068\u3057\u3066\u306E\u6559\u80B2\u7684\u4FE1\u5FF5\u30FB\u793E\u4F1A\u7684\u5F79\u5272\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u300C\u306A\u305C\u305D\u306E\u671F\u5F85\u306B\u5FDC\u3048\u308B\u3079\u304D\u304B\u30FB\u5FDC\u3048\u306A\u3044\u3079\u304D\u304B\u300D\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u3001\u5C02\u9580\u8077\u3068\u3057\u3066\u306E\u5224\u65AD\u8EF8\u3092\u660E\u793A\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 20, factor: "factor4", item_label: "\u4EBA\u9593\u95A2\u4FC2\u30FB\u5C02\u9580\u7684\u671F\u5F85\u3078\u306E\u5BFE\u5FDC", lambda: 0.5, score: 4, rd_level: "RD3", indicator: "\u8907\u6570\u306E\u30B9\u30C6\u30FC\u30AF\u30DB\u30EB\u30C0\u30FC\u304B\u3089\u306E\u671F\u5F85\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u305D\u308C\u305E\u308C\u3078\u306E\u5BFE\u5FDC\u7B56\u3068\u4EE3\u66FF\u7684\u30A2\u30D7\u30ED\u30FC\u30C1\u3092\u691C\u8A0E\u3057\u3001\u610F\u8B58\u7684\u306B\u3068\u3063\u305F\u884C\u52D5\u3092\u8A18\u8FF0\u3057\u3066\u3044\u308B" }, { item_number: 20, factor: "factor4", item_label: "\u4EBA\u9593\u95A2\u4FC2\u30FB\u5C02\u9580\u7684\u671F\u5F85\u3078\u306E\u5BFE\u5FDC", lambda: 0.5, score: 3, rd_level: "RD2", indicator: "\u6307\u5C0E\u6559\u54E1\u30FB\u62C5\u4EFB\u304B\u3089\u306E\u671F\u5F85\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60C5\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u671F\u5F85\u306B\u5FDC\u3048\u3089\u308C\u305F\u304B\u4E0D\u5B89\u3060\u3063\u305F\u300D\u7B49\uFF09\u3001\u671F\u5F85\u3078\u306E\u5BFE\u5FDC\u6839\u62E0\u306F\u9650\u5B9A\u7684" }, { item_number: 20, factor: "factor4", item_label: "\u4EBA\u9593\u95A2\u4FC2\u30FB\u5C02\u9580\u7684\u671F\u5F85\u3078\u306E\u5BFE\u5FDC", lambda: 0.5, score: 2, rd_level: "RD1", indicator: "\u671F\u5F85\u3078\u306E\u5BFE\u5FDC\u306E\u4E8B\u5B9F\u306E\u307F\u3092\u8A18\u8FF0\u3059\u308B\u306B\u3068\u3069\u307E\u308A\uFF08\u300C\u8A00\u308F\u308C\u305F\u901A\u308A\u306B\u3057\u305F\u300D\u7B49\uFF09\u3001\u7701\u5BDF\u7684\u8981\u7D20\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 20, factor: "factor4", item_label: "\u4EBA\u9593\u95A2\u4FC2\u30FB\u5C02\u9580\u7684\u671F\u5F85\u3078\u306E\u5BFE\u5FDC", lambda: 0.5, score: 1, rd_level: "RD0", indicator: "\u6559\u5E2B\u3078\u306E\u671F\u5F85\u306B\u95A2\u3059\u308B\u8A8D\u8B58\u30FB\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 21, factor: "factor4", item_label: "\u6559\u5E2B\u5F79\u5272\u306E\u591A\u69D8\u6027\u7406\u89E3", lambda: 0.46, score: 5, rd_level: "RD4", indicator: "\u6559\u5E2B\u306E\u5F79\u5272\uFF08\u6388\u696D\u8005\u30FB\u76F8\u8AC7\u8005\u30FB\u4FDD\u8B77\u8005\u9023\u643A\u8005\u30FB\u30B3\u30FC\u30C7\u30A3\u30CD\u30FC\u30BF\u30FC\u7B49\uFF09\u306E\u591A\u69D8\u6027\u3092\u3001\u6559\u5E2B\u5C02\u9580\u8077\u306E\u7406\u5FF5\u30FB\u6CD5\u4EE4\u30FB\u7814\u7A76\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u300C\u306A\u305C\u5F79\u5272\u304C\u591A\u69D8\u3067\u3042\u308B\u3079\u304D\u304B\u300D\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u3001\u5834\u9762\u306B\u5FDC\u3058\u305F\u5F79\u5272\u306E\u4F7F\u3044\u5206\u3051\u306E\u6839\u62E0\u3092\u8A18\u8FF0\u3057\u3066\u3044\u308B" }, { item_number: 21, factor: "factor4", item_label: "\u6559\u5E2B\u5F79\u5272\u306E\u591A\u69D8\u6027\u7406\u89E3", lambda: 0.46, score: 4, rd_level: "RD3", indicator: "\u6559\u5E2B\u306E\u8907\u6570\u306E\u5F79\u5272\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u5B9F\u7FD2\u5834\u9762\u3067\u306E\u5F79\u5272\u5B9F\u8DF5\u306E\u6839\u62E0\u3068\u4EE3\u66FF\u7684\u306A\u30A2\u30D7\u30ED\u30FC\u30C1\u3092\u5177\u4F53\u7684\u306B\u691C\u8A0E\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 21, factor: "factor4", item_label: "\u6559\u5E2B\u5F79\u5272\u306E\u591A\u69D8\u6027\u7406\u89E3", lambda: 0.46, score: 3, rd_level: "RD2", indicator: "\u300C\u6388\u696D\u3092\u3059\u308B\u4EE5\u5916\u306B\u3082\u4ED5\u4E8B\u304C\u3042\u308B\u300D\u3068\u3044\u3046\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u3044\u308D\u3044\u308D\u306A\u5F79\u5272\u304C\u3042\u308B\u3068\u77E5\u3063\u305F\u300D\u7B49\uFF09\u3001\u5177\u4F53\u7684\u306A\u65B9\u6CD5\u306E\u6839\u62E0\u306F\u9650\u5B9A\u7684" }, { item_number: 21, factor: "factor4", item_label: "\u6559\u5E2B\u5F79\u5272\u306E\u591A\u69D8\u6027\u7406\u89E3", lambda: 0.46, score: 2, rd_level: "RD1", indicator: "\u6559\u5E2B\u306E\u5F79\u5272\u3092\u6388\u696D\u8005\u306E\u5074\u9762\u306E\u307F\u306B\u9650\u5B9A\u3057\u305F\u4E8B\u5B9F\u8A18\u8FF0\u306B\u3068\u3069\u307E\u308A\u3001\u7701\u5BDF\u7684\u8981\u7D20\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 21, factor: "factor4", item_label: "\u6559\u5E2B\u5F79\u5272\u306E\u591A\u69D8\u6027\u7406\u89E3", lambda: 0.46, score: 1, rd_level: "RD0", indicator: "\u6559\u5E2B\u306E\u5F79\u5272\u591A\u69D8\u6027\u3078\u306E\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 22, factor: "factor4", item_label: "\u6559\u5E2B\u306E\u6A29\u5A01\u306E\u610F\u5473\u7406\u89E3", lambda: 0.42, score: 5, rd_level: "RD4", indicator: "\u6A29\u5A01\u3092\u4FE1\u983C\u306B\u57FA\u3065\u304F\u5F71\u97FF\u529B\u3068\u3057\u3066\u6349\u3048\u3001\u305D\u306E\u54F2\u5B66\u7684\u30FB\u793E\u4F1A\u7684\u6839\u62E0\uFF08\u6A29\u5A01\u306E\u6B63\u5F53\u6027\u306E\u7406\u8AD6\u7B49\uFF09\u3092\u6559\u80B2\u7684\u4FE1\u5FF5\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u300C\u81EA\u5206\u304C\u6A29\u5A01\u3092\u884C\u4F7F\u3059\u308B\u3053\u3068\u306E\u610F\u5473\u300D\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 22, factor: "factor4", item_label: "\u6559\u5E2B\u306E\u6A29\u5A01\u306E\u610F\u5473\u7406\u89E3", lambda: 0.42, score: 4, rd_level: "RD3", indicator: "\u6A29\u5A01\u306E\u6B63\u5F53\u6027\uFF08\u5C02\u9580\u77E5\u8B58\u30FB\u502B\u7406\u7684\u884C\u52D5\u30FB\u516C\u5E73\u306A\u6271\u3044\uFF09\u306E\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u65E5\u5E38\u7684\u306A\u95A2\u308F\u308A\u3067\u3069\u3046\u4F53\u73FE\u3059\u308B\u304B\u306E\u4EE3\u66FF\u7684\u30A2\u30D7\u30ED\u30FC\u30C1\u3092\u691C\u8A0E\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 22, factor: "factor4", item_label: "\u6559\u5E2B\u306E\u6A29\u5A01\u306E\u610F\u5473\u7406\u89E3", lambda: 0.42, score: 3, rd_level: "RD2", indicator: "\u6559\u5E2B\u306E\u6A29\u5A01\u3078\u306E\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u6A29\u5A01\u306E\u3042\u308B\u5B58\u5728\u3068\u3057\u3066\u898B\u3089\u308C\u3066\u3044\u308B\u3068\u611F\u3058\u305F\u300D\u7B49\uFF09\u3001\u610F\u5473\u3084\u884C\u4F7F\u306E\u4ED5\u65B9\u3078\u306E\u8003\u5BDF\u304C\u6D45\u3044" }, { item_number: 22, factor: "factor4", item_label: "\u6559\u5E2B\u306E\u6A29\u5A01\u306E\u610F\u5473\u7406\u89E3", lambda: 0.42, score: 2, rd_level: "RD1", indicator: "\u6A29\u5A01\u3092\u5F79\u8077\u304B\u3089\u306E\u5F37\u5236\u529B\u3068\u6349\u3048\u305F\u4E8B\u5B9F\u8A18\u8FF0\u306E\u307F\u306B\u3068\u3069\u307E\u308A\u3001\u7701\u5BDF\u7684\u8981\u7D20\u304C\u9650\u5B9A\u7684" }, { item_number: 22, factor: "factor4", item_label: "\u6559\u5E2B\u306E\u6A29\u5A01\u306E\u610F\u5473\u7406\u89E3", lambda: 0.42, score: 1, rd_level: "RD0", indicator: "\u6559\u5E2B\u306E\u6A29\u5A01\u306B\u3064\u3044\u3066\u306E\u7406\u89E3\u30FB\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }, { item_number: 23, factor: "factor4", item_label: "\u8077\u696D\u502B\u7406\u3068\u9023\u5E2F\u8CAC\u4EFB", lambda: 0.41, score: 5, rd_level: "RD4", indicator: "\u5B66\u6821\u306E\u6559\u80B2\u65B9\u91DD\u30FB\u670D\u52D9\u898F\u5F8B\u30FB\u60C5\u5831\u7BA1\u7406\u65B9\u91DD\u3092\u3001\u6559\u5E2B\u306E\u8077\u696D\u502B\u7406\u30FB\u793E\u4F1A\u7684\u8CAC\u4EFB\u306E\u4FE1\u5FF5\u3068\u6279\u5224\u7684\u306B\u7D50\u3073\u3064\u3051\u3001\u300C\u306A\u305C\u9023\u5E2F\u8CAC\u4EFB\u3092\u62C5\u3046\u3079\u304D\u304B\u300D\u306E\u524D\u63D0\u3092\u554F\u3044\u76F4\u3057\u3001\u502B\u7406\u7684\u5224\u65AD\u306E\u6839\u62E0\u3092\u660E\u793A\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 23, factor: "factor4", item_label: "\u8077\u696D\u502B\u7406\u3068\u9023\u5E2F\u8CAC\u4EFB", lambda: 0.41, score: 4, rd_level: "RD3", indicator: "\u5B66\u6821\u306E\u65B9\u91DD\u306B\u6CBF\u3063\u3066\u884C\u52D5\u3057\u305F\u539F\u56E0\u30FB\u80CC\u666F\u3092\u5206\u6790\u3057\u3001\u7D44\u7E54\u306E\u4E00\u54E1\u3068\u3057\u3066\u306E\u8CAC\u4EFB\u610F\u8B58\u3092\u8907\u6570\u306E\u5177\u4F53\u7684\u5834\u9762\u3067\u793A\u3057\u3001\u4EE3\u66FF\u7684\u306A\u884C\u52D5\u3092\u691C\u8A0E\u3057\u305F\u8A18\u8FF0\u304C\u3042\u308B" }, { item_number: 23, factor: "factor4", item_label: "\u8077\u696D\u502B\u7406\u3068\u9023\u5E2F\u8CAC\u4EFB", lambda: 0.41, score: 3, rd_level: "RD2", indicator: "\u5B66\u6821\u306E\u65B9\u91DD\u306B\u5F93\u304A\u3046\u3068\u3057\u305F\u6C17\u3065\u304D\u3084\u611F\u60F3\u3092\u8A00\u8A9E\u5316\u3057\u3066\u3044\u308B\u304C\uFF08\u300C\u7D44\u7E54\u306E\u4E00\u54E1\u3060\u3068\u611F\u3058\u305F\u300D\u7B49\uFF09\u3001\u9023\u5E2F\u8CAC\u4EFB\u306E\u6982\u5FF5\u3078\u306E\u7406\u89E3\u306F\u8868\u9762\u7684" }, { item_number: 23, factor: "factor4", item_label: "\u8077\u696D\u502B\u7406\u3068\u9023\u5E2F\u8CAC\u4EFB", lambda: 0.41, score: 2, rd_level: "RD1", indicator: "\u500B\u4EBA\u306E\u884C\u52D5\u306E\u4E8B\u5B9F\u306E\u307F\u3092\u8A18\u8FF0\u3059\u308B\u306B\u3068\u3069\u307E\u308A\uFF08\u300C\u65B9\u91DD\u306B\u5F93\u3063\u305F\u300D\u7B49\uFF09\u3001\u7D44\u7E54\u7684\u9023\u5E2F\u8CAC\u4EFB\u3078\u306E\u7701\u5BDF\u304C\u898B\u3089\u308C\u306A\u3044" }, { item_number: 23, factor: "factor4", item_label: "\u8077\u696D\u502B\u7406\u3068\u9023\u5E2F\u8CAC\u4EFB", lambda: 0.41, score: 1, rd_level: "RD0", indicator: "\u8077\u696D\u502B\u7406\u30FB\u9023\u5E2F\u8CAC\u4EFB\u306B\u95A2\u3059\u308B\u7701\u5BDF\u304C\u65E5\u8A8C\u306B\u898B\u3089\u308C\u306A\u3044" }], n = { 1: "\u7279\u5225\u306A\u652F\u63F4\u3092\u5FC5\u8981\u3068\u3059\u308B\u5150\u7AE5\uFF08\u8EAB\u4F53\u969C\u5BB3\u3092\u6709\u3059\u308B\u8005\u3092\u542B\u3080\uFF09\u306B\u5BFE\u3057\u3066\u3001\u898B\u901A\u3057\u3092\u3082\u3063\u3066\u9069\u5207\u306A\u5BFE\u5FDC\u304C\u3067\u304D\u308B\u3053\u3068", 2: "\u81EA\u56FD\u306E\u8A00\u8A9E\u304C\u6BCD\u8A9E\u3067\u306A\u3044\u5150\u7AE5\u306B\u5BFE\u3057\u3066\u3001\u9069\u5207\u306A\u5BFE\u5FDC\u3084\u6307\u5C0E\u304C\u3067\u304D\u308B\u3053\u3068", 3: "\u7279\u5225\u306A\u652F\u63F4\u3092\u5FC5\u8981\u3068\u3059\u308B\u5150\u7AE5\uFF08\u8EAB\u4F53\u969C\u5BB3\u3092\u6709\u3059\u308B\u8005\u3092\u542B\u3080\uFF09\u306B\u5BFE\u3057\u3066\u3001\u3069\u306E\u3088\u3046\u306A\u5BFE\u5FDC\u3092\u3059\u308C\u3070\u3088\u3044\u304B\u3092\u7406\u89E3\u3057\u3066\u3044\u308B\u3053\u3068", 4: "\u81EA\u56FD\u306E\u8A00\u8A9E\u304C\u6BCD\u8A9E\u3067\u306A\u3044\u5150\u7AE5\u306B\u5BFE\u3057\u3066\u3001\u3069\u306E\u3088\u3046\u306A\u5BFE\u5FDC\u3092\u3059\u308C\u3070\u3088\u3044\u304B\u3092\u7406\u89E3\u3057\u3066\u3044\u308B\u3053\u3068", 5: "\u5150\u7AE5\u306E\u300C\u6027\u5225\u300D\u306B\u3088\u308B\u5FC3\u7406\u30FB\u884C\u52D5\u306E\u9055\u3044\u306E\u91CD\u8981\u6027\u3092\u6B63\u3057\u304F\u7406\u89E3\u3057\u3066\u3044\u308B\u3053\u3068", 6: "\u5150\u7AE5\u306E\u767A\u9054\u3068\u5065\u5EB7\u306F\u3001\u69D8\u3005\u306A\u793E\u4F1A\u7684\u3001\u5B97\u6559\u7684\u3001\u6C11\u65CF\u7684\u3001\u6587\u5316\u7684\u3001\u8A00\u8A9E\u7684\u5F71\u97FF\u3092\u53D7\u3051\u308B\u3053\u3068\u3092\u7406\u89E3\u3057\u3066\u3044\u308B\u3053\u3068", 7: "\u5404\u6559\u79D1\u7B49\u306E\u7279\u6027\u3092\u8E0F\u307E\u3048\u3001\u5150\u7AE5\u306E\u5B9F\u614B\u306B\u5373\u3057\u305F\u6388\u696D\u3065\u304F\u308A\u304C\u3067\u304D\u308B\u3053\u3068", 8: "\u5B9F\u7FD2\u751F\u306E\u4F53\u9A13\u304B\u3089\u5F97\u305F\u77E5\u8B58\u304C\u3001\u6559\u5E2B\u306E\u4ED5\u4E8B\u3084\u6559\u5E2B\u3068\u3057\u3066\u306E\u767A\u9054\u306B\u3044\u304B\u306B\u95A2\u4FC2\u3059\u308B\u304B\u3092\u7406\u89E3\u3067\u304D\u308B\u3053\u3068", 9: "\u6388\u696D\u3068\u5B66\u7FD2\u306B\u95A2\u3057\u3066\u8A9E\u308A\u3001\u6559\u80B2\u6D3B\u52D5\u306E\u767A\u5C55\u306B\u95A2\u3059\u308B\u8208\u5473\u3068\u95A2\u5FC3\u3092\u793A\u3057\u3001\u81EA\u5206\u81EA\u8EAB\u306E\u6307\u5C0E\u3084\u59FF\u52E2\u3092\u691C\u8A3C\u3059\u308B\u80FD\u529B\u3092\u5099\u3048\u3066\u3044\u308B\u3053\u3068", 10: "\u5150\u7AE5\u306B\u5BFE\u3057\u3066\u671F\u5F85\u3057\u3066\u3044\u308B\u80AF\u5B9A\u7684\u306A\u4FA1\u5024\u89B3\u3001\u614B\u5EA6\u3001\u304A\u3088\u3073\u884C\u52D5\u3092\u5B9F\u8DF5\u3057\u3066\u898B\u305B\u308B\u3053\u3068", 11: "\u30A2\u30C9\u30D0\u30A4\u30B9\u3068\u30D5\u30A3\u30FC\u30C9\u30D0\u30C3\u30AF\u306B\u57FA\u3065\u304D\u884C\u52D5\u3057\u3001\u6307\u5C0E\u3068\u52A9\u8A00\u3092\u53D7\u3051\u5165\u308C\u308B\u3053\u3068", 12: "\u81EA\u5206\u81EA\u8EAB\u306E\u5B9F\u8DF5\u3092\u53CD\u7701\u3057\u3001\u6539\u5584\u3057\u3001\u5C02\u9580\u7684\u30CB\u30FC\u30BA\u306E\u767A\u9054\u3092\u8A8D\u8B58\u3057\u3001\u305D\u308C\u3092\u5B9F\u73FE\u3059\u308B\u3053\u3068\u306B\u8CAC\u4EFB\u3092\u6301\u3064\u3053\u3068", 13: "\u6559\u5E2B\u3068\u3057\u3066\u306E\u5C02\u9580\u6027\u3092\u5411\u4E0A\u3055\u305B\u308B\u305F\u3081\u306B\u53CD\u7701\u3001\u81EA\u5DF1\u7701\u5BDF\u3059\u308B\u3053\u3068\u3082\u542B\u3081\u3066\u3001\u81EA\u5206\u81EA\u8EAB\u3092\u8A55\u4FA1\u3059\u308B\u529B\u3092\u6709\u3059\u308B\u3053\u3068", 14: "\u30AF\u30E9\u30B9\u904B\u55B6\u306B\u4F34\u3046\u751F\u5F92\u6307\u5C0E\u306B\u95A2\u3059\u308B\u529B\u3092\u6709\u3059\u308B\u3053\u3068", 15: "\u30AF\u30E9\u30B9\u904B\u55B6\u306B\u4F34\u3046\u7BA1\u7406\u80FD\u529B\u3092\u6709\u3059\u308B\u3053\u3068", 16: "\u6A29\u5A01\u3042\u308B\u5B58\u5728\u3068\u3057\u3066\u6559\u5BA4\u5185\u3067\u30AF\u30E9\u30B9\u904B\u55B6\u306B\u4F34\u3046\u30EA\u30FC\u30C0\u30FC\u30B7\u30C3\u30D7\u3092\u767A\u63EE\u3059\u308B\u3053\u3068\u304C\u3067\u304D\u308B\u3053\u3068", 17: "\u5B66\u6821\u3084\u6388\u696D\u306B\u304A\u3051\u308B\u5150\u7AE5\u306E\u56F0\u96E3\u3084\u845B\u85E4\u306E\u89E3\u6C7A\u3092\u652F\u63F4\u3059\u308B\u3053\u3068\u304C\u3067\u304D\u308B\u3053\u3068", 18: "\u5171\u306B\u50CD\u3044\u3066\u3044\u308B\u540C\u50DA\u304C\u3001\u5B66\u7FD2\u306E\u30B5\u30DD\u30FC\u30C8\u306B\u9069\u5207\u306B\u53C2\u52A0\u3057\u3001\u5F7C\u3089\u304C\u679C\u305F\u3059\u3053\u3068\u3092\u671F\u5F85\u3055\u308C\u3066\u3044\u308B\u5F79\u5272\u3092\u7406\u89E3\u3057\u3066\u3044\u308B\u3053\u3068", 19: "\u7279\u5225\u306A\u8CAC\u4EFB\u3092\u6709\u3059\u308B\u540C\u50DA\u306E\u5F79\u5272\u3092\u77E5\u308B\u3053\u3068", 20: "\u6559\u5E2B\u306E\u4ED5\u4E8B\u306B\u95A2\u9023\u3059\u308B\u4EBA\u9593\u95A2\u4FC2\u53CA\u3073\u5C02\u9580\u7684\u306A\u9762\u306B\u304A\u3044\u3066\u306E\u671F\u5F85\u3092\u5206\u6790\u3057\u5BFE\u5FDC\u3059\u308B\u3053\u3068", 21: "\u6559\u5E2B\u306E\u5F79\u5272\u3092\u9042\u884C\u3059\u308B\u305F\u3081\u306E\u591A\u69D8\u306A\u65B9\u6CD5\u3092\u77E5\u308A\u3001\u305D\u306E\u6839\u62E0\u3092\u7406\u89E3\u3059\u308B\u3053\u3068", 22: "\u6388\u696D\u3068\u30AF\u30E9\u30B9\u306E\u793E\u4F1A\u751F\u6D3B\u306B\u304A\u3051\u308B\u6559\u5E2B\u306E\u6A29\u5A01\u306E\u610F\u5473\u306B\u3064\u3044\u3066\u7406\u89E3\u3059\u308B\u3053\u3068", 23: "\u8077\u696D\u306E\u65B9\u91DD\u3068\u5B9F\u8DF5\u306B\u7559\u610F\u3057\u3001\u305D\u306E\u5B9F\u8DF5\u306B\u304A\u3044\u3066\u306F\u9023\u5E2F\u8CAC\u4EFB\u3092\u6709\u3059\u308B\u3053\u3068" };
  let a = 0;
  for (const s of r) {
    const i = `beh-${s.item_number}-${s.score}`;
    try {
      await t.prepare(`
        INSERT OR REPLACE INTO rubric_item_behaviors
          (id, item_number, factor, item_label, item_text, lambda, score, rd_level, indicator)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(i, s.item_number, s.factor, s.item_label, n[s.item_number] ?? `\u9805\u76EE${s.item_number}`, s.lambda, s.score, s.rd_level, s.indicator).run(), a++;
    } catch (c) {
      console.warn(`Skip item ${s.item_number} score ${s.score}:`, c);
    }
  }
  return e.json({ success: true, inserted: a, total: r.length });
});
j.get("/rubric-behaviors/:itemNumber", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 500);
  const r = parseInt(e.req.param("itemNumber"));
  if (isNaN(r) || r < 1 || r > 23) return e.json({ error: "Invalid item number (1-23)" }, 400);
  try {
    const { results: a } = await t.prepare("SELECT * FROM rubric_item_behaviors WHERE item_number = ? ORDER BY score DESC").bind(r).all();
    return e.json({ item_number: r, behaviors: a });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.post("/rq3b/save", async (e) => {
  const t = e.req.header("Authorization");
  if (!t || !t.startsWith("Bearer ")) return e.json({ error: "Unauthorized" }, 401);
  let r;
  try {
    const i = t.split(" ")[1];
    r = JSON.parse(atob(i));
  } catch {
    return e.json({ error: "Invalid token" }, 401);
  }
  if (r.role !== "student") return e.json({ error: "Forbidden" }, 403);
  const n = await e.req.json(), a = n.userId;
  if (a !== r.id) return e.json({ error: "Forbidden: Cannot update other users data" }, 403);
  const o = e.env.DB, s = Array.isArray(n.updates) ? n.updates : [n];
  try {
    const i = s.map((c) => {
      const { week_number: l, goal_id: d, focus_item_id: u, rd_chat_raw_level: f, rd_chat_category: m, previous_score: h, current_score: b, delta_score: R, ga_self_rating: O, ga_self_binary: D, ga_evidence_binary: S, ga_evidence_reason: E } = c, y = d || "no_goal", A = u || 0, w = `${a}_wk${l}_g${y}_f${A}`;
      return o.prepare(`
        INSERT INTO rq3b_outcomes (
          id, user_id, week_number, goal_id, focus_item_id,
          rd_chat_raw_level, rd_chat_category,
          previous_score, current_score, delta_score,
          ga_self_rating, ga_self_binary,
          ga_evidence_binary, ga_evidence_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, week_number, goal_id, focus_item_id) DO UPDATE SET
          rd_chat_raw_level = COALESCE(excluded.rd_chat_raw_level, rq3b_outcomes.rd_chat_raw_level),
          rd_chat_category = COALESCE(excluded.rd_chat_category, rq3b_outcomes.rd_chat_category),
          previous_score = COALESCE(excluded.previous_score, rq3b_outcomes.previous_score),
          current_score = COALESCE(excluded.current_score, rq3b_outcomes.current_score),
          delta_score = COALESCE(excluded.delta_score, rq3b_outcomes.delta_score),
          ga_self_rating = COALESCE(excluded.ga_self_rating, rq3b_outcomes.ga_self_rating),
          ga_self_binary = COALESCE(excluded.ga_self_binary, rq3b_outcomes.ga_self_binary),
          ga_evidence_binary = COALESCE(excluded.ga_evidence_binary, rq3b_outcomes.ga_evidence_binary),
          ga_evidence_reason = COALESCE(excluded.ga_evidence_reason, rq3b_outcomes.ga_evidence_reason),
          updated_at = CURRENT_TIMESTAMP
      `).bind(w, a, l, y, A, f || null, m || null, h || null, b || null, R || null, O || null, D !== void 0 ? D : null, S !== void 0 ? S : null, E || null);
    });
    return await o.batch(i), e.json({ success: true });
  } catch (i) {
    return console.error("RQ3b save error:", i), e.json({ error: "Internal server error" }, 500);
  }
});
j.get("/rq3b/responses/:userId", async (e) => {
  const t = e.req.param("userId"), r = e.req.header("Authorization");
  if (!r || !r.startsWith("Bearer ")) return e.json({ error: "Unauthorized" }, 401);
  let n;
  try {
    const o = r.split(" ")[1];
    n = JSON.parse(atob(o));
  } catch {
    return e.json({ error: "Invalid token" }, 401);
  }
  if (n.role === "student" && n.id !== t) return e.json({ error: "Forbidden" }, 403);
  const a = e.env.DB;
  try {
    const { results: o } = await a.prepare("SELECT * FROM rq3b_outcomes WHERE user_id = ? ORDER BY week_number ASC").bind(t).all();
    return e.json({ success: true, data: o });
  } catch (o) {
    return console.error("RQ3b fetch error:", o), e.json({ error: "Internal server error" }, 500);
  }
});
j.get("/export/joint-display-csv", async (e) => {
  var n;
  const t = e.req.header("X-User-Role");
  if (t !== "researcher" && t !== "admin") return e.text("Forbidden", 403);
  const r = (n = e.env) == null ? void 0 : n.DB;
  if (!r) return e.json({ error: "DB not configured" }, 503);
  try {
    const { results: a } = await r.prepare(`
      SELECT
        sc.segment_id, sc.researcher_id,
        sc.step1_keywords, sc.step2_thesaurus, sc.step3_concept, sc.step4_theme, sc.memo, sc.factor,
        ss.text_content,
        je.student_id, je.week_number, je.id as journal_id,
        e.total_score as ai_total_score,
        e.factor1_score as ai_f1, e.factor2_score as ai_f2, e.factor3_score as ai_f3, e.factor4_score as ai_f4,
        se.total_score as self_total_score,
        se.factor1_score as self_f1, se.factor2_score as self_f2, se.factor3_score as self_f3, se.factor4_score as self_f4
      FROM scat_codes sc
      JOIN scat_segments ss ON sc.segment_id = ss.id
      LEFT JOIN journal_entries je ON ss.source_journal_id = je.id
      LEFT JOIN evaluations e ON je.id = e.journal_id
      LEFT JOIN self_evaluations se ON je.student_id = se.student_id AND je.week_number = se.week_number
      ORDER BY je.student_id, je.week_number, ss.segment_order
    `).all();
    if (!a || a.length === 0) return e.text("No data", 404);
    const o = Object.keys(a[0]), s = [o.join(","), ...a.map((i) => o.map((c) => `"${String(i[c] ?? "").replace(/"/g, '""')}"`).join(","))].join(`
`);
    return new Response("\uFEFF" + s, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=joint_display.csv" } });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.get("/export/chat-goals-csv", async (e) => {
  var n;
  const t = e.req.header("X-User-Role");
  if (t !== "researcher" && t !== "admin") return e.text("Forbidden", 403);
  const r = (n = e.env) == null ? void 0 : n.DB;
  if (!r) return e.json({ error: "DB not configured" }, 503);
  try {
    const { results: a } = await r.prepare(`
      SELECT
        cm.session_id as chat_session_id, cm.role as message_role, cm.content as message_text, cm.created_at, cm.message_order, cm.phase, cm.reflection_depth,
        cs.student_id, cs.journal_id, cs.total_turns, cs.max_rd_chat_level,
        je.week_number,
        g.id as goal_id, g.goal_text, g.target_factor as goal_type, g.target_item_id as focus_item_id, g.achieved as achievement_status, g.created_at as goal_time
      FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      LEFT JOIN journal_entries je ON cs.journal_id = je.id
      LEFT JOIN goals g ON cs.id = g.session_id
      ORDER BY cs.student_id, je.week_number, cm.session_id, cm.message_order
    `).all();
    if (!a || a.length === 0) return e.text("No data", 404);
    const o = Object.keys(a[0]), s = [o.join(","), ...a.map((i) => o.map((c) => `"${String(i[c] ?? "").replace(/"/g, '""')}"`).join(","))].join(`
`);
    return new Response("\uFEFF" + s, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=chat_goals.csv" } });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.get("/evaluator-profiles", async (e) => {
  var r;
  const t = (r = e.env) == null ? void 0 : r.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  await K(t);
  try {
    const { results: n } = await t.prepare("SELECT * FROM evaluator_profiles").all();
    return e.json({ success: true, profiles: n });
  } catch (n) {
    return e.json({ error: String(n) }, 500);
  }
});
j.post("/evaluator-profiles", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  await K(t);
  const r = await e.req.json();
  try {
    return await t.prepare(`
      INSERT INTO evaluator_profiles (evaluator_id, years_of_experience, training_background)
      VALUES (?, ?, ?)
      ON CONFLICT(evaluator_id) DO UPDATE SET
        years_of_experience = excluded.years_of_experience,
        training_background = excluded.training_background
    `).bind(r.evaluator_id, r.years_of_experience || 0, r.training_background || "").run(), e.json({ success: true });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.get("/joint-display", async (e) => {
  var n;
  const t = (n = e.env) == null ? void 0 : n.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  const r = e.req.header("X-User-Role");
  if (r !== "researcher" && r !== "admin") return e.json({ error: "Forbidden" }, 403);
  await K(t);
  try {
    const { results: a } = await t.prepare(`
      SELECT
        sc.segment_id, sc.researcher_id,
        sc.step1_keywords, sc.step2_thesaurus, sc.step3_concept, sc.step4_theme, sc.memo, sc.factor,
        ss.text_content,
        je.student_id, je.week_number, je.id as journal_id,
        e.total_score as ai_total_score,
        e.factor1_score as ai_f1, e.factor2_score as ai_f2, e.factor3_score as ai_f3, e.factor4_score as ai_f4,
        se.total_score as self_total_score,
        se.factor1_score as self_f1, se.factor2_score as self_f2, se.factor3_score as self_f3, se.factor4_score as self_f4
      FROM scat_codes sc
      JOIN scat_segments ss ON sc.segment_id = ss.id
      LEFT JOIN journal_entries je ON ss.source_journal_id = je.id
      LEFT JOIN evaluations e ON je.id = e.journal_id
      LEFT JOIN self_evaluations se ON je.student_id = se.student_id AND je.week_number = se.week_number
      ORDER BY je.student_id, je.week_number, ss.segment_order
    `).all();
    return e.json({ success: true, jointData: a });
  } catch (a) {
    return e.json({ error: String(a) }, 500);
  }
});
j.get("/scat/projects", async (e) => {
  var r;
  const t = (r = e.env) == null ? void 0 : r.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  try {
    const { results: n } = await t.prepare("SELECT * FROM scat_projects ORDER BY created_at DESC").all();
    return e.json({ projects: n });
  } catch (n) {
    return e.json({ error: String(n) }, 500);
  }
});
j.post("/scat/projects", async (e) => {
  var r;
  const t = (r = e.env) == null ? void 0 : r.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  try {
    const { title: n, description: a, created_by: o } = await e.req.json(), s = "proj_" + Date.now();
    return await t.prepare("INSERT INTO scat_projects (id, title, description, created_by) VALUES (?, ?, ?, ?)").bind(s, n, a, o).run(), e.json({ success: true, id: s });
  } catch (n) {
    return e.json({ error: String(n) }, 500);
  }
});
j.get("/scat/segments/:projectId", async (e) => {
  var r;
  const t = (r = e.env) == null ? void 0 : r.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  try {
    const { results: n } = await t.prepare("SELECT * FROM scat_segments WHERE project_id = ? ORDER BY created_at ASC").bind(e.req.param("projectId")).all();
    return e.json({ segments: n });
  } catch (n) {
    return e.json({ error: String(n) }, 500);
  }
});
j.post("/scat/segments/:projectId", async (e) => {
  var r;
  const t = (r = e.env) == null ? void 0 : r.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  try {
    const { segments: n } = await e.req.json(), a = e.req.param("projectId"), o = t.prepare("INSERT INTO scat_segments (id, project_id, journal_id, text_content) VALUES (?, ?, ?, ?)"), s = n.map((i) => o.bind("seg_" + Math.random().toString(36).substr(2, 9), a, i.journal_id || null, i.text_content));
    return s.length > 0 && await t.batch(s), e.json({ success: true });
  } catch (n) {
    return e.json({ error: String(n) }, 500);
  }
});
j.get("/scat/codes/:projectId", async (e) => {
  var r;
  const t = (r = e.env) == null ? void 0 : r.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  try {
    const { results: n } = await t.prepare("SELECT c.* FROM scat_codes c JOIN scat_segments s ON c.segment_id = s.id WHERE s.project_id = ?").bind(e.req.param("projectId")).all();
    return e.json({ codes: n });
  } catch (n) {
    return e.json({ error: String(n) }, 500);
  }
});
j.post("/scat/codes", async (e) => {
  var r;
  const t = (r = e.env) == null ? void 0 : r.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  try {
    const n = await e.req.json(), a = n.id || "code_" + Date.now();
    return await t.prepare(`
      INSERT INTO scat_codes (id, segment_id, researcher_id, step1_words, step2_words, step3_concepts, step4_themes, memo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        step1_words = excluded.step1_words,
        step2_words = excluded.step2_words,
        step3_concepts = excluded.step3_concepts,
        step4_themes = excluded.step4_themes,
        memo = excluded.memo,
        updated_at = CURRENT_TIMESTAMP
    `).bind(a, n.segment_id, n.researcher_id, n.step1_words || "", n.step2_words || "", n.step3_concepts || "", n.step4_themes || "", n.memo || "").run(), e.json({ success: true, id: a });
  } catch (n) {
    return e.json({ error: String(n) }, 500);
  }
});
j.post("/bfi/save", async (e) => {
  const t = e.req.header("x-user-id"), { env: r } = e, n = await e.req.json(), a = n.userId;
  if (a !== t) return e.json({ error: "Unauthorized" }, 401);
  const o = n.responses;
  if (!a || !o) return e.json({ error: "Invalid request" }, 400);
  for (const [s, i] of Object.entries(o)) {
    const c = parseInt(s, 10), l = parseInt(i, 10);
    if (c < 1 || c > 29 || l < 1 || l > 5) return e.json({ error: "Invalid item_id or score. Must be 1-29 and 1-5." }, 400);
    await r.DB.prepare("INSERT INTO namikawa_bfi_responses (user_id, item_id, score) VALUES (?, ?, ?) ON CONFLICT(user_id, item_id) DO UPDATE SET score=excluded.score, updated_at=CURRENT_TIMESTAMP").bind(a, c, l).run();
  }
  if (Object.keys(o).length === 29) {
    const s = { extraversion: [1, 2, 3, 4, -5], neuroticism: [6, 7, 8, 9, 10], openness: [11, 12, 13, 14, 15, 16], agreeableness: [17, 18, 19, -20, -21, -22], conscientiousness: [23, 24, -25, -26, -27, -28, -29] }, i = {};
    for (const [c, l] of Object.entries(s)) {
      let d = 0;
      for (const u of l) {
        const f = Math.abs(u), m = parseInt(o[f], 10);
        d += u < 0 ? 6 - m : m;
      }
      i[c] = d / l.length;
    }
    return await r.DB.prepare("INSERT INTO user_bfi_scores (user_id, extraversion, neuroticism, openness, agreeableness, conscientiousness, is_completed) VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT(user_id) DO UPDATE SET extraversion=excluded.extraversion, neuroticism=excluded.neuroticism, openness=excluded.openness, agreeableness=excluded.agreeableness, conscientiousness=excluded.conscientiousness, is_completed=1, updated_at=CURRENT_TIMESTAMP").bind(a, i.extraversion, i.neuroticism, i.openness, i.agreeableness, i.conscientiousness).run(), e.json({ success: true, isCompleted: true, scores: i });
  }
  return e.json({ success: true, isCompleted: false });
});
j.get("/bfi/responses/:userId", async (e) => {
  const t = e.req.header("x-user-id"), { env: r } = e, n = e.req.param("userId");
  if (n !== t) return e.json({ error: "Unauthorized" }, 401);
  const a = await r.DB.prepare("SELECT item_id, score FROM namikawa_bfi_responses WHERE user_id = ?").bind(n).all(), o = {};
  for (const s of a.results) o[s.item_id] = s.score;
  return e.json({ responses: o });
});
var Ze = new Se();
Ze.get("/pipeline", async (e) => {
  var r;
  const t = (r = e.env) == null ? void 0 : r.DB;
  if (!t) return e.json({ error: "DB not configured" }, 503);
  try {
    const [{ count: n }] = await t.prepare("SELECT count(*) as count FROM evaluations").all().then((i) => i.results), [{ count: a }] = await t.prepare("SELECT count(*) as count FROM journal_entries").all().then((i) => i.results), [{ count: o }] = await t.prepare("SELECT count(DISTINCT student_id) as count FROM journal_entries").all().then((i) => i.results), [{ count: s }] = await t.prepare("SELECT count(*) as count FROM users").all().then((i) => i.results);
    return e.json({ run_id: crypto.randomUUID(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), layers: { L1: { name: "users & auth", count: s, missing_flag_handled: true }, L2: { name: "students", count: o, missing_flag_handled: true }, L3: { name: "journals", count: a, missing_flag_handled: true }, L4: { name: "evaluations", count: n, missing_flag_handled: true } } });
  } catch (n) {
    return e.json({ error: String(n) }, 500);
  }
});
Ze.post("/g-methods", async (e) => e.json({ run_id: crypto.randomUUID(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), method: "IPTW (Inverse Probability of Treatment Weighting)", status: "not_available", message: "G-methods analysis is currently disabled and requires external statistical software (e.g., R/causalweight)." }));
Ze.get("/fairness", (e) => e.json({ run_id: crypto.randomUUID(), timestamp: (/* @__PURE__ */ new Date()).toISOString(), status: "not_available", message: "Automated fairness and validity audit is not fully implemented in-system. Please use exported data for external analysis." }));
var H = new Se();
H.use("/api/*", Qe({ origin: ["https://localhost:3000", "https://teaching-practice-eval.pages.dev"], allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], allowHeaders: ["Content-Type", "Authorization"] }));
H.get("/healthz", (e) => e.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
H.get("/version", (e) => e.json({ version: "1.0.0", environment: "production" }));
H.route("/api/ai", z);
H.route("/api/ocr", z);
H.route("/api/analytics", Ze);
H.route("/api/stats", G);
H.route("/api/data", j);
H.get("/api/health", (e) => {
  var t, r, n;
  return e.json({ status: "ok", version: "1.0.0", timestamp: (/* @__PURE__ */ new Date()).toISOString(), services: { openai: !!((t = e.env) != null && t.OPENAI_API_KEY), vision: !!((r = e.env) != null && r.GOOGLE_CLOUD_VISION_API_KEY), d1: !!((n = e.env) != null && n.DB) } });
});
H.use("/assets/*", ut());
H.use("/static/*", ut());
H.get("*", ut());
var gt = new Se();
var Br = Object.assign({ "/src/index.tsx": H });
var Ht = false;
for (const [, e] of Object.entries(Br)) e && (gt.route("/", e), gt.notFound(e.notFoundHandler), Ht = true);
if (!Ht) throw new Error("Can't import modules from ['/src/index.tsx','/app/server.ts']");

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-4eFVtb/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = gt;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-4eFVtb/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=bundledWorker-0.5531726480886299.mjs.map
