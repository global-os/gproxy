var rxjs = (() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // node_modules/rxjs/dist/bundles/rxjs.umd.js
  var require_rxjs_umd = __commonJS({
    "node_modules/rxjs/dist/bundles/rxjs.umd.js"(exports, module) {
      (function(global, factory) {
        typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define("rxjs", ["exports"], factory) : factory(global.rxjs = {});
      })(exports, (function(exports2) {
        "use strict";
        var extendStatics = function(d, b) {
          extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
            d2.__proto__ = b2;
          } || function(d2, b2) {
            for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
          };
          return extendStatics(d, b);
        };
        function __extends(d, b) {
          if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
          extendStatics(d, b);
          function __() {
            this.constructor = d;
          }
          d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        }
        var __assign = function() {
          __assign = Object.assign || function __assign2(t) {
            for (var s, i = 1, n = arguments.length; i < n; i++) {
              s = arguments[i];
              for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
            }
            return t;
          };
          return __assign.apply(this, arguments);
        };
        function __rest(s, e) {
          var t = {};
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
          if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
              if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
            }
          return t;
        }
        function __awaiter(thisArg, _arguments, P, generator) {
          function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
              resolve(value);
            });
          }
          return new (P || (P = Promise))(function(resolve, reject) {
            function fulfilled(value) {
              try {
                step(generator.next(value));
              } catch (e) {
                reject(e);
              }
            }
            function rejected(value) {
              try {
                step(generator["throw"](value));
              } catch (e) {
                reject(e);
              }
            }
            function step(result) {
              result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
          });
        }
        function __generator(thisArg, body) {
          var _ = { label: 0, sent: function() {
            if (t[0] & 1) throw t[1];
            return t[1];
          }, trys: [], ops: [] }, f, y, t, g;
          return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
            return this;
          }), g;
          function verb(n) {
            return function(v) {
              return step([n, v]);
            };
          }
          function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
              if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
              if (y = 0, t) op = [op[0] & 2, t.value];
              switch (op[0]) {
                case 0:
                case 1:
                  t = op;
                  break;
                case 4:
                  _.label++;
                  return { value: op[1], done: false };
                case 5:
                  _.label++;
                  y = op[1];
                  op = [0];
                  continue;
                case 7:
                  op = _.ops.pop();
                  _.trys.pop();
                  continue;
                default:
                  if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                    _ = 0;
                    continue;
                  }
                  if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                    _.label = op[1];
                    break;
                  }
                  if (op[0] === 6 && _.label < t[1]) {
                    _.label = t[1];
                    t = op;
                    break;
                  }
                  if (t && _.label < t[2]) {
                    _.label = t[2];
                    _.ops.push(op);
                    break;
                  }
                  if (t[2]) _.ops.pop();
                  _.trys.pop();
                  continue;
              }
              op = body.call(thisArg, _);
            } catch (e) {
              op = [6, e];
              y = 0;
            } finally {
              f = t = 0;
            }
            if (op[0] & 5) throw op[1];
            return { value: op[0] ? op[1] : void 0, done: true };
          }
        }
        function __values(o) {
          var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
          if (m) return m.call(o);
          if (o && typeof o.length === "number") return {
            next: function() {
              if (o && i >= o.length) o = void 0;
              return { value: o && o[i++], done: !o };
            }
          };
          throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
        }
        function __read(o, n) {
          var m = typeof Symbol === "function" && o[Symbol.iterator];
          if (!m) return o;
          var i = m.call(o), r, ar = [], e;
          try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
          } catch (error) {
            e = { error };
          } finally {
            try {
              if (r && !r.done && (m = i["return"])) m.call(i);
            } finally {
              if (e) throw e.error;
            }
          }
          return ar;
        }
        function __spreadArray(to, from2, pack) {
          if (pack || arguments.length === 2) for (var i = 0, l = from2.length, ar; i < l; i++) {
            if (ar || !(i in from2)) {
              if (!ar) ar = Array.prototype.slice.call(from2, 0, i);
              ar[i] = from2[i];
            }
          }
          return to.concat(ar || Array.prototype.slice.call(from2));
        }
        function __await(v) {
          return this instanceof __await ? (this.v = v, this) : new __await(v);
        }
        function __asyncGenerator(thisArg, _arguments, generator) {
          if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
          var g = generator.apply(thisArg, _arguments || []), i, q = [];
          return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
            return this;
          }, i;
          function verb(n) {
            if (g[n]) i[n] = function(v) {
              return new Promise(function(a, b) {
                q.push([n, v, a, b]) > 1 || resume(n, v);
              });
            };
          }
          function resume(n, v) {
            try {
              step(g[n](v));
            } catch (e) {
              settle(q[0][3], e);
            }
          }
          function step(r) {
            r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
          }
          function fulfill(value) {
            resume("next", value);
          }
          function reject(value) {
            resume("throw", value);
          }
          function settle(f, v) {
            if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
          }
        }
        function __asyncValues(o) {
          if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
          var m = o[Symbol.asyncIterator], i;
          return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
            return this;
          }, i);
          function verb(n) {
            i[n] = o[n] && function(v) {
              return new Promise(function(resolve, reject) {
                v = o[n](v), settle(resolve, reject, v.done, v.value);
              });
            };
          }
          function settle(resolve, reject, d, v) {
            Promise.resolve(v).then(function(v2) {
              resolve({ value: v2, done: d });
            }, reject);
          }
        }
        function isFunction(value) {
          return typeof value === "function";
        }
        function createErrorClass(createImpl) {
          var _super = function(instance) {
            Error.call(instance);
            instance.stack = new Error().stack;
          };
          var ctorFunc = createImpl(_super);
          ctorFunc.prototype = Object.create(Error.prototype);
          ctorFunc.prototype.constructor = ctorFunc;
          return ctorFunc;
        }
        var UnsubscriptionError = createErrorClass(function(_super) {
          return function UnsubscriptionErrorImpl(errors) {
            _super(this);
            this.message = errors ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function(err, i) {
              return i + 1 + ") " + err.toString();
            }).join("\n  ") : "";
            this.name = "UnsubscriptionError";
            this.errors = errors;
          };
        });
        function arrRemove(arr, item) {
          if (arr) {
            var index = arr.indexOf(item);
            0 <= index && arr.splice(index, 1);
          }
        }
        var Subscription = (function() {
          function Subscription2(initialTeardown) {
            this.initialTeardown = initialTeardown;
            this.closed = false;
            this._parentage = null;
            this._finalizers = null;
          }
          Subscription2.prototype.unsubscribe = function() {
            var e_1, _a, e_2, _b;
            var errors;
            if (!this.closed) {
              this.closed = true;
              var _parentage = this._parentage;
              if (_parentage) {
                this._parentage = null;
                if (Array.isArray(_parentage)) {
                  try {
                    for (var _parentage_1 = __values(_parentage), _parentage_1_1 = _parentage_1.next(); !_parentage_1_1.done; _parentage_1_1 = _parentage_1.next()) {
                      var parent_1 = _parentage_1_1.value;
                      parent_1.remove(this);
                    }
                  } catch (e_1_1) {
                    e_1 = { error: e_1_1 };
                  } finally {
                    try {
                      if (_parentage_1_1 && !_parentage_1_1.done && (_a = _parentage_1.return)) _a.call(_parentage_1);
                    } finally {
                      if (e_1) throw e_1.error;
                    }
                  }
                } else {
                  _parentage.remove(this);
                }
              }
              var initialFinalizer = this.initialTeardown;
              if (isFunction(initialFinalizer)) {
                try {
                  initialFinalizer();
                } catch (e) {
                  errors = e instanceof UnsubscriptionError ? e.errors : [e];
                }
              }
              var _finalizers = this._finalizers;
              if (_finalizers) {
                this._finalizers = null;
                try {
                  for (var _finalizers_1 = __values(_finalizers), _finalizers_1_1 = _finalizers_1.next(); !_finalizers_1_1.done; _finalizers_1_1 = _finalizers_1.next()) {
                    var finalizer = _finalizers_1_1.value;
                    try {
                      execFinalizer(finalizer);
                    } catch (err) {
                      errors = errors !== null && errors !== void 0 ? errors : [];
                      if (err instanceof UnsubscriptionError) {
                        errors = __spreadArray(__spreadArray([], __read(errors)), __read(err.errors));
                      } else {
                        errors.push(err);
                      }
                    }
                  }
                } catch (e_2_1) {
                  e_2 = { error: e_2_1 };
                } finally {
                  try {
                    if (_finalizers_1_1 && !_finalizers_1_1.done && (_b = _finalizers_1.return)) _b.call(_finalizers_1);
                  } finally {
                    if (e_2) throw e_2.error;
                  }
                }
              }
              if (errors) {
                throw new UnsubscriptionError(errors);
              }
            }
          };
          Subscription2.prototype.add = function(teardown) {
            var _a;
            if (teardown && teardown !== this) {
              if (this.closed) {
                execFinalizer(teardown);
              } else {
                if (teardown instanceof Subscription2) {
                  if (teardown.closed || teardown._hasParent(this)) {
                    return;
                  }
                  teardown._addParent(this);
                }
                (this._finalizers = (_a = this._finalizers) !== null && _a !== void 0 ? _a : []).push(teardown);
              }
            }
          };
          Subscription2.prototype._hasParent = function(parent) {
            var _parentage = this._parentage;
            return _parentage === parent || Array.isArray(_parentage) && _parentage.includes(parent);
          };
          Subscription2.prototype._addParent = function(parent) {
            var _parentage = this._parentage;
            this._parentage = Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : _parentage ? [_parentage, parent] : parent;
          };
          Subscription2.prototype._removeParent = function(parent) {
            var _parentage = this._parentage;
            if (_parentage === parent) {
              this._parentage = null;
            } else if (Array.isArray(_parentage)) {
              arrRemove(_parentage, parent);
            }
          };
          Subscription2.prototype.remove = function(teardown) {
            var _finalizers = this._finalizers;
            _finalizers && arrRemove(_finalizers, teardown);
            if (teardown instanceof Subscription2) {
              teardown._removeParent(this);
            }
          };
          Subscription2.EMPTY = (function() {
            var empty2 = new Subscription2();
            empty2.closed = true;
            return empty2;
          })();
          return Subscription2;
        })();
        var EMPTY_SUBSCRIPTION = Subscription.EMPTY;
        function isSubscription(value) {
          return value instanceof Subscription || value && "closed" in value && isFunction(value.remove) && isFunction(value.add) && isFunction(value.unsubscribe);
        }
        function execFinalizer(finalizer) {
          if (isFunction(finalizer)) {
            finalizer();
          } else {
            finalizer.unsubscribe();
          }
        }
        var config = {
          onUnhandledError: null,
          onStoppedNotification: null,
          Promise: void 0,
          useDeprecatedSynchronousErrorHandling: false,
          useDeprecatedNextContext: false
        };
        var timeoutProvider = {
          setTimeout: function(handler, timeout2) {
            var args = [];
            for (var _i = 2; _i < arguments.length; _i++) {
              args[_i - 2] = arguments[_i];
            }
            var delegate = timeoutProvider.delegate;
            if (delegate === null || delegate === void 0 ? void 0 : delegate.setTimeout) {
              return delegate.setTimeout.apply(delegate, __spreadArray([handler, timeout2], __read(args)));
            }
            return setTimeout.apply(void 0, __spreadArray([handler, timeout2], __read(args)));
          },
          clearTimeout: function(handle) {
            var delegate = timeoutProvider.delegate;
            return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearTimeout) || clearTimeout)(handle);
          },
          delegate: void 0
        };
        function reportUnhandledError(err) {
          timeoutProvider.setTimeout(function() {
            var onUnhandledError = config.onUnhandledError;
            if (onUnhandledError) {
              onUnhandledError(err);
            } else {
              throw err;
            }
          });
        }
        function noop() {
        }
        var COMPLETE_NOTIFICATION = (function() {
          return createNotification("C", void 0, void 0);
        })();
        function errorNotification(error) {
          return createNotification("E", void 0, error);
        }
        function nextNotification(value) {
          return createNotification("N", value, void 0);
        }
        function createNotification(kind, value, error) {
          return {
            kind,
            value,
            error
          };
        }
        var context = null;
        function errorContext(cb) {
          if (config.useDeprecatedSynchronousErrorHandling) {
            var isRoot = !context;
            if (isRoot) {
              context = { errorThrown: false, error: null };
            }
            cb();
            if (isRoot) {
              var _a = context, errorThrown = _a.errorThrown, error = _a.error;
              context = null;
              if (errorThrown) {
                throw error;
              }
            }
          } else {
            cb();
          }
        }
        function captureError(err) {
          if (config.useDeprecatedSynchronousErrorHandling && context) {
            context.errorThrown = true;
            context.error = err;
          }
        }
        var Subscriber = (function(_super) {
          __extends(Subscriber2, _super);
          function Subscriber2(destination) {
            var _this = _super.call(this) || this;
            _this.isStopped = false;
            if (destination) {
              _this.destination = destination;
              if (isSubscription(destination)) {
                destination.add(_this);
              }
            } else {
              _this.destination = EMPTY_OBSERVER;
            }
            return _this;
          }
          Subscriber2.create = function(next, error, complete) {
            return new SafeSubscriber(next, error, complete);
          };
          Subscriber2.prototype.next = function(value) {
            if (this.isStopped) {
              handleStoppedNotification(nextNotification(value), this);
            } else {
              this._next(value);
            }
          };
          Subscriber2.prototype.error = function(err) {
            if (this.isStopped) {
              handleStoppedNotification(errorNotification(err), this);
            } else {
              this.isStopped = true;
              this._error(err);
            }
          };
          Subscriber2.prototype.complete = function() {
            if (this.isStopped) {
              handleStoppedNotification(COMPLETE_NOTIFICATION, this);
            } else {
              this.isStopped = true;
              this._complete();
            }
          };
          Subscriber2.prototype.unsubscribe = function() {
            if (!this.closed) {
              this.isStopped = true;
              _super.prototype.unsubscribe.call(this);
              this.destination = null;
            }
          };
          Subscriber2.prototype._next = function(value) {
            this.destination.next(value);
          };
          Subscriber2.prototype._error = function(err) {
            try {
              this.destination.error(err);
            } finally {
              this.unsubscribe();
            }
          };
          Subscriber2.prototype._complete = function() {
            try {
              this.destination.complete();
            } finally {
              this.unsubscribe();
            }
          };
          return Subscriber2;
        })(Subscription);
        var _bind = Function.prototype.bind;
        function bind(fn, thisArg) {
          return _bind.call(fn, thisArg);
        }
        var ConsumerObserver = (function() {
          function ConsumerObserver2(partialObserver) {
            this.partialObserver = partialObserver;
          }
          ConsumerObserver2.prototype.next = function(value) {
            var partialObserver = this.partialObserver;
            if (partialObserver.next) {
              try {
                partialObserver.next(value);
              } catch (error) {
                handleUnhandledError(error);
              }
            }
          };
          ConsumerObserver2.prototype.error = function(err) {
            var partialObserver = this.partialObserver;
            if (partialObserver.error) {
              try {
                partialObserver.error(err);
              } catch (error) {
                handleUnhandledError(error);
              }
            } else {
              handleUnhandledError(err);
            }
          };
          ConsumerObserver2.prototype.complete = function() {
            var partialObserver = this.partialObserver;
            if (partialObserver.complete) {
              try {
                partialObserver.complete();
              } catch (error) {
                handleUnhandledError(error);
              }
            }
          };
          return ConsumerObserver2;
        })();
        var SafeSubscriber = (function(_super) {
          __extends(SafeSubscriber2, _super);
          function SafeSubscriber2(observerOrNext, error, complete) {
            var _this = _super.call(this) || this;
            var partialObserver;
            if (isFunction(observerOrNext) || !observerOrNext) {
              partialObserver = {
                next: observerOrNext !== null && observerOrNext !== void 0 ? observerOrNext : void 0,
                error: error !== null && error !== void 0 ? error : void 0,
                complete: complete !== null && complete !== void 0 ? complete : void 0
              };
            } else {
              var context_1;
              if (_this && config.useDeprecatedNextContext) {
                context_1 = Object.create(observerOrNext);
                context_1.unsubscribe = function() {
                  return _this.unsubscribe();
                };
                partialObserver = {
                  next: observerOrNext.next && bind(observerOrNext.next, context_1),
                  error: observerOrNext.error && bind(observerOrNext.error, context_1),
                  complete: observerOrNext.complete && bind(observerOrNext.complete, context_1)
                };
              } else {
                partialObserver = observerOrNext;
              }
            }
            _this.destination = new ConsumerObserver(partialObserver);
            return _this;
          }
          return SafeSubscriber2;
        })(Subscriber);
        function handleUnhandledError(error) {
          if (config.useDeprecatedSynchronousErrorHandling) {
            captureError(error);
          } else {
            reportUnhandledError(error);
          }
        }
        function defaultErrorHandler(err) {
          throw err;
        }
        function handleStoppedNotification(notification, subscriber) {
          var onStoppedNotification = config.onStoppedNotification;
          onStoppedNotification && timeoutProvider.setTimeout(function() {
            return onStoppedNotification(notification, subscriber);
          });
        }
        var EMPTY_OBSERVER = {
          closed: true,
          next: noop,
          error: defaultErrorHandler,
          complete: noop
        };
        var observable = (function() {
          return typeof Symbol === "function" && Symbol.observable || "@@observable";
        })();
        function identity(x) {
          return x;
        }
        function pipe() {
          var fns = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            fns[_i] = arguments[_i];
          }
          return pipeFromArray(fns);
        }
        function pipeFromArray(fns) {
          if (fns.length === 0) {
            return identity;
          }
          if (fns.length === 1) {
            return fns[0];
          }
          return function piped(input) {
            return fns.reduce(function(prev, fn) {
              return fn(prev);
            }, input);
          };
        }
        var Observable = (function() {
          function Observable2(subscribe) {
            if (subscribe) {
              this._subscribe = subscribe;
            }
          }
          Observable2.prototype.lift = function(operator) {
            var observable$$1 = new Observable2();
            observable$$1.source = this;
            observable$$1.operator = operator;
            return observable$$1;
          };
          Observable2.prototype.subscribe = function(observerOrNext, error, complete) {
            var _this = this;
            var subscriber = isSubscriber(observerOrNext) ? observerOrNext : new SafeSubscriber(observerOrNext, error, complete);
            errorContext(function() {
              var _a = _this, operator = _a.operator, source = _a.source;
              subscriber.add(operator ? operator.call(subscriber, source) : source ? _this._subscribe(subscriber) : _this._trySubscribe(subscriber));
            });
            return subscriber;
          };
          Observable2.prototype._trySubscribe = function(sink) {
            try {
              return this._subscribe(sink);
            } catch (err) {
              sink.error(err);
            }
          };
          Observable2.prototype.forEach = function(next, promiseCtor) {
            var _this = this;
            promiseCtor = getPromiseCtor(promiseCtor);
            return new promiseCtor(function(resolve, reject) {
              var subscriber = new SafeSubscriber({
                next: function(value) {
                  try {
                    next(value);
                  } catch (err) {
                    reject(err);
                    subscriber.unsubscribe();
                  }
                },
                error: reject,
                complete: resolve
              });
              _this.subscribe(subscriber);
            });
          };
          Observable2.prototype._subscribe = function(subscriber) {
            var _a;
            return (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber);
          };
          Observable2.prototype[observable] = function() {
            return this;
          };
          Observable2.prototype.pipe = function() {
            var operations = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              operations[_i] = arguments[_i];
            }
            return pipeFromArray(operations)(this);
          };
          Observable2.prototype.toPromise = function(promiseCtor) {
            var _this = this;
            promiseCtor = getPromiseCtor(promiseCtor);
            return new promiseCtor(function(resolve, reject) {
              var value;
              _this.subscribe(function(x) {
                return value = x;
              }, function(err) {
                return reject(err);
              }, function() {
                return resolve(value);
              });
            });
          };
          Observable2.create = function(subscribe) {
            return new Observable2(subscribe);
          };
          return Observable2;
        })();
        function getPromiseCtor(promiseCtor) {
          var _a;
          return (_a = promiseCtor !== null && promiseCtor !== void 0 ? promiseCtor : config.Promise) !== null && _a !== void 0 ? _a : Promise;
        }
        function isObserver(value) {
          return value && isFunction(value.next) && isFunction(value.error) && isFunction(value.complete);
        }
        function isSubscriber(value) {
          return value && value instanceof Subscriber || isObserver(value) && isSubscription(value);
        }
        function hasLift(source) {
          return isFunction(source === null || source === void 0 ? void 0 : source.lift);
        }
        function operate(init) {
          return function(source) {
            if (hasLift(source)) {
              return source.lift(function(liftedSource) {
                try {
                  return init(liftedSource, this);
                } catch (err) {
                  this.error(err);
                }
              });
            }
            throw new TypeError("Unable to lift unknown Observable type");
          };
        }
        function createOperatorSubscriber(destination, onNext, onComplete, onError, onFinalize) {
          return new OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize);
        }
        var OperatorSubscriber = (function(_super) {
          __extends(OperatorSubscriber2, _super);
          function OperatorSubscriber2(destination, onNext, onComplete, onError, onFinalize, shouldUnsubscribe) {
            var _this = _super.call(this, destination) || this;
            _this.onFinalize = onFinalize;
            _this.shouldUnsubscribe = shouldUnsubscribe;
            _this._next = onNext ? function(value) {
              try {
                onNext(value);
              } catch (err) {
                destination.error(err);
              }
            } : _super.prototype._next;
            _this._error = onError ? function(err) {
              try {
                onError(err);
              } catch (err2) {
                destination.error(err2);
              } finally {
                this.unsubscribe();
              }
            } : _super.prototype._error;
            _this._complete = onComplete ? function() {
              try {
                onComplete();
              } catch (err) {
                destination.error(err);
              } finally {
                this.unsubscribe();
              }
            } : _super.prototype._complete;
            return _this;
          }
          OperatorSubscriber2.prototype.unsubscribe = function() {
            var _a;
            if (!this.shouldUnsubscribe || this.shouldUnsubscribe()) {
              var closed_1 = this.closed;
              _super.prototype.unsubscribe.call(this);
              !closed_1 && ((_a = this.onFinalize) === null || _a === void 0 ? void 0 : _a.call(this));
            }
          };
          return OperatorSubscriber2;
        })(Subscriber);
        function refCount() {
          return operate(function(source, subscriber) {
            var connection = null;
            source._refCount++;
            var refCounter = createOperatorSubscriber(subscriber, void 0, void 0, void 0, function() {
              if (!source || source._refCount <= 0 || 0 < --source._refCount) {
                connection = null;
                return;
              }
              var sharedConnection = source._connection;
              var conn = connection;
              connection = null;
              if (sharedConnection && (!conn || sharedConnection === conn)) {
                sharedConnection.unsubscribe();
              }
              subscriber.unsubscribe();
            });
            source.subscribe(refCounter);
            if (!refCounter.closed) {
              connection = source.connect();
            }
          });
        }
        var ConnectableObservable = (function(_super) {
          __extends(ConnectableObservable2, _super);
          function ConnectableObservable2(source, subjectFactory) {
            var _this = _super.call(this) || this;
            _this.source = source;
            _this.subjectFactory = subjectFactory;
            _this._subject = null;
            _this._refCount = 0;
            _this._connection = null;
            if (hasLift(source)) {
              _this.lift = source.lift;
            }
            return _this;
          }
          ConnectableObservable2.prototype._subscribe = function(subscriber) {
            return this.getSubject().subscribe(subscriber);
          };
          ConnectableObservable2.prototype.getSubject = function() {
            var subject = this._subject;
            if (!subject || subject.isStopped) {
              this._subject = this.subjectFactory();
            }
            return this._subject;
          };
          ConnectableObservable2.prototype._teardown = function() {
            this._refCount = 0;
            var _connection = this._connection;
            this._subject = this._connection = null;
            _connection === null || _connection === void 0 ? void 0 : _connection.unsubscribe();
          };
          ConnectableObservable2.prototype.connect = function() {
            var _this = this;
            var connection = this._connection;
            if (!connection) {
              connection = this._connection = new Subscription();
              var subject_1 = this.getSubject();
              connection.add(this.source.subscribe(createOperatorSubscriber(subject_1, void 0, function() {
                _this._teardown();
                subject_1.complete();
              }, function(err) {
                _this._teardown();
                subject_1.error(err);
              }, function() {
                return _this._teardown();
              })));
              if (connection.closed) {
                this._connection = null;
                connection = Subscription.EMPTY;
              }
            }
            return connection;
          };
          ConnectableObservable2.prototype.refCount = function() {
            return refCount()(this);
          };
          return ConnectableObservable2;
        })(Observable);
        var performanceTimestampProvider = {
          now: function() {
            return (performanceTimestampProvider.delegate || performance).now();
          },
          delegate: void 0
        };
        var animationFrameProvider = {
          schedule: function(callback) {
            var request = requestAnimationFrame;
            var cancel = cancelAnimationFrame;
            var delegate = animationFrameProvider.delegate;
            if (delegate) {
              request = delegate.requestAnimationFrame;
              cancel = delegate.cancelAnimationFrame;
            }
            var handle = request(function(timestamp2) {
              cancel = void 0;
              callback(timestamp2);
            });
            return new Subscription(function() {
              return cancel === null || cancel === void 0 ? void 0 : cancel(handle);
            });
          },
          requestAnimationFrame: function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var delegate = animationFrameProvider.delegate;
            return ((delegate === null || delegate === void 0 ? void 0 : delegate.requestAnimationFrame) || requestAnimationFrame).apply(void 0, __spreadArray([], __read(args)));
          },
          cancelAnimationFrame: function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var delegate = animationFrameProvider.delegate;
            return ((delegate === null || delegate === void 0 ? void 0 : delegate.cancelAnimationFrame) || cancelAnimationFrame).apply(void 0, __spreadArray([], __read(args)));
          },
          delegate: void 0
        };
        function animationFrames(timestampProvider) {
          return timestampProvider ? animationFramesFactory(timestampProvider) : DEFAULT_ANIMATION_FRAMES;
        }
        function animationFramesFactory(timestampProvider) {
          return new Observable(function(subscriber) {
            var provider = timestampProvider || performanceTimestampProvider;
            var start = provider.now();
            var id = 0;
            var run = function() {
              if (!subscriber.closed) {
                id = animationFrameProvider.requestAnimationFrame(function(timestamp2) {
                  id = 0;
                  var now = provider.now();
                  subscriber.next({
                    timestamp: timestampProvider ? now : timestamp2,
                    elapsed: now - start
                  });
                  run();
                });
              }
            };
            run();
            return function() {
              if (id) {
                animationFrameProvider.cancelAnimationFrame(id);
              }
            };
          });
        }
        var DEFAULT_ANIMATION_FRAMES = animationFramesFactory();
        var ObjectUnsubscribedError = createErrorClass(function(_super) {
          return function ObjectUnsubscribedErrorImpl() {
            _super(this);
            this.name = "ObjectUnsubscribedError";
            this.message = "object unsubscribed";
          };
        });
        var Subject = (function(_super) {
          __extends(Subject2, _super);
          function Subject2() {
            var _this = _super.call(this) || this;
            _this.closed = false;
            _this.currentObservers = null;
            _this.observers = [];
            _this.isStopped = false;
            _this.hasError = false;
            _this.thrownError = null;
            return _this;
          }
          Subject2.prototype.lift = function(operator) {
            var subject = new AnonymousSubject(this, this);
            subject.operator = operator;
            return subject;
          };
          Subject2.prototype._throwIfClosed = function() {
            if (this.closed) {
              throw new ObjectUnsubscribedError();
            }
          };
          Subject2.prototype.next = function(value) {
            var _this = this;
            errorContext(function() {
              var e_1, _a;
              _this._throwIfClosed();
              if (!_this.isStopped) {
                if (!_this.currentObservers) {
                  _this.currentObservers = Array.from(_this.observers);
                }
                try {
                  for (var _b = __values(_this.currentObservers), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var observer = _c.value;
                    observer.next(value);
                  }
                } catch (e_1_1) {
                  e_1 = { error: e_1_1 };
                } finally {
                  try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                  } finally {
                    if (e_1) throw e_1.error;
                  }
                }
              }
            });
          };
          Subject2.prototype.error = function(err) {
            var _this = this;
            errorContext(function() {
              _this._throwIfClosed();
              if (!_this.isStopped) {
                _this.hasError = _this.isStopped = true;
                _this.thrownError = err;
                var observers = _this.observers;
                while (observers.length) {
                  observers.shift().error(err);
                }
              }
            });
          };
          Subject2.prototype.complete = function() {
            var _this = this;
            errorContext(function() {
              _this._throwIfClosed();
              if (!_this.isStopped) {
                _this.isStopped = true;
                var observers = _this.observers;
                while (observers.length) {
                  observers.shift().complete();
                }
              }
            });
          };
          Subject2.prototype.unsubscribe = function() {
            this.isStopped = this.closed = true;
            this.observers = this.currentObservers = null;
          };
          Object.defineProperty(Subject2.prototype, "observed", {
            get: function() {
              var _a;
              return ((_a = this.observers) === null || _a === void 0 ? void 0 : _a.length) > 0;
            },
            enumerable: false,
            configurable: true
          });
          Subject2.prototype._trySubscribe = function(subscriber) {
            this._throwIfClosed();
            return _super.prototype._trySubscribe.call(this, subscriber);
          };
          Subject2.prototype._subscribe = function(subscriber) {
            this._throwIfClosed();
            this._checkFinalizedStatuses(subscriber);
            return this._innerSubscribe(subscriber);
          };
          Subject2.prototype._innerSubscribe = function(subscriber) {
            var _this = this;
            var _a = this, hasError = _a.hasError, isStopped = _a.isStopped, observers = _a.observers;
            if (hasError || isStopped) {
              return EMPTY_SUBSCRIPTION;
            }
            this.currentObservers = null;
            observers.push(subscriber);
            return new Subscription(function() {
              _this.currentObservers = null;
              arrRemove(observers, subscriber);
            });
          };
          Subject2.prototype._checkFinalizedStatuses = function(subscriber) {
            var _a = this, hasError = _a.hasError, thrownError = _a.thrownError, isStopped = _a.isStopped;
            if (hasError) {
              subscriber.error(thrownError);
            } else if (isStopped) {
              subscriber.complete();
            }
          };
          Subject2.prototype.asObservable = function() {
            var observable2 = new Observable();
            observable2.source = this;
            return observable2;
          };
          Subject2.create = function(destination, source) {
            return new AnonymousSubject(destination, source);
          };
          return Subject2;
        })(Observable);
        var AnonymousSubject = (function(_super) {
          __extends(AnonymousSubject2, _super);
          function AnonymousSubject2(destination, source) {
            var _this = _super.call(this) || this;
            _this.destination = destination;
            _this.source = source;
            return _this;
          }
          AnonymousSubject2.prototype.next = function(value) {
            var _a, _b;
            (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.next) === null || _b === void 0 ? void 0 : _b.call(_a, value);
          };
          AnonymousSubject2.prototype.error = function(err) {
            var _a, _b;
            (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, err);
          };
          AnonymousSubject2.prototype.complete = function() {
            var _a, _b;
            (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.complete) === null || _b === void 0 ? void 0 : _b.call(_a);
          };
          AnonymousSubject2.prototype._subscribe = function(subscriber) {
            var _a, _b;
            return (_b = (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber)) !== null && _b !== void 0 ? _b : EMPTY_SUBSCRIPTION;
          };
          return AnonymousSubject2;
        })(Subject);
        var BehaviorSubject = (function(_super) {
          __extends(BehaviorSubject2, _super);
          function BehaviorSubject2(_value) {
            var _this = _super.call(this) || this;
            _this._value = _value;
            return _this;
          }
          Object.defineProperty(BehaviorSubject2.prototype, "value", {
            get: function() {
              return this.getValue();
            },
            enumerable: false,
            configurable: true
          });
          BehaviorSubject2.prototype._subscribe = function(subscriber) {
            var subscription = _super.prototype._subscribe.call(this, subscriber);
            !subscription.closed && subscriber.next(this._value);
            return subscription;
          };
          BehaviorSubject2.prototype.getValue = function() {
            var _a = this, hasError = _a.hasError, thrownError = _a.thrownError, _value = _a._value;
            if (hasError) {
              throw thrownError;
            }
            this._throwIfClosed();
            return _value;
          };
          BehaviorSubject2.prototype.next = function(value) {
            _super.prototype.next.call(this, this._value = value);
          };
          return BehaviorSubject2;
        })(Subject);
        var dateTimestampProvider = {
          now: function() {
            return (dateTimestampProvider.delegate || Date).now();
          },
          delegate: void 0
        };
        var ReplaySubject = (function(_super) {
          __extends(ReplaySubject2, _super);
          function ReplaySubject2(_bufferSize, _windowTime, _timestampProvider) {
            if (_bufferSize === void 0) {
              _bufferSize = Infinity;
            }
            if (_windowTime === void 0) {
              _windowTime = Infinity;
            }
            if (_timestampProvider === void 0) {
              _timestampProvider = dateTimestampProvider;
            }
            var _this = _super.call(this) || this;
            _this._bufferSize = _bufferSize;
            _this._windowTime = _windowTime;
            _this._timestampProvider = _timestampProvider;
            _this._buffer = [];
            _this._infiniteTimeWindow = true;
            _this._infiniteTimeWindow = _windowTime === Infinity;
            _this._bufferSize = Math.max(1, _bufferSize);
            _this._windowTime = Math.max(1, _windowTime);
            return _this;
          }
          ReplaySubject2.prototype.next = function(value) {
            var _a = this, isStopped = _a.isStopped, _buffer = _a._buffer, _infiniteTimeWindow = _a._infiniteTimeWindow, _timestampProvider = _a._timestampProvider, _windowTime = _a._windowTime;
            if (!isStopped) {
              _buffer.push(value);
              !_infiniteTimeWindow && _buffer.push(_timestampProvider.now() + _windowTime);
            }
            this._trimBuffer();
            _super.prototype.next.call(this, value);
          };
          ReplaySubject2.prototype._subscribe = function(subscriber) {
            this._throwIfClosed();
            this._trimBuffer();
            var subscription = this._innerSubscribe(subscriber);
            var _a = this, _infiniteTimeWindow = _a._infiniteTimeWindow, _buffer = _a._buffer;
            var copy = _buffer.slice();
            for (var i = 0; i < copy.length && !subscriber.closed; i += _infiniteTimeWindow ? 1 : 2) {
              subscriber.next(copy[i]);
            }
            this._checkFinalizedStatuses(subscriber);
            return subscription;
          };
          ReplaySubject2.prototype._trimBuffer = function() {
            var _a = this, _bufferSize = _a._bufferSize, _timestampProvider = _a._timestampProvider, _buffer = _a._buffer, _infiniteTimeWindow = _a._infiniteTimeWindow;
            var adjustedBufferSize = (_infiniteTimeWindow ? 1 : 2) * _bufferSize;
            _bufferSize < Infinity && adjustedBufferSize < _buffer.length && _buffer.splice(0, _buffer.length - adjustedBufferSize);
            if (!_infiniteTimeWindow) {
              var now = _timestampProvider.now();
              var last2 = 0;
              for (var i = 1; i < _buffer.length && _buffer[i] <= now; i += 2) {
                last2 = i;
              }
              last2 && _buffer.splice(0, last2 + 1);
            }
          };
          return ReplaySubject2;
        })(Subject);
        var AsyncSubject = (function(_super) {
          __extends(AsyncSubject2, _super);
          function AsyncSubject2() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this._value = null;
            _this._hasValue = false;
            _this._isComplete = false;
            return _this;
          }
          AsyncSubject2.prototype._checkFinalizedStatuses = function(subscriber) {
            var _a = this, hasError = _a.hasError, _hasValue = _a._hasValue, _value = _a._value, thrownError = _a.thrownError, isStopped = _a.isStopped, _isComplete = _a._isComplete;
            if (hasError) {
              subscriber.error(thrownError);
            } else if (isStopped || _isComplete) {
              _hasValue && subscriber.next(_value);
              subscriber.complete();
            }
          };
          AsyncSubject2.prototype.next = function(value) {
            if (!this.isStopped) {
              this._value = value;
              this._hasValue = true;
            }
          };
          AsyncSubject2.prototype.complete = function() {
            var _a = this, _hasValue = _a._hasValue, _value = _a._value, _isComplete = _a._isComplete;
            if (!_isComplete) {
              this._isComplete = true;
              _hasValue && _super.prototype.next.call(this, _value);
              _super.prototype.complete.call(this);
            }
          };
          return AsyncSubject2;
        })(Subject);
        var Action = (function(_super) {
          __extends(Action2, _super);
          function Action2(scheduler, work) {
            return _super.call(this) || this;
          }
          Action2.prototype.schedule = function(state, delay2) {
            if (delay2 === void 0) {
              delay2 = 0;
            }
            return this;
          };
          return Action2;
        })(Subscription);
        var intervalProvider = {
          setInterval: function(handler, timeout2) {
            var args = [];
            for (var _i = 2; _i < arguments.length; _i++) {
              args[_i - 2] = arguments[_i];
            }
            var delegate = intervalProvider.delegate;
            if (delegate === null || delegate === void 0 ? void 0 : delegate.setInterval) {
              return delegate.setInterval.apply(delegate, __spreadArray([handler, timeout2], __read(args)));
            }
            return setInterval.apply(void 0, __spreadArray([handler, timeout2], __read(args)));
          },
          clearInterval: function(handle) {
            var delegate = intervalProvider.delegate;
            return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearInterval) || clearInterval)(handle);
          },
          delegate: void 0
        };
        var AsyncAction = (function(_super) {
          __extends(AsyncAction2, _super);
          function AsyncAction2(scheduler, work) {
            var _this = _super.call(this, scheduler, work) || this;
            _this.scheduler = scheduler;
            _this.work = work;
            _this.pending = false;
            return _this;
          }
          AsyncAction2.prototype.schedule = function(state, delay2) {
            var _a;
            if (delay2 === void 0) {
              delay2 = 0;
            }
            if (this.closed) {
              return this;
            }
            this.state = state;
            var id = this.id;
            var scheduler = this.scheduler;
            if (id != null) {
              this.id = this.recycleAsyncId(scheduler, id, delay2);
            }
            this.pending = true;
            this.delay = delay2;
            this.id = (_a = this.id) !== null && _a !== void 0 ? _a : this.requestAsyncId(scheduler, this.id, delay2);
            return this;
          };
          AsyncAction2.prototype.requestAsyncId = function(scheduler, _id, delay2) {
            if (delay2 === void 0) {
              delay2 = 0;
            }
            return intervalProvider.setInterval(scheduler.flush.bind(scheduler, this), delay2);
          };
          AsyncAction2.prototype.recycleAsyncId = function(_scheduler, id, delay2) {
            if (delay2 === void 0) {
              delay2 = 0;
            }
            if (delay2 != null && this.delay === delay2 && this.pending === false) {
              return id;
            }
            if (id != null) {
              intervalProvider.clearInterval(id);
            }
            return void 0;
          };
          AsyncAction2.prototype.execute = function(state, delay2) {
            if (this.closed) {
              return new Error("executing a cancelled action");
            }
            this.pending = false;
            var error = this._execute(state, delay2);
            if (error) {
              return error;
            } else if (this.pending === false && this.id != null) {
              this.id = this.recycleAsyncId(this.scheduler, this.id, null);
            }
          };
          AsyncAction2.prototype._execute = function(state, _delay) {
            var errored = false;
            var errorValue;
            try {
              this.work(state);
            } catch (e) {
              errored = true;
              errorValue = e ? e : new Error("Scheduled action threw falsy error");
            }
            if (errored) {
              this.unsubscribe();
              return errorValue;
            }
          };
          AsyncAction2.prototype.unsubscribe = function() {
            if (!this.closed) {
              var _a = this, id = _a.id, scheduler = _a.scheduler;
              var actions = scheduler.actions;
              this.work = this.state = this.scheduler = null;
              this.pending = false;
              arrRemove(actions, this);
              if (id != null) {
                this.id = this.recycleAsyncId(scheduler, id, null);
              }
              this.delay = null;
              _super.prototype.unsubscribe.call(this);
            }
          };
          return AsyncAction2;
        })(Action);
        var nextHandle = 1;
        var resolved;
        var activeHandles = {};
        function findAndClearHandle(handle) {
          if (handle in activeHandles) {
            delete activeHandles[handle];
            return true;
          }
          return false;
        }
        var Immediate = {
          setImmediate: function(cb) {
            var handle = nextHandle++;
            activeHandles[handle] = true;
            if (!resolved) {
              resolved = Promise.resolve();
            }
            resolved.then(function() {
              return findAndClearHandle(handle) && cb();
            });
            return handle;
          },
          clearImmediate: function(handle) {
            findAndClearHandle(handle);
          }
        };
        var setImmediate = Immediate.setImmediate, clearImmediate = Immediate.clearImmediate;
        var immediateProvider = {
          setImmediate: function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var delegate = immediateProvider.delegate;
            return ((delegate === null || delegate === void 0 ? void 0 : delegate.setImmediate) || setImmediate).apply(void 0, __spreadArray([], __read(args)));
          },
          clearImmediate: function(handle) {
            var delegate = immediateProvider.delegate;
            return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearImmediate) || clearImmediate)(handle);
          },
          delegate: void 0
        };
        var AsapAction = (function(_super) {
          __extends(AsapAction2, _super);
          function AsapAction2(scheduler, work) {
            var _this = _super.call(this, scheduler, work) || this;
            _this.scheduler = scheduler;
            _this.work = work;
            return _this;
          }
          AsapAction2.prototype.requestAsyncId = function(scheduler, id, delay2) {
            if (delay2 === void 0) {
              delay2 = 0;
            }
            if (delay2 !== null && delay2 > 0) {
              return _super.prototype.requestAsyncId.call(this, scheduler, id, delay2);
            }
            scheduler.actions.push(this);
            return scheduler._scheduled || (scheduler._scheduled = immediateProvider.setImmediate(scheduler.flush.bind(scheduler, void 0)));
          };
          AsapAction2.prototype.recycleAsyncId = function(scheduler, id, delay2) {
            var _a;
            if (delay2 === void 0) {
              delay2 = 0;
            }
            if (delay2 != null ? delay2 > 0 : this.delay > 0) {
              return _super.prototype.recycleAsyncId.call(this, scheduler, id, delay2);
            }
            var actions = scheduler.actions;
            if (id != null && ((_a = actions[actions.length - 1]) === null || _a === void 0 ? void 0 : _a.id) !== id) {
              immediateProvider.clearImmediate(id);
              if (scheduler._scheduled === id) {
                scheduler._scheduled = void 0;
              }
            }
            return void 0;
          };
          return AsapAction2;
        })(AsyncAction);
        var Scheduler = (function() {
          function Scheduler2(schedulerActionCtor, now) {
            if (now === void 0) {
              now = Scheduler2.now;
            }
            this.schedulerActionCtor = schedulerActionCtor;
            this.now = now;
          }
          Scheduler2.prototype.schedule = function(work, delay2, state) {
            if (delay2 === void 0) {
              delay2 = 0;
            }
            return new this.schedulerActionCtor(this, work).schedule(state, delay2);
          };
          Scheduler2.now = dateTimestampProvider.now;
          return Scheduler2;
        })();
        var AsyncScheduler = (function(_super) {
          __extends(AsyncScheduler2, _super);
          function AsyncScheduler2(SchedulerAction, now) {
            if (now === void 0) {
              now = Scheduler.now;
            }
            var _this = _super.call(this, SchedulerAction, now) || this;
            _this.actions = [];
            _this._active = false;
            return _this;
          }
          AsyncScheduler2.prototype.flush = function(action) {
            var actions = this.actions;
            if (this._active) {
              actions.push(action);
              return;
            }
            var error;
            this._active = true;
            do {
              if (error = action.execute(action.state, action.delay)) {
                break;
              }
            } while (action = actions.shift());
            this._active = false;
            if (error) {
              while (action = actions.shift()) {
                action.unsubscribe();
              }
              throw error;
            }
          };
          return AsyncScheduler2;
        })(Scheduler);
        var AsapScheduler = (function(_super) {
          __extends(AsapScheduler2, _super);
          function AsapScheduler2() {
            return _super !== null && _super.apply(this, arguments) || this;
          }
          AsapScheduler2.prototype.flush = function(action) {
            this._active = true;
            var flushId = this._scheduled;
            this._scheduled = void 0;
            var actions = this.actions;
            var error;
            action = action || actions.shift();
            do {
              if (error = action.execute(action.state, action.delay)) {
                break;
              }
            } while ((action = actions[0]) && action.id === flushId && actions.shift());
            this._active = false;
            if (error) {
              while ((action = actions[0]) && action.id === flushId && actions.shift()) {
                action.unsubscribe();
              }
              throw error;
            }
          };
          return AsapScheduler2;
        })(AsyncScheduler);
        var asapScheduler = new AsapScheduler(AsapAction);
        var asap = asapScheduler;
        var asyncScheduler = new AsyncScheduler(AsyncAction);
        var async = asyncScheduler;
        var QueueAction = (function(_super) {
          __extends(QueueAction2, _super);
          function QueueAction2(scheduler, work) {
            var _this = _super.call(this, scheduler, work) || this;
            _this.scheduler = scheduler;
            _this.work = work;
            return _this;
          }
          QueueAction2.prototype.schedule = function(state, delay2) {
            if (delay2 === void 0) {
              delay2 = 0;
            }
            if (delay2 > 0) {
              return _super.prototype.schedule.call(this, state, delay2);
            }
            this.delay = delay2;
            this.state = state;
            this.scheduler.flush(this);
            return this;
          };
          QueueAction2.prototype.execute = function(state, delay2) {
            return delay2 > 0 || this.closed ? _super.prototype.execute.call(this, state, delay2) : this._execute(state, delay2);
          };
          QueueAction2.prototype.requestAsyncId = function(scheduler, id, delay2) {
            if (delay2 === void 0) {
              delay2 = 0;
            }
            if (delay2 != null && delay2 > 0 || delay2 == null && this.delay > 0) {
              return _super.prototype.requestAsyncId.call(this, scheduler, id, delay2);
            }
            scheduler.flush(this);
            return 0;
          };
          return QueueAction2;
        })(AsyncAction);
        var QueueScheduler = (function(_super) {
          __extends(QueueScheduler2, _super);
          function QueueScheduler2() {
            return _super !== null && _super.apply(this, arguments) || this;
          }
          return QueueScheduler2;
        })(AsyncScheduler);
        var queueScheduler = new QueueScheduler(QueueAction);
        var queue = queueScheduler;
        var AnimationFrameAction = (function(_super) {
          __extends(AnimationFrameAction2, _super);
          function AnimationFrameAction2(scheduler, work) {
            var _this = _super.call(this, scheduler, work) || this;
            _this.scheduler = scheduler;
            _this.work = work;
            return _this;
          }
          AnimationFrameAction2.prototype.requestAsyncId = function(scheduler, id, delay2) {
            if (delay2 === void 0) {
              delay2 = 0;
            }
            if (delay2 !== null && delay2 > 0) {
              return _super.prototype.requestAsyncId.call(this, scheduler, id, delay2);
            }
            scheduler.actions.push(this);
            return scheduler._scheduled || (scheduler._scheduled = animationFrameProvider.requestAnimationFrame(function() {
              return scheduler.flush(void 0);
            }));
          };
          AnimationFrameAction2.prototype.recycleAsyncId = function(scheduler, id, delay2) {
            var _a;
            if (delay2 === void 0) {
              delay2 = 0;
            }
            if (delay2 != null ? delay2 > 0 : this.delay > 0) {
              return _super.prototype.recycleAsyncId.call(this, scheduler, id, delay2);
            }
            var actions = scheduler.actions;
            if (id != null && ((_a = actions[actions.length - 1]) === null || _a === void 0 ? void 0 : _a.id) !== id) {
              animationFrameProvider.cancelAnimationFrame(id);
              scheduler._scheduled = void 0;
            }
            return void 0;
          };
          return AnimationFrameAction2;
        })(AsyncAction);
        var AnimationFrameScheduler = (function(_super) {
          __extends(AnimationFrameScheduler2, _super);
          function AnimationFrameScheduler2() {
            return _super !== null && _super.apply(this, arguments) || this;
          }
          AnimationFrameScheduler2.prototype.flush = function(action) {
            this._active = true;
            var flushId = this._scheduled;
            this._scheduled = void 0;
            var actions = this.actions;
            var error;
            action = action || actions.shift();
            do {
              if (error = action.execute(action.state, action.delay)) {
                break;
              }
            } while ((action = actions[0]) && action.id === flushId && actions.shift());
            this._active = false;
            if (error) {
              while ((action = actions[0]) && action.id === flushId && actions.shift()) {
                action.unsubscribe();
              }
              throw error;
            }
          };
          return AnimationFrameScheduler2;
        })(AsyncScheduler);
        var animationFrameScheduler = new AnimationFrameScheduler(AnimationFrameAction);
        var animationFrame = animationFrameScheduler;
        var VirtualTimeScheduler = (function(_super) {
          __extends(VirtualTimeScheduler2, _super);
          function VirtualTimeScheduler2(schedulerActionCtor, maxFrames) {
            if (schedulerActionCtor === void 0) {
              schedulerActionCtor = VirtualAction;
            }
            if (maxFrames === void 0) {
              maxFrames = Infinity;
            }
            var _this = _super.call(this, schedulerActionCtor, function() {
              return _this.frame;
            }) || this;
            _this.maxFrames = maxFrames;
            _this.frame = 0;
            _this.index = -1;
            return _this;
          }
          VirtualTimeScheduler2.prototype.flush = function() {
            var _a = this, actions = _a.actions, maxFrames = _a.maxFrames;
            var error;
            var action;
            while ((action = actions[0]) && action.delay <= maxFrames) {
              actions.shift();
              this.frame = action.delay;
              if (error = action.execute(action.state, action.delay)) {
                break;
              }
            }
            if (error) {
              while (action = actions.shift()) {
                action.unsubscribe();
              }
              throw error;
            }
          };
          VirtualTimeScheduler2.frameTimeFactor = 10;
          return VirtualTimeScheduler2;
        })(AsyncScheduler);
        var VirtualAction = (function(_super) {
          __extends(VirtualAction2, _super);
          function VirtualAction2(scheduler, work, index) {
            if (index === void 0) {
              index = scheduler.index += 1;
            }
            var _this = _super.call(this, scheduler, work) || this;
            _this.scheduler = scheduler;
            _this.work = work;
            _this.index = index;
            _this.active = true;
            _this.index = scheduler.index = index;
            return _this;
          }
          VirtualAction2.prototype.schedule = function(state, delay2) {
            if (delay2 === void 0) {
              delay2 = 0;
            }
            if (Number.isFinite(delay2)) {
              if (!this.id) {
                return _super.prototype.schedule.call(this, state, delay2);
              }
              this.active = false;
              var action = new VirtualAction2(this.scheduler, this.work);
              this.add(action);
              return action.schedule(state, delay2);
            } else {
              return Subscription.EMPTY;
            }
          };
          VirtualAction2.prototype.requestAsyncId = function(scheduler, id, delay2) {
            if (delay2 === void 0) {
              delay2 = 0;
            }
            this.delay = scheduler.frame + delay2;
            var actions = scheduler.actions;
            actions.push(this);
            actions.sort(VirtualAction2.sortActions);
            return 1;
          };
          VirtualAction2.prototype.recycleAsyncId = function(scheduler, id, delay2) {
            if (delay2 === void 0) {
              delay2 = 0;
            }
            return void 0;
          };
          VirtualAction2.prototype._execute = function(state, delay2) {
            if (this.active === true) {
              return _super.prototype._execute.call(this, state, delay2);
            }
          };
          VirtualAction2.sortActions = function(a, b) {
            if (a.delay === b.delay) {
              if (a.index === b.index) {
                return 0;
              } else if (a.index > b.index) {
                return 1;
              } else {
                return -1;
              }
            } else if (a.delay > b.delay) {
              return 1;
            } else {
              return -1;
            }
          };
          return VirtualAction2;
        })(AsyncAction);
        var EMPTY = new Observable(function(subscriber) {
          return subscriber.complete();
        });
        function empty(scheduler) {
          return scheduler ? emptyScheduled(scheduler) : EMPTY;
        }
        function emptyScheduled(scheduler) {
          return new Observable(function(subscriber) {
            return scheduler.schedule(function() {
              return subscriber.complete();
            });
          });
        }
        function isScheduler(value) {
          return value && isFunction(value.schedule);
        }
        function last(arr) {
          return arr[arr.length - 1];
        }
        function popResultSelector(args) {
          return isFunction(last(args)) ? args.pop() : void 0;
        }
        function popScheduler(args) {
          return isScheduler(last(args)) ? args.pop() : void 0;
        }
        function popNumber(args, defaultValue) {
          return typeof last(args) === "number" ? args.pop() : defaultValue;
        }
        var isArrayLike = (function(x) {
          return x && typeof x.length === "number" && typeof x !== "function";
        });
        function isPromise(value) {
          return isFunction(value === null || value === void 0 ? void 0 : value.then);
        }
        function isInteropObservable(input) {
          return isFunction(input[observable]);
        }
        function isAsyncIterable(obj) {
          return Symbol.asyncIterator && isFunction(obj === null || obj === void 0 ? void 0 : obj[Symbol.asyncIterator]);
        }
        function createInvalidObservableTypeError(input) {
          return new TypeError("You provided " + (input !== null && typeof input === "object" ? "an invalid object" : "'" + input + "'") + " where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.");
        }
        function getSymbolIterator() {
          if (typeof Symbol !== "function" || !Symbol.iterator) {
            return "@@iterator";
          }
          return Symbol.iterator;
        }
        var iterator = getSymbolIterator();
        function isIterable(input) {
          return isFunction(input === null || input === void 0 ? void 0 : input[iterator]);
        }
        function readableStreamLikeToAsyncGenerator(readableStream) {
          return __asyncGenerator(this, arguments, function readableStreamLikeToAsyncGenerator_1() {
            var reader, _a, value, done;
            return __generator(this, function(_b) {
              switch (_b.label) {
                case 0:
                  reader = readableStream.getReader();
                  _b.label = 1;
                case 1:
                  _b.trys.push([1, , 9, 10]);
                  _b.label = 2;
                case 2:
                  return [4, __await(reader.read())];
                case 3:
                  _a = _b.sent(), value = _a.value, done = _a.done;
                  if (!done) return [3, 5];
                  return [4, __await(void 0)];
                case 4:
                  return [2, _b.sent()];
                case 5:
                  return [4, __await(value)];
                case 6:
                  return [4, _b.sent()];
                case 7:
                  _b.sent();
                  return [3, 2];
                case 8:
                  return [3, 10];
                case 9:
                  reader.releaseLock();
                  return [7];
                case 10:
                  return [2];
              }
            });
          });
        }
        function isReadableStreamLike(obj) {
          return isFunction(obj === null || obj === void 0 ? void 0 : obj.getReader);
        }
        function innerFrom(input) {
          if (input instanceof Observable) {
            return input;
          }
          if (input != null) {
            if (isInteropObservable(input)) {
              return fromInteropObservable(input);
            }
            if (isArrayLike(input)) {
              return fromArrayLike(input);
            }
            if (isPromise(input)) {
              return fromPromise(input);
            }
            if (isAsyncIterable(input)) {
              return fromAsyncIterable(input);
            }
            if (isIterable(input)) {
              return fromIterable(input);
            }
            if (isReadableStreamLike(input)) {
              return fromReadableStreamLike(input);
            }
          }
          throw createInvalidObservableTypeError(input);
        }
        function fromInteropObservable(obj) {
          return new Observable(function(subscriber) {
            var obs = obj[observable]();
            if (isFunction(obs.subscribe)) {
              return obs.subscribe(subscriber);
            }
            throw new TypeError("Provided object does not correctly implement Symbol.observable");
          });
        }
        function fromArrayLike(array) {
          return new Observable(function(subscriber) {
            for (var i = 0; i < array.length && !subscriber.closed; i++) {
              subscriber.next(array[i]);
            }
            subscriber.complete();
          });
        }
        function fromPromise(promise) {
          return new Observable(function(subscriber) {
            promise.then(function(value) {
              if (!subscriber.closed) {
                subscriber.next(value);
                subscriber.complete();
              }
            }, function(err) {
              return subscriber.error(err);
            }).then(null, reportUnhandledError);
          });
        }
        function fromIterable(iterable) {
          return new Observable(function(subscriber) {
            var e_1, _a;
            try {
              for (var iterable_1 = __values(iterable), iterable_1_1 = iterable_1.next(); !iterable_1_1.done; iterable_1_1 = iterable_1.next()) {
                var value = iterable_1_1.value;
                subscriber.next(value);
                if (subscriber.closed) {
                  return;
                }
              }
            } catch (e_1_1) {
              e_1 = { error: e_1_1 };
            } finally {
              try {
                if (iterable_1_1 && !iterable_1_1.done && (_a = iterable_1.return)) _a.call(iterable_1);
              } finally {
                if (e_1) throw e_1.error;
              }
            }
            subscriber.complete();
          });
        }
        function fromAsyncIterable(asyncIterable) {
          return new Observable(function(subscriber) {
            process(asyncIterable, subscriber).catch(function(err) {
              return subscriber.error(err);
            });
          });
        }
        function fromReadableStreamLike(readableStream) {
          return fromAsyncIterable(readableStreamLikeToAsyncGenerator(readableStream));
        }
        function process(asyncIterable, subscriber) {
          var asyncIterable_1, asyncIterable_1_1;
          var e_2, _a;
          return __awaiter(this, void 0, void 0, function() {
            var value, e_2_1;
            return __generator(this, function(_b) {
              switch (_b.label) {
                case 0:
                  _b.trys.push([0, 5, 6, 11]);
                  asyncIterable_1 = __asyncValues(asyncIterable);
                  _b.label = 1;
                case 1:
                  return [4, asyncIterable_1.next()];
                case 2:
                  if (!(asyncIterable_1_1 = _b.sent(), !asyncIterable_1_1.done)) return [3, 4];
                  value = asyncIterable_1_1.value;
                  subscriber.next(value);
                  if (subscriber.closed) {
                    return [2];
                  }
                  _b.label = 3;
                case 3:
                  return [3, 1];
                case 4:
                  return [3, 11];
                case 5:
                  e_2_1 = _b.sent();
                  e_2 = { error: e_2_1 };
                  return [3, 11];
                case 6:
                  _b.trys.push([6, , 9, 10]);
                  if (!(asyncIterable_1_1 && !asyncIterable_1_1.done && (_a = asyncIterable_1.return))) return [3, 8];
                  return [4, _a.call(asyncIterable_1)];
                case 7:
                  _b.sent();
                  _b.label = 8;
                case 8:
                  return [3, 10];
                case 9:
                  if (e_2) throw e_2.error;
                  return [7];
                case 10:
                  return [7];
                case 11:
                  subscriber.complete();
                  return [2];
              }
            });
          });
        }
        function executeSchedule(parentSubscription, scheduler, work, delay2, repeat2) {
          if (delay2 === void 0) {
            delay2 = 0;
          }
          if (repeat2 === void 0) {
            repeat2 = false;
          }
          var scheduleSubscription = scheduler.schedule(function() {
            work();
            if (repeat2) {
              parentSubscription.add(this.schedule(null, delay2));
            } else {
              this.unsubscribe();
            }
          }, delay2);
          parentSubscription.add(scheduleSubscription);
          if (!repeat2) {
            return scheduleSubscription;
          }
        }
        function observeOn(scheduler, delay2) {
          if (delay2 === void 0) {
            delay2 = 0;
          }
          return operate(function(source, subscriber) {
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              return executeSchedule(subscriber, scheduler, function() {
                return subscriber.next(value);
              }, delay2);
            }, function() {
              return executeSchedule(subscriber, scheduler, function() {
                return subscriber.complete();
              }, delay2);
            }, function(err) {
              return executeSchedule(subscriber, scheduler, function() {
                return subscriber.error(err);
              }, delay2);
            }));
          });
        }
        function subscribeOn(scheduler, delay2) {
          if (delay2 === void 0) {
            delay2 = 0;
          }
          return operate(function(source, subscriber) {
            subscriber.add(scheduler.schedule(function() {
              return source.subscribe(subscriber);
            }, delay2));
          });
        }
        function scheduleObservable(input, scheduler) {
          return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
        }
        function schedulePromise(input, scheduler) {
          return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
        }
        function scheduleArray(input, scheduler) {
          return new Observable(function(subscriber) {
            var i = 0;
            return scheduler.schedule(function() {
              if (i === input.length) {
                subscriber.complete();
              } else {
                subscriber.next(input[i++]);
                if (!subscriber.closed) {
                  this.schedule();
                }
              }
            });
          });
        }
        function scheduleIterable(input, scheduler) {
          return new Observable(function(subscriber) {
            var iterator$$1;
            executeSchedule(subscriber, scheduler, function() {
              iterator$$1 = input[iterator]();
              executeSchedule(subscriber, scheduler, function() {
                var _a;
                var value;
                var done;
                try {
                  _a = iterator$$1.next(), value = _a.value, done = _a.done;
                } catch (err) {
                  subscriber.error(err);
                  return;
                }
                if (done) {
                  subscriber.complete();
                } else {
                  subscriber.next(value);
                }
              }, 0, true);
            });
            return function() {
              return isFunction(iterator$$1 === null || iterator$$1 === void 0 ? void 0 : iterator$$1.return) && iterator$$1.return();
            };
          });
        }
        function scheduleAsyncIterable(input, scheduler) {
          if (!input) {
            throw new Error("Iterable cannot be null");
          }
          return new Observable(function(subscriber) {
            executeSchedule(subscriber, scheduler, function() {
              var iterator2 = input[Symbol.asyncIterator]();
              executeSchedule(subscriber, scheduler, function() {
                iterator2.next().then(function(result) {
                  if (result.done) {
                    subscriber.complete();
                  } else {
                    subscriber.next(result.value);
                  }
                });
              }, 0, true);
            });
          });
        }
        function scheduleReadableStreamLike(input, scheduler) {
          return scheduleAsyncIterable(readableStreamLikeToAsyncGenerator(input), scheduler);
        }
        function scheduled(input, scheduler) {
          if (input != null) {
            if (isInteropObservable(input)) {
              return scheduleObservable(input, scheduler);
            }
            if (isArrayLike(input)) {
              return scheduleArray(input, scheduler);
            }
            if (isPromise(input)) {
              return schedulePromise(input, scheduler);
            }
            if (isAsyncIterable(input)) {
              return scheduleAsyncIterable(input, scheduler);
            }
            if (isIterable(input)) {
              return scheduleIterable(input, scheduler);
            }
            if (isReadableStreamLike(input)) {
              return scheduleReadableStreamLike(input, scheduler);
            }
          }
          throw createInvalidObservableTypeError(input);
        }
        function from(input, scheduler) {
          return scheduler ? scheduled(input, scheduler) : innerFrom(input);
        }
        function of() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          var scheduler = popScheduler(args);
          return from(args, scheduler);
        }
        function throwError(errorOrErrorFactory, scheduler) {
          var errorFactory = isFunction(errorOrErrorFactory) ? errorOrErrorFactory : function() {
            return errorOrErrorFactory;
          };
          var init = function(subscriber) {
            return subscriber.error(errorFactory());
          };
          return new Observable(scheduler ? function(subscriber) {
            return scheduler.schedule(init, 0, subscriber);
          } : init);
        }
        (function(NotificationKind) {
          NotificationKind["NEXT"] = "N";
          NotificationKind["ERROR"] = "E";
          NotificationKind["COMPLETE"] = "C";
        })(exports2.NotificationKind || (exports2.NotificationKind = {}));
        var Notification = (function() {
          function Notification2(kind, value, error) {
            this.kind = kind;
            this.value = value;
            this.error = error;
            this.hasValue = kind === "N";
          }
          Notification2.prototype.observe = function(observer) {
            return observeNotification(this, observer);
          };
          Notification2.prototype.do = function(nextHandler, errorHandler, completeHandler) {
            var _a = this, kind = _a.kind, value = _a.value, error = _a.error;
            return kind === "N" ? nextHandler === null || nextHandler === void 0 ? void 0 : nextHandler(value) : kind === "E" ? errorHandler === null || errorHandler === void 0 ? void 0 : errorHandler(error) : completeHandler === null || completeHandler === void 0 ? void 0 : completeHandler();
          };
          Notification2.prototype.accept = function(nextOrObserver, error, complete) {
            var _a;
            return isFunction((_a = nextOrObserver) === null || _a === void 0 ? void 0 : _a.next) ? this.observe(nextOrObserver) : this.do(nextOrObserver, error, complete);
          };
          Notification2.prototype.toObservable = function() {
            var _a = this, kind = _a.kind, value = _a.value, error = _a.error;
            var result = kind === "N" ? of(value) : kind === "E" ? throwError(function() {
              return error;
            }) : kind === "C" ? EMPTY : 0;
            if (!result) {
              throw new TypeError("Unexpected notification kind " + kind);
            }
            return result;
          };
          Notification2.createNext = function(value) {
            return new Notification2("N", value);
          };
          Notification2.createError = function(err) {
            return new Notification2("E", void 0, err);
          };
          Notification2.createComplete = function() {
            return Notification2.completeNotification;
          };
          Notification2.completeNotification = new Notification2("C");
          return Notification2;
        })();
        function observeNotification(notification, observer) {
          var _a, _b, _c;
          var _d = notification, kind = _d.kind, value = _d.value, error = _d.error;
          if (typeof kind !== "string") {
            throw new TypeError('Invalid notification, missing "kind"');
          }
          kind === "N" ? (_a = observer.next) === null || _a === void 0 ? void 0 : _a.call(observer, value) : kind === "E" ? (_b = observer.error) === null || _b === void 0 ? void 0 : _b.call(observer, error) : (_c = observer.complete) === null || _c === void 0 ? void 0 : _c.call(observer);
        }
        function isObservable(obj) {
          return !!obj && (obj instanceof Observable || isFunction(obj.lift) && isFunction(obj.subscribe));
        }
        var EmptyError = createErrorClass(function(_super) {
          return function EmptyErrorImpl() {
            _super(this);
            this.name = "EmptyError";
            this.message = "no elements in sequence";
          };
        });
        function lastValueFrom(source, config2) {
          var hasConfig = typeof config2 === "object";
          return new Promise(function(resolve, reject) {
            var _hasValue = false;
            var _value;
            source.subscribe({
              next: function(value) {
                _value = value;
                _hasValue = true;
              },
              error: reject,
              complete: function() {
                if (_hasValue) {
                  resolve(_value);
                } else if (hasConfig) {
                  resolve(config2.defaultValue);
                } else {
                  reject(new EmptyError());
                }
              }
            });
          });
        }
        function firstValueFrom(source, config2) {
          var hasConfig = typeof config2 === "object";
          return new Promise(function(resolve, reject) {
            var subscriber = new SafeSubscriber({
              next: function(value) {
                resolve(value);
                subscriber.unsubscribe();
              },
              error: reject,
              complete: function() {
                if (hasConfig) {
                  resolve(config2.defaultValue);
                } else {
                  reject(new EmptyError());
                }
              }
            });
            source.subscribe(subscriber);
          });
        }
        var ArgumentOutOfRangeError = createErrorClass(function(_super) {
          return function ArgumentOutOfRangeErrorImpl() {
            _super(this);
            this.name = "ArgumentOutOfRangeError";
            this.message = "argument out of range";
          };
        });
        var NotFoundError = createErrorClass(function(_super) {
          return function NotFoundErrorImpl(message) {
            _super(this);
            this.name = "NotFoundError";
            this.message = message;
          };
        });
        var SequenceError = createErrorClass(function(_super) {
          return function SequenceErrorImpl(message) {
            _super(this);
            this.name = "SequenceError";
            this.message = message;
          };
        });
        function isValidDate(value) {
          return value instanceof Date && !isNaN(value);
        }
        var TimeoutError = createErrorClass(function(_super) {
          return function TimeoutErrorImpl(info) {
            if (info === void 0) {
              info = null;
            }
            _super(this);
            this.message = "Timeout has occurred";
            this.name = "TimeoutError";
            this.info = info;
          };
        });
        function timeout(config2, schedulerArg) {
          var _a = isValidDate(config2) ? { first: config2 } : typeof config2 === "number" ? { each: config2 } : config2, first2 = _a.first, each = _a.each, _b = _a.with, _with = _b === void 0 ? timeoutErrorFactory : _b, _c = _a.scheduler, scheduler = _c === void 0 ? schedulerArg !== null && schedulerArg !== void 0 ? schedulerArg : asyncScheduler : _c, _d = _a.meta, meta = _d === void 0 ? null : _d;
          if (first2 == null && each == null) {
            throw new TypeError("No timeout provided.");
          }
          return operate(function(source, subscriber) {
            var originalSourceSubscription;
            var timerSubscription;
            var lastValue = null;
            var seen = 0;
            var startTimer = function(delay2) {
              timerSubscription = executeSchedule(subscriber, scheduler, function() {
                try {
                  originalSourceSubscription.unsubscribe();
                  innerFrom(_with({
                    meta,
                    lastValue,
                    seen
                  })).subscribe(subscriber);
                } catch (err) {
                  subscriber.error(err);
                }
              }, delay2);
            };
            originalSourceSubscription = source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.unsubscribe();
              seen++;
              subscriber.next(lastValue = value);
              each > 0 && startTimer(each);
            }, void 0, void 0, function() {
              if (!(timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.closed)) {
                timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.unsubscribe();
              }
              lastValue = null;
            }));
            !seen && startTimer(first2 != null ? typeof first2 === "number" ? first2 : +first2 - scheduler.now() : each);
          });
        }
        function timeoutErrorFactory(info) {
          throw new TimeoutError(info);
        }
        function map(project, thisArg) {
          return operate(function(source, subscriber) {
            var index = 0;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              subscriber.next(project.call(thisArg, value, index++));
            }));
          });
        }
        var isArray = Array.isArray;
        function callOrApply(fn, args) {
          return isArray(args) ? fn.apply(void 0, __spreadArray([], __read(args))) : fn(args);
        }
        function mapOneOrManyArgs(fn) {
          return map(function(args) {
            return callOrApply(fn, args);
          });
        }
        function bindCallbackInternals(isNodeStyle, callbackFunc, resultSelector, scheduler) {
          if (resultSelector) {
            if (isScheduler(resultSelector)) {
              scheduler = resultSelector;
            } else {
              return function() {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                  args[_i] = arguments[_i];
                }
                return bindCallbackInternals(isNodeStyle, callbackFunc, scheduler).apply(this, args).pipe(mapOneOrManyArgs(resultSelector));
              };
            }
          }
          if (scheduler) {
            return function() {
              var args = [];
              for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
              }
              return bindCallbackInternals(isNodeStyle, callbackFunc).apply(this, args).pipe(subscribeOn(scheduler), observeOn(scheduler));
            };
          }
          return function() {
            var _this = this;
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var subject = new AsyncSubject();
            var uninitialized = true;
            return new Observable(function(subscriber) {
              var subs = subject.subscribe(subscriber);
              if (uninitialized) {
                uninitialized = false;
                var isAsync_1 = false;
                var isComplete_1 = false;
                callbackFunc.apply(_this, __spreadArray(__spreadArray([], __read(args)), [
                  function() {
                    var results = [];
                    for (var _i2 = 0; _i2 < arguments.length; _i2++) {
                      results[_i2] = arguments[_i2];
                    }
                    if (isNodeStyle) {
                      var err = results.shift();
                      if (err != null) {
                        subject.error(err);
                        return;
                      }
                    }
                    subject.next(1 < results.length ? results : results[0]);
                    isComplete_1 = true;
                    if (isAsync_1) {
                      subject.complete();
                    }
                  }
                ]));
                if (isComplete_1) {
                  subject.complete();
                }
                isAsync_1 = true;
              }
              return subs;
            });
          };
        }
        function bindCallback(callbackFunc, resultSelector, scheduler) {
          return bindCallbackInternals(false, callbackFunc, resultSelector, scheduler);
        }
        function bindNodeCallback(callbackFunc, resultSelector, scheduler) {
          return bindCallbackInternals(true, callbackFunc, resultSelector, scheduler);
        }
        var isArray$1 = Array.isArray;
        var getPrototypeOf = Object.getPrototypeOf, objectProto = Object.prototype, getKeys = Object.keys;
        function argsArgArrayOrObject(args) {
          if (args.length === 1) {
            var first_1 = args[0];
            if (isArray$1(first_1)) {
              return { args: first_1, keys: null };
            }
            if (isPOJO(first_1)) {
              var keys = getKeys(first_1);
              return {
                args: keys.map(function(key) {
                  return first_1[key];
                }),
                keys
              };
            }
          }
          return { args, keys: null };
        }
        function isPOJO(obj) {
          return obj && typeof obj === "object" && getPrototypeOf(obj) === objectProto;
        }
        function createObject(keys, values) {
          return keys.reduce(function(result, key, i) {
            return result[key] = values[i], result;
          }, {});
        }
        function combineLatest() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          var scheduler = popScheduler(args);
          var resultSelector = popResultSelector(args);
          var _a = argsArgArrayOrObject(args), observables = _a.args, keys = _a.keys;
          if (observables.length === 0) {
            return from([], scheduler);
          }
          var result = new Observable(combineLatestInit(observables, scheduler, keys ? function(values) {
            return createObject(keys, values);
          } : identity));
          return resultSelector ? result.pipe(mapOneOrManyArgs(resultSelector)) : result;
        }
        function combineLatestInit(observables, scheduler, valueTransform) {
          if (valueTransform === void 0) {
            valueTransform = identity;
          }
          return function(subscriber) {
            maybeSchedule(scheduler, function() {
              var length = observables.length;
              var values = new Array(length);
              var active = length;
              var remainingFirstValues = length;
              var _loop_1 = function(i2) {
                maybeSchedule(scheduler, function() {
                  var source = from(observables[i2], scheduler);
                  var hasFirstValue = false;
                  source.subscribe(createOperatorSubscriber(subscriber, function(value) {
                    values[i2] = value;
                    if (!hasFirstValue) {
                      hasFirstValue = true;
                      remainingFirstValues--;
                    }
                    if (!remainingFirstValues) {
                      subscriber.next(valueTransform(values.slice()));
                    }
                  }, function() {
                    if (!--active) {
                      subscriber.complete();
                    }
                  }));
                }, subscriber);
              };
              for (var i = 0; i < length; i++) {
                _loop_1(i);
              }
            }, subscriber);
          };
        }
        function maybeSchedule(scheduler, execute, subscription) {
          if (scheduler) {
            executeSchedule(subscription, scheduler, execute);
          } else {
            execute();
          }
        }
        function mergeInternals(source, subscriber, project, concurrent, onBeforeNext, expand2, innerSubScheduler, additionalFinalizer) {
          var buffer2 = [];
          var active = 0;
          var index = 0;
          var isComplete = false;
          var checkComplete = function() {
            if (isComplete && !buffer2.length && !active) {
              subscriber.complete();
            }
          };
          var outerNext = function(value) {
            return active < concurrent ? doInnerSub(value) : buffer2.push(value);
          };
          var doInnerSub = function(value) {
            expand2 && subscriber.next(value);
            active++;
            var innerComplete = false;
            innerFrom(project(value, index++)).subscribe(createOperatorSubscriber(subscriber, function(innerValue) {
              onBeforeNext === null || onBeforeNext === void 0 ? void 0 : onBeforeNext(innerValue);
              if (expand2) {
                outerNext(innerValue);
              } else {
                subscriber.next(innerValue);
              }
            }, function() {
              innerComplete = true;
            }, void 0, function() {
              if (innerComplete) {
                try {
                  active--;
                  var _loop_1 = function() {
                    var bufferedValue = buffer2.shift();
                    if (innerSubScheduler) {
                      executeSchedule(subscriber, innerSubScheduler, function() {
                        return doInnerSub(bufferedValue);
                      });
                    } else {
                      doInnerSub(bufferedValue);
                    }
                  };
                  while (buffer2.length && active < concurrent) {
                    _loop_1();
                  }
                  checkComplete();
                } catch (err) {
                  subscriber.error(err);
                }
              }
            }));
          };
          source.subscribe(createOperatorSubscriber(subscriber, outerNext, function() {
            isComplete = true;
            checkComplete();
          }));
          return function() {
            additionalFinalizer === null || additionalFinalizer === void 0 ? void 0 : additionalFinalizer();
          };
        }
        function mergeMap(project, resultSelector, concurrent) {
          if (concurrent === void 0) {
            concurrent = Infinity;
          }
          if (isFunction(resultSelector)) {
            return mergeMap(function(a, i) {
              return map(function(b, ii) {
                return resultSelector(a, b, i, ii);
              })(innerFrom(project(a, i)));
            }, concurrent);
          } else if (typeof resultSelector === "number") {
            concurrent = resultSelector;
          }
          return operate(function(source, subscriber) {
            return mergeInternals(source, subscriber, project, concurrent);
          });
        }
        function mergeAll(concurrent) {
          if (concurrent === void 0) {
            concurrent = Infinity;
          }
          return mergeMap(identity, concurrent);
        }
        function concatAll() {
          return mergeAll(1);
        }
        function concat() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          return concatAll()(from(args, popScheduler(args)));
        }
        function defer(observableFactory) {
          return new Observable(function(subscriber) {
            innerFrom(observableFactory()).subscribe(subscriber);
          });
        }
        var DEFAULT_CONFIG = {
          connector: function() {
            return new Subject();
          },
          resetOnDisconnect: true
        };
        function connectable(source, config2) {
          if (config2 === void 0) {
            config2 = DEFAULT_CONFIG;
          }
          var connection = null;
          var connector = config2.connector, _a = config2.resetOnDisconnect, resetOnDisconnect = _a === void 0 ? true : _a;
          var subject = connector();
          var result = new Observable(function(subscriber) {
            return subject.subscribe(subscriber);
          });
          result.connect = function() {
            if (!connection || connection.closed) {
              connection = defer(function() {
                return source;
              }).subscribe(subject);
              if (resetOnDisconnect) {
                connection.add(function() {
                  return subject = connector();
                });
              }
            }
            return connection;
          };
          return result;
        }
        function forkJoin() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          var resultSelector = popResultSelector(args);
          var _a = argsArgArrayOrObject(args), sources = _a.args, keys = _a.keys;
          var result = new Observable(function(subscriber) {
            var length = sources.length;
            if (!length) {
              subscriber.complete();
              return;
            }
            var values = new Array(length);
            var remainingCompletions = length;
            var remainingEmissions = length;
            var _loop_1 = function(sourceIndex2) {
              var hasValue = false;
              innerFrom(sources[sourceIndex2]).subscribe(createOperatorSubscriber(subscriber, function(value) {
                if (!hasValue) {
                  hasValue = true;
                  remainingEmissions--;
                }
                values[sourceIndex2] = value;
              }, function() {
                return remainingCompletions--;
              }, void 0, function() {
                if (!remainingCompletions || !hasValue) {
                  if (!remainingEmissions) {
                    subscriber.next(keys ? createObject(keys, values) : values);
                  }
                  subscriber.complete();
                }
              }));
            };
            for (var sourceIndex = 0; sourceIndex < length; sourceIndex++) {
              _loop_1(sourceIndex);
            }
          });
          return resultSelector ? result.pipe(mapOneOrManyArgs(resultSelector)) : result;
        }
        var nodeEventEmitterMethods = ["addListener", "removeListener"];
        var eventTargetMethods = ["addEventListener", "removeEventListener"];
        var jqueryMethods = ["on", "off"];
        function fromEvent(target, eventName, options, resultSelector) {
          if (isFunction(options)) {
            resultSelector = options;
            options = void 0;
          }
          if (resultSelector) {
            return fromEvent(target, eventName, options).pipe(mapOneOrManyArgs(resultSelector));
          }
          var _a = __read(isEventTarget(target) ? eventTargetMethods.map(function(methodName) {
            return function(handler) {
              return target[methodName](eventName, handler, options);
            };
          }) : isNodeStyleEventEmitter(target) ? nodeEventEmitterMethods.map(toCommonHandlerRegistry(target, eventName)) : isJQueryStyleEventEmitter(target) ? jqueryMethods.map(toCommonHandlerRegistry(target, eventName)) : [], 2), add = _a[0], remove = _a[1];
          if (!add) {
            if (isArrayLike(target)) {
              return mergeMap(function(subTarget) {
                return fromEvent(subTarget, eventName, options);
              })(innerFrom(target));
            }
          }
          if (!add) {
            throw new TypeError("Invalid event target");
          }
          return new Observable(function(subscriber) {
            var handler = function() {
              var args = [];
              for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
              }
              return subscriber.next(1 < args.length ? args : args[0]);
            };
            add(handler);
            return function() {
              return remove(handler);
            };
          });
        }
        function toCommonHandlerRegistry(target, eventName) {
          return function(methodName) {
            return function(handler) {
              return target[methodName](eventName, handler);
            };
          };
        }
        function isNodeStyleEventEmitter(target) {
          return isFunction(target.addListener) && isFunction(target.removeListener);
        }
        function isJQueryStyleEventEmitter(target) {
          return isFunction(target.on) && isFunction(target.off);
        }
        function isEventTarget(target) {
          return isFunction(target.addEventListener) && isFunction(target.removeEventListener);
        }
        function fromEventPattern(addHandler, removeHandler, resultSelector) {
          if (resultSelector) {
            return fromEventPattern(addHandler, removeHandler).pipe(mapOneOrManyArgs(resultSelector));
          }
          return new Observable(function(subscriber) {
            var handler = function() {
              var e = [];
              for (var _i = 0; _i < arguments.length; _i++) {
                e[_i] = arguments[_i];
              }
              return subscriber.next(e.length === 1 ? e[0] : e);
            };
            var retValue = addHandler(handler);
            return isFunction(removeHandler) ? function() {
              return removeHandler(handler, retValue);
            } : void 0;
          });
        }
        function generate(initialStateOrOptions, condition, iterate, resultSelectorOrScheduler, scheduler) {
          var _a, _b;
          var resultSelector;
          var initialState;
          if (arguments.length === 1) {
            _a = initialStateOrOptions, initialState = _a.initialState, condition = _a.condition, iterate = _a.iterate, _b = _a.resultSelector, resultSelector = _b === void 0 ? identity : _b, scheduler = _a.scheduler;
          } else {
            initialState = initialStateOrOptions;
            if (!resultSelectorOrScheduler || isScheduler(resultSelectorOrScheduler)) {
              resultSelector = identity;
              scheduler = resultSelectorOrScheduler;
            } else {
              resultSelector = resultSelectorOrScheduler;
            }
          }
          function gen() {
            var state;
            return __generator(this, function(_a2) {
              switch (_a2.label) {
                case 0:
                  state = initialState;
                  _a2.label = 1;
                case 1:
                  if (!(!condition || condition(state))) return [3, 4];
                  return [4, resultSelector(state)];
                case 2:
                  _a2.sent();
                  _a2.label = 3;
                case 3:
                  state = iterate(state);
                  return [3, 1];
                case 4:
                  return [2];
              }
            });
          }
          return defer(scheduler ? function() {
            return scheduleIterable(gen(), scheduler);
          } : gen);
        }
        function iif(condition, trueResult, falseResult) {
          return defer(function() {
            return condition() ? trueResult : falseResult;
          });
        }
        function timer(dueTime, intervalOrScheduler, scheduler) {
          if (dueTime === void 0) {
            dueTime = 0;
          }
          if (scheduler === void 0) {
            scheduler = async;
          }
          var intervalDuration = -1;
          if (intervalOrScheduler != null) {
            if (isScheduler(intervalOrScheduler)) {
              scheduler = intervalOrScheduler;
            } else {
              intervalDuration = intervalOrScheduler;
            }
          }
          return new Observable(function(subscriber) {
            var due = isValidDate(dueTime) ? +dueTime - scheduler.now() : dueTime;
            if (due < 0) {
              due = 0;
            }
            var n = 0;
            return scheduler.schedule(function() {
              if (!subscriber.closed) {
                subscriber.next(n++);
                if (0 <= intervalDuration) {
                  this.schedule(void 0, intervalDuration);
                } else {
                  subscriber.complete();
                }
              }
            }, due);
          });
        }
        function interval(period, scheduler) {
          if (period === void 0) {
            period = 0;
          }
          if (scheduler === void 0) {
            scheduler = asyncScheduler;
          }
          if (period < 0) {
            period = 0;
          }
          return timer(period, period, scheduler);
        }
        function merge() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          var scheduler = popScheduler(args);
          var concurrent = popNumber(args, Infinity);
          var sources = args;
          return !sources.length ? EMPTY : sources.length === 1 ? innerFrom(sources[0]) : mergeAll(concurrent)(from(sources, scheduler));
        }
        var NEVER = new Observable(noop);
        function never() {
          return NEVER;
        }
        var isArray$2 = Array.isArray;
        function argsOrArgArray(args) {
          return args.length === 1 && isArray$2(args[0]) ? args[0] : args;
        }
        function onErrorResumeNext() {
          var sources = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            sources[_i] = arguments[_i];
          }
          var nextSources = argsOrArgArray(sources);
          return new Observable(function(subscriber) {
            var sourceIndex = 0;
            var subscribeNext = function() {
              if (sourceIndex < nextSources.length) {
                var nextSource = void 0;
                try {
                  nextSource = innerFrom(nextSources[sourceIndex++]);
                } catch (err) {
                  subscribeNext();
                  return;
                }
                var innerSubscriber = new OperatorSubscriber(subscriber, void 0, noop, noop);
                nextSource.subscribe(innerSubscriber);
                innerSubscriber.add(subscribeNext);
              } else {
                subscriber.complete();
              }
            };
            subscribeNext();
          });
        }
        function pairs(obj, scheduler) {
          return from(Object.entries(obj), scheduler);
        }
        function not(pred, thisArg) {
          return function(value, index) {
            return !pred.call(thisArg, value, index);
          };
        }
        function filter(predicate, thisArg) {
          return operate(function(source, subscriber) {
            var index = 0;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              return predicate.call(thisArg, value, index++) && subscriber.next(value);
            }));
          });
        }
        function partition(source, predicate, thisArg) {
          return [filter(predicate, thisArg)(innerFrom(source)), filter(not(predicate, thisArg))(innerFrom(source))];
        }
        function race() {
          var sources = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            sources[_i] = arguments[_i];
          }
          sources = argsOrArgArray(sources);
          return sources.length === 1 ? innerFrom(sources[0]) : new Observable(raceInit(sources));
        }
        function raceInit(sources) {
          return function(subscriber) {
            var subscriptions = [];
            var _loop_1 = function(i2) {
              subscriptions.push(innerFrom(sources[i2]).subscribe(createOperatorSubscriber(subscriber, function(value) {
                if (subscriptions) {
                  for (var s = 0; s < subscriptions.length; s++) {
                    s !== i2 && subscriptions[s].unsubscribe();
                  }
                  subscriptions = null;
                }
                subscriber.next(value);
              })));
            };
            for (var i = 0; subscriptions && !subscriber.closed && i < sources.length; i++) {
              _loop_1(i);
            }
          };
        }
        function range(start, count2, scheduler) {
          if (count2 == null) {
            count2 = start;
            start = 0;
          }
          if (count2 <= 0) {
            return EMPTY;
          }
          var end = count2 + start;
          return new Observable(scheduler ? function(subscriber) {
            var n = start;
            return scheduler.schedule(function() {
              if (n < end) {
                subscriber.next(n++);
                this.schedule();
              } else {
                subscriber.complete();
              }
            });
          } : function(subscriber) {
            var n = start;
            while (n < end && !subscriber.closed) {
              subscriber.next(n++);
            }
            subscriber.complete();
          });
        }
        function using(resourceFactory, observableFactory) {
          return new Observable(function(subscriber) {
            var resource = resourceFactory();
            var result = observableFactory(resource);
            var source = result ? innerFrom(result) : EMPTY;
            source.subscribe(subscriber);
            return function() {
              if (resource) {
                resource.unsubscribe();
              }
            };
          });
        }
        function zip() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          var resultSelector = popResultSelector(args);
          var sources = argsOrArgArray(args);
          return sources.length ? new Observable(function(subscriber) {
            var buffers = sources.map(function() {
              return [];
            });
            var completed = sources.map(function() {
              return false;
            });
            subscriber.add(function() {
              buffers = completed = null;
            });
            var _loop_1 = function(sourceIndex2) {
              innerFrom(sources[sourceIndex2]).subscribe(createOperatorSubscriber(subscriber, function(value) {
                buffers[sourceIndex2].push(value);
                if (buffers.every(function(buffer2) {
                  return buffer2.length;
                })) {
                  var result = buffers.map(function(buffer2) {
                    return buffer2.shift();
                  });
                  subscriber.next(resultSelector ? resultSelector.apply(void 0, __spreadArray([], __read(result))) : result);
                  if (buffers.some(function(buffer2, i) {
                    return !buffer2.length && completed[i];
                  })) {
                    subscriber.complete();
                  }
                }
              }, function() {
                completed[sourceIndex2] = true;
                !buffers[sourceIndex2].length && subscriber.complete();
              }));
            };
            for (var sourceIndex = 0; !subscriber.closed && sourceIndex < sources.length; sourceIndex++) {
              _loop_1(sourceIndex);
            }
            return function() {
              buffers = completed = null;
            };
          }) : EMPTY;
        }
        function audit(durationSelector) {
          return operate(function(source, subscriber) {
            var hasValue = false;
            var lastValue = null;
            var durationSubscriber = null;
            var isComplete = false;
            var endDuration = function() {
              durationSubscriber === null || durationSubscriber === void 0 ? void 0 : durationSubscriber.unsubscribe();
              durationSubscriber = null;
              if (hasValue) {
                hasValue = false;
                var value = lastValue;
                lastValue = null;
                subscriber.next(value);
              }
              isComplete && subscriber.complete();
            };
            var cleanupDuration = function() {
              durationSubscriber = null;
              isComplete && subscriber.complete();
            };
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              hasValue = true;
              lastValue = value;
              if (!durationSubscriber) {
                innerFrom(durationSelector(value)).subscribe(durationSubscriber = createOperatorSubscriber(subscriber, endDuration, cleanupDuration));
              }
            }, function() {
              isComplete = true;
              (!hasValue || !durationSubscriber || durationSubscriber.closed) && subscriber.complete();
            }));
          });
        }
        function auditTime(duration, scheduler) {
          if (scheduler === void 0) {
            scheduler = asyncScheduler;
          }
          return audit(function() {
            return timer(duration, scheduler);
          });
        }
        function buffer(closingNotifier) {
          return operate(function(source, subscriber) {
            var currentBuffer = [];
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              return currentBuffer.push(value);
            }, function() {
              subscriber.next(currentBuffer);
              subscriber.complete();
            }));
            innerFrom(closingNotifier).subscribe(createOperatorSubscriber(subscriber, function() {
              var b = currentBuffer;
              currentBuffer = [];
              subscriber.next(b);
            }, noop));
            return function() {
              currentBuffer = null;
            };
          });
        }
        function bufferCount(bufferSize, startBufferEvery) {
          if (startBufferEvery === void 0) {
            startBufferEvery = null;
          }
          startBufferEvery = startBufferEvery !== null && startBufferEvery !== void 0 ? startBufferEvery : bufferSize;
          return operate(function(source, subscriber) {
            var buffers = [];
            var count2 = 0;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              var e_1, _a, e_2, _b;
              var toEmit = null;
              if (count2++ % startBufferEvery === 0) {
                buffers.push([]);
              }
              try {
                for (var buffers_1 = __values(buffers), buffers_1_1 = buffers_1.next(); !buffers_1_1.done; buffers_1_1 = buffers_1.next()) {
                  var buffer2 = buffers_1_1.value;
                  buffer2.push(value);
                  if (bufferSize <= buffer2.length) {
                    toEmit = toEmit !== null && toEmit !== void 0 ? toEmit : [];
                    toEmit.push(buffer2);
                  }
                }
              } catch (e_1_1) {
                e_1 = { error: e_1_1 };
              } finally {
                try {
                  if (buffers_1_1 && !buffers_1_1.done && (_a = buffers_1.return)) _a.call(buffers_1);
                } finally {
                  if (e_1) throw e_1.error;
                }
              }
              if (toEmit) {
                try {
                  for (var toEmit_1 = __values(toEmit), toEmit_1_1 = toEmit_1.next(); !toEmit_1_1.done; toEmit_1_1 = toEmit_1.next()) {
                    var buffer2 = toEmit_1_1.value;
                    arrRemove(buffers, buffer2);
                    subscriber.next(buffer2);
                  }
                } catch (e_2_1) {
                  e_2 = { error: e_2_1 };
                } finally {
                  try {
                    if (toEmit_1_1 && !toEmit_1_1.done && (_b = toEmit_1.return)) _b.call(toEmit_1);
                  } finally {
                    if (e_2) throw e_2.error;
                  }
                }
              }
            }, function() {
              var e_3, _a;
              try {
                for (var buffers_2 = __values(buffers), buffers_2_1 = buffers_2.next(); !buffers_2_1.done; buffers_2_1 = buffers_2.next()) {
                  var buffer2 = buffers_2_1.value;
                  subscriber.next(buffer2);
                }
              } catch (e_3_1) {
                e_3 = { error: e_3_1 };
              } finally {
                try {
                  if (buffers_2_1 && !buffers_2_1.done && (_a = buffers_2.return)) _a.call(buffers_2);
                } finally {
                  if (e_3) throw e_3.error;
                }
              }
              subscriber.complete();
            }, void 0, function() {
              buffers = null;
            }));
          });
        }
        function bufferTime(bufferTimeSpan) {
          var _a, _b;
          var otherArgs = [];
          for (var _i = 1; _i < arguments.length; _i++) {
            otherArgs[_i - 1] = arguments[_i];
          }
          var scheduler = (_a = popScheduler(otherArgs)) !== null && _a !== void 0 ? _a : asyncScheduler;
          var bufferCreationInterval = (_b = otherArgs[0]) !== null && _b !== void 0 ? _b : null;
          var maxBufferSize = otherArgs[1] || Infinity;
          return operate(function(source, subscriber) {
            var bufferRecords = [];
            var restartOnEmit = false;
            var emit = function(record) {
              var buffer2 = record.buffer, subs = record.subs;
              subs.unsubscribe();
              arrRemove(bufferRecords, record);
              subscriber.next(buffer2);
              restartOnEmit && startBuffer();
            };
            var startBuffer = function() {
              if (bufferRecords) {
                var subs = new Subscription();
                subscriber.add(subs);
                var buffer2 = [];
                var record_1 = {
                  buffer: buffer2,
                  subs
                };
                bufferRecords.push(record_1);
                executeSchedule(subs, scheduler, function() {
                  return emit(record_1);
                }, bufferTimeSpan);
              }
            };
            if (bufferCreationInterval !== null && bufferCreationInterval >= 0) {
              executeSchedule(subscriber, scheduler, startBuffer, bufferCreationInterval, true);
            } else {
              restartOnEmit = true;
            }
            startBuffer();
            var bufferTimeSubscriber = createOperatorSubscriber(subscriber, function(value) {
              var e_1, _a2;
              var recordsCopy = bufferRecords.slice();
              try {
                for (var recordsCopy_1 = __values(recordsCopy), recordsCopy_1_1 = recordsCopy_1.next(); !recordsCopy_1_1.done; recordsCopy_1_1 = recordsCopy_1.next()) {
                  var record = recordsCopy_1_1.value;
                  var buffer2 = record.buffer;
                  buffer2.push(value);
                  maxBufferSize <= buffer2.length && emit(record);
                }
              } catch (e_1_1) {
                e_1 = { error: e_1_1 };
              } finally {
                try {
                  if (recordsCopy_1_1 && !recordsCopy_1_1.done && (_a2 = recordsCopy_1.return)) _a2.call(recordsCopy_1);
                } finally {
                  if (e_1) throw e_1.error;
                }
              }
            }, function() {
              while (bufferRecords === null || bufferRecords === void 0 ? void 0 : bufferRecords.length) {
                subscriber.next(bufferRecords.shift().buffer);
              }
              bufferTimeSubscriber === null || bufferTimeSubscriber === void 0 ? void 0 : bufferTimeSubscriber.unsubscribe();
              subscriber.complete();
              subscriber.unsubscribe();
            }, void 0, function() {
              return bufferRecords = null;
            });
            source.subscribe(bufferTimeSubscriber);
          });
        }
        function bufferToggle(openings, closingSelector) {
          return operate(function(source, subscriber) {
            var buffers = [];
            innerFrom(openings).subscribe(createOperatorSubscriber(subscriber, function(openValue) {
              var buffer2 = [];
              buffers.push(buffer2);
              var closingSubscription = new Subscription();
              var emitBuffer = function() {
                arrRemove(buffers, buffer2);
                subscriber.next(buffer2);
                closingSubscription.unsubscribe();
              };
              closingSubscription.add(innerFrom(closingSelector(openValue)).subscribe(createOperatorSubscriber(subscriber, emitBuffer, noop)));
            }, noop));
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              var e_1, _a;
              try {
                for (var buffers_1 = __values(buffers), buffers_1_1 = buffers_1.next(); !buffers_1_1.done; buffers_1_1 = buffers_1.next()) {
                  var buffer2 = buffers_1_1.value;
                  buffer2.push(value);
                }
              } catch (e_1_1) {
                e_1 = { error: e_1_1 };
              } finally {
                try {
                  if (buffers_1_1 && !buffers_1_1.done && (_a = buffers_1.return)) _a.call(buffers_1);
                } finally {
                  if (e_1) throw e_1.error;
                }
              }
            }, function() {
              while (buffers.length > 0) {
                subscriber.next(buffers.shift());
              }
              subscriber.complete();
            }));
          });
        }
        function bufferWhen(closingSelector) {
          return operate(function(source, subscriber) {
            var buffer2 = null;
            var closingSubscriber = null;
            var openBuffer = function() {
              closingSubscriber === null || closingSubscriber === void 0 ? void 0 : closingSubscriber.unsubscribe();
              var b = buffer2;
              buffer2 = [];
              b && subscriber.next(b);
              innerFrom(closingSelector()).subscribe(closingSubscriber = createOperatorSubscriber(subscriber, openBuffer, noop));
            };
            openBuffer();
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              return buffer2 === null || buffer2 === void 0 ? void 0 : buffer2.push(value);
            }, function() {
              buffer2 && subscriber.next(buffer2);
              subscriber.complete();
            }, void 0, function() {
              return buffer2 = closingSubscriber = null;
            }));
          });
        }
        function catchError(selector) {
          return operate(function(source, subscriber) {
            var innerSub = null;
            var syncUnsub = false;
            var handledResult;
            innerSub = source.subscribe(createOperatorSubscriber(subscriber, void 0, void 0, function(err) {
              handledResult = innerFrom(selector(err, catchError(selector)(source)));
              if (innerSub) {
                innerSub.unsubscribe();
                innerSub = null;
                handledResult.subscribe(subscriber);
              } else {
                syncUnsub = true;
              }
            }));
            if (syncUnsub) {
              innerSub.unsubscribe();
              innerSub = null;
              handledResult.subscribe(subscriber);
            }
          });
        }
        function scanInternals(accumulator, seed, hasSeed, emitOnNext, emitBeforeComplete) {
          return function(source, subscriber) {
            var hasState = hasSeed;
            var state = seed;
            var index = 0;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              var i = index++;
              state = hasState ? accumulator(state, value, i) : (hasState = true, value);
              emitOnNext && subscriber.next(state);
            }, emitBeforeComplete && (function() {
              hasState && subscriber.next(state);
              subscriber.complete();
            })));
          };
        }
        function reduce(accumulator, seed) {
          return operate(scanInternals(accumulator, seed, arguments.length >= 2, false, true));
        }
        var arrReducer = function(arr, value) {
          return arr.push(value), arr;
        };
        function toArray() {
          return operate(function(source, subscriber) {
            reduce(arrReducer, [])(source).subscribe(subscriber);
          });
        }
        function joinAllInternals(joinFn, project) {
          return pipe(toArray(), mergeMap(function(sources) {
            return joinFn(sources);
          }), project ? mapOneOrManyArgs(project) : identity);
        }
        function combineLatestAll(project) {
          return joinAllInternals(combineLatest, project);
        }
        var combineAll = combineLatestAll;
        function combineLatest$1() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          var resultSelector = popResultSelector(args);
          return resultSelector ? pipe(combineLatest$1.apply(void 0, __spreadArray([], __read(args))), mapOneOrManyArgs(resultSelector)) : operate(function(source, subscriber) {
            combineLatestInit(__spreadArray([source], __read(argsOrArgArray(args))))(subscriber);
          });
        }
        function combineLatestWith() {
          var otherSources = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            otherSources[_i] = arguments[_i];
          }
          return combineLatest$1.apply(void 0, __spreadArray([], __read(otherSources)));
        }
        function concatMap(project, resultSelector) {
          return isFunction(resultSelector) ? mergeMap(project, resultSelector, 1) : mergeMap(project, 1);
        }
        function concatMapTo(innerObservable, resultSelector) {
          return isFunction(resultSelector) ? concatMap(function() {
            return innerObservable;
          }, resultSelector) : concatMap(function() {
            return innerObservable;
          });
        }
        function concat$1() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          var scheduler = popScheduler(args);
          return operate(function(source, subscriber) {
            concatAll()(from(__spreadArray([source], __read(args)), scheduler)).subscribe(subscriber);
          });
        }
        function concatWith() {
          var otherSources = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            otherSources[_i] = arguments[_i];
          }
          return concat$1.apply(void 0, __spreadArray([], __read(otherSources)));
        }
        function fromSubscribable(subscribable) {
          return new Observable(function(subscriber) {
            return subscribable.subscribe(subscriber);
          });
        }
        var DEFAULT_CONFIG$1 = {
          connector: function() {
            return new Subject();
          }
        };
        function connect(selector, config2) {
          if (config2 === void 0) {
            config2 = DEFAULT_CONFIG$1;
          }
          var connector = config2.connector;
          return operate(function(source, subscriber) {
            var subject = connector();
            innerFrom(selector(fromSubscribable(subject))).subscribe(subscriber);
            subscriber.add(source.subscribe(subject));
          });
        }
        function count(predicate) {
          return reduce(function(total, value, i) {
            return !predicate || predicate(value, i) ? total + 1 : total;
          }, 0);
        }
        function debounce(durationSelector) {
          return operate(function(source, subscriber) {
            var hasValue = false;
            var lastValue = null;
            var durationSubscriber = null;
            var emit = function() {
              durationSubscriber === null || durationSubscriber === void 0 ? void 0 : durationSubscriber.unsubscribe();
              durationSubscriber = null;
              if (hasValue) {
                hasValue = false;
                var value = lastValue;
                lastValue = null;
                subscriber.next(value);
              }
            };
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              durationSubscriber === null || durationSubscriber === void 0 ? void 0 : durationSubscriber.unsubscribe();
              hasValue = true;
              lastValue = value;
              durationSubscriber = createOperatorSubscriber(subscriber, emit, noop);
              innerFrom(durationSelector(value)).subscribe(durationSubscriber);
            }, function() {
              emit();
              subscriber.complete();
            }, void 0, function() {
              lastValue = durationSubscriber = null;
            }));
          });
        }
        function debounceTime(dueTime, scheduler) {
          if (scheduler === void 0) {
            scheduler = asyncScheduler;
          }
          return operate(function(source, subscriber) {
            var activeTask = null;
            var lastValue = null;
            var lastTime = null;
            var emit = function() {
              if (activeTask) {
                activeTask.unsubscribe();
                activeTask = null;
                var value = lastValue;
                lastValue = null;
                subscriber.next(value);
              }
            };
            function emitWhenIdle() {
              var targetTime = lastTime + dueTime;
              var now = scheduler.now();
              if (now < targetTime) {
                activeTask = this.schedule(void 0, targetTime - now);
                subscriber.add(activeTask);
                return;
              }
              emit();
            }
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              lastValue = value;
              lastTime = scheduler.now();
              if (!activeTask) {
                activeTask = scheduler.schedule(emitWhenIdle, dueTime);
                subscriber.add(activeTask);
              }
            }, function() {
              emit();
              subscriber.complete();
            }, void 0, function() {
              lastValue = activeTask = null;
            }));
          });
        }
        function defaultIfEmpty(defaultValue) {
          return operate(function(source, subscriber) {
            var hasValue = false;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              hasValue = true;
              subscriber.next(value);
            }, function() {
              if (!hasValue) {
                subscriber.next(defaultValue);
              }
              subscriber.complete();
            }));
          });
        }
        function take(count2) {
          return count2 <= 0 ? function() {
            return EMPTY;
          } : operate(function(source, subscriber) {
            var seen = 0;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              if (++seen <= count2) {
                subscriber.next(value);
                if (count2 <= seen) {
                  subscriber.complete();
                }
              }
            }));
          });
        }
        function ignoreElements() {
          return operate(function(source, subscriber) {
            source.subscribe(createOperatorSubscriber(subscriber, noop));
          });
        }
        function mapTo(value) {
          return map(function() {
            return value;
          });
        }
        function delayWhen(delayDurationSelector, subscriptionDelay) {
          if (subscriptionDelay) {
            return function(source) {
              return concat(subscriptionDelay.pipe(take(1), ignoreElements()), source.pipe(delayWhen(delayDurationSelector)));
            };
          }
          return mergeMap(function(value, index) {
            return innerFrom(delayDurationSelector(value, index)).pipe(take(1), mapTo(value));
          });
        }
        function delay(due, scheduler) {
          if (scheduler === void 0) {
            scheduler = asyncScheduler;
          }
          var duration = timer(due, scheduler);
          return delayWhen(function() {
            return duration;
          });
        }
        function dematerialize() {
          return operate(function(source, subscriber) {
            source.subscribe(createOperatorSubscriber(subscriber, function(notification) {
              return observeNotification(notification, subscriber);
            }));
          });
        }
        function distinct(keySelector, flushes) {
          return operate(function(source, subscriber) {
            var distinctKeys = /* @__PURE__ */ new Set();
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              var key = keySelector ? keySelector(value) : value;
              if (!distinctKeys.has(key)) {
                distinctKeys.add(key);
                subscriber.next(value);
              }
            }));
            flushes && innerFrom(flushes).subscribe(createOperatorSubscriber(subscriber, function() {
              return distinctKeys.clear();
            }, noop));
          });
        }
        function distinctUntilChanged(comparator, keySelector) {
          if (keySelector === void 0) {
            keySelector = identity;
          }
          comparator = comparator !== null && comparator !== void 0 ? comparator : defaultCompare;
          return operate(function(source, subscriber) {
            var previousKey;
            var first2 = true;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              var currentKey = keySelector(value);
              if (first2 || !comparator(previousKey, currentKey)) {
                first2 = false;
                previousKey = currentKey;
                subscriber.next(value);
              }
            }));
          });
        }
        function defaultCompare(a, b) {
          return a === b;
        }
        function distinctUntilKeyChanged(key, compare) {
          return distinctUntilChanged(function(x, y) {
            return compare ? compare(x[key], y[key]) : x[key] === y[key];
          });
        }
        function throwIfEmpty(errorFactory) {
          if (errorFactory === void 0) {
            errorFactory = defaultErrorFactory;
          }
          return operate(function(source, subscriber) {
            var hasValue = false;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              hasValue = true;
              subscriber.next(value);
            }, function() {
              return hasValue ? subscriber.complete() : subscriber.error(errorFactory());
            }));
          });
        }
        function defaultErrorFactory() {
          return new EmptyError();
        }
        function elementAt(index, defaultValue) {
          if (index < 0) {
            throw new ArgumentOutOfRangeError();
          }
          var hasDefaultValue = arguments.length >= 2;
          return function(source) {
            return source.pipe(filter(function(v, i) {
              return i === index;
            }), take(1), hasDefaultValue ? defaultIfEmpty(defaultValue) : throwIfEmpty(function() {
              return new ArgumentOutOfRangeError();
            }));
          };
        }
        function endWith() {
          var values = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
          }
          return function(source) {
            return concat(source, of.apply(void 0, __spreadArray([], __read(values))));
          };
        }
        function every(predicate, thisArg) {
          return operate(function(source, subscriber) {
            var index = 0;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              if (!predicate.call(thisArg, value, index++, source)) {
                subscriber.next(false);
                subscriber.complete();
              }
            }, function() {
              subscriber.next(true);
              subscriber.complete();
            }));
          });
        }
        function exhaustMap(project, resultSelector) {
          if (resultSelector) {
            return function(source) {
              return source.pipe(exhaustMap(function(a, i) {
                return innerFrom(project(a, i)).pipe(map(function(b, ii) {
                  return resultSelector(a, b, i, ii);
                }));
              }));
            };
          }
          return operate(function(source, subscriber) {
            var index = 0;
            var innerSub = null;
            var isComplete = false;
            source.subscribe(createOperatorSubscriber(subscriber, function(outerValue) {
              if (!innerSub) {
                innerSub = createOperatorSubscriber(subscriber, void 0, function() {
                  innerSub = null;
                  isComplete && subscriber.complete();
                });
                innerFrom(project(outerValue, index++)).subscribe(innerSub);
              }
            }, function() {
              isComplete = true;
              !innerSub && subscriber.complete();
            }));
          });
        }
        function exhaustAll() {
          return exhaustMap(identity);
        }
        var exhaust = exhaustAll;
        function expand(project, concurrent, scheduler) {
          if (concurrent === void 0) {
            concurrent = Infinity;
          }
          concurrent = (concurrent || 0) < 1 ? Infinity : concurrent;
          return operate(function(source, subscriber) {
            return mergeInternals(source, subscriber, project, concurrent, void 0, true, scheduler);
          });
        }
        function finalize(callback) {
          return operate(function(source, subscriber) {
            try {
              source.subscribe(subscriber);
            } finally {
              subscriber.add(callback);
            }
          });
        }
        function find(predicate, thisArg) {
          return operate(createFind(predicate, thisArg, "value"));
        }
        function createFind(predicate, thisArg, emit) {
          var findIndex2 = emit === "index";
          return function(source, subscriber) {
            var index = 0;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              var i = index++;
              if (predicate.call(thisArg, value, i, source)) {
                subscriber.next(findIndex2 ? i : value);
                subscriber.complete();
              }
            }, function() {
              subscriber.next(findIndex2 ? -1 : void 0);
              subscriber.complete();
            }));
          };
        }
        function findIndex(predicate, thisArg) {
          return operate(createFind(predicate, thisArg, "index"));
        }
        function first(predicate, defaultValue) {
          var hasDefaultValue = arguments.length >= 2;
          return function(source) {
            return source.pipe(predicate ? filter(function(v, i) {
              return predicate(v, i, source);
            }) : identity, take(1), hasDefaultValue ? defaultIfEmpty(defaultValue) : throwIfEmpty(function() {
              return new EmptyError();
            }));
          };
        }
        function groupBy(keySelector, elementOrOptions, duration, connector) {
          return operate(function(source, subscriber) {
            var element;
            if (!elementOrOptions || typeof elementOrOptions === "function") {
              element = elementOrOptions;
            } else {
              duration = elementOrOptions.duration, element = elementOrOptions.element, connector = elementOrOptions.connector;
            }
            var groups = /* @__PURE__ */ new Map();
            var notify = function(cb) {
              groups.forEach(cb);
              cb(subscriber);
            };
            var handleError = function(err) {
              return notify(function(consumer) {
                return consumer.error(err);
              });
            };
            var activeGroups = 0;
            var teardownAttempted = false;
            var groupBySourceSubscriber = new OperatorSubscriber(subscriber, function(value) {
              try {
                var key_1 = keySelector(value);
                var group_1 = groups.get(key_1);
                if (!group_1) {
                  groups.set(key_1, group_1 = connector ? connector() : new Subject());
                  var grouped = createGroupedObservable(key_1, group_1);
                  subscriber.next(grouped);
                  if (duration) {
                    var durationSubscriber_1 = createOperatorSubscriber(group_1, function() {
                      group_1.complete();
                      durationSubscriber_1 === null || durationSubscriber_1 === void 0 ? void 0 : durationSubscriber_1.unsubscribe();
                    }, void 0, void 0, function() {
                      return groups.delete(key_1);
                    });
                    groupBySourceSubscriber.add(innerFrom(duration(grouped)).subscribe(durationSubscriber_1));
                  }
                }
                group_1.next(element ? element(value) : value);
              } catch (err) {
                handleError(err);
              }
            }, function() {
              return notify(function(consumer) {
                return consumer.complete();
              });
            }, handleError, function() {
              return groups.clear();
            }, function() {
              teardownAttempted = true;
              return activeGroups === 0;
            });
            source.subscribe(groupBySourceSubscriber);
            function createGroupedObservable(key, groupSubject) {
              var result = new Observable(function(groupSubscriber) {
                activeGroups++;
                var innerSub = groupSubject.subscribe(groupSubscriber);
                return function() {
                  innerSub.unsubscribe();
                  --activeGroups === 0 && teardownAttempted && groupBySourceSubscriber.unsubscribe();
                };
              });
              result.key = key;
              return result;
            }
          });
        }
        function isEmpty() {
          return operate(function(source, subscriber) {
            source.subscribe(createOperatorSubscriber(subscriber, function() {
              subscriber.next(false);
              subscriber.complete();
            }, function() {
              subscriber.next(true);
              subscriber.complete();
            }));
          });
        }
        function takeLast(count2) {
          return count2 <= 0 ? function() {
            return EMPTY;
          } : operate(function(source, subscriber) {
            var buffer2 = [];
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              buffer2.push(value);
              count2 < buffer2.length && buffer2.shift();
            }, function() {
              var e_1, _a;
              try {
                for (var buffer_1 = __values(buffer2), buffer_1_1 = buffer_1.next(); !buffer_1_1.done; buffer_1_1 = buffer_1.next()) {
                  var value = buffer_1_1.value;
                  subscriber.next(value);
                }
              } catch (e_1_1) {
                e_1 = { error: e_1_1 };
              } finally {
                try {
                  if (buffer_1_1 && !buffer_1_1.done && (_a = buffer_1.return)) _a.call(buffer_1);
                } finally {
                  if (e_1) throw e_1.error;
                }
              }
              subscriber.complete();
            }, void 0, function() {
              buffer2 = null;
            }));
          });
        }
        function last$1(predicate, defaultValue) {
          var hasDefaultValue = arguments.length >= 2;
          return function(source) {
            return source.pipe(predicate ? filter(function(v, i) {
              return predicate(v, i, source);
            }) : identity, takeLast(1), hasDefaultValue ? defaultIfEmpty(defaultValue) : throwIfEmpty(function() {
              return new EmptyError();
            }));
          };
        }
        function materialize() {
          return operate(function(source, subscriber) {
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              subscriber.next(Notification.createNext(value));
            }, function() {
              subscriber.next(Notification.createComplete());
              subscriber.complete();
            }, function(err) {
              subscriber.next(Notification.createError(err));
              subscriber.complete();
            }));
          });
        }
        function max(comparer) {
          return reduce(isFunction(comparer) ? function(x, y) {
            return comparer(x, y) > 0 ? x : y;
          } : function(x, y) {
            return x > y ? x : y;
          });
        }
        var flatMap = mergeMap;
        function mergeMapTo(innerObservable, resultSelector, concurrent) {
          if (concurrent === void 0) {
            concurrent = Infinity;
          }
          if (isFunction(resultSelector)) {
            return mergeMap(function() {
              return innerObservable;
            }, resultSelector, concurrent);
          }
          if (typeof resultSelector === "number") {
            concurrent = resultSelector;
          }
          return mergeMap(function() {
            return innerObservable;
          }, concurrent);
        }
        function mergeScan(accumulator, seed, concurrent) {
          if (concurrent === void 0) {
            concurrent = Infinity;
          }
          return operate(function(source, subscriber) {
            var state = seed;
            return mergeInternals(source, subscriber, function(value, index) {
              return accumulator(state, value, index);
            }, concurrent, function(value) {
              state = value;
            }, false, void 0, function() {
              return state = null;
            });
          });
        }
        function merge$1() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          var scheduler = popScheduler(args);
          var concurrent = popNumber(args, Infinity);
          args = argsOrArgArray(args);
          return operate(function(source, subscriber) {
            mergeAll(concurrent)(from(__spreadArray([source], __read(args)), scheduler)).subscribe(subscriber);
          });
        }
        function mergeWith() {
          var otherSources = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            otherSources[_i] = arguments[_i];
          }
          return merge$1.apply(void 0, __spreadArray([], __read(otherSources)));
        }
        function min(comparer) {
          return reduce(isFunction(comparer) ? function(x, y) {
            return comparer(x, y) < 0 ? x : y;
          } : function(x, y) {
            return x < y ? x : y;
          });
        }
        function multicast(subjectOrSubjectFactory, selector) {
          var subjectFactory = isFunction(subjectOrSubjectFactory) ? subjectOrSubjectFactory : function() {
            return subjectOrSubjectFactory;
          };
          if (isFunction(selector)) {
            return connect(selector, {
              connector: subjectFactory
            });
          }
          return function(source) {
            return new ConnectableObservable(source, subjectFactory);
          };
        }
        function onErrorResumeNextWith() {
          var sources = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            sources[_i] = arguments[_i];
          }
          var nextSources = argsOrArgArray(sources);
          return function(source) {
            return onErrorResumeNext.apply(void 0, __spreadArray([source], __read(nextSources)));
          };
        }
        var onErrorResumeNext$1 = onErrorResumeNextWith;
        function pairwise() {
          return operate(function(source, subscriber) {
            var prev;
            var hasPrev = false;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              var p = prev;
              prev = value;
              hasPrev && subscriber.next([p, value]);
              hasPrev = true;
            }));
          });
        }
        function pluck() {
          var properties = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            properties[_i] = arguments[_i];
          }
          var length = properties.length;
          if (length === 0) {
            throw new Error("list of properties cannot be empty.");
          }
          return map(function(x) {
            var currentProp = x;
            for (var i = 0; i < length; i++) {
              var p = currentProp === null || currentProp === void 0 ? void 0 : currentProp[properties[i]];
              if (typeof p !== "undefined") {
                currentProp = p;
              } else {
                return void 0;
              }
            }
            return currentProp;
          });
        }
        function publish(selector) {
          return selector ? function(source) {
            return connect(selector)(source);
          } : function(source) {
            return multicast(new Subject())(source);
          };
        }
        function publishBehavior(initialValue) {
          return function(source) {
            var subject = new BehaviorSubject(initialValue);
            return new ConnectableObservable(source, function() {
              return subject;
            });
          };
        }
        function publishLast() {
          return function(source) {
            var subject = new AsyncSubject();
            return new ConnectableObservable(source, function() {
              return subject;
            });
          };
        }
        function publishReplay(bufferSize, windowTime2, selectorOrScheduler, timestampProvider) {
          if (selectorOrScheduler && !isFunction(selectorOrScheduler)) {
            timestampProvider = selectorOrScheduler;
          }
          var selector = isFunction(selectorOrScheduler) ? selectorOrScheduler : void 0;
          return function(source) {
            return multicast(new ReplaySubject(bufferSize, windowTime2, timestampProvider), selector)(source);
          };
        }
        function raceWith() {
          var otherSources = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            otherSources[_i] = arguments[_i];
          }
          return !otherSources.length ? identity : operate(function(source, subscriber) {
            raceInit(__spreadArray([source], __read(otherSources)))(subscriber);
          });
        }
        function repeat(countOrConfig) {
          var _a;
          var count2 = Infinity;
          var delay2;
          if (countOrConfig != null) {
            if (typeof countOrConfig === "object") {
              _a = countOrConfig.count, count2 = _a === void 0 ? Infinity : _a, delay2 = countOrConfig.delay;
            } else {
              count2 = countOrConfig;
            }
          }
          return count2 <= 0 ? function() {
            return EMPTY;
          } : operate(function(source, subscriber) {
            var soFar = 0;
            var sourceSub;
            var resubscribe = function() {
              sourceSub === null || sourceSub === void 0 ? void 0 : sourceSub.unsubscribe();
              sourceSub = null;
              if (delay2 != null) {
                var notifier = typeof delay2 === "number" ? timer(delay2) : innerFrom(delay2(soFar));
                var notifierSubscriber_1 = createOperatorSubscriber(subscriber, function() {
                  notifierSubscriber_1.unsubscribe();
                  subscribeToSource();
                });
                notifier.subscribe(notifierSubscriber_1);
              } else {
                subscribeToSource();
              }
            };
            var subscribeToSource = function() {
              var syncUnsub = false;
              sourceSub = source.subscribe(createOperatorSubscriber(subscriber, void 0, function() {
                if (++soFar < count2) {
                  if (sourceSub) {
                    resubscribe();
                  } else {
                    syncUnsub = true;
                  }
                } else {
                  subscriber.complete();
                }
              }));
              if (syncUnsub) {
                resubscribe();
              }
            };
            subscribeToSource();
          });
        }
        function repeatWhen(notifier) {
          return operate(function(source, subscriber) {
            var innerSub;
            var syncResub = false;
            var completions$;
            var isNotifierComplete = false;
            var isMainComplete = false;
            var checkComplete = function() {
              return isMainComplete && isNotifierComplete && (subscriber.complete(), true);
            };
            var getCompletionSubject = function() {
              if (!completions$) {
                completions$ = new Subject();
                innerFrom(notifier(completions$)).subscribe(createOperatorSubscriber(subscriber, function() {
                  if (innerSub) {
                    subscribeForRepeatWhen();
                  } else {
                    syncResub = true;
                  }
                }, function() {
                  isNotifierComplete = true;
                  checkComplete();
                }));
              }
              return completions$;
            };
            var subscribeForRepeatWhen = function() {
              isMainComplete = false;
              innerSub = source.subscribe(createOperatorSubscriber(subscriber, void 0, function() {
                isMainComplete = true;
                !checkComplete() && getCompletionSubject().next();
              }));
              if (syncResub) {
                innerSub.unsubscribe();
                innerSub = null;
                syncResub = false;
                subscribeForRepeatWhen();
              }
            };
            subscribeForRepeatWhen();
          });
        }
        function retry(configOrCount) {
          if (configOrCount === void 0) {
            configOrCount = Infinity;
          }
          var config2;
          if (configOrCount && typeof configOrCount === "object") {
            config2 = configOrCount;
          } else {
            config2 = {
              count: configOrCount
            };
          }
          var _a = config2.count, count2 = _a === void 0 ? Infinity : _a, delay2 = config2.delay, _b = config2.resetOnSuccess, resetOnSuccess = _b === void 0 ? false : _b;
          return count2 <= 0 ? identity : operate(function(source, subscriber) {
            var soFar = 0;
            var innerSub;
            var subscribeForRetry = function() {
              var syncUnsub = false;
              innerSub = source.subscribe(createOperatorSubscriber(subscriber, function(value) {
                if (resetOnSuccess) {
                  soFar = 0;
                }
                subscriber.next(value);
              }, void 0, function(err) {
                if (soFar++ < count2) {
                  var resub_1 = function() {
                    if (innerSub) {
                      innerSub.unsubscribe();
                      innerSub = null;
                      subscribeForRetry();
                    } else {
                      syncUnsub = true;
                    }
                  };
                  if (delay2 != null) {
                    var notifier = typeof delay2 === "number" ? timer(delay2) : innerFrom(delay2(err, soFar));
                    var notifierSubscriber_1 = createOperatorSubscriber(subscriber, function() {
                      notifierSubscriber_1.unsubscribe();
                      resub_1();
                    }, function() {
                      subscriber.complete();
                    });
                    notifier.subscribe(notifierSubscriber_1);
                  } else {
                    resub_1();
                  }
                } else {
                  subscriber.error(err);
                }
              }));
              if (syncUnsub) {
                innerSub.unsubscribe();
                innerSub = null;
                subscribeForRetry();
              }
            };
            subscribeForRetry();
          });
        }
        function retryWhen(notifier) {
          return operate(function(source, subscriber) {
            var innerSub;
            var syncResub = false;
            var errors$;
            var subscribeForRetryWhen = function() {
              innerSub = source.subscribe(createOperatorSubscriber(subscriber, void 0, void 0, function(err) {
                if (!errors$) {
                  errors$ = new Subject();
                  innerFrom(notifier(errors$)).subscribe(createOperatorSubscriber(subscriber, function() {
                    return innerSub ? subscribeForRetryWhen() : syncResub = true;
                  }));
                }
                if (errors$) {
                  errors$.next(err);
                }
              }));
              if (syncResub) {
                innerSub.unsubscribe();
                innerSub = null;
                syncResub = false;
                subscribeForRetryWhen();
              }
            };
            subscribeForRetryWhen();
          });
        }
        function sample(notifier) {
          return operate(function(source, subscriber) {
            var hasValue = false;
            var lastValue = null;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              hasValue = true;
              lastValue = value;
            }));
            innerFrom(notifier).subscribe(createOperatorSubscriber(subscriber, function() {
              if (hasValue) {
                hasValue = false;
                var value = lastValue;
                lastValue = null;
                subscriber.next(value);
              }
            }, noop));
          });
        }
        function sampleTime(period, scheduler) {
          if (scheduler === void 0) {
            scheduler = asyncScheduler;
          }
          return sample(interval(period, scheduler));
        }
        function scan(accumulator, seed) {
          return operate(scanInternals(accumulator, seed, arguments.length >= 2, true));
        }
        function sequenceEqual(compareTo, comparator) {
          if (comparator === void 0) {
            comparator = function(a, b) {
              return a === b;
            };
          }
          return operate(function(source, subscriber) {
            var aState = createState();
            var bState = createState();
            var emit = function(isEqual) {
              subscriber.next(isEqual);
              subscriber.complete();
            };
            var createSubscriber = function(selfState, otherState) {
              var sequenceEqualSubscriber = createOperatorSubscriber(subscriber, function(a) {
                var buffer2 = otherState.buffer, complete = otherState.complete;
                if (buffer2.length === 0) {
                  complete ? emit(false) : selfState.buffer.push(a);
                } else {
                  !comparator(a, buffer2.shift()) && emit(false);
                }
              }, function() {
                selfState.complete = true;
                var complete = otherState.complete, buffer2 = otherState.buffer;
                complete && emit(buffer2.length === 0);
                sequenceEqualSubscriber === null || sequenceEqualSubscriber === void 0 ? void 0 : sequenceEqualSubscriber.unsubscribe();
              });
              return sequenceEqualSubscriber;
            };
            source.subscribe(createSubscriber(aState, bState));
            innerFrom(compareTo).subscribe(createSubscriber(bState, aState));
          });
        }
        function createState() {
          return {
            buffer: [],
            complete: false
          };
        }
        function share(options) {
          if (options === void 0) {
            options = {};
          }
          var _a = options.connector, connector = _a === void 0 ? function() {
            return new Subject();
          } : _a, _b = options.resetOnError, resetOnError = _b === void 0 ? true : _b, _c = options.resetOnComplete, resetOnComplete = _c === void 0 ? true : _c, _d = options.resetOnRefCountZero, resetOnRefCountZero = _d === void 0 ? true : _d;
          return function(wrapperSource) {
            var connection;
            var resetConnection;
            var subject;
            var refCount2 = 0;
            var hasCompleted = false;
            var hasErrored = false;
            var cancelReset = function() {
              resetConnection === null || resetConnection === void 0 ? void 0 : resetConnection.unsubscribe();
              resetConnection = void 0;
            };
            var reset = function() {
              cancelReset();
              connection = subject = void 0;
              hasCompleted = hasErrored = false;
            };
            var resetAndUnsubscribe = function() {
              var conn = connection;
              reset();
              conn === null || conn === void 0 ? void 0 : conn.unsubscribe();
            };
            return operate(function(source, subscriber) {
              refCount2++;
              if (!hasErrored && !hasCompleted) {
                cancelReset();
              }
              var dest = subject = subject !== null && subject !== void 0 ? subject : connector();
              subscriber.add(function() {
                refCount2--;
                if (refCount2 === 0 && !hasErrored && !hasCompleted) {
                  resetConnection = handleReset(resetAndUnsubscribe, resetOnRefCountZero);
                }
              });
              dest.subscribe(subscriber);
              if (!connection && refCount2 > 0) {
                connection = new SafeSubscriber({
                  next: function(value) {
                    return dest.next(value);
                  },
                  error: function(err) {
                    hasErrored = true;
                    cancelReset();
                    resetConnection = handleReset(reset, resetOnError, err);
                    dest.error(err);
                  },
                  complete: function() {
                    hasCompleted = true;
                    cancelReset();
                    resetConnection = handleReset(reset, resetOnComplete);
                    dest.complete();
                  }
                });
                innerFrom(source).subscribe(connection);
              }
            })(wrapperSource);
          };
        }
        function handleReset(reset, on) {
          var args = [];
          for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
          }
          if (on === true) {
            reset();
            return;
          }
          if (on === false) {
            return;
          }
          var onSubscriber = new SafeSubscriber({
            next: function() {
              onSubscriber.unsubscribe();
              reset();
            }
          });
          return innerFrom(on.apply(void 0, __spreadArray([], __read(args)))).subscribe(onSubscriber);
        }
        function shareReplay(configOrBufferSize, windowTime2, scheduler) {
          var _a, _b, _c;
          var bufferSize;
          var refCount2 = false;
          if (configOrBufferSize && typeof configOrBufferSize === "object") {
            _a = configOrBufferSize.bufferSize, bufferSize = _a === void 0 ? Infinity : _a, _b = configOrBufferSize.windowTime, windowTime2 = _b === void 0 ? Infinity : _b, _c = configOrBufferSize.refCount, refCount2 = _c === void 0 ? false : _c, scheduler = configOrBufferSize.scheduler;
          } else {
            bufferSize = configOrBufferSize !== null && configOrBufferSize !== void 0 ? configOrBufferSize : Infinity;
          }
          return share({
            connector: function() {
              return new ReplaySubject(bufferSize, windowTime2, scheduler);
            },
            resetOnError: true,
            resetOnComplete: false,
            resetOnRefCountZero: refCount2
          });
        }
        function single(predicate) {
          return operate(function(source, subscriber) {
            var hasValue = false;
            var singleValue;
            var seenValue = false;
            var index = 0;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              seenValue = true;
              if (!predicate || predicate(value, index++, source)) {
                hasValue && subscriber.error(new SequenceError("Too many matching values"));
                hasValue = true;
                singleValue = value;
              }
            }, function() {
              if (hasValue) {
                subscriber.next(singleValue);
                subscriber.complete();
              } else {
                subscriber.error(seenValue ? new NotFoundError("No matching values") : new EmptyError());
              }
            }));
          });
        }
        function skip(count2) {
          return filter(function(_, index) {
            return count2 <= index;
          });
        }
        function skipLast(skipCount) {
          return skipCount <= 0 ? identity : operate(function(source, subscriber) {
            var ring = new Array(skipCount);
            var seen = 0;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              var valueIndex = seen++;
              if (valueIndex < skipCount) {
                ring[valueIndex] = value;
              } else {
                var index = valueIndex % skipCount;
                var oldValue = ring[index];
                ring[index] = value;
                subscriber.next(oldValue);
              }
            }));
            return function() {
              ring = null;
            };
          });
        }
        function skipUntil(notifier) {
          return operate(function(source, subscriber) {
            var taking = false;
            var skipSubscriber = createOperatorSubscriber(subscriber, function() {
              skipSubscriber === null || skipSubscriber === void 0 ? void 0 : skipSubscriber.unsubscribe();
              taking = true;
            }, noop);
            innerFrom(notifier).subscribe(skipSubscriber);
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              return taking && subscriber.next(value);
            }));
          });
        }
        function skipWhile(predicate) {
          return operate(function(source, subscriber) {
            var taking = false;
            var index = 0;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              return (taking || (taking = !predicate(value, index++))) && subscriber.next(value);
            }));
          });
        }
        function startWith() {
          var values = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
          }
          var scheduler = popScheduler(values);
          return operate(function(source, subscriber) {
            (scheduler ? concat(values, source, scheduler) : concat(values, source)).subscribe(subscriber);
          });
        }
        function switchMap(project, resultSelector) {
          return operate(function(source, subscriber) {
            var innerSubscriber = null;
            var index = 0;
            var isComplete = false;
            var checkComplete = function() {
              return isComplete && !innerSubscriber && subscriber.complete();
            };
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              innerSubscriber === null || innerSubscriber === void 0 ? void 0 : innerSubscriber.unsubscribe();
              var innerIndex = 0;
              var outerIndex = index++;
              innerFrom(project(value, outerIndex)).subscribe(innerSubscriber = createOperatorSubscriber(subscriber, function(innerValue) {
                return subscriber.next(resultSelector ? resultSelector(value, innerValue, outerIndex, innerIndex++) : innerValue);
              }, function() {
                innerSubscriber = null;
                checkComplete();
              }));
            }, function() {
              isComplete = true;
              checkComplete();
            }));
          });
        }
        function switchAll() {
          return switchMap(identity);
        }
        function switchMapTo(innerObservable, resultSelector) {
          return isFunction(resultSelector) ? switchMap(function() {
            return innerObservable;
          }, resultSelector) : switchMap(function() {
            return innerObservable;
          });
        }
        function switchScan(accumulator, seed) {
          return operate(function(source, subscriber) {
            var state = seed;
            switchMap(function(value, index) {
              return accumulator(state, value, index);
            }, function(_, innerValue) {
              return state = innerValue, innerValue;
            })(source).subscribe(subscriber);
            return function() {
              state = null;
            };
          });
        }
        function takeUntil(notifier) {
          return operate(function(source, subscriber) {
            innerFrom(notifier).subscribe(createOperatorSubscriber(subscriber, function() {
              return subscriber.complete();
            }, noop));
            !subscriber.closed && source.subscribe(subscriber);
          });
        }
        function takeWhile(predicate, inclusive) {
          if (inclusive === void 0) {
            inclusive = false;
          }
          return operate(function(source, subscriber) {
            var index = 0;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              var result = predicate(value, index++);
              (result || inclusive) && subscriber.next(value);
              !result && subscriber.complete();
            }));
          });
        }
        function tap(observerOrNext, error, complete) {
          var tapObserver = isFunction(observerOrNext) || error || complete ? { next: observerOrNext, error, complete } : observerOrNext;
          return tapObserver ? operate(function(source, subscriber) {
            var _a;
            (_a = tapObserver.subscribe) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
            var isUnsub = true;
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              var _a2;
              (_a2 = tapObserver.next) === null || _a2 === void 0 ? void 0 : _a2.call(tapObserver, value);
              subscriber.next(value);
            }, function() {
              var _a2;
              isUnsub = false;
              (_a2 = tapObserver.complete) === null || _a2 === void 0 ? void 0 : _a2.call(tapObserver);
              subscriber.complete();
            }, function(err) {
              var _a2;
              isUnsub = false;
              (_a2 = tapObserver.error) === null || _a2 === void 0 ? void 0 : _a2.call(tapObserver, err);
              subscriber.error(err);
            }, function() {
              var _a2, _b;
              if (isUnsub) {
                (_a2 = tapObserver.unsubscribe) === null || _a2 === void 0 ? void 0 : _a2.call(tapObserver);
              }
              (_b = tapObserver.finalize) === null || _b === void 0 ? void 0 : _b.call(tapObserver);
            }));
          }) : identity;
        }
        function throttle(durationSelector, config2) {
          return operate(function(source, subscriber) {
            var _a = config2 !== null && config2 !== void 0 ? config2 : {}, _b = _a.leading, leading = _b === void 0 ? true : _b, _c = _a.trailing, trailing = _c === void 0 ? false : _c;
            var hasValue = false;
            var sendValue = null;
            var throttled = null;
            var isComplete = false;
            var endThrottling = function() {
              throttled === null || throttled === void 0 ? void 0 : throttled.unsubscribe();
              throttled = null;
              if (trailing) {
                send();
                isComplete && subscriber.complete();
              }
            };
            var cleanupThrottling = function() {
              throttled = null;
              isComplete && subscriber.complete();
            };
            var startThrottle = function(value) {
              return throttled = innerFrom(durationSelector(value)).subscribe(createOperatorSubscriber(subscriber, endThrottling, cleanupThrottling));
            };
            var send = function() {
              if (hasValue) {
                hasValue = false;
                var value = sendValue;
                sendValue = null;
                subscriber.next(value);
                !isComplete && startThrottle(value);
              }
            };
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              hasValue = true;
              sendValue = value;
              !(throttled && !throttled.closed) && (leading ? send() : startThrottle(value));
            }, function() {
              isComplete = true;
              !(trailing && hasValue && throttled && !throttled.closed) && subscriber.complete();
            }));
          });
        }
        function throttleTime(duration, scheduler, config2) {
          if (scheduler === void 0) {
            scheduler = asyncScheduler;
          }
          var duration$ = timer(duration, scheduler);
          return throttle(function() {
            return duration$;
          }, config2);
        }
        function timeInterval(scheduler) {
          if (scheduler === void 0) {
            scheduler = asyncScheduler;
          }
          return operate(function(source, subscriber) {
            var last2 = scheduler.now();
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              var now = scheduler.now();
              var interval2 = now - last2;
              last2 = now;
              subscriber.next(new TimeInterval(value, interval2));
            }));
          });
        }
        var TimeInterval = /* @__PURE__ */ (function() {
          function TimeInterval2(value, interval2) {
            this.value = value;
            this.interval = interval2;
          }
          return TimeInterval2;
        })();
        function timeoutWith(due, withObservable, scheduler) {
          var first2;
          var each;
          var _with;
          scheduler = scheduler !== null && scheduler !== void 0 ? scheduler : async;
          if (isValidDate(due)) {
            first2 = due;
          } else if (typeof due === "number") {
            each = due;
          }
          if (withObservable) {
            _with = function() {
              return withObservable;
            };
          } else {
            throw new TypeError("No observable provided to switch to");
          }
          if (first2 == null && each == null) {
            throw new TypeError("No timeout provided.");
          }
          return timeout({
            first: first2,
            each,
            scheduler,
            with: _with
          });
        }
        function timestamp(timestampProvider) {
          if (timestampProvider === void 0) {
            timestampProvider = dateTimestampProvider;
          }
          return map(function(value) {
            return { value, timestamp: timestampProvider.now() };
          });
        }
        function window(windowBoundaries) {
          return operate(function(source, subscriber) {
            var windowSubject = new Subject();
            subscriber.next(windowSubject.asObservable());
            var errorHandler = function(err) {
              windowSubject.error(err);
              subscriber.error(err);
            };
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              return windowSubject === null || windowSubject === void 0 ? void 0 : windowSubject.next(value);
            }, function() {
              windowSubject.complete();
              subscriber.complete();
            }, errorHandler));
            innerFrom(windowBoundaries).subscribe(createOperatorSubscriber(subscriber, function() {
              windowSubject.complete();
              subscriber.next(windowSubject = new Subject());
            }, noop, errorHandler));
            return function() {
              windowSubject === null || windowSubject === void 0 ? void 0 : windowSubject.unsubscribe();
              windowSubject = null;
            };
          });
        }
        function windowCount(windowSize, startWindowEvery) {
          if (startWindowEvery === void 0) {
            startWindowEvery = 0;
          }
          var startEvery = startWindowEvery > 0 ? startWindowEvery : windowSize;
          return operate(function(source, subscriber) {
            var windows = [new Subject()];
            var count2 = 0;
            subscriber.next(windows[0].asObservable());
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              var e_1, _a;
              try {
                for (var windows_1 = __values(windows), windows_1_1 = windows_1.next(); !windows_1_1.done; windows_1_1 = windows_1.next()) {
                  var window_1 = windows_1_1.value;
                  window_1.next(value);
                }
              } catch (e_1_1) {
                e_1 = { error: e_1_1 };
              } finally {
                try {
                  if (windows_1_1 && !windows_1_1.done && (_a = windows_1.return)) _a.call(windows_1);
                } finally {
                  if (e_1) throw e_1.error;
                }
              }
              var c = count2 - windowSize + 1;
              if (c >= 0 && c % startEvery === 0) {
                windows.shift().complete();
              }
              if (++count2 % startEvery === 0) {
                var window_2 = new Subject();
                windows.push(window_2);
                subscriber.next(window_2.asObservable());
              }
            }, function() {
              while (windows.length > 0) {
                windows.shift().complete();
              }
              subscriber.complete();
            }, function(err) {
              while (windows.length > 0) {
                windows.shift().error(err);
              }
              subscriber.error(err);
            }, function() {
              windows = null;
            }));
          });
        }
        function windowTime(windowTimeSpan) {
          var _a, _b;
          var otherArgs = [];
          for (var _i = 1; _i < arguments.length; _i++) {
            otherArgs[_i - 1] = arguments[_i];
          }
          var scheduler = (_a = popScheduler(otherArgs)) !== null && _a !== void 0 ? _a : asyncScheduler;
          var windowCreationInterval = (_b = otherArgs[0]) !== null && _b !== void 0 ? _b : null;
          var maxWindowSize = otherArgs[1] || Infinity;
          return operate(function(source, subscriber) {
            var windowRecords = [];
            var restartOnClose = false;
            var closeWindow = function(record) {
              var window2 = record.window, subs = record.subs;
              window2.complete();
              subs.unsubscribe();
              arrRemove(windowRecords, record);
              restartOnClose && startWindow();
            };
            var startWindow = function() {
              if (windowRecords) {
                var subs = new Subscription();
                subscriber.add(subs);
                var window_1 = new Subject();
                var record_1 = {
                  window: window_1,
                  subs,
                  seen: 0
                };
                windowRecords.push(record_1);
                subscriber.next(window_1.asObservable());
                executeSchedule(subs, scheduler, function() {
                  return closeWindow(record_1);
                }, windowTimeSpan);
              }
            };
            if (windowCreationInterval !== null && windowCreationInterval >= 0) {
              executeSchedule(subscriber, scheduler, startWindow, windowCreationInterval, true);
            } else {
              restartOnClose = true;
            }
            startWindow();
            var loop = function(cb) {
              return windowRecords.slice().forEach(cb);
            };
            var terminate = function(cb) {
              loop(function(_a2) {
                var window2 = _a2.window;
                return cb(window2);
              });
              cb(subscriber);
              subscriber.unsubscribe();
            };
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              loop(function(record) {
                record.window.next(value);
                maxWindowSize <= ++record.seen && closeWindow(record);
              });
            }, function() {
              return terminate(function(consumer) {
                return consumer.complete();
              });
            }, function(err) {
              return terminate(function(consumer) {
                return consumer.error(err);
              });
            }));
            return function() {
              windowRecords = null;
            };
          });
        }
        function windowToggle(openings, closingSelector) {
          return operate(function(source, subscriber) {
            var windows = [];
            var handleError = function(err) {
              while (0 < windows.length) {
                windows.shift().error(err);
              }
              subscriber.error(err);
            };
            innerFrom(openings).subscribe(createOperatorSubscriber(subscriber, function(openValue) {
              var window2 = new Subject();
              windows.push(window2);
              var closingSubscription = new Subscription();
              var closeWindow = function() {
                arrRemove(windows, window2);
                window2.complete();
                closingSubscription.unsubscribe();
              };
              var closingNotifier;
              try {
                closingNotifier = innerFrom(closingSelector(openValue));
              } catch (err) {
                handleError(err);
                return;
              }
              subscriber.next(window2.asObservable());
              closingSubscription.add(closingNotifier.subscribe(createOperatorSubscriber(subscriber, closeWindow, noop, handleError)));
            }, noop));
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              var e_1, _a;
              var windowsCopy = windows.slice();
              try {
                for (var windowsCopy_1 = __values(windowsCopy), windowsCopy_1_1 = windowsCopy_1.next(); !windowsCopy_1_1.done; windowsCopy_1_1 = windowsCopy_1.next()) {
                  var window_1 = windowsCopy_1_1.value;
                  window_1.next(value);
                }
              } catch (e_1_1) {
                e_1 = { error: e_1_1 };
              } finally {
                try {
                  if (windowsCopy_1_1 && !windowsCopy_1_1.done && (_a = windowsCopy_1.return)) _a.call(windowsCopy_1);
                } finally {
                  if (e_1) throw e_1.error;
                }
              }
            }, function() {
              while (0 < windows.length) {
                windows.shift().complete();
              }
              subscriber.complete();
            }, handleError, function() {
              while (0 < windows.length) {
                windows.shift().unsubscribe();
              }
            }));
          });
        }
        function windowWhen(closingSelector) {
          return operate(function(source, subscriber) {
            var window2;
            var closingSubscriber;
            var handleError = function(err) {
              window2.error(err);
              subscriber.error(err);
            };
            var openWindow = function() {
              closingSubscriber === null || closingSubscriber === void 0 ? void 0 : closingSubscriber.unsubscribe();
              window2 === null || window2 === void 0 ? void 0 : window2.complete();
              window2 = new Subject();
              subscriber.next(window2.asObservable());
              var closingNotifier;
              try {
                closingNotifier = innerFrom(closingSelector());
              } catch (err) {
                handleError(err);
                return;
              }
              closingNotifier.subscribe(closingSubscriber = createOperatorSubscriber(subscriber, openWindow, openWindow, handleError));
            };
            openWindow();
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              return window2.next(value);
            }, function() {
              window2.complete();
              subscriber.complete();
            }, handleError, function() {
              closingSubscriber === null || closingSubscriber === void 0 ? void 0 : closingSubscriber.unsubscribe();
              window2 = null;
            }));
          });
        }
        function withLatestFrom() {
          var inputs = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            inputs[_i] = arguments[_i];
          }
          var project = popResultSelector(inputs);
          return operate(function(source, subscriber) {
            var len = inputs.length;
            var otherValues = new Array(len);
            var hasValue = inputs.map(function() {
              return false;
            });
            var ready = false;
            var _loop_1 = function(i2) {
              innerFrom(inputs[i2]).subscribe(createOperatorSubscriber(subscriber, function(value) {
                otherValues[i2] = value;
                if (!ready && !hasValue[i2]) {
                  hasValue[i2] = true;
                  (ready = hasValue.every(identity)) && (hasValue = null);
                }
              }, noop));
            };
            for (var i = 0; i < len; i++) {
              _loop_1(i);
            }
            source.subscribe(createOperatorSubscriber(subscriber, function(value) {
              if (ready) {
                var values = __spreadArray([value], __read(otherValues));
                subscriber.next(project ? project.apply(void 0, __spreadArray([], __read(values))) : values);
              }
            }));
          });
        }
        function zipAll(project) {
          return joinAllInternals(zip, project);
        }
        function zip$1() {
          var sources = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            sources[_i] = arguments[_i];
          }
          return operate(function(source, subscriber) {
            zip.apply(void 0, __spreadArray([source], __read(sources))).subscribe(subscriber);
          });
        }
        function zipWith() {
          var otherInputs = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            otherInputs[_i] = arguments[_i];
          }
          return zip$1.apply(void 0, __spreadArray([], __read(otherInputs)));
        }
        function partition$1(predicate, thisArg) {
          return function(source) {
            return [filter(predicate, thisArg)(source), filter(not(predicate, thisArg))(source)];
          };
        }
        function race$1() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
          }
          return raceWith.apply(void 0, __spreadArray([], __read(argsOrArgArray(args))));
        }
        var _operators = /* @__PURE__ */ Object.freeze({
          audit,
          auditTime,
          buffer,
          bufferCount,
          bufferTime,
          bufferToggle,
          bufferWhen,
          catchError,
          combineAll,
          combineLatestAll,
          combineLatest: combineLatest$1,
          combineLatestWith,
          concat: concat$1,
          concatAll,
          concatMap,
          concatMapTo,
          concatWith,
          connect,
          count,
          debounce,
          debounceTime,
          defaultIfEmpty,
          delay,
          delayWhen,
          dematerialize,
          distinct,
          distinctUntilChanged,
          distinctUntilKeyChanged,
          elementAt,
          endWith,
          every,
          exhaust,
          exhaustAll,
          exhaustMap,
          expand,
          filter,
          finalize,
          find,
          findIndex,
          first,
          groupBy,
          ignoreElements,
          isEmpty,
          last: last$1,
          map,
          mapTo,
          materialize,
          max,
          merge: merge$1,
          mergeAll,
          flatMap,
          mergeMap,
          mergeMapTo,
          mergeScan,
          mergeWith,
          min,
          multicast,
          observeOn,
          onErrorResumeNext: onErrorResumeNext$1,
          pairwise,
          partition: partition$1,
          pluck,
          publish,
          publishBehavior,
          publishLast,
          publishReplay,
          race: race$1,
          raceWith,
          reduce,
          repeat,
          repeatWhen,
          retry,
          retryWhen,
          refCount,
          sample,
          sampleTime,
          scan,
          sequenceEqual,
          share,
          shareReplay,
          single,
          skip,
          skipLast,
          skipUntil,
          skipWhile,
          startWith,
          subscribeOn,
          switchAll,
          switchMap,
          switchMapTo,
          switchScan,
          take,
          takeLast,
          takeUntil,
          takeWhile,
          tap,
          throttle,
          throttleTime,
          throwIfEmpty,
          timeInterval,
          timeout,
          timeoutWith,
          timestamp,
          toArray,
          window,
          windowCount,
          windowTime,
          windowToggle,
          windowWhen,
          withLatestFrom,
          zip: zip$1,
          zipAll,
          zipWith
        });
        var SubscriptionLog = /* @__PURE__ */ (function() {
          function SubscriptionLog2(subscribedFrame, unsubscribedFrame) {
            if (unsubscribedFrame === void 0) {
              unsubscribedFrame = Infinity;
            }
            this.subscribedFrame = subscribedFrame;
            this.unsubscribedFrame = unsubscribedFrame;
          }
          return SubscriptionLog2;
        })();
        var SubscriptionLoggable = (function() {
          function SubscriptionLoggable2() {
            this.subscriptions = [];
          }
          SubscriptionLoggable2.prototype.logSubscribedFrame = function() {
            this.subscriptions.push(new SubscriptionLog(this.scheduler.now()));
            return this.subscriptions.length - 1;
          };
          SubscriptionLoggable2.prototype.logUnsubscribedFrame = function(index) {
            var subscriptionLogs = this.subscriptions;
            var oldSubscriptionLog = subscriptionLogs[index];
            subscriptionLogs[index] = new SubscriptionLog(oldSubscriptionLog.subscribedFrame, this.scheduler.now());
          };
          return SubscriptionLoggable2;
        })();
        function applyMixins(derivedCtor, baseCtors) {
          for (var i = 0, len = baseCtors.length; i < len; i++) {
            var baseCtor = baseCtors[i];
            var propertyKeys = Object.getOwnPropertyNames(baseCtor.prototype);
            for (var j = 0, len2 = propertyKeys.length; j < len2; j++) {
              var name_1 = propertyKeys[j];
              derivedCtor.prototype[name_1] = baseCtor.prototype[name_1];
            }
          }
        }
        var ColdObservable = (function(_super) {
          __extends(ColdObservable2, _super);
          function ColdObservable2(messages, scheduler) {
            var _this = _super.call(this, function(subscriber) {
              var observable2 = this;
              var index = observable2.logSubscribedFrame();
              var subscription = new Subscription();
              subscription.add(new Subscription(function() {
                observable2.logUnsubscribedFrame(index);
              }));
              observable2.scheduleMessages(subscriber);
              return subscription;
            }) || this;
            _this.messages = messages;
            _this.subscriptions = [];
            _this.scheduler = scheduler;
            return _this;
          }
          ColdObservable2.prototype.scheduleMessages = function(subscriber) {
            var messagesLength = this.messages.length;
            for (var i = 0; i < messagesLength; i++) {
              var message = this.messages[i];
              subscriber.add(this.scheduler.schedule(function(state) {
                var _a = state, notification = _a.message.notification, destination = _a.subscriber;
                observeNotification(notification, destination);
              }, message.frame, { message, subscriber }));
            }
          };
          return ColdObservable2;
        })(Observable);
        applyMixins(ColdObservable, [SubscriptionLoggable]);
        var HotObservable = (function(_super) {
          __extends(HotObservable2, _super);
          function HotObservable2(messages, scheduler) {
            var _this = _super.call(this) || this;
            _this.messages = messages;
            _this.subscriptions = [];
            _this.scheduler = scheduler;
            return _this;
          }
          HotObservable2.prototype._subscribe = function(subscriber) {
            var subject = this;
            var index = subject.logSubscribedFrame();
            var subscription = new Subscription();
            subscription.add(new Subscription(function() {
              subject.logUnsubscribedFrame(index);
            }));
            subscription.add(_super.prototype._subscribe.call(this, subscriber));
            return subscription;
          };
          HotObservable2.prototype.setup = function() {
            var subject = this;
            var messagesLength = subject.messages.length;
            var _loop_1 = function(i2) {
              (function() {
                var _a = subject.messages[i2], notification = _a.notification, frame = _a.frame;
                subject.scheduler.schedule(function() {
                  observeNotification(notification, subject);
                }, frame);
              })();
            };
            for (var i = 0; i < messagesLength; i++) {
              _loop_1(i);
            }
          };
          return HotObservable2;
        })(Subject);
        applyMixins(HotObservable, [SubscriptionLoggable]);
        var defaultMaxFrame = 750;
        var TestScheduler = (function(_super) {
          __extends(TestScheduler2, _super);
          function TestScheduler2(assertDeepEqual) {
            var _this = _super.call(this, VirtualAction, defaultMaxFrame) || this;
            _this.assertDeepEqual = assertDeepEqual;
            _this.hotObservables = [];
            _this.coldObservables = [];
            _this.flushTests = [];
            _this.runMode = false;
            return _this;
          }
          TestScheduler2.prototype.createTime = function(marbles) {
            var indexOf = this.runMode ? marbles.trim().indexOf("|") : marbles.indexOf("|");
            if (indexOf === -1) {
              throw new Error('marble diagram for time should have a completion marker "|"');
            }
            return indexOf * TestScheduler2.frameTimeFactor;
          };
          TestScheduler2.prototype.createColdObservable = function(marbles, values, error) {
            if (marbles.indexOf("^") !== -1) {
              throw new Error('cold observable cannot have subscription offset "^"');
            }
            if (marbles.indexOf("!") !== -1) {
              throw new Error('cold observable cannot have unsubscription marker "!"');
            }
            var messages = TestScheduler2.parseMarbles(marbles, values, error, void 0, this.runMode);
            var cold = new ColdObservable(messages, this);
            this.coldObservables.push(cold);
            return cold;
          };
          TestScheduler2.prototype.createHotObservable = function(marbles, values, error) {
            if (marbles.indexOf("!") !== -1) {
              throw new Error('hot observable cannot have unsubscription marker "!"');
            }
            var messages = TestScheduler2.parseMarbles(marbles, values, error, void 0, this.runMode);
            var subject = new HotObservable(messages, this);
            this.hotObservables.push(subject);
            return subject;
          };
          TestScheduler2.prototype.materializeInnerObservable = function(observable2, outerFrame) {
            var _this = this;
            var messages = [];
            observable2.subscribe({
              next: function(value) {
                messages.push({ frame: _this.frame - outerFrame, notification: nextNotification(value) });
              },
              error: function(error) {
                messages.push({ frame: _this.frame - outerFrame, notification: errorNotification(error) });
              },
              complete: function() {
                messages.push({ frame: _this.frame - outerFrame, notification: COMPLETE_NOTIFICATION });
              }
            });
            return messages;
          };
          TestScheduler2.prototype.expectObservable = function(observable2, subscriptionMarbles) {
            var _this = this;
            if (subscriptionMarbles === void 0) {
              subscriptionMarbles = null;
            }
            var actual = [];
            var flushTest = { actual, ready: false };
            var subscriptionParsed = TestScheduler2.parseMarblesAsSubscriptions(subscriptionMarbles, this.runMode);
            var subscriptionFrame = subscriptionParsed.subscribedFrame === Infinity ? 0 : subscriptionParsed.subscribedFrame;
            var unsubscriptionFrame = subscriptionParsed.unsubscribedFrame;
            var subscription;
            this.schedule(function() {
              subscription = observable2.subscribe({
                next: function(x) {
                  var value = x instanceof Observable ? _this.materializeInnerObservable(x, _this.frame) : x;
                  actual.push({ frame: _this.frame, notification: nextNotification(value) });
                },
                error: function(error) {
                  actual.push({ frame: _this.frame, notification: errorNotification(error) });
                },
                complete: function() {
                  actual.push({ frame: _this.frame, notification: COMPLETE_NOTIFICATION });
                }
              });
            }, subscriptionFrame);
            if (unsubscriptionFrame !== Infinity) {
              this.schedule(function() {
                return subscription.unsubscribe();
              }, unsubscriptionFrame);
            }
            this.flushTests.push(flushTest);
            var runMode = this.runMode;
            return {
              toBe: function(marbles, values, errorValue) {
                flushTest.ready = true;
                flushTest.expected = TestScheduler2.parseMarbles(marbles, values, errorValue, true, runMode);
              },
              toEqual: function(other) {
                flushTest.ready = true;
                flushTest.expected = [];
                _this.schedule(function() {
                  subscription = other.subscribe({
                    next: function(x) {
                      var value = x instanceof Observable ? _this.materializeInnerObservable(x, _this.frame) : x;
                      flushTest.expected.push({ frame: _this.frame, notification: nextNotification(value) });
                    },
                    error: function(error) {
                      flushTest.expected.push({ frame: _this.frame, notification: errorNotification(error) });
                    },
                    complete: function() {
                      flushTest.expected.push({ frame: _this.frame, notification: COMPLETE_NOTIFICATION });
                    }
                  });
                }, subscriptionFrame);
              }
            };
          };
          TestScheduler2.prototype.expectSubscriptions = function(actualSubscriptionLogs) {
            var flushTest = { actual: actualSubscriptionLogs, ready: false };
            this.flushTests.push(flushTest);
            var runMode = this.runMode;
            return {
              toBe: function(marblesOrMarblesArray) {
                var marblesArray = typeof marblesOrMarblesArray === "string" ? [marblesOrMarblesArray] : marblesOrMarblesArray;
                flushTest.ready = true;
                flushTest.expected = marblesArray.map(function(marbles) {
                  return TestScheduler2.parseMarblesAsSubscriptions(marbles, runMode);
                }).filter(function(marbles) {
                  return marbles.subscribedFrame !== Infinity;
                });
              }
            };
          };
          TestScheduler2.prototype.flush = function() {
            var _this = this;
            var hotObservables = this.hotObservables;
            while (hotObservables.length > 0) {
              hotObservables.shift().setup();
            }
            _super.prototype.flush.call(this);
            this.flushTests = this.flushTests.filter(function(test) {
              if (test.ready) {
                _this.assertDeepEqual(test.actual, test.expected);
                return false;
              }
              return true;
            });
          };
          TestScheduler2.parseMarblesAsSubscriptions = function(marbles, runMode) {
            var _this = this;
            if (runMode === void 0) {
              runMode = false;
            }
            if (typeof marbles !== "string") {
              return new SubscriptionLog(Infinity);
            }
            var characters = __spreadArray([], __read(marbles));
            var len = characters.length;
            var groupStart = -1;
            var subscriptionFrame = Infinity;
            var unsubscriptionFrame = Infinity;
            var frame = 0;
            var _loop_1 = function(i2) {
              var nextFrame = frame;
              var advanceFrameBy = function(count2) {
                nextFrame += count2 * _this.frameTimeFactor;
              };
              var c = characters[i2];
              switch (c) {
                case " ":
                  if (!runMode) {
                    advanceFrameBy(1);
                  }
                  break;
                case "-":
                  advanceFrameBy(1);
                  break;
                case "(":
                  groupStart = frame;
                  advanceFrameBy(1);
                  break;
                case ")":
                  groupStart = -1;
                  advanceFrameBy(1);
                  break;
                case "^":
                  if (subscriptionFrame !== Infinity) {
                    throw new Error("found a second subscription point '^' in a subscription marble diagram. There can only be one.");
                  }
                  subscriptionFrame = groupStart > -1 ? groupStart : frame;
                  advanceFrameBy(1);
                  break;
                case "!":
                  if (unsubscriptionFrame !== Infinity) {
                    throw new Error("found a second unsubscription point '!' in a subscription marble diagram. There can only be one.");
                  }
                  unsubscriptionFrame = groupStart > -1 ? groupStart : frame;
                  break;
                default:
                  if (runMode && c.match(/^[0-9]$/)) {
                    if (i2 === 0 || characters[i2 - 1] === " ") {
                      var buffer2 = characters.slice(i2).join("");
                      var match = buffer2.match(/^([0-9]+(?:\.[0-9]+)?)(ms|s|m) /);
                      if (match) {
                        i2 += match[0].length - 1;
                        var duration = parseFloat(match[1]);
                        var unit = match[2];
                        var durationInMs = void 0;
                        switch (unit) {
                          case "ms":
                            durationInMs = duration;
                            break;
                          case "s":
                            durationInMs = duration * 1e3;
                            break;
                          case "m":
                            durationInMs = duration * 1e3 * 60;
                            break;
                          default:
                            break;
                        }
                        advanceFrameBy(durationInMs / this_1.frameTimeFactor);
                        break;
                      }
                    }
                  }
                  throw new Error("there can only be '^' and '!' markers in a subscription marble diagram. Found instead '" + c + "'.");
              }
              frame = nextFrame;
              out_i_1 = i2;
            };
            var this_1 = this, out_i_1;
            for (var i = 0; i < len; i++) {
              _loop_1(i);
              i = out_i_1;
            }
            if (unsubscriptionFrame < 0) {
              return new SubscriptionLog(subscriptionFrame);
            } else {
              return new SubscriptionLog(subscriptionFrame, unsubscriptionFrame);
            }
          };
          TestScheduler2.parseMarbles = function(marbles, values, errorValue, materializeInnerObservables, runMode) {
            var _this = this;
            if (materializeInnerObservables === void 0) {
              materializeInnerObservables = false;
            }
            if (runMode === void 0) {
              runMode = false;
            }
            if (marbles.indexOf("!") !== -1) {
              throw new Error('conventional marble diagrams cannot have the unsubscription marker "!"');
            }
            var characters = __spreadArray([], __read(marbles));
            var len = characters.length;
            var testMessages = [];
            var subIndex = runMode ? marbles.replace(/^[ ]+/, "").indexOf("^") : marbles.indexOf("^");
            var frame = subIndex === -1 ? 0 : subIndex * -this.frameTimeFactor;
            var getValue = typeof values !== "object" ? function(x) {
              return x;
            } : function(x) {
              if (materializeInnerObservables && values[x] instanceof ColdObservable) {
                return values[x].messages;
              }
              return values[x];
            };
            var groupStart = -1;
            var _loop_2 = function(i2) {
              var nextFrame = frame;
              var advanceFrameBy = function(count2) {
                nextFrame += count2 * _this.frameTimeFactor;
              };
              var notification = void 0;
              var c = characters[i2];
              switch (c) {
                case " ":
                  if (!runMode) {
                    advanceFrameBy(1);
                  }
                  break;
                case "-":
                  advanceFrameBy(1);
                  break;
                case "(":
                  groupStart = frame;
                  advanceFrameBy(1);
                  break;
                case ")":
                  groupStart = -1;
                  advanceFrameBy(1);
                  break;
                case "|":
                  notification = COMPLETE_NOTIFICATION;
                  advanceFrameBy(1);
                  break;
                case "^":
                  advanceFrameBy(1);
                  break;
                case "#":
                  notification = errorNotification(errorValue || "error");
                  advanceFrameBy(1);
                  break;
                default:
                  if (runMode && c.match(/^[0-9]$/)) {
                    if (i2 === 0 || characters[i2 - 1] === " ") {
                      var buffer2 = characters.slice(i2).join("");
                      var match = buffer2.match(/^([0-9]+(?:\.[0-9]+)?)(ms|s|m) /);
                      if (match) {
                        i2 += match[0].length - 1;
                        var duration = parseFloat(match[1]);
                        var unit = match[2];
                        var durationInMs = void 0;
                        switch (unit) {
                          case "ms":
                            durationInMs = duration;
                            break;
                          case "s":
                            durationInMs = duration * 1e3;
                            break;
                          case "m":
                            durationInMs = duration * 1e3 * 60;
                            break;
                          default:
                            break;
                        }
                        advanceFrameBy(durationInMs / this_2.frameTimeFactor);
                        break;
                      }
                    }
                  }
                  notification = nextNotification(getValue(c));
                  advanceFrameBy(1);
                  break;
              }
              if (notification) {
                testMessages.push({ frame: groupStart > -1 ? groupStart : frame, notification });
              }
              frame = nextFrame;
              out_i_2 = i2;
            };
            var this_2 = this, out_i_2;
            for (var i = 0; i < len; i++) {
              _loop_2(i);
              i = out_i_2;
            }
            return testMessages;
          };
          TestScheduler2.prototype.createAnimator = function() {
            var _this = this;
            if (!this.runMode) {
              throw new Error("animate() must only be used in run mode");
            }
            var lastHandle = 0;
            var map2;
            var delegate = {
              requestAnimationFrame: function(callback) {
                if (!map2) {
                  throw new Error("animate() was not called within run()");
                }
                var handle = ++lastHandle;
                map2.set(handle, callback);
                return handle;
              },
              cancelAnimationFrame: function(handle) {
                if (!map2) {
                  throw new Error("animate() was not called within run()");
                }
                map2.delete(handle);
              }
            };
            var animate = function(marbles) {
              var e_1, _a;
              if (map2) {
                throw new Error("animate() must not be called more than once within run()");
              }
              if (/[|#]/.test(marbles)) {
                throw new Error("animate() must not complete or error");
              }
              map2 = /* @__PURE__ */ new Map();
              var messages = TestScheduler2.parseMarbles(marbles, void 0, void 0, void 0, true);
              try {
                for (var messages_1 = __values(messages), messages_1_1 = messages_1.next(); !messages_1_1.done; messages_1_1 = messages_1.next()) {
                  var message = messages_1_1.value;
                  _this.schedule(function() {
                    var e_2, _a2;
                    var now = _this.now();
                    var callbacks = Array.from(map2.values());
                    map2.clear();
                    try {
                      for (var callbacks_1 = (e_2 = void 0, __values(callbacks)), callbacks_1_1 = callbacks_1.next(); !callbacks_1_1.done; callbacks_1_1 = callbacks_1.next()) {
                        var callback = callbacks_1_1.value;
                        callback(now);
                      }
                    } catch (e_2_1) {
                      e_2 = { error: e_2_1 };
                    } finally {
                      try {
                        if (callbacks_1_1 && !callbacks_1_1.done && (_a2 = callbacks_1.return)) _a2.call(callbacks_1);
                      } finally {
                        if (e_2) throw e_2.error;
                      }
                    }
                  }, message.frame);
                }
              } catch (e_1_1) {
                e_1 = { error: e_1_1 };
              } finally {
                try {
                  if (messages_1_1 && !messages_1_1.done && (_a = messages_1.return)) _a.call(messages_1);
                } finally {
                  if (e_1) throw e_1.error;
                }
              }
            };
            return { animate, delegate };
          };
          TestScheduler2.prototype.createDelegates = function() {
            var _this = this;
            var lastHandle = 0;
            var scheduleLookup = /* @__PURE__ */ new Map();
            var run = function() {
              var now = _this.now();
              var scheduledRecords = Array.from(scheduleLookup.values());
              var scheduledRecordsDue = scheduledRecords.filter(function(_a2) {
                var due = _a2.due;
                return due <= now;
              });
              var dueImmediates = scheduledRecordsDue.filter(function(_a2) {
                var type = _a2.type;
                return type === "immediate";
              });
              if (dueImmediates.length > 0) {
                var _a = dueImmediates[0], handle = _a.handle, handler = _a.handler;
                scheduleLookup.delete(handle);
                handler();
                return;
              }
              var dueIntervals = scheduledRecordsDue.filter(function(_a2) {
                var type = _a2.type;
                return type === "interval";
              });
              if (dueIntervals.length > 0) {
                var firstDueInterval = dueIntervals[0];
                var duration = firstDueInterval.duration, handler = firstDueInterval.handler;
                firstDueInterval.due = now + duration;
                firstDueInterval.subscription = _this.schedule(run, duration);
                handler();
                return;
              }
              var dueTimeouts = scheduledRecordsDue.filter(function(_a2) {
                var type = _a2.type;
                return type === "timeout";
              });
              if (dueTimeouts.length > 0) {
                var _b = dueTimeouts[0], handle = _b.handle, handler = _b.handler;
                scheduleLookup.delete(handle);
                handler();
                return;
              }
              throw new Error("Expected a due immediate or interval");
            };
            var immediate = {
              setImmediate: function(handler) {
                var handle = ++lastHandle;
                scheduleLookup.set(handle, {
                  due: _this.now(),
                  duration: 0,
                  handle,
                  handler,
                  subscription: _this.schedule(run, 0),
                  type: "immediate"
                });
                return handle;
              },
              clearImmediate: function(handle) {
                var value = scheduleLookup.get(handle);
                if (value) {
                  value.subscription.unsubscribe();
                  scheduleLookup.delete(handle);
                }
              }
            };
            var interval2 = {
              setInterval: function(handler, duration) {
                if (duration === void 0) {
                  duration = 0;
                }
                var handle = ++lastHandle;
                scheduleLookup.set(handle, {
                  due: _this.now() + duration,
                  duration,
                  handle,
                  handler,
                  subscription: _this.schedule(run, duration),
                  type: "interval"
                });
                return handle;
              },
              clearInterval: function(handle) {
                var value = scheduleLookup.get(handle);
                if (value) {
                  value.subscription.unsubscribe();
                  scheduleLookup.delete(handle);
                }
              }
            };
            var timeout2 = {
              setTimeout: function(handler, duration) {
                if (duration === void 0) {
                  duration = 0;
                }
                var handle = ++lastHandle;
                scheduleLookup.set(handle, {
                  due: _this.now() + duration,
                  duration,
                  handle,
                  handler,
                  subscription: _this.schedule(run, duration),
                  type: "timeout"
                });
                return handle;
              },
              clearTimeout: function(handle) {
                var value = scheduleLookup.get(handle);
                if (value) {
                  value.subscription.unsubscribe();
                  scheduleLookup.delete(handle);
                }
              }
            };
            return { immediate, interval: interval2, timeout: timeout2 };
          };
          TestScheduler2.prototype.run = function(callback) {
            var prevFrameTimeFactor = TestScheduler2.frameTimeFactor;
            var prevMaxFrames = this.maxFrames;
            TestScheduler2.frameTimeFactor = 1;
            this.maxFrames = Infinity;
            this.runMode = true;
            var animator = this.createAnimator();
            var delegates = this.createDelegates();
            animationFrameProvider.delegate = animator.delegate;
            dateTimestampProvider.delegate = this;
            immediateProvider.delegate = delegates.immediate;
            intervalProvider.delegate = delegates.interval;
            timeoutProvider.delegate = delegates.timeout;
            performanceTimestampProvider.delegate = this;
            var helpers = {
              cold: this.createColdObservable.bind(this),
              hot: this.createHotObservable.bind(this),
              flush: this.flush.bind(this),
              time: this.createTime.bind(this),
              expectObservable: this.expectObservable.bind(this),
              expectSubscriptions: this.expectSubscriptions.bind(this),
              animate: animator.animate
            };
            try {
              var ret = callback(helpers);
              this.flush();
              return ret;
            } finally {
              TestScheduler2.frameTimeFactor = prevFrameTimeFactor;
              this.maxFrames = prevMaxFrames;
              this.runMode = false;
              animationFrameProvider.delegate = void 0;
              dateTimestampProvider.delegate = void 0;
              immediateProvider.delegate = void 0;
              intervalProvider.delegate = void 0;
              timeoutProvider.delegate = void 0;
              performanceTimestampProvider.delegate = void 0;
            }
          };
          TestScheduler2.frameTimeFactor = 10;
          return TestScheduler2;
        })(VirtualTimeScheduler);
        var _testing = /* @__PURE__ */ Object.freeze({
          TestScheduler
        });
        function getXHRResponse(xhr) {
          switch (xhr.responseType) {
            case "json": {
              if ("response" in xhr) {
                return xhr.response;
              } else {
                var ieXHR = xhr;
                return JSON.parse(ieXHR.responseText);
              }
            }
            case "document":
              return xhr.responseXML;
            case "text":
            default: {
              if ("response" in xhr) {
                return xhr.response;
              } else {
                var ieXHR = xhr;
                return ieXHR.responseText;
              }
            }
          }
        }
        var AjaxResponse = /* @__PURE__ */ (function() {
          function AjaxResponse2(originalEvent, xhr, request, type) {
            if (type === void 0) {
              type = "download_load";
            }
            this.originalEvent = originalEvent;
            this.xhr = xhr;
            this.request = request;
            this.type = type;
            var status = xhr.status, responseType = xhr.responseType;
            this.status = status !== null && status !== void 0 ? status : 0;
            this.responseType = responseType !== null && responseType !== void 0 ? responseType : "";
            var allHeaders = xhr.getAllResponseHeaders();
            this.responseHeaders = allHeaders ? allHeaders.split("\n").reduce(function(headers, line) {
              var index = line.indexOf(": ");
              headers[line.slice(0, index)] = line.slice(index + 2);
              return headers;
            }, {}) : {};
            this.response = getXHRResponse(xhr);
            var loaded = originalEvent.loaded, total = originalEvent.total;
            this.loaded = loaded;
            this.total = total;
          }
          return AjaxResponse2;
        })();
        var AjaxError = createErrorClass(function(_super) {
          return function AjaxErrorImpl(message, xhr, request) {
            this.message = message;
            this.name = "AjaxError";
            this.xhr = xhr;
            this.request = request;
            this.status = xhr.status;
            this.responseType = xhr.responseType;
            var response;
            try {
              response = getXHRResponse(xhr);
            } catch (err) {
              response = xhr.responseText;
            }
            this.response = response;
          };
        });
        var AjaxTimeoutError = (function() {
          function AjaxTimeoutErrorImpl(xhr, request) {
            AjaxError.call(this, "ajax timeout", xhr, request);
            this.name = "AjaxTimeoutError";
            return this;
          }
          AjaxTimeoutErrorImpl.prototype = Object.create(AjaxError.prototype);
          return AjaxTimeoutErrorImpl;
        })();
        function ajaxGet(url, headers) {
          return ajax({ method: "GET", url, headers });
        }
        function ajaxPost(url, body, headers) {
          return ajax({ method: "POST", url, body, headers });
        }
        function ajaxDelete(url, headers) {
          return ajax({ method: "DELETE", url, headers });
        }
        function ajaxPut(url, body, headers) {
          return ajax({ method: "PUT", url, body, headers });
        }
        function ajaxPatch(url, body, headers) {
          return ajax({ method: "PATCH", url, body, headers });
        }
        var mapResponse = map(function(x) {
          return x.response;
        });
        function ajaxGetJSON(url, headers) {
          return mapResponse(ajax({
            method: "GET",
            url,
            headers
          }));
        }
        var ajax = (function() {
          var create = function(urlOrConfig) {
            var config2 = typeof urlOrConfig === "string" ? {
              url: urlOrConfig
            } : urlOrConfig;
            return fromAjax(config2);
          };
          create.get = ajaxGet;
          create.post = ajaxPost;
          create.delete = ajaxDelete;
          create.put = ajaxPut;
          create.patch = ajaxPatch;
          create.getJSON = ajaxGetJSON;
          return create;
        })();
        var UPLOAD = "upload";
        var DOWNLOAD = "download";
        var LOADSTART = "loadstart";
        var PROGRESS = "progress";
        var LOAD = "load";
        function fromAjax(init) {
          return new Observable(function(destination) {
            var _a, _b;
            var config2 = __assign({ async: true, crossDomain: false, withCredentials: false, method: "GET", timeout: 0, responseType: "json" }, init);
            var queryParams = config2.queryParams, configuredBody = config2.body, configuredHeaders = config2.headers;
            var url = config2.url;
            if (!url) {
              throw new TypeError("url is required");
            }
            if (queryParams) {
              var searchParams_1;
              if (url.includes("?")) {
                var parts = url.split("?");
                if (2 < parts.length) {
                  throw new TypeError("invalid url");
                }
                searchParams_1 = new URLSearchParams(parts[1]);
                new URLSearchParams(queryParams).forEach(function(value, key2) {
                  return searchParams_1.set(key2, value);
                });
                url = parts[0] + "?" + searchParams_1;
              } else {
                searchParams_1 = new URLSearchParams(queryParams);
                url = url + "?" + searchParams_1;
              }
            }
            var headers = {};
            if (configuredHeaders) {
              for (var key in configuredHeaders) {
                if (configuredHeaders.hasOwnProperty(key)) {
                  headers[key.toLowerCase()] = configuredHeaders[key];
                }
              }
            }
            var crossDomain = config2.crossDomain;
            if (!crossDomain && !("x-requested-with" in headers)) {
              headers["x-requested-with"] = "XMLHttpRequest";
            }
            var withCredentials = config2.withCredentials, xsrfCookieName = config2.xsrfCookieName, xsrfHeaderName = config2.xsrfHeaderName;
            if ((withCredentials || !crossDomain) && xsrfCookieName && xsrfHeaderName) {
              var xsrfCookie = (_b = (_a = document === null || document === void 0 ? void 0 : document.cookie.match(new RegExp("(^|;\\s*)(" + xsrfCookieName + ")=([^;]*)"))) === null || _a === void 0 ? void 0 : _a.pop()) !== null && _b !== void 0 ? _b : "";
              if (xsrfCookie) {
                headers[xsrfHeaderName] = xsrfCookie;
              }
            }
            var body = extractContentTypeAndMaybeSerializeBody(configuredBody, headers);
            var _request = __assign(__assign({}, config2), {
              url,
              headers,
              body
            });
            var xhr;
            xhr = init.createXHR ? init.createXHR() : new XMLHttpRequest();
            {
              var progressSubscriber_1 = init.progressSubscriber, _c = init.includeDownloadProgress, includeDownloadProgress = _c === void 0 ? false : _c, _d = init.includeUploadProgress, includeUploadProgress = _d === void 0 ? false : _d;
              var addErrorEvent = function(type, errorFactory) {
                xhr.addEventListener(type, function() {
                  var _a2;
                  var error = errorFactory();
                  (_a2 = progressSubscriber_1 === null || progressSubscriber_1 === void 0 ? void 0 : progressSubscriber_1.error) === null || _a2 === void 0 ? void 0 : _a2.call(progressSubscriber_1, error);
                  destination.error(error);
                });
              };
              addErrorEvent("timeout", function() {
                return new AjaxTimeoutError(xhr, _request);
              });
              addErrorEvent("abort", function() {
                return new AjaxError("aborted", xhr, _request);
              });
              var createResponse_1 = function(direction, event) {
                return new AjaxResponse(event, xhr, _request, direction + "_" + event.type);
              };
              var addProgressEvent_1 = function(target, type, direction) {
                target.addEventListener(type, function(event) {
                  destination.next(createResponse_1(direction, event));
                });
              };
              if (includeUploadProgress) {
                [LOADSTART, PROGRESS, LOAD].forEach(function(type) {
                  return addProgressEvent_1(xhr.upload, type, UPLOAD);
                });
              }
              if (progressSubscriber_1) {
                [LOADSTART, PROGRESS].forEach(function(type) {
                  return xhr.upload.addEventListener(type, function(e) {
                    var _a2;
                    return (_a2 = progressSubscriber_1 === null || progressSubscriber_1 === void 0 ? void 0 : progressSubscriber_1.next) === null || _a2 === void 0 ? void 0 : _a2.call(progressSubscriber_1, e);
                  });
                });
              }
              if (includeDownloadProgress) {
                [LOADSTART, PROGRESS].forEach(function(type) {
                  return addProgressEvent_1(xhr, type, DOWNLOAD);
                });
              }
              var emitError_1 = function(status) {
                var msg = "ajax error" + (status ? " " + status : "");
                destination.error(new AjaxError(msg, xhr, _request));
              };
              xhr.addEventListener("error", function(e) {
                var _a2;
                (_a2 = progressSubscriber_1 === null || progressSubscriber_1 === void 0 ? void 0 : progressSubscriber_1.error) === null || _a2 === void 0 ? void 0 : _a2.call(progressSubscriber_1, e);
                emitError_1();
              });
              xhr.addEventListener(LOAD, function(event) {
                var _a2, _b2;
                var status = xhr.status;
                if (status < 400) {
                  (_a2 = progressSubscriber_1 === null || progressSubscriber_1 === void 0 ? void 0 : progressSubscriber_1.complete) === null || _a2 === void 0 ? void 0 : _a2.call(progressSubscriber_1);
                  var response = void 0;
                  try {
                    response = createResponse_1(DOWNLOAD, event);
                  } catch (err) {
                    destination.error(err);
                    return;
                  }
                  destination.next(response);
                  destination.complete();
                } else {
                  (_b2 = progressSubscriber_1 === null || progressSubscriber_1 === void 0 ? void 0 : progressSubscriber_1.error) === null || _b2 === void 0 ? void 0 : _b2.call(progressSubscriber_1, event);
                  emitError_1(status);
                }
              });
            }
            var user = _request.user, method = _request.method, async2 = _request.async;
            if (user) {
              xhr.open(method, url, async2, user, _request.password);
            } else {
              xhr.open(method, url, async2);
            }
            if (async2) {
              xhr.timeout = _request.timeout;
              xhr.responseType = _request.responseType;
            }
            if ("withCredentials" in xhr) {
              xhr.withCredentials = _request.withCredentials;
            }
            for (var key in headers) {
              if (headers.hasOwnProperty(key)) {
                xhr.setRequestHeader(key, headers[key]);
              }
            }
            if (body) {
              xhr.send(body);
            } else {
              xhr.send();
            }
            return function() {
              if (xhr && xhr.readyState !== 4) {
                xhr.abort();
              }
            };
          });
        }
        function extractContentTypeAndMaybeSerializeBody(body, headers) {
          var _a;
          if (!body || typeof body === "string" || isFormData(body) || isURLSearchParams(body) || isArrayBuffer(body) || isFile(body) || isBlob(body) || isReadableStream(body)) {
            return body;
          }
          if (isArrayBufferView(body)) {
            return body.buffer;
          }
          if (typeof body === "object") {
            headers["content-type"] = (_a = headers["content-type"]) !== null && _a !== void 0 ? _a : "application/json;charset=utf-8";
            return JSON.stringify(body);
          }
          throw new TypeError("Unknown body type");
        }
        var _toString = Object.prototype.toString;
        function toStringCheck(obj, name) {
          return _toString.call(obj) === "[object " + name + "]";
        }
        function isArrayBuffer(body) {
          return toStringCheck(body, "ArrayBuffer");
        }
        function isFile(body) {
          return toStringCheck(body, "File");
        }
        function isBlob(body) {
          return toStringCheck(body, "Blob");
        }
        function isArrayBufferView(body) {
          return typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(body);
        }
        function isFormData(body) {
          return typeof FormData !== "undefined" && body instanceof FormData;
        }
        function isURLSearchParams(body) {
          return typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;
        }
        function isReadableStream(body) {
          return typeof ReadableStream !== "undefined" && body instanceof ReadableStream;
        }
        var _ajax = /* @__PURE__ */ Object.freeze({
          ajax,
          AjaxError,
          AjaxTimeoutError,
          AjaxResponse
        });
        var DEFAULT_WEBSOCKET_CONFIG = {
          url: "",
          deserializer: function(e) {
            return JSON.parse(e.data);
          },
          serializer: function(value) {
            return JSON.stringify(value);
          }
        };
        var WEBSOCKETSUBJECT_INVALID_ERROR_OBJECT = "WebSocketSubject.error must be called with an object with an error code, and an optional reason: { code: number, reason: string }";
        var WebSocketSubject = (function(_super) {
          __extends(WebSocketSubject2, _super);
          function WebSocketSubject2(urlConfigOrSource, destination) {
            var _this = _super.call(this) || this;
            _this._socket = null;
            if (urlConfigOrSource instanceof Observable) {
              _this.destination = destination;
              _this.source = urlConfigOrSource;
            } else {
              var config2 = _this._config = __assign({}, DEFAULT_WEBSOCKET_CONFIG);
              _this._output = new Subject();
              if (typeof urlConfigOrSource === "string") {
                config2.url = urlConfigOrSource;
              } else {
                for (var key in urlConfigOrSource) {
                  if (urlConfigOrSource.hasOwnProperty(key)) {
                    config2[key] = urlConfigOrSource[key];
                  }
                }
              }
              if (!config2.WebSocketCtor && WebSocket) {
                config2.WebSocketCtor = WebSocket;
              } else if (!config2.WebSocketCtor) {
                throw new Error("no WebSocket constructor can be found");
              }
              _this.destination = new ReplaySubject();
            }
            return _this;
          }
          WebSocketSubject2.prototype.lift = function(operator) {
            var sock = new WebSocketSubject2(this._config, this.destination);
            sock.operator = operator;
            sock.source = this;
            return sock;
          };
          WebSocketSubject2.prototype._resetState = function() {
            this._socket = null;
            if (!this.source) {
              this.destination = new ReplaySubject();
            }
            this._output = new Subject();
          };
          WebSocketSubject2.prototype.multiplex = function(subMsg, unsubMsg, messageFilter) {
            var self = this;
            return new Observable(function(observer) {
              try {
                self.next(subMsg());
              } catch (err) {
                observer.error(err);
              }
              var subscription = self.subscribe({
                next: function(x) {
                  try {
                    if (messageFilter(x)) {
                      observer.next(x);
                    }
                  } catch (err) {
                    observer.error(err);
                  }
                },
                error: function(err) {
                  return observer.error(err);
                },
                complete: function() {
                  return observer.complete();
                }
              });
              return function() {
                try {
                  self.next(unsubMsg());
                } catch (err) {
                  observer.error(err);
                }
                subscription.unsubscribe();
              };
            });
          };
          WebSocketSubject2.prototype._connectSocket = function() {
            var _this = this;
            var _a = this._config, WebSocketCtor = _a.WebSocketCtor, protocol = _a.protocol, url = _a.url, binaryType = _a.binaryType;
            var observer = this._output;
            var socket = null;
            try {
              socket = protocol ? new WebSocketCtor(url, protocol) : new WebSocketCtor(url);
              this._socket = socket;
              if (binaryType) {
                this._socket.binaryType = binaryType;
              }
            } catch (e) {
              observer.error(e);
              return;
            }
            var subscription = new Subscription(function() {
              _this._socket = null;
              if (socket && socket.readyState === 1) {
                socket.close();
              }
            });
            socket.onopen = function(evt) {
              var _socket = _this._socket;
              if (!_socket) {
                socket.close();
                _this._resetState();
                return;
              }
              var openObserver = _this._config.openObserver;
              if (openObserver) {
                openObserver.next(evt);
              }
              var queue2 = _this.destination;
              _this.destination = Subscriber.create(function(x) {
                if (socket.readyState === 1) {
                  try {
                    var serializer = _this._config.serializer;
                    socket.send(serializer(x));
                  } catch (e) {
                    _this.destination.error(e);
                  }
                }
              }, function(err) {
                var closingObserver = _this._config.closingObserver;
                if (closingObserver) {
                  closingObserver.next(void 0);
                }
                if (err && err.code) {
                  socket.close(err.code, err.reason);
                } else {
                  observer.error(new TypeError(WEBSOCKETSUBJECT_INVALID_ERROR_OBJECT));
                }
                _this._resetState();
              }, function() {
                var closingObserver = _this._config.closingObserver;
                if (closingObserver) {
                  closingObserver.next(void 0);
                }
                socket.close();
                _this._resetState();
              });
              if (queue2 && queue2 instanceof ReplaySubject) {
                subscription.add(queue2.subscribe(_this.destination));
              }
            };
            socket.onerror = function(e) {
              _this._resetState();
              observer.error(e);
            };
            socket.onclose = function(e) {
              if (socket === _this._socket) {
                _this._resetState();
              }
              var closeObserver = _this._config.closeObserver;
              if (closeObserver) {
                closeObserver.next(e);
              }
              if (e.wasClean) {
                observer.complete();
              } else {
                observer.error(e);
              }
            };
            socket.onmessage = function(e) {
              try {
                var deserializer = _this._config.deserializer;
                observer.next(deserializer(e));
              } catch (err) {
                observer.error(err);
              }
            };
          };
          WebSocketSubject2.prototype._subscribe = function(subscriber) {
            var _this = this;
            var source = this.source;
            if (source) {
              return source.subscribe(subscriber);
            }
            if (!this._socket) {
              this._connectSocket();
            }
            this._output.subscribe(subscriber);
            subscriber.add(function() {
              var _socket = _this._socket;
              if (_this._output.observers.length === 0) {
                if (_socket && (_socket.readyState === 1 || _socket.readyState === 0)) {
                  _socket.close();
                }
                _this._resetState();
              }
            });
            return subscriber;
          };
          WebSocketSubject2.prototype.unsubscribe = function() {
            var _socket = this._socket;
            if (_socket && (_socket.readyState === 1 || _socket.readyState === 0)) {
              _socket.close();
            }
            this._resetState();
            _super.prototype.unsubscribe.call(this);
          };
          return WebSocketSubject2;
        })(AnonymousSubject);
        function webSocket(urlConfigOrSource) {
          return new WebSocketSubject(urlConfigOrSource);
        }
        var _webSocket = /* @__PURE__ */ Object.freeze({
          webSocket,
          WebSocketSubject
        });
        function fromFetch(input, initWithSelector) {
          if (initWithSelector === void 0) {
            initWithSelector = {};
          }
          var selector = initWithSelector.selector, init = __rest(initWithSelector, ["selector"]);
          return new Observable(function(subscriber) {
            var controller = new AbortController();
            var signal = controller.signal;
            var abortable = true;
            var outerSignal = init.signal;
            if (outerSignal) {
              if (outerSignal.aborted) {
                controller.abort();
              } else {
                var outerSignalHandler_1 = function() {
                  if (!signal.aborted) {
                    controller.abort();
                  }
                };
                outerSignal.addEventListener("abort", outerSignalHandler_1);
                subscriber.add(function() {
                  return outerSignal.removeEventListener("abort", outerSignalHandler_1);
                });
              }
            }
            var perSubscriberInit = __assign(__assign({}, init), { signal });
            var handleError = function(err) {
              abortable = false;
              subscriber.error(err);
            };
            fetch(input, perSubscriberInit).then(function(response) {
              if (selector) {
                innerFrom(selector(response)).subscribe(createOperatorSubscriber(subscriber, void 0, function() {
                  abortable = false;
                  subscriber.complete();
                }, handleError));
              } else {
                abortable = false;
                subscriber.next(response);
                subscriber.complete();
              }
            }).catch(handleError);
            return function() {
              if (abortable) {
                controller.abort();
              }
            };
          });
        }
        var _fetch = /* @__PURE__ */ Object.freeze({
          fromFetch
        });
        var operators = _operators;
        var testing = _testing;
        var ajax$1 = _ajax;
        var webSocket$1 = _webSocket;
        var fetch$1 = _fetch;
        exports2.operators = operators;
        exports2.testing = testing;
        exports2.ajax = ajax$1;
        exports2.webSocket = webSocket$1;
        exports2.fetch = fetch$1;
        exports2.Observable = Observable;
        exports2.ConnectableObservable = ConnectableObservable;
        exports2.observable = observable;
        exports2.animationFrames = animationFrames;
        exports2.Subject = Subject;
        exports2.BehaviorSubject = BehaviorSubject;
        exports2.ReplaySubject = ReplaySubject;
        exports2.AsyncSubject = AsyncSubject;
        exports2.asap = asap;
        exports2.asapScheduler = asapScheduler;
        exports2.async = async;
        exports2.asyncScheduler = asyncScheduler;
        exports2.queue = queue;
        exports2.queueScheduler = queueScheduler;
        exports2.animationFrame = animationFrame;
        exports2.animationFrameScheduler = animationFrameScheduler;
        exports2.VirtualTimeScheduler = VirtualTimeScheduler;
        exports2.VirtualAction = VirtualAction;
        exports2.Scheduler = Scheduler;
        exports2.Subscription = Subscription;
        exports2.Subscriber = Subscriber;
        exports2.Notification = Notification;
        exports2.pipe = pipe;
        exports2.noop = noop;
        exports2.identity = identity;
        exports2.isObservable = isObservable;
        exports2.lastValueFrom = lastValueFrom;
        exports2.firstValueFrom = firstValueFrom;
        exports2.ArgumentOutOfRangeError = ArgumentOutOfRangeError;
        exports2.EmptyError = EmptyError;
        exports2.NotFoundError = NotFoundError;
        exports2.ObjectUnsubscribedError = ObjectUnsubscribedError;
        exports2.SequenceError = SequenceError;
        exports2.TimeoutError = TimeoutError;
        exports2.UnsubscriptionError = UnsubscriptionError;
        exports2.bindCallback = bindCallback;
        exports2.bindNodeCallback = bindNodeCallback;
        exports2.combineLatest = combineLatest;
        exports2.concat = concat;
        exports2.connectable = connectable;
        exports2.defer = defer;
        exports2.empty = empty;
        exports2.forkJoin = forkJoin;
        exports2.from = from;
        exports2.fromEvent = fromEvent;
        exports2.fromEventPattern = fromEventPattern;
        exports2.generate = generate;
        exports2.iif = iif;
        exports2.interval = interval;
        exports2.merge = merge;
        exports2.never = never;
        exports2.of = of;
        exports2.onErrorResumeNext = onErrorResumeNext;
        exports2.pairs = pairs;
        exports2.partition = partition;
        exports2.race = race;
        exports2.range = range;
        exports2.throwError = throwError;
        exports2.timer = timer;
        exports2.using = using;
        exports2.zip = zip;
        exports2.scheduled = scheduled;
        exports2.EMPTY = EMPTY;
        exports2.NEVER = NEVER;
        exports2.config = config;
        exports2.audit = audit;
        exports2.auditTime = auditTime;
        exports2.buffer = buffer;
        exports2.bufferCount = bufferCount;
        exports2.bufferTime = bufferTime;
        exports2.bufferToggle = bufferToggle;
        exports2.bufferWhen = bufferWhen;
        exports2.catchError = catchError;
        exports2.combineAll = combineAll;
        exports2.combineLatestAll = combineLatestAll;
        exports2.combineLatestWith = combineLatestWith;
        exports2.concatAll = concatAll;
        exports2.concatMap = concatMap;
        exports2.concatMapTo = concatMapTo;
        exports2.concatWith = concatWith;
        exports2.connect = connect;
        exports2.count = count;
        exports2.debounce = debounce;
        exports2.debounceTime = debounceTime;
        exports2.defaultIfEmpty = defaultIfEmpty;
        exports2.delay = delay;
        exports2.delayWhen = delayWhen;
        exports2.dematerialize = dematerialize;
        exports2.distinct = distinct;
        exports2.distinctUntilChanged = distinctUntilChanged;
        exports2.distinctUntilKeyChanged = distinctUntilKeyChanged;
        exports2.elementAt = elementAt;
        exports2.endWith = endWith;
        exports2.every = every;
        exports2.exhaust = exhaust;
        exports2.exhaustAll = exhaustAll;
        exports2.exhaustMap = exhaustMap;
        exports2.expand = expand;
        exports2.filter = filter;
        exports2.finalize = finalize;
        exports2.find = find;
        exports2.findIndex = findIndex;
        exports2.first = first;
        exports2.groupBy = groupBy;
        exports2.ignoreElements = ignoreElements;
        exports2.isEmpty = isEmpty;
        exports2.last = last$1;
        exports2.map = map;
        exports2.mapTo = mapTo;
        exports2.materialize = materialize;
        exports2.max = max;
        exports2.mergeAll = mergeAll;
        exports2.flatMap = flatMap;
        exports2.mergeMap = mergeMap;
        exports2.mergeMapTo = mergeMapTo;
        exports2.mergeScan = mergeScan;
        exports2.mergeWith = mergeWith;
        exports2.min = min;
        exports2.multicast = multicast;
        exports2.observeOn = observeOn;
        exports2.onErrorResumeNextWith = onErrorResumeNextWith;
        exports2.pairwise = pairwise;
        exports2.pluck = pluck;
        exports2.publish = publish;
        exports2.publishBehavior = publishBehavior;
        exports2.publishLast = publishLast;
        exports2.publishReplay = publishReplay;
        exports2.raceWith = raceWith;
        exports2.reduce = reduce;
        exports2.repeat = repeat;
        exports2.repeatWhen = repeatWhen;
        exports2.retry = retry;
        exports2.retryWhen = retryWhen;
        exports2.refCount = refCount;
        exports2.sample = sample;
        exports2.sampleTime = sampleTime;
        exports2.scan = scan;
        exports2.sequenceEqual = sequenceEqual;
        exports2.share = share;
        exports2.shareReplay = shareReplay;
        exports2.single = single;
        exports2.skip = skip;
        exports2.skipLast = skipLast;
        exports2.skipUntil = skipUntil;
        exports2.skipWhile = skipWhile;
        exports2.startWith = startWith;
        exports2.subscribeOn = subscribeOn;
        exports2.switchAll = switchAll;
        exports2.switchMap = switchMap;
        exports2.switchMapTo = switchMapTo;
        exports2.switchScan = switchScan;
        exports2.take = take;
        exports2.takeLast = takeLast;
        exports2.takeUntil = takeUntil;
        exports2.takeWhile = takeWhile;
        exports2.tap = tap;
        exports2.throttle = throttle;
        exports2.throttleTime = throttleTime;
        exports2.throwIfEmpty = throwIfEmpty;
        exports2.timeInterval = timeInterval;
        exports2.timeout = timeout;
        exports2.timeoutWith = timeoutWith;
        exports2.timestamp = timestamp;
        exports2.toArray = toArray;
        exports2.window = window;
        exports2.windowCount = windowCount;
        exports2.windowTime = windowTime;
        exports2.windowToggle = windowToggle;
        exports2.windowWhen = windowWhen;
        exports2.withLatestFrom = withLatestFrom;
        exports2.zipAll = zipAll;
        exports2.zipWith = zipWith;
        Object.defineProperty(exports2, "__esModule", { value: true });
      }));
    }
  });
  return require_rxjs_umd();
})();
/*! Bundled license information:

rxjs/dist/bundles/rxjs.umd.js:
  (**
    @license
                                   Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/
  
   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION
  
   1. Definitions.
  
      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.
  
      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.
  
      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.
  
      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.
  
      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.
  
      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.
  
      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).
  
      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.
  
      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."
  
      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.
  
   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.
  
   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.
  
   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:
  
      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and
  
      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and
  
      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and
  
      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.
  
      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.
  
   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.
  
   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.
  
   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.
  
   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.
  
   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.
  
   END OF TERMS AND CONDITIONS
  
   APPENDIX: How to apply the Apache License to your work.
  
      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.
  
   Copyright (c) 2015-2018 Google, Inc., Netflix, Inc., Microsoft Corp. and contributors
  
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
  
       http://www.apache.org/licenses/LICENSE-2.0
  
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
   
  
   **)
  (*! *****************************************************************************
      Copyright (c) Microsoft Corporation.
  
      Permission to use, copy, modify, and/or distribute this software for any
      purpose with or without fee is hereby granted.
  
      THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
      REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
      AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
      INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
      LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
      OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
      PERFORMANCE OF THIS SOFTWARE.
      ***************************************************************************** *)
*/
