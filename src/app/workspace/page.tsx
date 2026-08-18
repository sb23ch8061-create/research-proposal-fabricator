"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export default function TargetWorkspace() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [folders, setFolders] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [savedEvidence, setSavedEvidence] = useState<any[]>([]);

  // Mechanism Control
  const [activeMechanism, setActiveMechanism] = useState<1 | 2 | 3>(1);

  // Mechanism 1: Link State
  const [targetUrl, setTargetUrl] = useState("");
  const [isExtractingLink, setIsExtractingLink] = useState(false);

  // Mechanism 2: File Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [previewTable, setPreviewTable] = useState<any[]>([]);

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (selectedFolderId) fetchProfiles(selectedFolderId);
  }, [selectedFolderId]);

  useEffect(() => {
    if (selectedProfileId) fetchEvidence(selectedProfileId);
  }, [selectedProfileId]);

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

  // MECHANISM 1: LINK EXTRACTION
  const executeLinkExtraction = async () => {
    if (!targetUrl.trim() || !selectedFolderId) return alert("Select a folder and enter a URL.");
    setIsExtractingLink(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('targetUrl', targetUrl);
      await processEnrichmentPayload(formDataToSend);
      setTargetUrl("");
    } catch (err: any) { alert(err.message); }
    setIsExtractingLink(false);
  };

  // MECHANISM 2: FILE IMPORT
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const executeBulkEnrichment = async () => {
    if (previewTable.length === 0 || !selectedFolderId) return;
    setIsProcessingFile(true);
    try {
      for (const row of previewTable) {
        const formDataToSend = new FormData();
        formDataToSend.append('sparseData', JSON.stringify(row));
        await processEnrichmentPayload(formDataToSend);
      }
      setPreviewTable([]);
    } catch (err: any) { alert(err.message); }
    setIsProcessingFile(false);
  };

  // COMMON ENRICHMENT HANDLER FOR ALL MECHANISMS
  const processEnrichmentPayload = async (formData: FormData) => {
    const { data: { user } } = await supabase.auth.getUser();
    const response = await fetch('/api/enrich-target', { method: 'POST', body: formData });
    const result = await response.json();

    if (!result.success) throw new Error(result.error);

    for (const prof of result.enrichedProfiles) {
      const { data: profileData } = await supabase.from('verified_profiles').insert({
        user_id: user?.id, folder_id: selectedFolderId, professor_name: prof.professor_name, department_name: prof.department_name, university_name: prof.university_name
      }).select().single();

      if (prof.evidence && prof.evidence.length > 0) {
        const evPayload = prof.evidence.map((ev: any) => ({
          profile_id: profileData.id, user_id: user?.id, field_name: ev.field_name, field_value: ev.field_value, 
          verification_status: ev.field_value === 'NOT VERIFIED' ? 'UNVERIFIED' : 'VERIFIED'
        }));
        await supabase.from('professor_evidence').insert(evPayload);
      }
    }
    fetchProfiles(selectedFolderId);
  };

  if (isLoading) return <div className="p-8 aesthetic">Loading Target Workspace...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans aesthetic">
      <div className="flex justify-between items-center border-b border-gray-400 pb-4 mb-8">
        <h1 className="text-3xl font-extrabold uppercase">Target Workspace</h1>
        <button onClick={() => router.push("/dashboard")} className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-wider">Back to Command Center</button>
      </div>

      {/* PROMINENT DATASET PREVIEW MODAL */}
      {previewTable.length > 0 && (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
          <div className="bg-gray-100 rounded-2xl w-full max-w-6xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl border border-gray-400">
            <div className="p-6 border-b border-gray-300 bg-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold uppercase tracking-widest">Dataset Analysis Preview</h2>
                <p className="text-sm font-bold text-gray-600 mt-1">Detected {previewTable.length} sparse records. The system will independently enrich and cross-check each one.</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setPreviewTable([])} disabled={isProcessingFile} className="px-6 py-3 bg-gray-300 rounded-xl font-bold uppercase disabled:opacity-50 text-gray-900">Cancel</button>
                <button onClick={executeBulkEnrichment} disabled={isProcessingFile} className="px-8 py-3 bg-gray-900 text-white rounded-xl font-extrabold uppercase tracking-wider disabled:opacity-50">
                  {isProcessingFile ? "Enriching via Web..." : "Run Web Enrichment & Import"}
                </button>
              </div>
            </div>
            <div className="p-6 overflow-auto flex-1">
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
              {previewTable.length > 10 && <div className="text-center p-4 font-bold text-gray-500">...and {previewTable.length - 10} more rows</div>}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* COLUMN 1: FOLDERS */}
        <div className="md:col-span-3 border p-6 rounded-xl bg-gray-50 flex flex-col h-[700px] shadow-sm">
          <h2 className="font-extrabold uppercase mb-4 tracking-wider">1. Folders</h2>
          <div className="flex gap-2 mb-4">
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="New Folder" className="border border-gray-400 p-3 flex-1 rounded-xl font-bold w-full" />
            <button onClick={createFolder} className="bg-gray-900 text-white px-4 py-3 rounded-xl font-bold">+</button>
          </div>
          <div className="space-y-3 overflow-y-auto pr-2">
            {folders.map(f => (
              <div key={f.id} onClick={() => setSelectedFolderId(f.id)} className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedFolderId === f.id ? 'bg-gray-200 border-gray-600' : 'bg-white'}`}>
                <span className="font-bold">{f.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2: THE 3 ACQUISITION MECHANISMS */}
        <div className="md:col-span-5 border rounded-xl bg-gray-50 flex flex-col h-[700px] shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-300 bg-gray-200">
            <button onClick={() => setActiveMechanism(1)} className={`flex-1 py-4 font-extrabold text-xs uppercase tracking-wider ${activeMechanism === 1 ? 'bg-white border-t-4 border-gray-900' : 'text-gray-500'}`}>Link</button>
            <button onClick={() => setActiveMechanism(2)} className={`flex-1 py-4 font-extrabold text-xs uppercase tracking-wider ${activeMechanism === 2 ? 'bg-white border-t-4 border-gray-900' : 'text-gray-500'}`}>File</button>
            <button onClick={() => setActiveMechanism(3)} className={`flex-1 py-4 font-extrabold text-xs uppercase tracking-wider ${activeMechanism === 3 ? 'bg-white border-t-4 border-gray-900' : 'text-gray-500'}`}>University</button>
          </div>

          <div className="p-6 flex-1 flex flex-col">
            {!selectedFolderId && <div className="bg-yellow-100 p-4 rounded-xl mb-4 font-bold text-sm text-yellow-800">Select a folder first to acquire targets.</div>}

            {activeMechanism === 1 && (
              <div className="space-y-4">
                <h3 className="font-extrabold uppercase">Extract New Target via Link</h3>
                <p className="text-sm font-bold text-gray-600">Provide a URL. The system will identify the professor and independently enrich missing details.</p>
                <input value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="https://..." className="w-full border border-gray-400 p-3 rounded-xl font-bold" />
                <button onClick={executeLinkExtraction} disabled={isExtractingLink || !selectedFolderId} className="w-full bg-gray-900 text-white px-4 py-4 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50">
                  {isExtractingLink ? "Discovering & Enriching..." : "Extract Target"}
                </button>
              </div>
            )}

            {activeMechanism === 2 && (
              <div className="space-y-4">
                <h3 className="font-extrabold uppercase">Import Target Database</h3>
                <p className="text-sm font-bold text-gray-600">Upload a CSV/Excel with sparse data (e.g. just names/emails). The system will independently research and complete each record.</p>
                <input type="file" accept=".csv,.xlsx" ref={fileInputRef} onChange={handleFileSelection} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={!selectedFolderId} className="w-full bg-gray-900 text-white px-4 py-4 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 border border-gray-500">
                  Select File
                </button>
              </div>
            )}

            {activeMechanism === 3 && (
              <div className="space-y-4">
                <h3 className="font-extrabold uppercase">Discover By University</h3>
                <p className="text-sm font-bold text-gray-600">QS Database Integration & Department filtering will be established here in Phase 4.</p>
                <button disabled className="w-full bg-gray-300 text-gray-500 px-4 py-4 rounded-xl font-bold uppercase tracking-wider opacity-50">
                  Awaiting Phase 4 Activation
                </button>
              </div>
            )}

            <div className="mt-8 border-t border-gray-300 pt-6 flex-1 overflow-y-auto">
              <h3 className="font-extrabold uppercase mb-4 text-gray-500 tracking-wider text-xs">Acquired Targets in Folder</h3>
              <div className="space-y-2">
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

        {/* COLUMN 3: EVIDENCE VAULT */}
        <div className="md:col-span-4 border p-6 rounded-xl bg-gray-50 flex flex-col h-[700px] shadow-sm">
          <h2 className="font-extrabold uppercase mb-4 tracking-wider">3. Verified Evidence</h2>
          {selectedProfileId ? (
            <div className="overflow-y-auto flex-1 pr-2 space-y-3">
              {savedEvidence.map(ev => (
                <div key={ev.id} className="bg-white p-4 border border-gray-300 rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-extrabold uppercase text-xs text-gray-500 tracking-wider">{ev.field_name.replace(/_/g, ' ')}</span>
                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${ev.verification_status === 'VERIFIED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {ev.verification_status}
                    </span>
                  </div>
                  <span className="text-gray-900 font-bold text-sm leading-relaxed">{ev.field_value}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm font-bold text-center mt-10">Select a target to view enriched evidence.</p>}
        </div>

      </div>
    </div>
  );
}