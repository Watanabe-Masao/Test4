(function(root){
  function createAppState(initialState){
    var listeners = [];
    var snapshot = Object.assign({}, initialState || {});

    function emit(prev, changedKeys){
      listeners.forEach(function(fn){
        try{ fn(snapshot, prev, changedKeys); }catch(e){}
      });
    }

    function setKey(key, value){
      var prev = Object.assign({}, snapshot);
      snapshot[key] = value;
      emit(prev, [key]);
      return value;
    }

    function patchKey(key, patch){
      return setKey(key, Object.assign({}, snapshot[key] || {}, patch));
    }

    function makeObjectProxy(key){
      return new Proxy({}, {
        get: function(_t, prop){
          var src = snapshot[key] || {};
          return src[prop];
        },
        set: function(_t, prop, val){
          var p = {};
          p[prop] = val;
          patchKey(key, p);
          return true;
        },
        deleteProperty: function(_t, prop){
          var next = Object.assign({}, snapshot[key] || {});
          delete next[prop];
          setKey(key, next);
          return true;
        },
        ownKeys: function(){ return Reflect.ownKeys(snapshot[key] || {}); },
        has: function(_t, prop){ return prop in (snapshot[key] || {}); },
        getOwnPropertyDescriptor: function(_t, prop){
          return Object.getOwnPropertyDescriptor(snapshot[key] || {}, prop) || { configurable:true, enumerable:true, writable:true, value:undefined };
        }
      });
    }

    var proxies = {
      DATA: makeObjectProxy('DATA'),
      STORES: makeObjectProxy('STORES'),
      SUPPLIERS: makeObjectProxy('SUPPLIERS'),
      STORE_INVENTORY: makeObjectProxy('STORE_INVENTORY'),
      STORE_BUDGET: makeObjectProxy('STORE_BUDGET')
    };

    return {
      get: function(key){ return snapshot[key]; },
      set: setKey,
      patch: patchKey,
      subscribe: function(fn){ listeners.push(fn); },
      wireAlias: function(name, key){
        Object.defineProperty(root, name, {
          configurable: true,
          get: function(){ return key === 'result' ? snapshot.result : proxies[key]; },
          set: function(v){ setKey(key, v); }
        });
      }
    };
  }

  root.createAppState = createAppState;
})(globalThis);
