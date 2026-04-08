import { TxtUploadEditor } from "@/components/txt-upload-editor";

export default function UploadTxtFile() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">TXT Parser</h1>
          <p className="text-gray-600">
            Upload plain text bank statements. The system will automatically detect headers, extract transactions, and match them with challan remarks.
          </p>
        </div>
        <TxtUploadEditor />
      </div>
    </main>
  );
}
