/**
 * This file is generated from ../api/openapi.yaml.
 * Generation command (when npm registry access is available):
 *   npm run generate:api
 */

export interface paths {
  "/healthz": {
    get: operations["healthz"];
  };
  "/v1/imports": {
    post: operations["uploadImport"];
  };
}

export interface operations {
  healthz: {
    responses: {
      200: {
        content: {
          "application/json": {
            ok: boolean;
          };
        };
      };
    };
  };
  uploadImport: {
    requestBody: {
      content: {
        "multipart/form-data": {
          store_id: number;
          imported_by: string;
          file: Blob;
        };
      };
    };
    responses: {
      201: {
        content: {
          "application/json": components["schemas"]["ImportResult"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["Error"];
        };
      };
    };
  };
}

export interface components {
  schemas: {
    DailyTotal: {
      date: string;
      total_amount: number;
    };
    ImportResult: {
      import_id: string;
      report_id: string;
      store_id: number;
      imported_by: string;
      imported_at: string;
      file_sha256: string;
      rows_count: number;
      total_amount: number;
      daily_totals: components["schemas"]["DailyTotal"][];
    };
    Error: {
      message: string;
    };
  };
}

export type UploadImportResponse =
  operations["uploadImport"]["responses"][201]["content"]["application/json"];
