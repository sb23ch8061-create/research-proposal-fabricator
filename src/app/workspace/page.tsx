"use client";

import { useRouter } from "next/navigation";

export default function TargetWorkspaceHub() {
  const router = useRouter();

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans aesthetic flex flex-col h-screen">
      <div className="flex justify-between items-center border-b border-gray-400 pb-4 mb-12 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold uppercase">Target Workspace</h1>
          <p className="font-bold text-gray-600 mt-1">Select an acquisition vector to enter the extraction protocols.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => router.push("/workspace/grid")} className="px-6 py-2 bg-blue-800 text-white rounded-xl font-bold uppercase tracking-wider">Macroscopic Data Grid</button>
          <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-wider">Back to Command Center</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1">
        <div onClick={() => router.push("/workspace/link")} className="border border-gray-300 rounded-xl p-8 bg-gray-50 hover:bg-gray-200 cursor-pointer transition-all flex flex-col justify-center items-center text-center shadow-sm h-96">
          <h2 className="text-2xl font-extrabold uppercase mb-4 text-gray-900">Extract via Link</h2>
          <p className="font-bold text-gray-600 text-sm">Provide a direct URL to an official academic profile. The AI will cross-check and enrich missing parameters instantly.</p>
        </div>

        <div onClick={() => router.push("/workspace/file")} className="border border-gray-300 rounded-xl p-8 bg-gray-50 hover:bg-gray-200 cursor-pointer transition-all flex flex-col justify-center items-center text-center shadow-sm h-96">
          <h2 className="text-2xl font-extrabold uppercase mb-4 text-gray-900">Import File / Image</h2>
          <p className="font-bold text-gray-600 text-sm">Upload sparse CSVs, Excel databases, or screenshots. The AI will bulk-enrich and structure the complete dossier.</p>
        </div>

        <div onClick={() => router.push("/workspace/university")} className="border border-gray-300 rounded-xl p-8 bg-gray-50 hover:bg-gray-200 cursor-pointer transition-all flex flex-col justify-center items-center text-center shadow-sm h-96">
          <h2 className="text-2xl font-extrabold uppercase mb-4 text-gray-900">University Discovery</h2>
          <p className="font-bold text-gray-600 text-sm">Search the QS Ranking Database. Extract institutional admission intelligence and autonomously discover department targets.</p>
        </div>
      </div>
    </div>
  );
}