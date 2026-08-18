"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "../../../../src/lib/supabase";
import { fetchCompleteFolderDataset } from "../../../../src/lib/fetchFolderData";
import * as XLSX from "xlsx";

interface InspectedCell {
  type: 'AI' | 'CUSTOM';
  profileId: string;
  professorName: string;
  fieldKey: string; 
  fieldNameDisplay: string;
  aiEvidence?: any;
  manualEdit?: any;
}

export default function SpreadsheetWorkspace() {
  const router = useRouter();
  const params = useParams();
  const folderId = params.id as string;

  const [dataset, setDataset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [inspectedCell, setInspectedCell] = useState<InspectedCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [newColumnName, setNewColumnName] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);

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

  useEffect(() => {
    if (folderId) loadData();
  }, [folderId]);

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    setIsAddingColumn(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('folder_custom_columns').insert({
        user_id: user.id,
        folder_id: folderId,
        column_name: newColumnName.trim(),
        display_order: dataset.customColumns.length
      });
      if (error) throw error;
      
      setNewColumnName("");
      await loadData();
    } catch (error: any) {
      alert("Failed to add column: " + error.message);
    }
    setIsAddingColumn(false);
  };

  const handleSaveEdit = async () => {
    if (!inspectedCell) return;
    setIsSavingEdit(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const existingEdit = inspectedCell.manualEdit;
      const editType = inspectedCell.type === 'AI' ? 'AI_OVERRIDE' : 'CUSTOM_COLUMN';

      if (existingEdit) {
        const { error } = await supabase.from('professor_manual_edits')
          .update({ manual_value: editValue.trim() })
          .eq('id', existingEdit.id);
        if (error) throw error;
      } else {
        if (editValue.trim()) {
          const { error } = await supabase.from('professor_manual_edits').insert({
            user_id: user.id,
            profile_id: inspectedCell.profileId,
            edit_type: editType,
            target_key: inspectedCell.fieldKey,
            manual_value: editValue.trim()
          });
          if (error) throw error;
        }
      }
      
      setInspectedCell(null);
      await loadData();
    } catch (error: any) {
      alert("Failed to save edit: " + error.message);
    }
    setIsSavingEdit(false);
  };

  const openInspector = (type: 'AI' | 'CUSTOM', profile: any, fieldKey: string, fieldNameDisplay: string, aiEvidence?: any) => {
    const manualEdit = dataset.manualEdits.find((e: any) => e.profile_id === profile.id && e.target_key === fieldKey);
    setEditValue(manualEdit?.manual_value || "");
    setInspectedCell({
      type,
      profileId: profile.id,
      professorName: profile.professor_name,
      fieldKey,
      fieldNameDisplay,
      aiEvidence,
      manualEdit
    });
  };

  const handleExportXLSX = () => {
    if (!dataset) return;
    const overviewData = dataset.profiles.map((profile: any) => {
      const row: any = { "Professor Name": profile.professor_name, "Department": profile.department_name, "Research Status": "COMPLETED" };
      dataset.customColumns.forEach((col: any) => {
        const edit = dataset.manualEdits.find((m: any) => m.profile_id === profile.id && m.target_key === col.id);
        row[col.column_name] = edit ? edit.manual_value : "";
      });
      return row;
    });

    const evidenceData: any[] = [];
    dataset.profiles.forEach((profile: any) => {
      const profEvidence = dataset.evidence.filter((e: any) => e.profile_id === profile.id);
      profEvidence.forEach((ev: any) => {
        evidenceData.push({
          "Professor Name": profile.professor_name,
          "AI Field": formatHeader(ev.field_name),
          "Extracted Value": ev.field_value,
          "Verification Status": ev.verification_status,
          "Conflict Notes": ev.conflict_notes || "None",
          "Source URLs": ev.source_urls ? ev.source_urls.join("  |  ") : "None"
        });
      });
    });

    const overrideData: any[] = [];
    dataset.profiles.forEach((profile: any) => {
      const overrides = dataset.manualEdits.filter((m: any) => m.profile_id === profile.id && m.edit_type === 'AI_OVERRIDE');
      overrides.forEach((ov: any) => {
        overrideData.push({
          "Professor Name": profile.professor_name,
          "Overridden Field": formatHeader(ov.target_key),
          "Your Manual Value": ov.manual_value
        });
      });
    });

    const queueData = dataset.incompleteQueue.map((inc: any) => ({
      "Professor Name": inc.extracted_professors.name,
      "Target URL": inc.extracted_professors.department_url,
      "Queue Status": inc.status,
      "Error Details": inc.error_log || ""
    }));

    const wb = XLSX.utils.book_new();
    if (overviewData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overviewData), "Master Overview");
    if (evidenceData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(evidenceData), "AI Evidence Vault");
    if (overrideData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overrideData), "Manual Overrides");
    if (queueData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(queueData), "Incomplete Queue");

    const safeFileName = dataset.folder.name.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `${safeFileName}_Full_Dataset.xlsx`);
  };

  // NEW: The Flat CSV Export Engine
  const handleExportCSV = () => {
    if (!dataset) return;

    const headers = [
      "Professor Name", "Department", "Research Status",
      ...dataset.customColumns.map((c: any) => c.column_name),
      ...aiColumns.map(c => formatHeader(c) + " (Value)"),
      ...aiColumns.map(c => formatHeader(c) + " (Status)")
    ];

    const escapeCSV = (str: string | null | undefined) => {
      if (!str) return '""';
      return `"${String(str).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    };

    const rows = dataset.profiles.map((profile: any) => {
      const row = [profile.professor_name, profile.department_name, "COMPLETED"];

      dataset.customColumns.forEach((col: any) => {
        const edit = dataset.manualEdits.find((m: any) => m.profile_id === profile.id && m.target_key === col.id);
        row.push(edit ? edit.manual_value : "");
      });

      const profEvidence = dataset.evidence.filter((e: any) => e.profile_id === profile.id);
      
      // Values loop
      aiColumns.forEach(col => {
        const ev = profEvidence.find((e: any) => e.field_name === col);
        const override = dataset.manualEdits.find((m: any) => m.profile_id === profile.id && m.target_key === col);
        if (override && override.manual_value) row.push(`[OVERRIDE] ${override.manual_value}`);
        else if (ev) row.push(ev.field_value);
        else row.push("");
      });

      // Statuses loop
      aiColumns.forEach(col => {
        const ev = profEvidence.find((e: any) => e.field_name === col);
        const override = dataset.manualEdits.find((m: any) => m.profile_id === profile.id && m.target_key === col);
        if (override && override.manual_value) row.push("USER OVERRIDE");
        else if (ev) row.push(ev.verification_status);
        else row.push("NOT FOUND");
      });

      return row;
    });

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((r: any[]) => r.map(escapeCSV).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const safeFileName = dataset.folder.name.replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute("download", `${safeFileName}_Flat_Dataset.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) return <div className="min-h-screen p-8 bg-gray-200 font-bold text-gray-900 flex items-center justify-center text-xl">Loading Spreadsheet Workspace...</div>;
  if (!dataset) return <div className="min-h-screen p-8 bg-gray-200 font-bold text-red-600 flex items-center justify-center">Error loading data.</div>;

  const allProfiles = dataset.profiles;
  const incomplete = dataset.incompleteQueue;
  const customCols = dataset.customColumns;

  const aiColumns = ["institutional_email", "lab_website", "phd_openings", "research_areas", "specific_research_topics"];
  const formatHeader = (name: string) => name.replace(/_/g, ' ').toUpperCase();

  return (
    <div className="min-h-screen bg-gray-200 text-gray-900 flex flex-col font-sans relative">
      
      <div className="p-6 bg-gray-100/80 backdrop-blur-md border-b border-gray-300 flex justify-between items-center shadow-sm z-20">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{dataset.folder.name}</h1>
          <p className="text-sm font-bold text-gray-600 mt-1">
            <span className="text-green-700">{allProfiles.length} Completed</span> | <span className="text-yellow-700">{incomplete.length} Pending</span>
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 mr-4 border-r border-gray-400 pr-4">
            <input 
              type="text" 
              placeholder="New Column Name..." 
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-gray-800"
            />
            <button onClick={handleAddColumn} disabled={isAddingColumn} className="px-4 py-2 bg-gray-800 text-white rounded-md font-bold hover:bg-gray-700 disabled:opacity-50">
              + Add
            </button>
          </div>
          <div className="flex gap-2 bg-gray-300 p-1 rounded-lg border border-gray-400">
            <button onClick={handleExportXLSX} className="px-4 py-1.5 bg-green-700 text-white rounded-md font-bold shadow-sm hover:bg-green-600 transition-all text-sm">
              XLSX (Rich)
            </button>
            <button onClick={handleExportCSV} className="px-4 py-1.5 bg-gray-800 text-white rounded-md font-bold shadow-sm hover:bg-gray-700 transition-all text-sm">
              CSV (Flat)
            </button>
          </div>
          <button onClick={() => router.push('/workspace')} className="px-6 py-2 bg-gray-300 text-gray-900 rounded-lg font-bold shadow-sm hover:bg-gray-400 transition-all ml-2">
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 relative">
        <div className="inline-block min-w-full align-middle bg-white shadow-lg border border-gray-300 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-300 table-fixed">
            <thead className="bg-gray-100">
              <tr>
                <th className="w-64 px-4 py-4 text-left text-xs font-extrabold text-gray-700 uppercase tracking-wider sticky left-0 top-0 z-20 bg-gray-100 border-r border-b border-gray-300 shadow-[1px_0_0_0_#d1d5db]">Professor</th>
                <th className="w-32 px-4 py-4 text-left text-xs font-extrabold text-gray-700 uppercase tracking-wider sticky top-0 z-10 bg-gray-100 border-b border-gray-300">Status</th>
                {aiColumns.map(col => (
                  <th key={col} className="w-72 px-4 py-4 text-left text-xs font-extrabold text-gray-700 uppercase tracking-wider sticky top-0 z-10 bg-gray-100 border-b border-gray-300">
                    🤖 {formatHeader(col)}
                  </th>
                ))}
                {customCols.map((col: any) => (
                  <th key={col.id} className="w-64 px-4 py-4 text-left text-xs font-extrabold text-blue-900 uppercase tracking-wider sticky top-0 z-10 bg-blue-50 border-b border-gray-300">
                    {col.column_name}
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody className="bg-white divide-y divide-gray-200">
              {allProfiles.map((profile: any) => {
                const profEvidence = dataset.evidence.filter((e: any) => e.profile_id === profile.id);

                return (
                  <tr key={profile.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-4 sticky left-0 bg-white group-hover:bg-gray-50 border-r border-gray-200 z-10 shadow-[1px_0_0_0_#e5e7eb] transition-colors">
                      <div className="font-bold text-gray-900 truncate">{profile.professor_name}</div>
                      <div className="text-xs font-bold text-gray-500 truncate mt-1">{profile.department_name}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-[10px] font-bold bg-green-200 text-green-900 rounded-md border border-green-400 tracking-wider">COMPLETED</span>
                    </td>
                    
                    {aiColumns.map(col => {
                      const ev = profEvidence.find((e: any) => e.field_name === col);
                      const manualOverride = dataset.manualEdits.find((m: any) => m.profile_id === profile.id && m.target_key === col);
                      
                      return (
                        <td key={col} onClick={() => openInspector('AI', profile, col, formatHeader(col), ev)} className="px-4 py-4 align-top cursor-pointer hover:bg-gray-100 hover:shadow-inner transition-all relative group/cell">
                          {manualOverride && manualOverride.manual_value ? (
                            <div className="space-y-1">
                              <span className="inline-block px-1.5 py-0.5 text-[9px] font-extrabold rounded-sm border bg-purple-200 text-purple-900 border-purple-400 uppercase tracking-wider">
                                👤 OVERRIDE
                              </span>
                              <div className="text-sm font-bold text-purple-900 line-clamp-4 leading-snug">{manualOverride.manual_value}</div>
                            </div>
                          ) : ev ? (
                            <div className="space-y-2 pointer-events-none">
                              <span className={`inline-block px-1.5 py-0.5 text-[9px] font-extrabold rounded-sm border uppercase tracking-wider ${
                                ev.verification_status === 'VERIFIED' ? 'bg-gray-900 text-white border-gray-900' : 
                                ev.verification_status === 'CONFLICTING' ? 'bg-yellow-200 text-yellow-900 border-yellow-400' : 
                                'bg-gray-200 text-gray-600 border-gray-300'
                              }`}>{ev.verification_status}</span>
                              <div className="text-sm font-medium text-gray-900 line-clamp-4 leading-snug">{ev.field_value}</div>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-gray-400 italic">No data</span>
                          )}
                        </td>
                      );
                    })}

                    {customCols.map((col: any) => {
                      const manualEdit = dataset.manualEdits.find((m: any) => m.profile_id === profile.id && m.target_key === col.id);
                      return (
                        <td key={col.id} onClick={() => openInspector('CUSTOM', profile, col.id, col.column_name)} className="px-4 py-4 align-top cursor-pointer bg-blue-50/30 hover:bg-blue-100 hover:shadow-inner transition-all border-l border-gray-100">
                          {manualEdit && manualEdit.manual_value ? (
                            <div className="text-sm font-bold text-blue-900 whitespace-pre-wrap">{manualEdit.manual_value}</div>
                          ) : (
                            <span className="text-xs font-bold text-blue-300 italic group-hover:text-blue-400 transition-colors">Click to edit</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {incomplete.map((inc: any) => (
                <tr key={inc.id} className="bg-gray-50 opacity-80">
                  <td className="px-4 py-4 sticky left-0 bg-gray-50 border-r border-gray-200 z-10 shadow-[1px_0_0_0_#e5e7eb]">
                    <div className="font-bold text-gray-700 truncate">{inc.extracted_professors.name}</div>
                    <div className="text-xs font-bold text-gray-400 truncate mt-1">{inc.extracted_professors.title}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-md border tracking-wider ${
                      inc.status === 'FAILED' ? 'bg-red-200 text-red-900 border-red-400' : 'bg-yellow-200 text-yellow-900 border-yellow-400'
                    }`}>{inc.status}</span>
                  </td>
                  <td colSpan={aiColumns.length + customCols.length} className="px-4 py-4 text-sm font-bold text-gray-400 italic text-center bg-gray-100/50">
                    Awaiting AI Research Engine...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {inspectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-100 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-gray-300 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-300 bg-white flex justify-between items-start">
              <div>
                <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-1">
                  {inspectedCell.type === 'AI' ? 'Evidence Inspection & Override' : 'Custom Data Editor'}
                </h3>
                <h2 className="text-xl font-bold text-gray-900">
                  {inspectedCell.professorName} - {inspectedCell.fieldNameDisplay}
                </h2>
              </div>
              <button onClick={() => setInspectedCell(null)} className="p-2 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg font-bold">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 flex flex-col">
              {inspectedCell.type === 'AI' && inspectedCell.aiEvidence && (
                <div className="p-5 bg-white border border-gray-300 rounded-xl space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      🔒 Original AI Evidence
                    </span>
                    <span className={`px-2 py-1 text-[10px] font-bold rounded-md border uppercase tracking-wider ${
                      inspectedCell.aiEvidence.verification_status === 'VERIFIED' ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-200 text-gray-700 border-gray-300'
                    }`}>{inspectedCell.aiEvidence.verification_status}</span>
                  </div>
                  <div className="font-medium text-gray-900 whitespace-pre-wrap">{inspectedCell.aiEvidence.field_value}</div>
                  
                  {inspectedCell.aiEvidence.source_urls && inspectedCell.aiEvidence.source_urls.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Sources:</span>
                      {inspectedCell.aiEvidence.source_urls.map((url: string, idx: number) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="block text-sm font-bold text-blue-600 hover:underline truncate">{url}</a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1 flex flex-col">
                <label className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-2 block">
                  {inspectedCell.type === 'AI' ? 'Your Manual Override (Optional)' : 'Enter Value'}
                </label>
                <textarea 
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={inspectedCell.type === 'AI' ? "Type here to override the AI value..." : "Enter custom data here..."}
                  className="w-full flex-1 min-h-[120px] p-4 bg-white border border-gray-400 rounded-xl font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 resize-none shadow-inner"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-300 bg-gray-50 flex justify-end gap-3">
              {inspectedCell.manualEdit && (
                <button 
                  onClick={() => setEditValue("")} 
                  className="px-4 py-2 bg-red-100 text-red-900 border border-red-300 rounded-lg font-bold hover:bg-red-200"
                >
                  Clear Entry
                </button>
              )}
              <button 
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-md hover:bg-gray-800 disabled:opacity-50"
              >
                {isSavingEdit ? "Saving..." : "Save Data"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}