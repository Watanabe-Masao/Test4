(function(global){
  var ImportError = global.ImportErrors.ImportError;

  async function parseXlsxToRows(file){
    if(typeof XLSX === 'undefined'){
      if(global.__ensureXLSX__) await global.__ensureXLSX__();
      if(typeof XLSX === 'undefined'){
        var banner = document.getElementById('xlsxBanner');
        if(banner) banner.style.display = 'block';
        throw new ImportError('XLSX_LIBRARY_MISSING', file && file.name);
      }
    }

    var buf = await global.ImportFileReader.readFileAsArrayBuffer(file);
    try{
      var wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      var sheet = wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if(!rows || !rows.length) throw new ImportError('EMPTY_FILE', file && file.name);
      return rows;
    }catch(err){
      throw global.ImportErrors.toImportError(err, 'PARSE_FAILED');
    }
  }

  global.ImportXlsxParser = {
    parseXlsxToRows: parseXlsxToRows
  };
})(window);
