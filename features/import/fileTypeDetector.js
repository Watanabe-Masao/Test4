(function(global){
  function detectByFilename(filename, fileTypes){
    var lowerName = String(filename || '').toLowerCase();
    return Object.keys(fileTypes || {}).find(function(type){
      var patterns = (fileTypes[type] && fileTypes[type].patterns) || [];
      return patterns.some(function(pattern){
        return lowerName.indexOf(String(pattern).toLowerCase()) !== -1;
      });
    }) || null;
  }

  function detectByRows(rows, fileTypes){
    if(!rows || !rows.length) return null;
    var headerStr = rows.slice(0, 3).flat().map(function(x){ return String(x || ''); }).join(' ').toLowerCase();
    return Object.keys(fileTypes || {}).find(function(type){
      var headerPatterns = (fileTypes[type] && fileTypes[type].headerPatterns) || [];
      return headerPatterns.some(function(pattern){
        return headerStr.indexOf(String(pattern).toLowerCase()) !== -1;
      });
    }) || null;
  }

  function detectFileType(filename, rows, fileTypes){
    var rules = [
      function(ctx){ return detectByFilename(ctx.filename, ctx.fileTypes); },
      function(ctx){ return detectByRows(ctx.rows, ctx.fileTypes); }
    ];

    var context = { filename: filename, rows: rows, fileTypes: fileTypes || {} };
    for(var i=0; i<rules.length; i++){
      var detected = rules[i](context);
      if(detected) return detected;
    }
    return null;
  }

  global.ImportFileTypeDetector = {
    detectFileType: detectFileType
  };
})(window);
