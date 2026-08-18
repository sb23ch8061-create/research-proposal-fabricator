"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import * as XLSX from 'xlsx';

export default function DataGridSubpage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  
  const [gridData, setGridData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const [newColumnName, setNewColumnName] = useState("");
  const [isEnrichingColumn, setIsEnrichingColumn] = useState(false);

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (selectedFolderId) loadFolderGrid(selectedFolderId);
  }, [selectedFolderId]);

  const fetchFolders = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { data } = await supabase.from('research_folders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setFolders(data);
    setIsLoading(false);
  };

  const loadFolderGrid = async (folderId: string) => {
    setIsLoading(true);
    const { data: profs } = await supabase.from('verified_profiles').select('*').eq('folder_id', folderId);
    if (!profs) return;
    
    let grid = [];
    let colSet = new Set(["Name", "Department", "University"]);

    for (const p of profs) {
      const { data: evs } = await supabase.from('professor_evidence').select('*').eq('profile_id', p.id);
      let row: any = { id: p.id, Name: p.professor_name, Department: p.department_name, University: p.university_name };
      
      evs?.forEach(e => { 
        const fieldName = e.field_name.replace(/_/g, ' ');
        row[fieldName] = e.field_value; 
        colSet.add(fieldName);
      });
      grid.push(row);
    }
    setColumns(Array.from(colSet));
    setGridData(grid);
    setIsLoading(false);
  };

  const handleAddNewColumn = async () => {
    if (!newColumnName.trim() || !selectedFolderId || gridData.length === 0) return;
    setIsEnrichingColumn(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const colName = newColumnName.trim();
      let successCount = 0;
      
      for (const row of gridData) {
        let finalFieldValue = "NOT VERIFIED";

        try {
          const response = await fetch('/api/enrich-column', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              professorName: row.Name,
              university: row.University,
              department: row.Department,
              targetColumn: colName
            })
          });
          
          const result = await response.json();
          if (result.success && result.extractedData?.field_value) {
             finalFieldValue = result.extractedData.field_value;
          }
        } catch (fetchErr) {
           console.error("API Call Failed for row:", row.Name);
        }

        const { error } = await supabase.from('professor_evidence').insert({
          profile_id: row.id,
          user_id: user?.id,
          field_name: colName.replace(/\s+/g, '_'),
          field_value: finalFieldValue,
          verification_status: finalFieldValue === 'NOT VERIFIED' ? 'UNVERIFIED' : 'VERIFIED'
        });
        
        if (!error) successCount++;
      }
      
      setNewColumnName("");
      await loadFolderGrid(selectedFolderId);

      if (successCount === 0) {
        alert("Operation completed, but the database rejected the new entries. Check backend logs.");
      }
      
    } catch (error: any) {
      alert("Failed to enrich new column: " + error.message);
    }
    setIsEnrichingColumn(false);
  };

  const exportFolderToExcel = () => {
    if (gridData.length === 0) return alert("No data to export.");
    const exportData = gridData.map(({ id, ...rest }) => rest);
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Verified Targets");
    XLSX.writeFile(wb, "Target_Workspace_Export.xlsx");
  };

  if (isLoading && folders.length === 0) return <div className="p-8 aesthetic">Loading Data Grid...</div>;

  return (
    <div className="p-8 max-w-full mx-auto font-sans aesthetic flex flex-col h-screen">
      <div className="flex justify-between items-center border-b border-gray-400 pb-4 mb-4 shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold uppercase">Macroscopic Data Grid</h1>
          <p className="font-bold text-gray-600 mt-1">Dynamically inject new columns and command the AI to research across entire folders.</p>
        </div>
        <div className="flex gap-4 items-center">
          <button onClick={() => router.push("/workspace")} className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-wider">Back to Workspace</button>
        </div>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        <div className="w-1/5 border p-6 rounded-xl bg-gray-50 flex flex-col shadow-sm min-h-0">
          <h2 className="font-extrabold uppercase mb-4 tracking-wider shrink-0">Select Folder</h2>
          <div className="space-y-3 overflow-y-auto flex-1 pr-2">
            {folders.map(f => (
              <div key={f.id} onClick={() => setSelectedFolderId(f.id)} className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedFolderId === f.id ? 'bg-gray-200 border-gray-600' : 'bg-white hover:bg-gray-100'}`}>
                <span className="font-bold">{f.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-4/5 border rounded-xl bg-white flex flex-col shadow-sm overflow-hidden relative">
          <div className="p-4 bg-gray-200 flex justify-between items-center shrink-0 border-b border-gray-300">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <span className="text-xs font-bold uppercase tracking-wider">Zoom:</span>
                 <input type="range" min="0.5" max="1.5" step="0.1" value={zoomLevel} onChange={e => setZoomLevel(parseFloat(e.target.value))} className="w-24" />
               </div>
            </div>
            <div className="flex gap-4 items-center">
              <div className="flex gap-2">
                <input value={newColumnName} onChange={e => setNewColumnName(e.target.value)} disabled={isEnrichingColumn || gridData.length === 0} placeholder="E.g., Post-Doc Openings" className="border border-gray-400 p-2 rounded text-sm font-bold" />
                <button onClick={handleAddNewColumn} disabled={isEnrichingColumn || gridData.length === 0} className="bg-blue-800 text-white px-4 py-2 rounded font-bold uppercase text-xs tracking-wider disabled:opacity-50 shadow-sm">
                  {isEnrichingColumn ? "Researching..." : "+ Add Dynamic Column"}
                </button>
              </div>
              <button onClick={exportFolderToExcel} disabled={gridData.length === 0} className="bg-gray-900 text-white px-6 py-2 rounded-xl font-bold uppercase text-xs tracking-wider disabled:opacity-50">Export to Excel</button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 bg-gray-50 relative">
            {!selectedFolderId ? (
               <p className="text-center mt-20 font-bold text-gray-500">Select a folder to load the grid.</p>
            ) : gridData.length === 0 ? (
               <p className="text-center mt-20 font-bold text-gray-500">No targets acquired in this folder yet.</p>
            ) : (
              <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
                <table className="text-left text-sm whitespace-nowrap bg-white border border-gray-300 shadow-sm rounded-lg">
                  <thead className="bg-gray-200 uppercase font-extrabold text-xs text-gray-700 tracking-wider">
                    <tr>
                      {columns.map(k => <th key={k} className="p-4 border-b border-r border-gray-300">{k}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {gridData.map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        {columns.map((k, j) => (
                          <td key={j} className="p-4 border-r border-gray-200 font-medium text-gray-800 max-w-xs overflow-hidden text-ellipsis">{row[k] || "N/A"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {isEnrichingColumn && (
               <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-10">
                 <div className="bg-white p-6 rounded-xl shadow-2xl text-center">
                   <h3 className="font-extrabold uppercase text-gray-900 mb-2 tracking-widest">Autonomous Deep Research Active</h3>
                   <p className="text-sm font-bold text-gray-600">The AI is currently investigating '{newColumnName}' for every target in this folder.</p>
                 </div>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}