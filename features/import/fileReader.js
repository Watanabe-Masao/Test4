(function(global){
  var ImportError = global.ImportErrors.ImportError;

  function readFileAsArrayBuffer(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(e){ resolve(e.target.result); };
      reader.onerror = function(){ reject(new ImportError('FILE_READ_ERROR', file && file.name)); };
      reader.readAsArrayBuffer(file);
    });
  }

  function readFileAsText(file, encoding){
    var targetEncoding = encoding || 'utf-8';
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(e){ resolve(String((e.target && e.target.result) || '')); };
      reader.onerror = function(){ reject(new ImportError('FILE_READ_ERROR', file && file.name)); };
      reader.readAsText(file, targetEncoding);
    });
  }

  global.ImportFileReader = {
    readFileAsArrayBuffer: readFileAsArrayBuffer,
    readFileAsText: readFileAsText
  };
})(window);
