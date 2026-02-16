(function(global){
  function ImportError(code, detail, cause){
    this.name = 'ImportError';
    this.code = code || 'UNKNOWN';
    this.detail = detail || '';
    this.cause = cause || null;
    this.message = this.code + (this.detail ? ': ' + this.detail : '');
    if(Error.captureStackTrace){
      Error.captureStackTrace(this, ImportError);
    }
  }
  ImportError.prototype = Object.create(Error.prototype);
  ImportError.prototype.constructor = ImportError;

  var ERROR_MESSAGES = {
    FILE_READ_ERROR: 'ファイルの読み込みに失敗しました。',
    UNSUPPORTED_FILE_TYPE: 'ファイル種別を判定できませんでした。',
    XLSX_LIBRARY_MISSING: 'Excel読込ライブラリ（XLSX）が未読み込みです。',
    PARSE_FAILED: 'ファイル解析中にエラーが発生しました。',
    EMPTY_FILE: 'ファイルが空です。',
    UNKNOWN: '予期しないエラーが発生しました。'
  };

  function toImportError(err, fallbackCode){
    if(err && err.name === 'ImportError') return err;
    return new ImportError(fallbackCode || 'UNKNOWN', err && err.message ? err.message : '', err || null);
  }

  function getImportErrorMessage(err){
    var normalized = toImportError(err);
    return ERROR_MESSAGES[normalized.code] || ERROR_MESSAGES.UNKNOWN;
  }

  global.ImportErrors = {
    ImportError: ImportError,
    ERROR_MESSAGES: ERROR_MESSAGES,
    toImportError: toImportError,
    getImportErrorMessage: getImportErrorMessage
  };
})(window);
