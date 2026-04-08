import { Link } from "react-router";
import { Button } from "../components/ui/button";

const features = [
  {
    title: "Convert TXT to JSON",
    description: "Convert bank statement TXT to JSON format.",
    script: "txt_to_json.py",
    link: "/upload-txt",
  },
  {
    title: "Reconcile BS vs MIS",
    description: "Primary BS vs MIS reconciliation.",
    script: "compare_bs_mis.py",
    link: "#",
  },
  {
    title: "JSON Summary to Excel",
    description: "Convert JSON summary data to Excel.",
    script: "bs_json_to_execl.py",
    link: "#",
  },
  {
    title: "Merge JSON Reports",
    description: "Combine multiple JSON reports together.",
    script: "combine_bs_reports_to_json.py",
    link: "#",
  },
  {
    title: "Analytics Calculations",
    description: "Perform detailed analytics calculations.",
    script: "bs_data_analytics.py",
    link: "#",
  },
];

export default function MainPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">Main Tool Dashboard</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Select a processing tool below to perform bank statement and MIS data transformations.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative flex flex-col items-start justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="w-full">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 mb-4">
                  {feature.description}
                </p>
                <div className="inline-block rounded-md bg-gray-100 px-2 py-1 text-xs font-mono text-gray-600 mb-6 border border-gray-100">
                  {feature.script}
                </div>
              </div>
              <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                <Link to={feature.link}>Run Tool</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
