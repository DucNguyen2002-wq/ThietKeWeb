function isCompatible(ua) {
    return !!((function() {
        'use strict';
        return !this && Function.prototype.bind;
    }()) && 'querySelector'in document && 'localStorage'in window && !ua.match(/MSIE 10|NetFront|Opera Mini|S40OviBrowser|MeeGo|Android.+Glass|^Mozilla\/5\.0 .+ Gecko\/$|googleweblight|PLAYSTATION|PlayStation/));
}
if (!isCompatible(navigator.userAgent)) {
    document.documentElement.className = document.documentElement.className.replace(/(^|\s)client-js(\s|$)/, '$1client-nojs$2');
    while (window.NORLQ && NORLQ[0]) {
        NORLQ.shift()();
    }
    NORLQ = {
        push: function(fn) {
            fn();
        }
    };
    RLQ = {
        push: function() {}
    };
} else {
    if (window.performance && performance.mark) {
        performance.mark('mwStartup');
    }
    (function() {
        'use strict';
        var mw, log, con = window.console;
        function logError(topic, data) {
            var msg, e = data.exception;
            if (con.log) {
                msg = (e ? 'Exception' : 'Error') + ' in ' + data.source + (data.module ? ' in module ' + data.module : '') + (e ? ':' : '.');
                con.log(msg);
                if (e && con.warn) {
                    con.warn(e);
                }
            }
        }
        function Map() {
            this.values = Object.create(null);
        }
        Map.prototype = {
            constructor: Map,
            get: function(selection, fallback) {
                var results, i;
                fallback = arguments.length > 1 ? fallback : null;
                if (Array.isArray(selection)) {
                    results = {};
                    for (i = 0; i < selection.length; i++) {
                        if (typeof selection[i] === 'string') {
                            results[selection[i]] = selection[i]in this.values ? this.values[selection[i]] : fallback;
                        }
                    }
                    return results;
                }
                if (typeof selection === 'string') {
                    return selection in this.values ? this.values[selection] : fallback;
                }
                if (selection === undefined) {
                    results = {};
                    for (i in this.values) {
                        results[i] = this.values[i];
                    }
                    return results;
                }
                return fallback;
            },
            set: function(selection, value) {
                if (arguments.length > 1) {
                    if (typeof selection === 'string') {
                        this.values[selection] = value;
                        return true;
                    }
                } else if (typeof selection === 'object') {
                    for (var s in selection) {
                        this.values[s] = selection[s];
                    }
                    return true;
                }
                return false;
            },
            exists: function(selection) {
                return typeof selection === 'string' && selection in this.values;
            }
        };
        log = function() {}
        ;
        log.warn = con.warn ? Function.prototype.bind.call(con.warn, con) : function() {}
        ;
        mw = {
            now: function() {
                var perf = window.performance
                  , navStart = perf && perf.timing && perf.timing.navigationStart;
                mw.now = navStart && perf.now ? function() {
                    return navStart + perf.now();
                }
                : Date.now;
                return mw.now();
            },
            trackQueue: [],
            track: function(topic, data) {
                mw.trackQueue.push({
                    topic: topic,
                    data: data
                });
            },
            trackError: function(topic, data) {
                mw.track(topic, data);
                logError(topic, data);
            },
            Map: Map,
            config: new Map(),
            messages: new Map(),
            templates: new Map(),
            log: log
        };
        window.mw = window.mediaWiki = mw;
    }());
    (function() {
        'use strict';
        var StringSet, store, hasOwn = Object.hasOwnProperty;
        function defineFallbacks() {
            StringSet = window.Set || function() {
                var set = Object.create(null);
                return {
                    add: function(value) {
                        set[value] = true;
                    },
                    has: function(value) {
                        return value in set;
                    }
                };
            }
            ;
        }
        defineFallbacks();
        function fnv132(str) {
            var hash = 0x811C9DC5;
            for (var i = 0; i < str.length; i++) {
                hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
                hash ^= str.charCodeAt(i);
            }
            hash = (hash >>> 0).toString(36).slice(0, 5);
            while (hash.length < 5) {
                hash = '0' + hash;
            }
            return hash;
        }
        var isES6Supported = typeof Promise === 'function' && Promise.prototype.finally && /./g.flags === 'g' && (function() {
            try {
                new Function('(a = 0) => a');
                return true;
            } catch (e) {
                return false;
            }
        }());
        var registry = Object.create(null), sources = Object.create(null), handlingPendingRequests = false, pendingRequests = [], queue = [], jobs = [], willPropagate = false, errorModules = [], baseModules = ["jquery", "mediawiki.base"], marker = document.querySelector('meta[name="ResourceLoaderDynamicStyles"]'), lastCssBuffer, rAF = window.requestAnimationFrame || setTimeout;
        function newStyleTag(text, nextNode) {
            var el = document.createElement('style');
            el.appendChild(document.createTextNode(text));
            if (nextNode && nextNode.parentNode) {
                nextNode.parentNode.insertBefore(el, nextNode);
            } else {
                document.head.appendChild(el);
            }
            return el;
        }
        function flushCssBuffer(cssBuffer) {
            if (cssBuffer === lastCssBuffer) {
                lastCssBuffer = null;
            }
            newStyleTag(cssBuffer.cssText, marker);
            for (var i = 0; i < cssBuffer.callbacks.length; i++) {
                cssBuffer.callbacks[i]();
            }
        }
        function addEmbeddedCSS(cssText, callback) {
            if (!lastCssBuffer || cssText.slice(0, 7) === '@import') {
                lastCssBuffer = {
                    cssText: '',
                    callbacks: []
                };
                rAF(flushCssBuffer.bind(null, lastCssBuffer));
            }
            lastCssBuffer.cssText += '\n' + cssText;
            lastCssBuffer.callbacks.push(callback);
        }
        function getCombinedVersion(modules) {
            var hashes = modules.reduce(function(result, module) {
                return result + registry[module].version;
            }, '');
            return fnv132(hashes);
        }
        function allReady(modules) {
            for (var i = 0; i < modules.length; i++) {
                if (mw.loader.getState(modules[i]) !== 'ready') {
                    return false;
                }
            }
            return true;
        }
        function allWithImplicitReady(module) {
            return allReady(registry[module].dependencies) && (baseModules.indexOf(module) !== -1 || allReady(baseModules));
        }
        function anyFailed(modules) {
            for (var i = 0; i < modules.length; i++) {
                var state = mw.loader.getState(modules[i]);
                if (state === 'error' || state === 'missing') {
                    return modules[i];
                }
            }
            return false;
        }
        function doPropagation() {
            var didPropagate = true;
            var module;
            while (didPropagate) {
                didPropagate = false;
                while (errorModules.length) {
                    var errorModule = errorModules.shift()
                      , baseModuleError = baseModules.indexOf(errorModule) !== -1;
                    for (module in registry) {
                        if (registry[module].state !== 'error' && registry[module].state !== 'missing') {
                            if (baseModuleError && baseModules.indexOf(module) === -1) {
                                registry[module].state = 'error';
                                didPropagate = true;
                            } else if (registry[module].dependencies.indexOf(errorModule) !== -1) {
                                registry[module].state = 'error';
                                errorModules.push(module);
                                didPropagate = true;
                            }
                        }
                    }
                }
                for (module in registry) {
                    if (registry[module].state === 'loaded' && allWithImplicitReady(module)) {
                        execute(module);
                        didPropagate = true;
                    }
                }
                for (var i = 0; i < jobs.length; i++) {
                    var job = jobs[i];
                    var failed = anyFailed(job.dependencies);
                    if (failed !== false || allReady(job.dependencies)) {
                        jobs.splice(i, 1);
                        i -= 1;
                        try {
                            if (failed !== false && job.error) {
                                job.error(new Error('Failed dependency: ' + failed), job.dependencies);
                            } else if (failed === false && job.ready) {
                                job.ready();
                            }
                        } catch (e) {
                            mw.trackError('resourceloader.exception', {
                                exception: e,
                                source: 'load-callback'
                            });
                        }
                        didPropagate = true;
                    }
                }
            }
            willPropagate = false;
        }
        function setAndPropagate(module, state) {
            registry[module].state = state;
            if (state === 'ready') {
                store.add(module);
            } else if (state === 'error' || state === 'missing') {
                errorModules.push(module);
            } else if (state !== 'loaded') {
                return;
            }
            if (willPropagate) {
                return;
            }
            willPropagate = true;
            mw.requestIdleCallback(doPropagation, {
                timeout: 1
            });
        }
        function sortDependencies(module, resolved, unresolved) {
            if (!(module in registry)) {
                throw new Error('Unknown module: ' + module);
            }
            if (typeof registry[module].skip === 'string') {
                var skip = (new Function(registry[module].skip)());
                registry[module].skip = !!skip;
                if (skip) {
                    registry[module].dependencies = [];
                    setAndPropagate(module, 'ready');
                    return;
                }
            }
            if (!unresolved) {
                unresolved = new StringSet();
            }
            var deps = registry[module].dependencies;
            unresolved.add(module);
            for (var i = 0; i < deps.length; i++) {
                if (resolved.indexOf(deps[i]) === -1) {
                    if (unresolved.has(deps[i])) {
                        throw new Error('Circular reference detected: ' + module + ' -> ' + deps[i]);
                    }
                    sortDependencies(deps[i], resolved, unresolved);
                }
            }
            resolved.push(module);
        }
        function resolve(modules) {
            var resolved = baseModules.slice();
            for (var i = 0; i < modules.length; i++) {
                sortDependencies(modules[i], resolved);
            }
            return resolved;
        }
        function resolveStubbornly(modules) {
            var resolved = baseModules.slice();
            for (var i = 0; i < modules.length; i++) {
                var saved = resolved.slice();
                try {
                    sortDependencies(modules[i], resolved);
                } catch (err) {
                    resolved = saved;
                    mw.log.warn('Skipped unavailable module ' + modules[i]);
                    if (modules[i]in registry) {
                        mw.trackError('resourceloader.exception', {
                            exception: err,
                            source: 'resolve'
                        });
                    }
                }
            }
            return resolved;
        }
        function resolveRelativePath(relativePath, basePath) {
            var relParts = relativePath.match(/^((?:\.\.?\/)+)(.*)$/);
            if (!relParts) {
                return null;
            }
            var baseDirParts = basePath.split('/');
            baseDirParts.pop();
            var prefixes = relParts[1].split('/');
            prefixes.pop();
            var prefix;
            while ((prefix = prefixes.pop()) !== undefined) {
                if (prefix === '..') {
                    baseDirParts.pop();
                }
            }
            return (baseDirParts.length ? baseDirParts.join('/') + '/' : '') + relParts[2];
        }
        function makeRequireFunction(moduleObj, basePath) {
            return function require(moduleName) {
                var fileName = resolveRelativePath(moduleName, basePath);
                if (fileName === null) {
                    return mw.loader.require(moduleName);
                }
                if (hasOwn.call(moduleObj.packageExports, fileName)) {
                    return moduleObj.packageExports[fileName];
                }
                var scriptFiles = moduleObj.script.files;
                if (!hasOwn.call(scriptFiles, fileName)) {
                    throw new Error('Cannot require undefined file ' + fileName);
                }
                var result, fileContent = scriptFiles[fileName];
                if (typeof fileContent === 'function') {
                    var moduleParam = {
                        exports: {}
                    };
                    fileContent(makeRequireFunction(moduleObj, fileName), moduleParam, moduleParam.exports);
                    result = moduleParam.exports;
                } else {
                    result = fileContent;
                }
                moduleObj.packageExports[fileName] = result;
                return result;
            }
            ;
        }
        function addScript(src, callback) {
            var script = document.createElement('script');
            script.src = src;
            script.onload = script.onerror = function() {
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
                if (callback) {
                    callback();
                    callback = null;
                }
            }
            ;
            document.head.appendChild(script);
        }
        function queueModuleScript(src, moduleName, callback) {
            pendingRequests.push(function() {
                if (moduleName !== 'jquery') {
                    window.require = mw.loader.require;
                    window.module = registry[moduleName].module;
                }
                addScript(src, function() {
                    delete window.module;
                    callback();
                    if (pendingRequests[0]) {
                        pendingRequests.shift()();
                    } else {
                        handlingPendingRequests = false;
                    }
                });
            });
            if (!handlingPendingRequests && pendingRequests[0]) {
                handlingPendingRequests = true;
                pendingRequests.shift()();
            }
        }
        function addLink(url, media, nextNode) {
            var el = document.createElement('link');
            el.rel = 'stylesheet';
            if (media) {
                el.media = media;
            }
            el.href = url;
            if (nextNode && nextNode.parentNode) {
                nextNode.parentNode.insertBefore(el, nextNode);
            } else {
                document.head.appendChild(el);
            }
        }
        function domEval(code) {
            var script = document.createElement('script');
            if (mw.config.get('wgCSPNonce') !== false) {
                script.nonce = mw.config.get('wgCSPNonce');
            }
            script.text = code;
            document.head.appendChild(script);
            script.parentNode.removeChild(script);
        }
        function enqueue(dependencies, ready, error) {
            if (allReady(dependencies)) {
                if (ready) {
                    ready();
                }
                return;
            }
            var failed = anyFailed(dependencies);
            if (failed !== false) {
                if (error) {
                    error(new Error('Dependency ' + failed + ' failed to load'), dependencies);
                }
                return;
            }
            if (ready || error) {
                jobs.push({
                    dependencies: dependencies.filter(function(module) {
                        var state = registry[module].state;
                        return state === 'registered' || state === 'loaded' || state === 'loading' || state === 'executing';
                    }),
                    ready: ready,
                    error: error
                });
            }
            dependencies.forEach(function(module) {
                if (registry[module].state === 'registered' && queue.indexOf(module) === -1) {
                    queue.push(module);
                }
            });
            mw.loader.work();
        }
        function execute(module) {
            if (registry[module].state !== 'loaded') {
                throw new Error('Module in state "' + registry[module].state + '" may not execute: ' + module);
            }
            registry[module].state = 'executing';
            var runScript = function() {
                var script = registry[module].script;
                var markModuleReady = function() {
                    setAndPropagate(module, 'ready');
                };
                var nestedAddScript = function(arr, offset) {
                    if (offset >= arr.length) {
                        markModuleReady();
                        return;
                    }
                    queueModuleScript(arr[offset], module, function() {
                        nestedAddScript(arr, offset + 1);
                    });
                };
                try {
                    if (Array.isArray(script)) {
                        nestedAddScript(script, 0);
                    } else if (typeof script === 'function') {
                        if (module === 'jquery') {
                            script();
                        } else {
                            script(window.$, window.$, mw.loader.require, registry[module].module);
                        }
                        markModuleReady();
                    } else if (typeof script === 'object' && script !== null) {
                        var mainScript = script.files[script.main];
                        if (typeof mainScript !== 'function') {
                            throw new Error('Main file in module ' + module + ' must be a function');
                        }
                        mainScript(makeRequireFunction(registry[module], script.main), registry[module].module, registry[module].module.exports);
                        markModuleReady();
                    } else if (typeof script === 'string') {
                        domEval(script);
                        markModuleReady();
                    } else {
                        markModuleReady();
                    }
                } catch (e) {
                    setAndPropagate(module, 'error');
                    mw.trackError('resourceloader.exception', {
                        exception: e,
                        module: module,
                        source: 'module-execute'
                    });
                }
            };
            if (registry[module].messages) {
                mw.messages.set(registry[module].messages);
            }
            if (registry[module].templates) {
                mw.templates.set(module, registry[module].templates);
            }
            var cssPending = 0;
            var cssHandle = function() {
                cssPending++;
                return function() {
                    cssPending--;
                    if (cssPending === 0) {
                        var runScriptCopy = runScript;
                        runScript = undefined;
                        runScriptCopy();
                    }
                }
                ;
            };
            if (registry[module].style) {
                for (var key in registry[module].style) {
                    var value = registry[module].style[key];
                    if (key === 'css') {
                        for (var i = 0; i < value.length; i++) {
                            addEmbeddedCSS(value[i], cssHandle());
                        }
                    } else if (key === 'url') {
                        for (var media in value) {
                            var urls = value[media];
                            for (var j = 0; j < urls.length; j++) {
                                addLink(urls[j], media, marker);
                            }
                        }
                    }
                }
            }
            if (module === 'user') {
                var siteDeps;
                var siteDepErr;
                try {
                    siteDeps = resolve(['site']);
                } catch (e) {
                    siteDepErr = e;
                    runScript();
                }
                if (!siteDepErr) {
                    enqueue(siteDeps, runScript, runScript);
                }
            } else if (cssPending === 0) {
                runScript();
            }
        }
        function sortQuery(o) {
            var sorted = {};
            var list = [];
            for (var key in o) {
                list.push(key);
            }
            list.sort();
            for (var i = 0; i < list.length; i++) {
                sorted[list[i]] = o[list[i]];
            }
            return sorted;
        }
        function buildModulesString(moduleMap) {
            var str = [];
            var list = [];
            var p;
            function restore(suffix) {
                return p + suffix;
            }
            for (var prefix in moduleMap) {
                p = prefix === '' ? '' : prefix + '.';
                str.push(p + moduleMap[prefix].join(','));
                list.push.apply(list, moduleMap[prefix].map(restore));
            }
            return {
                str: str.join('|'),
                list: list
            };
        }
        function makeQueryString(params) {
            var chunks = [];
            for (var key in params) {
                chunks.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
            }
            return chunks.join('&');
        }
        function batchRequest(batch) {
            if (!batch.length) {
                return;
            }
            var sourceLoadScript, currReqBase, moduleMap;
            function doRequest() {
                var query = Object.create(currReqBase)
                  , packed = buildModulesString(moduleMap);
                query.modules = packed.str;
                query.version = getCombinedVersion(packed.list);
                query = sortQuery(query);
                addScript(sourceLoadScript + '?' + makeQueryString(query));
            }
            batch.sort();
            var reqBase = {
                "lang": "en",
                "skin": "vectordark"
            };
            var splits = Object.create(null);
            for (var b = 0; b < batch.length; b++) {
                var bSource = registry[batch[b]].source;
                var bGroup = registry[batch[b]].group;
                if (!splits[bSource]) {
                    splits[bSource] = Object.create(null);
                }
                if (!splits[bSource][bGroup]) {
                    splits[bSource][bGroup] = [];
                }
                splits[bSource][bGroup].push(batch[b]);
            }
            for (var source in splits) {
                sourceLoadScript = sources[source];
                for (var group in splits[source]) {
                    var modules = splits[source][group];
                    currReqBase = Object.create(reqBase);
                    if (group === 0 && mw.config.get('wgUserName') !== null) {
                        currReqBase.user = mw.config.get('wgUserName');
                    }
                    var currReqBaseLength = makeQueryString(currReqBase).length + 23;
                    var length = currReqBaseLength;
                    var currReqModules = [];
                    moduleMap = Object.create(null);
                    for (var i = 0; i < modules.length; i++) {
                        var lastDotIndex = modules[i].lastIndexOf('.')
                          , prefix = modules[i].slice(0, Math.max(0, lastDotIndex))
                          , suffix = modules[i].slice(lastDotIndex + 1)
                          , bytesAdded = moduleMap[prefix] ? suffix.length + 3 : modules[i].length + 3;
                        if (currReqModules.length && length + bytesAdded > mw.loader.maxQueryLength) {
                            doRequest();
                            length = currReqBaseLength;
                            moduleMap = Object.create(null);
                            currReqModules = [];
                        }
                        if (!moduleMap[prefix]) {
                            moduleMap[prefix] = [];
                        }
                        length += bytesAdded;
                        moduleMap[prefix].push(suffix);
                        currReqModules.push(modules[i]);
                    }
                    if (currReqModules.length) {
                        doRequest();
                    }
                }
            }
        }
        function asyncEval(implementations, cb) {
            if (!implementations.length) {
                return;
            }
            mw.requestIdleCallback(function() {
                try {
                    domEval(implementations.join(';'));
                } catch (err) {
                    cb(err);
                }
            });
        }
        function getModuleKey(module) {
            return module in registry ? (module + '@' + registry[module].version) : null;
        }
        function splitModuleKey(key) {
            var index = key.lastIndexOf('@');
            if (index === -1 || index === 0) {
                return {
                    name: key,
                    version: ''
                };
            }
            return {
                name: key.slice(0, index),
                version: key.slice(index + 1)
            };
        }
        function registerOne(module, version, dependencies, group, source, skip) {
            if (module in registry) {
                throw new Error('module already registered: ' + module);
            }
            version = String(version || '');
            if (version.slice(-1) === '!') {
                if (!isES6Supported) {
                    return;
                }
                version = version.slice(0, -1);
            }
            registry[module] = {
                module: {
                    exports: {}
                },
                packageExports: {},
                version: version,
                dependencies: dependencies || [],
                group: typeof group === 'undefined' ? null : group,
                source: typeof source === 'string' ? source : 'local',
                state: 'registered',
                skip: typeof skip === 'string' ? skip : null
            };
        }
        mw.loader = {
            moduleRegistry: registry,
            maxQueryLength: 2000,
            addStyleTag: newStyleTag,
            enqueue: enqueue,
            resolve: resolve,
            work: function() {
                store.init();
                var q = queue.length
                  , storedImplementations = []
                  , storedNames = []
                  , requestNames = []
                  , batch = new StringSet();
                while (q--) {
                    var module = queue[q];
                    if (mw.loader.getState(module) === 'registered' && !batch.has(module)) {
                        registry[module].state = 'loading';
                        batch.add(module);
                        var implementation = store.get(module);
                        if (implementation) {
                            storedImplementations.push(implementation);
                            storedNames.push(module);
                        } else {
                            requestNames.push(module);
                        }
                    }
                }
                queue = [];
                asyncEval(storedImplementations, function(err) {
                    store.stats.failed++;
                    store.clear();
                    mw.trackError('resourceloader.exception', {
                        exception: err,
                        source: 'store-eval'
                    });
                    var failed = storedNames.filter(function(name) {
                        return registry[name].state === 'loading';
                    });
                    batchRequest(failed);
                });
                batchRequest(requestNames);
            },
            addSource: function(ids) {
                for (var id in ids) {
                    if (id in sources) {
                        throw new Error('source already registered: ' + id);
                    }
                    sources[id] = ids[id];
                }
            },
            register: function(modules) {
                if (typeof modules !== 'object') {
                    registerOne.apply(null, arguments);
                    return;
                }
                function resolveIndex(dep) {
                    return typeof dep === 'number' ? modules[dep][0] : dep;
                }
                for (var i = 0; i < modules.length; i++) {
                    var deps = modules[i][2];
                    if (deps) {
                        for (var j = 0; j < deps.length; j++) {
                            deps[j] = resolveIndex(deps[j]);
                        }
                    }
                    registerOne.apply(null, modules[i]);
                }
            },
            implement: function(module, script, style, messages, templates) {
                var split = splitModuleKey(module)
                  , name = split.name
                  , version = split.version;
                if (!(name in registry)) {
                    mw.loader.register(name);
                }
                if (registry[name].script !== undefined) {
                    throw new Error('module already implemented: ' + name);
                }
                if (version) {
                    registry[name].version = version;
                }
                registry[name].script = script || null;
                registry[name].style = style || null;
                registry[name].messages = messages || null;
                registry[name].templates = templates || null;
                if (registry[name].state !== 'error' && registry[name].state !== 'missing') {
                    setAndPropagate(name, 'loaded');
                }
            },
            load: function(modules, type) {
                if (typeof modules === 'string' && /^(https?:)?\/?\//.test(modules)) {
                    if (type === 'text/css') {
                        addLink(modules);
                    } else if (type === 'text/javascript' || type === undefined) {
                        addScript(modules);
                    } else {
                        throw new Error('Invalid type ' + type);
                    }
                } else {
                    modules = typeof modules === 'string' ? [modules] : modules;
                    enqueue(resolveStubbornly(modules));
                }
            },
            state: function(states) {
                for (var module in states) {
                    if (!(module in registry)) {
                        mw.loader.register(module);
                    }
                    setAndPropagate(module, states[module]);
                }
            },
            getState: function(module) {
                return module in registry ? registry[module].state : null;
            },
            require: function(moduleName) {
                if (mw.loader.getState(moduleName) !== 'ready') {
                    throw new Error('Module "' + moduleName + '" is not loaded');
                }
                return registry[moduleName].module.exports;
            }
        };
        var hasPendingWrites = false;
        function flushWrites() {
            store.prune();
            while (store.queue.length) {
                store.set(store.queue.shift());
            }
            try {
                localStorage.removeItem(store.key);
                var data = JSON.stringify(store);
                localStorage.setItem(store.key, data);
            } catch (e) {
                mw.trackError('resourceloader.exception', {
                    exception: e,
                    source: 'store-localstorage-update'
                });
            }
            hasPendingWrites = false;
        }
        mw.loader.store = store = {
            enabled: null,
            items: {},
            queue: [],
            stats: {
                hits: 0,
                misses: 0,
                expired: 0,
                failed: 0
            },
            toJSON: function() {
                return {
                    items: store.items,
                    vary: store.vary,
                    asOf: Math.ceil(Date.now() / 1e7)
                };
            },
            key: "MediaWikiModuleStore:mediawiki",
            vary: "vectordark:1:en",
            init: function() {
                if (this.enabled === null) {
                    this.enabled = false;
                    if (false || /Firefox/.test(navigator.userAgent)) {
                        this.clear();
                    } else {
                        this.load();
                    }
                }
            },
            load: function() {
                try {
                    var raw = localStorage.getItem(this.key);
                    this.enabled = true;
                    var data = JSON.parse(raw);
                    if (data && data.vary === this.vary && data.items && Date.now() < (data.asOf * 1e7) + 259e7) {
                        this.items = data.items;
                    }
                } catch (e) {}
            },
            get: function(module) {
                if (this.enabled) {
                    var key = getModuleKey(module);
                    if (key in this.items) {
                        this.stats.hits++;
                        return this.items[key];
                    }
                    this.stats.misses++;
                }
                return false;
            },
            add: function(module) {
                if (this.enabled) {
                    this.queue.push(module);
                    this.requestUpdate();
                }
            },
            set: function(module) {
                var args, encodedScript, descriptor = registry[module], key = getModuleKey(module);
                if (key in this.items || !descriptor || descriptor.state !== 'ready' || !descriptor.version || descriptor.group === 1 || descriptor.group === 0 || [descriptor.script, descriptor.style, descriptor.messages, descriptor.templates].indexOf(undefined) !== -1) {
                    return;
                }
                try {
                    if (typeof descriptor.script === 'function') {
                        encodedScript = String(descriptor.script);
                    } else if (typeof descriptor.script === 'object' && descriptor.script && !Array.isArray(descriptor.script)) {
                        encodedScript = '{' + 'main:' + JSON.stringify(descriptor.script.main) + ',' + 'files:{' + Object.keys(descriptor.script.files).map(function(file) {
                            var value = descriptor.script.files[file];
                            return JSON.stringify(file) + ':' + (typeof value === 'function' ? value : JSON.stringify(value));
                        }).join(',') + '}}';
                    } else {
                        encodedScript = JSON.stringify(descriptor.script);
                    }
                    args = [JSON.stringify(key), encodedScript, JSON.stringify(descriptor.style), JSON.stringify(descriptor.messages), JSON.stringify(descriptor.templates)];
                } catch (e) {
                    mw.trackError('resourceloader.exception', {
                        exception: e,
                        source: 'store-localstorage-json'
                    });
                    return;
                }
                var src = 'mw.loader.implement(' + args.join(',') + ');';
                if (src.length > 1e5) {
                    return;
                }
                this.items[key] = src;
            },
            prune: function() {
                for (var key in this.items) {
                    if (getModuleKey(splitModuleKey(key).name) !== key) {
                        this.stats.expired++;
                        delete this.items[key];
                    }
                }
            },
            clear: function() {
                this.items = {};
                try {
                    localStorage.removeItem(this.key);
                } catch (e) {}
            },
            requestUpdate: function() {
                if (!hasPendingWrites) {
                    hasPendingWrites = true;
                    setTimeout(function() {
                        mw.requestIdleCallback(flushWrites);
                    }, 2000);
                }
            }
        };
    }());
    mw.requestIdleCallbackInternal = function(callback) {
        setTimeout(function() {
            var start = mw.now();
            callback({
                didTimeout: false,
                timeRemaining: function() {
                    return Math.max(0, 50 - (mw.now() - start));
                }
            });
        }, 1);
    }
    ;
    mw.requestIdleCallback = window.requestIdleCallback ? window.requestIdleCallback.bind(window) : mw.requestIdleCallbackInternal;
    (function() {
        var queue;
        mw.loader.addSource({
            "local": "/load.php"
        });
        mw.loader.register([["site", "lst69", [1]], ["site.styles", "18ei7", [], 2], ["filepage", "g5bm6"], ["user", "s1wiu", [], 0], ["user.styles", "smrj4", [], 0], ["user.options", "1i9g4", [], 1], ["mediawiki.skinning.elements", "1e7qk"], ["mediawiki.skinning.content", "1qa6p"], ["mediawiki.skinning.interface", "1br3n"], ["jquery.makeCollapsible.styles", "ljtp5"], ["mediawiki.skinning.content.parsoid", "19thu"], ["mediawiki.skinning.content.externallinks", "4sfp3"], ["jquery", "1vnvf"], ["es6-polyfills", "u287e", [], null, null, "return Array.prototype.find\u0026\u0026Array.prototype.findIndex\u0026\u0026Array.prototype.includes\u0026\u0026typeof Promise==='function'\u0026\u0026Promise.prototype.finally;"], ["fetch-polyfill", "1gvrd", [15]], ["web2017-polyfills", "k0rck", [13], null, null, "return'IntersectionObserver'in window\u0026\u0026typeof fetch==='function'\u0026\u0026typeof URL==='function'\u0026\u0026'toJSON'in URL.prototype;"], ["mediawiki.base", "1wyxi", [12]], ["jquery.chosen", "bppd4"], ["jquery.client", "1tje2"], ["jquery.color", "qs4nu"], ["jquery.confirmable", "1en9n", [114]], ["jquery.cookie", "1u41n"], ["jquery.form", "186tg"], ["jquery.fullscreen", "18ttp"], ["jquery.highlightText", "t130m", [87]], ["jquery.hoverIntent", "pqqa9"], ["jquery.i18n", "31t4a", [113]], ["jquery.lengthLimit", "qrnp1", [69]], ["jquery.makeCollapsible", "3zx6r", [9]], ["jquery.spinner", "yoa8f", [30]], ["jquery.spinner.styles", "pfek7"], ["jquery.suggestions", "1ykxl", [24]], ["jquery.tablesorter", "ex6te", [33, 115, 87]], ["jquery.tablesorter.styles", "jjsfw"], ["jquery.textSelection", "em3yw", [18]], ["jquery.throttle-debounce", "1bymo"], ["jquery.tipsy", "1thqq"], ["jquery.ui", "19q0t"], ["moment", "r6trt", [111, 87]], ["vue", "3awne!"], ["@vue/composition-api", "1s4l3", [39]], ["vuex", "ironm!", [39]], ["wvui", "46zus", [40]], ["wvui-search", "1rr2l", [39]], ["mediawiki.template", "6nkqm"], ["mediawiki.template.mustache", "gy30q", [44]], ["mediawiki.apipretty", "qjpf2"], ["mediawiki.api", "1sdt6", [75, 114]], ["mediawiki.content.json", "m0cuh"], ["mediawiki.confirmCloseWindow", "1m54f"], ["mediawiki.debug", "a5lwb", [202]], ["mediawiki.diff", "oztjs"], ["mediawiki.diff.styles", "prl7y"], ["mediawiki.feedback", "176j7", [362, 210]], ["mediawiki.feedlink", "5bck4"], ["mediawiki.filewarning", "138bm", [202, 214]], ["mediawiki.ForeignApi", "17f2l", [57]], ["mediawiki.ForeignApi.core", "15s0r", [84, 47, 198]], ["mediawiki.helplink", "5fs9z"], ["mediawiki.hlist", "1fjxn"], ["mediawiki.htmlform", "18f2c", [27, 87]], ["mediawiki.htmlform.ooui", "moc8u", [202]], ["mediawiki.htmlform.styles", "1x8zm"], ["mediawiki.htmlform.ooui.styles", "ge3zz"], ["mediawiki.icon", "17xlm"], ["mediawiki.inspect", "1w7zb", [69, 87]], ["mediawiki.notification", "zyd9x", [87, 94]], ["mediawiki.notification.convertmessagebox", "zb0xo", [66]], ["mediawiki.notification.convertmessagebox.styles", "dro1f"], ["mediawiki.String", "1ck84"], ["mediawiki.pager.styles", "2txmq"], ["mediawiki.pager.tablePager", "ykcx2"], ["mediawiki.pulsatingdot", "svyap"], ["mediawiki.searchSuggest", "kvplw", [31, 47]], ["mediawiki.storage", "1sj4u"], ["mediawiki.Title", "1bqh8", [69, 87]], ["mediawiki.Upload", "3i9e4", [47]], ["mediawiki.ForeignUpload", "pxkp9", [56, 76]], ["mediawiki.ForeignStructuredUpload", "gsf1n", [77]], ["mediawiki.Upload.Dialog", "k8qbo", [80]], ["mediawiki.Upload.BookletLayout", "jgrqa", [76, 85, 38, 205, 210, 215, 216]], ["mediawiki.ForeignStructuredUpload.BookletLayout", "gss1b", [78, 80, 118, 181, 175]], ["mediawiki.toc", "5oex3", [91]], ["mediawiki.toc.styles", "110xl"], ["mediawiki.Uri", "1n2iu", [87]], ["mediawiki.user", "1ab6a", [47, 91]], ["mediawiki.userSuggest", "1tzu5", [31, 47]], ["mediawiki.util", "1vtem", [18]], ["mediawiki.viewport", "j19gc"], ["mediawiki.checkboxtoggle", "nzeg7"], ["mediawiki.checkboxtoggle.styles", "1esmp"], ["mediawiki.cookie", "nqrm2", [21]], ["mediawiki.experiments", "8e8ao"], ["mediawiki.editfont.styles", "513k5"], ["mediawiki.visibleTimeout", "1bmk6"], ["mediawiki.action.delete", "zjbix", [27, 202]], ["mediawiki.action.edit", "165e7", [34, 97, 47, 93, 177]], ["mediawiki.action.edit.styles", "szn5z"], ["mediawiki.action.edit.collapsibleFooter", "1jlz7", [28, 64, 74]], ["mediawiki.action.edit.preview", "37x3g", [29, 124, 85]], ["mediawiki.action.history", "1j8pz", [28]], ["mediawiki.action.history.styles", "18u8q"], ["mediawiki.action.protect", "nuj27", [27, 202]], ["mediawiki.action.view.metadata", "104m6", [109]], ["mediawiki.action.view.categoryPage.styles", "18sxm"], ["mediawiki.action.view.postEdit", "11sol", [114, 66, 202, 221]], ["mediawiki.action.view.redirect", "1a3n8", [18]], ["mediawiki.action.view.redirectPage", "q240x"], ["mediawiki.action.edit.editWarning", "192id", [34, 49, 114]], ["mediawiki.action.view.filepage", "zhum4"], ["mediawiki.action.styles", "xz1f2"], ["mediawiki.language", "1h2x6", [112]], ["mediawiki.cldr", "1630p", [113]], ["mediawiki.libs.pluralruleparser", "8vy0u"], ["mediawiki.jqueryMsg", "1tetk", [69, 111, 87, 5]], ["mediawiki.language.months", "1tymc", [111]], ["mediawiki.language.names", "hett5", [111]], ["mediawiki.language.specialCharacters", "cv42u", [111]], ["mediawiki.libs.jpegmeta", "16fc5"], ["mediawiki.page.gallery", "7tgpe", [120, 87]], ["mediawiki.page.gallery.styles", "b1yhv"], ["mediawiki.page.gallery.slideshow", "1j8et", [47, 205, 224, 226]], ["mediawiki.page.ready", "1m3as", [47]], ["mediawiki.page.watch.ajax", "fq0i1", [47]], ["mediawiki.page.preview", "1mxad", [28, 34, 47, 52, 202]], ["mediawiki.page.image.pagination", "18sxf", [29, 87]], ["mediawiki.rcfilters.filters.base.styles", "rpd13"], ["mediawiki.rcfilters.highlightCircles.seenunseen.styles", "1ikco"], ["mediawiki.rcfilters.filters.ui", "1fat4", [28, 84, 85, 172, 211, 218, 220, 221, 222, 224, 225]], ["mediawiki.interface.helpers.styles", "hxk8z"], ["mediawiki.special", "1w046"], ["mediawiki.special.apisandbox", "1hqnm", [28, 84, 192, 178, 201, 216]], ["mediawiki.special.block", "3z6jo", [60, 175, 191, 182, 192, 189, 216, 218]], ["mediawiki.misc-authed-ooui", "4897z", [61, 172, 177]], ["mediawiki.misc-authed-pref", "1b18i", [5]], ["mediawiki.misc-authed-curate", "1auv8", [20, 29, 47]], ["mediawiki.special.changeslist", "93w3o"], ["mediawiki.special.changeslist.watchlistexpiry", "dgsac", [130]], ["mediawiki.special.changeslist.enhanced", "1xll3"], ["mediawiki.special.changeslist.legend", "e31d3"], ["mediawiki.special.changeslist.legend.js", "fa4m4", [28, 91]], ["mediawiki.special.contributions", "ua2dg", [28, 114, 175, 201]], ["mediawiki.special.edittags", "1di11", [17, 27]], ["mediawiki.special.import", "5dvpi", [172]], ["mediawiki.special.import.styles.ooui", "1owcj"], ["mediawiki.special.preferences.ooui", "kr0k3", [49, 93, 67, 74, 182, 177]], ["mediawiki.special.preferences.styles.ooui", "yaaz9"], ["mediawiki.special.recentchanges", "1b2m9", [172]], ["mediawiki.special.revisionDelete", "e8jxp", [27]], ["mediawiki.special.search", "1sevh", [194]], ["mediawiki.special.search.commonsInterwikiWidget", "5zvgb", [84, 47]], ["mediawiki.special.search.interwikiwidget.styles", "17wtq"], ["mediawiki.special.search.styles", "w44wp"], ["mediawiki.special.unwatchedPages", "ygz13", [47]], ["mediawiki.special.upload", "s2u79", [29, 47, 49, 118, 130, 44]], ["mediawiki.special.userlogin.common.styles", "px9fy"], ["mediawiki.special.userlogin.login.styles", "1bqrv"], ["mediawiki.special.createaccount", "104qy", [47]], ["mediawiki.special.userlogin.signup.styles", "5bcbz"], ["mediawiki.special.userrights", "faiav", [27, 67]], ["mediawiki.special.watchlist", "du6lj", [47, 202, 221]], ["mediawiki.special.version", "5yx4s"], ["mediawiki.legacy.config", "odz9c"], ["mediawiki.legacy.commonPrint", "1hzmi"], ["mediawiki.legacy.shared", "9fxh2"], ["mediawiki.ui", "qwz4d"], ["mediawiki.ui.checkbox", "458jd"], ["mediawiki.ui.radio", "1niha"], ["mediawiki.ui.anchor", "mw0v4"], ["mediawiki.ui.button", "1pb5f"], ["mediawiki.ui.input", "1ktme"], ["mediawiki.ui.icon", "10gbu"], ["mediawiki.widgets", "1ds2f", [47, 173, 205, 215]], ["mediawiki.widgets.styles", "1kqtv"], ["mediawiki.widgets.AbandonEditDialog", "1qv1d", [210]], ["mediawiki.widgets.DateInputWidget", "17wo9", [176, 38, 205, 226]], ["mediawiki.widgets.DateInputWidget.styles", "1bl1e"], ["mediawiki.widgets.visibleLengthLimit", "uj2nl", [27, 202]], ["mediawiki.widgets.datetime", "1h0kn", [87, 202, 221, 225, 226]], ["mediawiki.widgets.expiry", "1xp7z", [178, 38, 205]], ["mediawiki.widgets.CheckMatrixWidget", "bbszi", [202]], ["mediawiki.widgets.CategoryMultiselectWidget", "fr599", [56, 205]], ["mediawiki.widgets.SelectWithInputWidget", "yjlkr", [183, 205]], ["mediawiki.widgets.SelectWithInputWidget.styles", "4wtw6"], ["mediawiki.widgets.SizeFilterWidget", "1ht3s", [185, 205]], ["mediawiki.widgets.SizeFilterWidget.styles", "b3yqn"], ["mediawiki.widgets.MediaSearch", "1iyvr", [56, 205]], ["mediawiki.widgets.Table", "1vxru", [205]], ["mediawiki.widgets.TagMultiselectWidget", "1mwuq", [205]], ["mediawiki.widgets.UserInputWidget", "1555z", [47, 205]], ["mediawiki.widgets.UsersMultiselectWidget", "1h6xp", [47, 205]], ["mediawiki.widgets.NamespacesMultiselectWidget", "jiviu", [205]], ["mediawiki.widgets.TitlesMultiselectWidget", "593ki", [172]], ["mediawiki.widgets.TagMultiselectWidget.styles", "1hdc9"], ["mediawiki.widgets.SearchInputWidget", "haq07", [73, 172, 221]], ["mediawiki.widgets.SearchInputWidget.styles", "176ja"], ["mediawiki.watchstar.widgets", "12mms", [201]], ["mediawiki.deflate", "glf6m"], ["oojs", "1ch6v"], ["mediawiki.router", "ajk4o", [200]], ["oojs-router", "3j2x4", [198]], ["oojs-ui", "1gvrd", [208, 205, 210]], ["oojs-ui-core", "104k6", [111, 198, 204, 203, 212]], ["oojs-ui-core.styles", "16qab"], ["oojs-ui-core.icons", "8tt5x"], ["oojs-ui-widgets", "usxwd", [202, 207]], ["oojs-ui-widgets.styles", "1ugt4"], ["oojs-ui-widgets.icons", "or36m"], ["oojs-ui-toolbars", "1lpdm", [202, 209]], ["oojs-ui-toolbars.icons", "cr94x"], ["oojs-ui-windows", "1khz3", [202, 211]], ["oojs-ui-windows.icons", "1ycb6"], ["oojs-ui.styles.indicators", "1lw9q"], ["oojs-ui.styles.icons-accessibility", "12ow2"], ["oojs-ui.styles.icons-alerts", "cx14w"], ["oojs-ui.styles.icons-content", "pejj2"], ["oojs-ui.styles.icons-editing-advanced", "1odg2"], ["oojs-ui.styles.icons-editing-citation", "11adp"], ["oojs-ui.styles.icons-editing-core", "1o1f9"], ["oojs-ui.styles.icons-editing-list", "1tco2"], ["oojs-ui.styles.icons-editing-styling", "dxigx"], ["oojs-ui.styles.icons-interactions", "9fsh1"], ["oojs-ui.styles.icons-layout", "1rp27"], ["oojs-ui.styles.icons-location", "1nyrn"], ["oojs-ui.styles.icons-media", "19z03"], ["oojs-ui.styles.icons-moderation", "18he2"], ["oojs-ui.styles.icons-movement", "4sbac"], ["oojs-ui.styles.icons-user", "mmgup"], ["oojs-ui.styles.icons-wikimedia", "clulx"], ["ext.confirmEdit.editPreview.ipwhitelist.styles", "1hytm"], ["ext.confirmEdit.visualEditor", "dqe95", [361]], ["ext.confirmEdit.simpleCaptcha", "13qx3"], ["ext.confirmEdit.hCaptcha.visualEditor", "q6yro"], ["ext.confirmAccount", "hz388"], ["skins.vector.user", "1xvcb", [], 0], ["skins.vector.user.styles", "1gxes", [], 0], ["skins.vector.search", "we6jx!", [84, 43]], ["skins.vector.styles.legacy", "1kxzj"], ["skins.vector.styles", "1t8qb"], ["skins.vector.icons.js", "5buxp"], ["skins.vector.icons", "d2gkg"], ["skins.vector.es6", "9he0d!", [92, 122, 123, 85, 239]], ["skins.vector.js", "r9gz2", [122, 239]], ["skins.vector.legacy.js", "1li6r", [122]], ["ext.charinsert", "4sxcx", [34]], ["ext.charinsert.styles", "ou48j"], ["ext.pygments", "3yewq"], ["ext.pygments.linenumbers", "zyy6j"], ["ext.geshi.visualEditor", "16uth", ["ext.visualEditor.mwcore", 216]], ["ext.wikiEditor", "1bd2a", [34, 37, 117, 85, 172, 216, 217, 218, 219, 220, 224, 44], 3], ["ext.wikiEditor.styles", "1q4gq", [], 3], ["ext.wikiEditor.realtimepreview", "1yass", [249, 124]], ["ext.CodeMirror", "1jpho", [253, 34, 37, 85, 220]], ["ext.CodeMirror.data", "yckjx"], ["ext.CodeMirror.lib", "12rli"], ["ext.CodeMirror.addons", "18r8x", [254]], ["ext.CodeMirror.mode.mediawiki", "1fp1t", [254]], ["ext.CodeMirror.lib.mode.css", "12rkf", [254]], ["ext.CodeMirror.lib.mode.javascript", "kv1z9", [254]], ["ext.CodeMirror.lib.mode.xml", "1n718", [254]], ["ext.CodeMirror.lib.mode.htmlmixed", "12m9d", [257, 258, 259]], ["ext.CodeMirror.lib.mode.clike", "1eahy", [254]], ["ext.CodeMirror.lib.mode.php", "19ek6", [261, 260]], ["ext.CodeMirror.visualEditor.init", "16iq7"], ["ext.CodeMirror.visualEditor", "qvp7i", ["ext.visualEditor.mwcore", 47]], ["ext.scribunto.errors", "1k506", [37]], ["ext.scribunto.logs", "kr527"], ["ext.scribunto.edit", "1lvk4", [29, 47]], ["ext.math.styles", "1v9c1"], ["ext.math.scripts", "16fem"], ["mw.widgets.MathWbEntitySelector", "amyw4", [56, 172, "mw.config.values.wbRepo", 210]], ["ext.math.visualEditor", "12uvp", [268, "ext.visualEditor.mwcore", 216]], ["ext.math.visualEditor.mathSymbolsData", "ltjso", [271]], ["ext.math.visualEditor.mathSymbols", "1tj2q", [272]], ["ext.math.visualEditor.chemSymbolsData", "ar9ku", [271]], ["ext.math.visualEditor.chemSymbols", "r7qo8", [274]], ["onoi.qtip.core", "75e6t"], ["onoi.qtip.extended", "momqm"], ["onoi.qtip", "1gvrd", [277]], ["onoi.md5", "17zbf"], ["onoi.blockUI", "ewol0"], ["onoi.rangeslider", "1wzu0"], ["onoi.localForage", "12lv7"], ["onoi.blobstore", "mzujy", [282]], ["onoi.util", "w3g00", [279]], ["onoi.async", "vd9uu"], ["onoi.jstorage", "apfta"], ["onoi.clipboard", "1qw6h"], ["onoi.bootstrap.tab.styles", "4d992"], ["onoi.bootstrap.tab", "1gwbh"], ["onoi.highlight", "nw85t"], ["onoi.dataTables.styles", "tgkmu"], ["onoi.dataTables.searchHighlight", "1m4mx", [290]], ["onoi.dataTables.responsive", "1h5pc", [294]], ["onoi.dataTables", "1fkni", [292]], ["ext.Tabber", "z4383"], ["ext.smw", "16je6", [306], 4], ["ext.smw.style", "fep2o", [], 4], ["ext.smw.special.styles", "11m01", [], 4], ["smw.ui", "gsfaw", [296, 303], 4], ["smw.ui.styles", "1o3m7", [], 4], ["smw.summarytable", "1w4hb", [], 4], ["ext.smw.special.style", "nhnwp", [], 4], ["jquery.selectmenu", "1tj5m", [304], 4], ["jquery.selectmenu.styles", "1o3m7", [], 4], ["jquery.jsonview", "mdfxe", [], 4], ["ext.jquery.async", "1a732", [], 4], ["ext.jquery.jStorage", "7l5nv", [], 4], ["ext.jquery.md5", "ixb2h", [], 4], ["ext.smw.dataItem", "1qngy", [296, 75, 84], 4], ["ext.smw.dataValue", "3e8jh", [309], 4], ["ext.smw.data", "1ha9p", [310], 4], ["ext.smw.query", "11ux7", [296, 87], 4], ["ext.smw.api", "4b2yo", [307, 308, 311, 312], 4], ["ext.jquery.autocomplete", "yhxel", [], 4], ["ext.jquery.qtip.styles", "1gc9l", [], 4], ["ext.jquery.qtip", "jic1i", [], 4], ["ext.smw.tooltip.styles", "19bcl", [], 4], ["ext.smw.tooltip.old", "pviib", [316, 296, 317], 4], ["ext.smw.tooltip", "1gvrd", [317, 357], 4], ["ext.smw.tooltips", "1gvrd", [297, 357], 4], ["ext.smw.autocomplete", "1tzhz", ["jquery.ui.autocomplete"], 4], ["ext.smw.purge", "1ktv1", [47], 4], ["ext.smw.vtabs.styles", "1bilv", [], 4], ["ext.smw.vtabs", "11jdb", [], 4], ["ext.smw.modal.styles", "3e5zw", [], 4], ["ext.smw.modal", "1mqmt", [], 4], ["smw.special.search.styles", "fjeoq", [], 4], ["smw.special.search", "149ur", [299], 4], ["ext.smw.postproc", "w3rnu", [47], 4], ["ext.jquery.caret", "rszni", [], 4], ["ext.jquery.atwho", "uc0bi", [330], 4], ["ext.smw.suggester", "12jry", [331, 296], 4], ["ext.smw.suggester.textInput", "112ul", [332], 4], ["ext.smw.autocomplete.page", "kg0rz", [314, 87], 4], ["ext.smw.autocomplete.property", "p9pbd", [314, 87], 4], ["ext.smw.ask.styles", "1nc5r", [], 4], ["ext.smw.ask", "16u8a", [336, 297, 332, 319], 4], ["ext.smw.table.styles", "3oos3", [], 4], ["ext.smw.browse.styles", "1papi", [], 4], ["ext.smw.browse", "116yi", [297, 47], 4], ["ext.smw.browse.autocomplete", "1gvrd", [334, 340], 4], ["ext.smw.admin", "1xm0w", [47, 355], 4], ["ext.smw.personal", "1vvm4", [319], 4], ["smw.tableprinter.datatable", "1qug5", [312, 294], 4], ["smw.tableprinter.datatable.styles", "s11z9", [], 4], ["ext.smw.deferred.styles", "13lpf", [], 4], ["ext.smw.deferred", "wfnch", [359, 281], 4], ["ext.smw.page.styles", "utpor", [], 4], ["smw.property.page", "1u1o3", [319, 359], 4], ["smw.content.schema", "1ynwn", [], 4], ["smw.factbox", "lntwk", [], 4], ["smw.content.schemaview", "bn9ru", [355], 4], ["jquery.mark.js", "14net", [], 4], ["smw.jsonview.styles", "1lc28", [], 4], ["smw.jsonview", "158ls", [296, 305, 353], 4], ["ext.libs.tippy", "bj9vr", [], 4], ["smw.tippy", "1ax09", [356, 296, 47], 4], ["smw.entityexaminer", "7kxs7", [357], 4], ["mediawiki.api.parse", "1gvrd", [47]], ["ext.gadget.Edittools", "1sf5y", [], 2], ["ext.confirmEdit.CaptchaInputWidget", "2u6h1", [202]], ["mediawiki.messagePoster", "gdbf7", [56]]]);
        mw.config.set(window.RLCONF || {});
        mw.loader.state(window.RLSTATE || {});
        mw.loader.load(window.RLPAGEMODULES || []);
        queue = window.RLQ || [];
        RLQ = [];
        RLQ.push = function(fn) {
            if (typeof fn === 'function') {
                fn();
            } else {
                RLQ[RLQ.length] = fn;
            }
        }
        ;
        while (queue[0]) {
            RLQ.push(queue.shift());
        }
        NORLQ = {
            push: function() {}
        };
    }());
}
