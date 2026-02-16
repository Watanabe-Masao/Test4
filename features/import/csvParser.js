(function(global){
  function parseCsvToRows(text){
    var src = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if(!src.trim()) return [];

    var rows = [];
    var row = [];
    var value = '';
    var inQuotes = false;

    for(var i=0; i<src.length; i++){
      var ch = src[i];
      var next = src[i+1];

      if(inQuotes){
        if(ch === '"' && next === '"'){
          value += '"';
          i++;
        }else if(ch === '"'){
          inQuotes = false;
        }else{
          value += ch;
        }
        continue;
      }

      if(ch === '"'){
        inQuotes = true;
      }else if(ch === ','){
        row.push(value.trim());
        value = '';
      }else if(ch === '\n'){
        row.push(value.trim());
        value = '';
        if(row.some(function(cell){ return String(cell).trim() !== ''; })){
          rows.push(row);
        }
        row = [];
      }else{
        value += ch;
      }
    }

    row.push(value.trim());
    if(row.some(function(cell){ return String(cell).trim() !== ''; })){
      rows.push(row);
    }

    return rows;
  }

  global.ImportCsvParser = {
    parseCsvToRows: parseCsvToRows
  };
})(window);
