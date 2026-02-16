(function(global){
  var ImportError = global.ImportErrors.ImportError;

  async function readTabularFile(file){
    var ext = ((file && file.name && file.name.split('.').pop()) || '').toLowerCase();
    if(ext === 'csv'){
      var text = await global.ImportFileReader.readFileAsText(file, 'utf-8');
      return global.ImportCsvParser.parseCsvToRows(text);
    }
    return global.ImportXlsxParser.parseXlsxToRows(file);
  }

  async function processDroppedFiles(files, deps){
    var options = deps || {};
    var fileTypes = options.fileTypes || {};
    var fileArray = Array.from(files || []);
    var results = [];

    for(var i=0; i<fileArray.length; i++){
      var file = fileArray[i];
      try{
        var rows = await readTabularFile(file);
        var type = global.ImportFileTypeDetector.detectFileType(file.name, rows, fileTypes);
        if(!type){
          throw new ImportError('UNSUPPORTED_FILE_TYPE', file.name);
        }
        results.push({ ok: true, file: file, rows: rows, type: type });
      }catch(err){
        results.push({ ok: false, file: file, error: global.ImportErrors.toImportError(err, 'PARSE_FAILED') });
      }
    }

    return {
      total: fileArray.length,
      successCount: results.filter(function(item){ return item.ok; }).length,
      results: results
    };
  }

  global.ImportService = {
    readTabularFile: readTabularFile,
    processDroppedFiles: processDroppedFiles
  };
})(window);
