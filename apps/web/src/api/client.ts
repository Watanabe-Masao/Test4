import type { UploadImportResponse } from "./generated";

export async function uploadImport(params: {
  baseUrl: string;
  storeId: number;
  importedBy: string;
  file: File;
}): Promise<UploadImportResponse> {
  const formData = new FormData();
  formData.append("store_id", String(params.storeId));
  formData.append("imported_by", params.importedBy);
  formData.append("file", params.file);

  const response = await fetch(`${params.baseUrl}/v1/imports`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${await response.text()}`);
  }

  return (await response.json()) as UploadImportResponse;
}
