import { FileUploadEditor } from "@/components/file-upload-editor";

export default function UploadeFile() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Data Editor</h1>
          <p className="text-gray-600">
            Upload CSV or Excel files, edit data, and manage columns and rows
          </p>
        </div>
        <FileUploadEditor />
      </div>
    </main>
  );
}
