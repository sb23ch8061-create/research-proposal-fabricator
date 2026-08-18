"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export default function FileWorkspace() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [folders, setFolders] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState("");
  const [editFolderName, setEditFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [savedEvidence, setSavedEvidence] = useState<any[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTable, setPreviewTable] = useState<any[]>([]);

  const [editEvId, setEditEvId] = useState("");
  const [editEvValue, setEditEvValue] = useState("");
  const [rawLiterature, setRawLiterature] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => { fetchFolders(); }, []);
  useEffect(() => { if (selectedFolderId) fetchProfiles(selectedFolderId); }, [selectedFolderId]);
  useEffect(() => { if (selectedProfileId) fetchEvidence(selectedProfileId); }, [selectedProfileId]);

  const fetchFolders = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    const { data } = await supabase.from('research_folders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setFolders(data);
    setIsLoading(false);
  };

  const fetchProfiles = async (folderId: string) => {
    const { data } = await supabase.from('verified_profiles').select('*').eq('folder_id', folderId).order('created_at', { ascending: false });
    if (data) setProfiles(data);
  };

  const fetchEvidence = async (profileId: string) => {
    const { data } = await supabase.from('professor_evidence').select('*').eq('profile_id', profileId).order('field_name', { ascending: true });
    if (data) setSavedEvidence(data);
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('research_folders').insert({ user_id: user?.id, name: newFolderName });
    setNewFolderName(""); fetchFolders();
  };

  const updateFolder = async (id: string) => {
    if (!editFolderName.trim()) return;
    await supabase.from('research_folders').update({ name: editFolderName }).eq('id', id);
    setEditingFolderId(""); fetchFolders();
  };

  const deleteFolder = async (id: string) => {
    await supabase.from('research_folders').delete().eq('id', id);
    if (selectedFolderId === id) setSelectedFolderId("");
    fetchFolders();
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);

    if (file.type.startsWith('image/')) {
      setPreviewImage(URL.createObjectURL(file));
      setPreviewTable([]);
    } else {
      setPreviewImage(null);
      const reader = new FileReader();
      reader.onload = (evt) => {
        let jsonData: any[] = [];
        if (file.name.endsWith('.csv')) {
          jsonData = Papa.parse(evt.target?.result as string, { header: true, skipEmptyLines: true }).data;
        } else {
          const wb = XLSX.read(evt.target?.result, { type: 'binary' });
          jsonData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        }
        setPreviewTable(jsonData);
      };
      if (file.name.endsWith('.csv')) reader.readAsText(file); else reader.readAsBinaryString(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const executeBulkEnrichment = async () => {
    if (!previewFile && previewTable.length === 0) return;
    if (!selectedFolderId) return alert("Select a folder first.");
    setIsProcessingFile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (previewFile?.type.startsWith('image/')) {
        const formDataToSend = new FormData();
        formDataToSend.append('file', previewFile);
        const response = await fetch('/api/enrich-target', { method: 'POST', body: formDataToSend });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        await saveEnrichedProfiles(result.enrichedProfiles, user?.id);
      } else {
        for (const row of previewTable) {
          const formDataToSend = new FormData();
          formDataToSend.append('sparseData', JSON.stringify(row));
          const response = await fetch('/api/enrich-target', { method: 'POST', body: formDataToSend });
          const result = await response.json();
          if (result.success) await saveEnrichedProfiles(result.enrichedProfiles, user?.id);
        }
      }
      setPreviewTable([]); setPreviewImage(null); setPreviewFile(null); fetchProfiles(selectedFolderId);
    } catch (err: any) { alert(err.message); }
    setIsProcessingFile(false);
  };

  const saveEnrichedProfiles = async (profiles: any[], userId: any) => {
    for (const prof of profiles) {
      const { data: profileData } = await supabase.from('verified_profiles').insert({
        user_id: userId, folder_id: selectedFolderId, professor_name: prof.professor_name, department_name: prof.department_name, university_name: prof.university_name
      }).select().single();
      if (prof.evidence && prof.evidence.length > 0) {
        const evPayload = prof.evidence.map((ev: any) => ({
          profile_id: profileData.id, user_id: userId, field_name: ev.field_name, field_value: ev.field_value, verification_status: ev.field_value === 'NOT VERIFIED' ? 'UNVERIFIED' : 'VERIFIED'
        }));
        await supabase.from('professor_evidence').insert(evPayload);
      }
    }
  };

  const handleExtraction = async () => {
    if (!rawLiterature.trim() || !selectedProfileId) return;
    setIsExtracting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const response = await fetch("/api/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawLiterature }) });
      const result = await response.json();
      const evidencePayload = result.evidence.map((ev: any) => ({ profile_id: selectedProfileId, user_id: user?.id, field_name: ev.field_name, field_value: ev.field_value, verification_status: 'UNVERIFIED' }));
      await supabase.from('professor_evidence').delete().eq('profile_id', selectedProfileId);
      await supabase.from('professor_evidence').insert(evidencePayload);
      setRawLiterature(""); fetchEvidence(selectedProfileId);
    } catch (err: any) {}
    setIsExtracting(false);
  };

  const saveEvidenceModification = async (id: string) => {
    await supabase.from('professor_evidence').update({ field_value: editEvValue, verification_status: 'VERIFIED' }).eq('id', id);
    setEditEvId("");
    fetchEvidence(selectedProfileId);
  };

  if (isLoading) return <div className="p-8 aesthetic">Loading Module...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans aesthetic flex flex-col h-screen">
      <div className="flex justify-between items-center border-b border-gray-400 pb-4 mb-8 shrink-0">
        <h1 className="text-3xl font-extrabold uppercase">File Import</h1>
        <button onClick={() => router.push("/workspace")} className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-wider">Back to Hub</button>
      </div>

      {(previewTable.length > 0 || previewImage) && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="bg-gray-100 rounded-2xl w-full max-w-6xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl border border-gray-400">
            <div className="p-6 border-b border-gray-300 bg-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold uppercase tracking-widest">Source Analysis Preview</h2>
                <p className="text-sm font-bold text-gray-600 mt-1">
                  {previewImage ? "Image detected. The system will extract targets and enrich them." : `Detected ${previewTable.length} sparse records. System will enrich each one.`}
                </p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => {setPreviewTable([]); setPreviewImage(null); setPreviewFile(null);}} disabled={isProcessingFile} className="px-6 py-3 bg-gray-300 rounded-xl font-bold uppercase disabled:opacity-50 text-gray-900">Cancel</button>
                <button onClick={executeBulkEnrichment} disabled={isProcessingFile} className="px-8 py-3 bg-gray-900 text-white rounded-xl font-extrabold uppercase tracking-wider disabled:opacity-50">
                  {isProcessingFile ? "Enriching via Web..." : "Run Web Enrichment & Import"}
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto flex-1 flex flex-col items-center justify-start">
              {previewImage ? (
                 <img src={previewImage} alt="Upload Preview" className="max-h-full object-contain rounded-lg border border-gray-400 shadow-sm" />
              ) : (
                <>
                  <table className="w-full text-left text-sm whitespace-nowrap bg-white border border-gray-300 rounded-lg">
                    <thead className="bg-gray-200 uppercase font-bold text-xs text-gray-700">
                      <tr>{Object.keys(previewTable[0] || {}).map(k => <th key={k} className="p-4 border-b">{k}</th>)}</tr>
                    </thead>
                    <tbody>
                      {previewTable.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                          {Object.values(row).map((v: any, j) => <td key={j} className="p-4 font-medium text-gray-800">{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewTable.length > 10 && <div className="text-center w-full p-4 font-bold text-gray-500">...and {previewTable.length - 10} more rows</div>}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 flex-1 min-h-0">
        <div className="md:col-span-3 border p-6 rounded-xl bg-gray-50 flex flex-col shadow-sm min-h-0">
          <h2 className="font-extrabold uppercase mb-4 tracking-wider shrink-0">1. Folders</h2>
          <div className="flex gap-2 mb-4 shrink-0">
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="New Folder" className="border border-gray-400 p-3 flex-1 rounded-xl font-bold w-full" />
            <button onClick={createFolder} className="bg-gray-900 text-white px-4 py-3 rounded-xl font-bold">+</button>
          </div>
          <div className="space-y-3 overflow-y-auto pr-2 flex-1 min-h-0">
            {folders.map(f => (
              <div key={f.id} className={`p-4 border rounded-xl transition-all ${selectedFolderId === f.id ? 'bg-gray-200 border-gray-600' : 'bg-white'}`}>
                {editingFolderId === f.id ? (
                  <div className="flex gap-2">
                    <input value={editFolderName} onChange={e => setEditFolderName(e.target.value)} className="border border-gray-400 p-1 text-sm flex-1 font-bold rounded" />
                    <button onClick={() => updateFolder(f.id)} className="bg-gray-900 text-white px-2 rounded font-bold text-xs">OK</button>
                    <button onClick={() => setEditingFolderId("")} className="bg-gray-300 px-2 rounded font-bold text-xs">X</button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="font-bold cursor-pointer flex-1" onClick={() => setSelectedFolderId(f.id)}>{f.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => {setEditingFolderId(f.id); setEditFolderName(f.name);}} className="text-xs font-bold text-gray-500">MOD</button>
                      <button onClick={() => deleteFolder(f.id)} className="text-xs font-bold text-gray-500">DEL</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-5 border rounded-xl bg-gray-50 flex flex-col shadow-sm overflow-hidden min-h-0">
          <div className="p-6 flex-1 flex flex-col min-h-0 relative">
            {!selectedFolderId && <div className="bg-gray-200 p-4 rounded-xl mb-4 font-bold text-sm text-gray-800 shrink-0">Select a folder first.</div>}
            <div className="shrink-0">
                <div className="space-y-4">
                  <h3 className="font-extrabold uppercase text-xl">Import Target Source</h3>
                  <input type="file" accept=".csv,.xlsx,.jpg,.jpeg,.png" ref={fileInputRef} onChange={handleFileSelection} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={!selectedFolderId} className="w-full bg-gray-900 text-white px-4 py-4 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 border border-gray-500">
                    Upload CSV / Excel / Image
                  </button>
                </div>
            </div>
            <div className="mt-8 border-t border-gray-300 pt-6 flex-1 flex flex-col min-h-0">
              <h3 className="font-extrabold uppercase mb-4 text-gray-500 tracking-wider text-xs shrink-0">Acquired Targets</h3>
              <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-2">
                {profiles.map(p => (
                  <div key={p.id} onClick={() => setSelectedProfileId(p.id)} className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedProfileId === p.id ? 'bg-gray-200 border-gray-600' : 'bg-white'}`}>
                    <div className="font-extrabold text-gray-900">{p.professor_name}</div>
                    <div className="text-xs text-gray-600 font-bold mt-1">{p.department_name}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-4 border p-6 rounded-xl bg-gray-50 flex flex-col shadow-sm overflow-hidden min-h-0">
          <h2 className="font-extrabold uppercase mb-4 tracking-wider shrink-0">3. Verified Evidence Vault</h2>
          <div className="flex-1 flex flex-col min-h-0">
            {selectedProfileId ? (
              <div className="flex flex-col h-full">
                <div className="flex flex-col gap-3 border-b border-gray-300 pb-6 mb-4 shrink-0">
                  <textarea value={rawLiterature} onChange={e => setRawLiterature(e.target.value)} placeholder="Paste URLs or text for deep extraction..." className="w-full h-24 border border-gray-400 p-3 rounded-xl resize-none font-bold" />
                  <button onClick={handleExtraction} disabled={isExtracting} className="bg-gray-900 text-white px-4 py-3 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50">
                    {isExtracting ? "Extracting..." : "Extract Data"}
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 pr-2 space-y-3 min-h-0">
                  {savedEvidence.length === 0 ? (
                    <p className="text-sm font-bold text-center mt-10 text-gray-500">Evidence will automatically appear here once extracted.</p>
                  ) : (
                    savedEvidence.map(ev => (
                      <div key={ev.id} className="bg-white p-4 border border-gray-300 rounded-xl shadow-sm relative group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-extrabold uppercase text-xs text-gray-500 tracking-wider">{ev.field_name.replace(/_/g, ' ')}</span>
                          <div className="flex gap-2 items-center">
                            <button onClick={() => {setEditEvId(ev.id); setEditEvValue(ev.field_value);}} className="text-[10px] px-2 py-1 bg-gray-200 text-gray-700 font-bold uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
                            <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${ev.verification_status === 'VERIFIED' ? 'bg-gray-300 text-gray-900' : 'bg-gray-200 text-gray-700'}`}>{ev.verification_status}</span>
                          </div>
                        </div>
                        {editEvId === ev.id ? (
                          <div className="mt-2">
                            <textarea value={editEvValue} onChange={e => setEditEvValue(e.target.value)} className="w-full border border-gray-400 p-2 rounded text-sm font-bold resize-none h-20" />
                            <div className="flex justify-end gap-2 mt-2">
                              <button onClick={() => setEditEvId("")} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded uppercase">Cancel</button>
                              <button onClick={() => saveEvidenceModification(ev.id)} className="px-3 py-1 bg-gray-900 text-white text-xs font-bold rounded uppercase">Save Override</button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-900 font-bold text-sm leading-relaxed whitespace-pre-wrap">{ev.field_value}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm font-bold text-center mt-10 text-gray-500">Select an acquired target to view their automatically enriched evidence.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}