(function(global){
  // Merge-conflict resolution shim:
  // Keep a dedicated app-state namespace so both main and aggregate branches can coexist.
  if(!global.__APP_STATE__){
    global.__APP_STATE__ = {
      bootedAt: new Date().toISOString(),
      version: 'state-shim-v1'
    };
  }
})(typeof window!=='undefined' ? window : globalThis);
