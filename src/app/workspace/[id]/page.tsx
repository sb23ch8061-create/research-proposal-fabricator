"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { fetchCompleteFolderDataset } from "../../../../src/lib/fetchFolderData";

export default function SpreadsheetWorkspace() {
  const router = useRouter();
  const params = useParams();
  const folderId = params.id as string;

  const [dataset, setDataset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // NEW: State to hold the currently clicked evidence for the inspection panel
  const [inspectedEvidence, setInspectedEvidence] = useState<any>(null);

  useEffect(() => {
    if (!folderId) return;
    const loadData = async () => {
      setIsLoading(true);
      const result = await fetchCompleteFolderDataset(folderId);
      if (result.success) {
        setDataset(result.data);
      } else {
        alert("Failed to load dataset: " + result.error);
      }
      setIsLoading(false);
    };
    loadData();
  }, [folderId]);

  if (isLoading) return <div className="min-h-screen p-8 bg-gray-200 font-bold text-gray-900 flex items-center justify-center text-xl">Loading Spreadsheet Workspace...</div>;
  if (!dataset) return <div className="min-h-screen p-8 bg-gray-200 font-bold text-red-600 flex items-center justify-center">Error loading data.</div>;

  const allProfiles = dataset.profiles;
  const incomplete = dataset.incompleteQueue;

  const aiColumns = [
    "institutional_email", "lab_website", "phd_openings", "research_areas", "specific_research_topics"
  ];

  const formatHeader = (name: string) => name.replace(/_/g, ' ').toUpperCase();

  return (
    <div className="min-h-screen bg-gray-200 text-gray-900 flex flex-col font-sans relative">
      
      {/* Workspace Header */}
      <div className="p-6 bg-gray-100/80 backdrop-blur-md border-b border-gray-300 flex justify-between items-center shadow-sm z-20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{dataset.folder.name}</h1>
          <p className="text-sm font-bold text-gray-600 mt-1">
            <span className="text-green-700">{allProfiles.length} Completed</span> | <span className="text-yellow-700">{incomplete.length} Pending/Failed</span>
          </p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => alert("Export features coming in Step 7!")} className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold shadow-md hover:bg-gray-800 transition-all">
            Export Folder (XLSX)
          </button>
          <button onClick={() => router.push('/workspace')} className="px-6 py-2 bg-gray-300 text-gray-900 rounded-lg font-bold shadow-sm hover:bg-gray-400 transition-all">
            Close Spreadsheet
          </button>
        </div>
      </div>

      {/* Spreadsheet Data Grid */}
      <div className="flex-1 overflow-auto p-6 relative">
        <div className="inline-block min-w-full align-middle bg-white shadow-lg border border-gray-300 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-300 table-fixed">
            <thead className="bg-gray-100">
              <tr>
                <th className="w-64 px-4 py-4 text-left text-xs font-extrabold text-gray-700 uppercase tracking-wider sticky left-0 top-0 z-20 bg-gray-100 border-r border-b border-gray-300 shadow-[1px_0_0_0_#d1d5db]">
                  Professor
                </th>
                <th className="w-32 px-4 py-4 text-left text-xs font-extrabold text-gray-700 uppercase tracking-wider sticky top-0 z-10 bg-gray-100 border-b border-gray-300">
                  Status
                </th>
                {aiColumns.map(col => (
                  <th key={col} className="w-72 px-4 py-4 text-left text-xs font-extrabold text-gray-700 uppercase tracking-wider sticky top-0 z-10 bg-gray-100 border-b border-gray-300">
                    {formatHeader(col)}
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody className="bg-white divide-y divide-gray-200">
              {/* COMPLETED PROFESSORS */}
              {allProfiles.map((profile: any) => {
                const profEvidence = dataset.evidence.filter((e: any) => e.profile_id === profile.id);

                return (
                  <tr key={profile.id} className="hover:bg-blue-50 transition-colors group">
                    <td className="px-4 py-4 sticky left-0 bg-white group-hover:bg-blue-50 border-r border-gray-200 z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors">
                      <div className="font-bold text-gray-900 truncate">{profile.professor_name}</div>
                      <div className="text-xs font-bold text-gray-500 truncate mt-1">{profile.department_name}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-[10px] font-bold bg-green-200 text-green-900 rounded-md border border-green-400 tracking-wider">
                        COMPLETED
                      </span>
                    </td>
                    
                    {/* AI Evidence Cells (Now Clickable) */}
                    {aiColumns.map(col => {
                      const ev = profEvidence.find((e: any) => e.field_name === col);
                      return (
                        <td 
                          key={col} 
                          onClick={() => ev && setInspectedEvidence({ ...ev, professor_name: profile.professor_name })}
                          className={`px-4 py-4 align-top transition-all ${ev ? 'cursor-pointer hover:bg-gray-100 hover:shadow-inner' : ''}`}
                        >
                          {ev ? (
                            <div className="space-y-2 pointer-events-none">
                              <span className={`inline-block px-1.5 py-0.5 text-[9px] font-extrabold rounded-sm border uppercase tracking-wider ${
                                ev.verification_status === 'VERIFIED' ? 'bg-gray-900 text-white border-gray-900' : 
                                ev.verification_status === 'CONFLICTING' ? 'bg-yellow-200 text-yellow-900 border-yellow-400' : 
                                'bg-gray-200 text-gray-600 border-gray-300'
                              }`}>
                                {ev.verification_status}
                              </span>
                              <div className="text-sm font-medium text-gray-900 line-clamp-4 leading-snug">
                                {ev.field_value}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-gray-400 italic">No data</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* PENDING / FAILED PROFESSORS */}
              {incomplete.map((inc: any) => (
                <tr key={inc.id} className="bg-gray-50 opacity-80">
                  <td className="px-4 py-4 sticky left-0 bg-gray-50 border-r border-gray-200 z-10 shadow-[1px_0_0_0_#e5e7eb]">
                    <div className="font-bold text-gray-700 truncate">{inc.extracted_professors.name}</div>
                    <div className="text-xs font-bold text-gray-400 truncate mt-1">{inc.extracted_professors.title}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-md border tracking-wider ${
                      inc.status === 'FAILED' ? 'bg-red-200 text-red-900 border-red-400' : 'bg-yellow-200 text-yellow-900 border-yellow-400'
                    }`}>
                      {inc.status}
                    </span>
                  </td>
                  <td colSpan={aiColumns.length} className="px-4 py-4 text-sm font-bold text-gray-400 italic text-center bg-gray-100/50">
                    Awaiting AI Research Engine...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW: Evidence Inspection Modal */}
      {inspectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-gray-100 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-300 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-300 bg-white flex justify-between items-start">
              <div>
                <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-1">
                  Evidence Inspection
                </h3>
                <h2 className="text-xl font-bold text-gray-900">
                  {inspectedEvidence.professor_name} - {formatHeader(inspectedEvidence.field_name)}
                </h2>
              </div>
              <button 
                onClick={() => setInspectedEvidence(null)}
                className="p-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">AI Extracted Value</span>
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-md border uppercase tracking-wider ${
                    inspectedEvidence.verification_status === 'VERIFIED' ? 'bg-gray-900 text-white border-gray-900' : 
                    inspectedEvidence.verification_status === 'CONFLICTING' ? 'bg-yellow-200 text-yellow-900 border-yellow-400' : 
                    'bg-gray-200 text-gray-700 border-gray-300'
                  }`}>
                    {inspectedEvidence.verification_status}
                  </span>
                </div>
                <div className="p-4 bg-white border border-gray-300 rounded-xl whitespace-pre-wrap font-medium text-gray-900">
                  {inspectedEvidence.field_value}
                </div>
              </div>

              {inspectedEvidence.conflict_notes && (
                <div>
                  <span className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2 block">Conflict / Notes</span>
                  <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-xl text-yellow-900 text-sm font-medium">
                    {inspectedEvidence.conflict_notes}
                  </div>
                </div>
              )}

              {inspectedEvidence.source_urls && inspectedEvidence.source_urls.length > 0 && (
                <div>
                  <span className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2 block">Source Evidence (Click to verify)</span>
                  <div className="space-y-2">
                    {inspectedEvidence.source_urls.map((url: string, idx: number) => (
                      <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="block p-3 bg-white border border-gray-300 rounded-lg text-sm font-bold text-blue-700 hover:underline truncate"
                      >
                        {url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}