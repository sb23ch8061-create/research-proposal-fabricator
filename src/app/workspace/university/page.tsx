"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function UniversityWorkspace() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [folders, setFolders] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  const [qsUniversities, setQsUniversities] = useState<any[]>([]);
  const [filteredQsUniversities, setFilteredQsUniversities] = useState<any[]>([]);
  
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolderId, setEditingFolderId] = useState("");
  const [editFolderName, setEditFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");
  const [savedEvidence, setSavedEvidence] = useState<any[]>([]);

  const [uniSearchQuery, setUniSearchQuery] = useState("");
  const [showUniDropdown, setShowUniDropdown] = useState(false);
  const [isResearchingUni, setIsResearchingUni] = useState(false);
  const [uniIntelligence, setUniIntelligence] = useState<any>(null);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [isExtractingLink, setIsExtractingLink] = useState(false);

  const [editEvId, setEditEvId] = useState("");
  const [editEvValue, setEditEvValue] = useState("");
  const [rawLiterature, setRawLiterature] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => { fetchFolders(); fetchPermanentQsData(); }, []);
  useEffect(() => { if (selectedFolderId) fetchProfiles(selectedFolderId); }, [selectedFolderId]);
  useEffect(() => { if (selectedProfileId) fetchEvidence(selectedProfileId); }, [selectedProfileId]);

  useEffect(() => {
    if (!uniSearchQuery.trim()) {
      setFilteredQsUniversities(qsUniversities);
    } else {
      const lowerQ = uniSearchQuery.toLowerCase();
      setFilteredQsUniversities(qsUniversities.filter(u => {
        if (!u || !u.university_name) return false;
        return String(u.university_name).toLowerCase().includes(lowerQ);
      }));
    }
  }, [uniSearchQuery, qsUniversities]);

  const fetchFolders = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");
    const { data } = await supabase.from('research_folders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setFolders(data);
    setIsLoading(false);
  };

  const fetchPermanentQsData = async () => {
    const { data } = await supabase.from('qs_universities').select('*').limit(3000); 
    if (data) {
      const validData = data.filter(u => u.university_name && u.university_name !== 'Name');
      setQsUniversities(validData);
      setFilteredQsUniversities(validData);
    }
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

  const executeUniversityResearch = async () => {
    if (!uniSearchQuery.trim()) return;
    setIsResearchingUni(true);
    try {
      const response = await fetch('/api/university-intelligence', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ universityName: uniSearchQuery })
      });
      const result = await response.json();
      if (result.success) setUniIntelligence(result.intelligenceData);
    } catch (error: any) { alert(error.message); }
    setIsResearchingUni(false);
  };

  const discoverProfessorsInDepartment = async () => {
    if (!selectedDepartment || !selectedFolderId) return alert("Select a folder and department.");
    setIsExtractingLink(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('sparseData', `Find top 3 active professors in ${selectedDepartment} at ${uniSearchQuery}`);
      const { data: { user } } = await supabase.auth.getUser();
      const response = await fetch('/api/enrich-target', { method: 'POST', body: formDataToSend });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      for (const prof of result.enrichedProfiles) {
        const { data: profileData } = await supabase.from('verified_profiles').insert({
          user_id: user?.id, folder_id: selectedFolderId, professor_name: prof.professor_name, department_name: prof.department_name, university_name: prof.university_name
        }).select().single();
        if (prof.evidence && prof.evidence.length > 0) {
          const evPayload = prof.evidence.map((ev: any) => ({
            profile_id: profileData.id, user_id: user?.id, field_name: ev.field_name, field_value: ev.field_value, verification_status: ev.field_value === 'NOT VERIFIED' ? 'UNVERIFIED' : 'VERIFIED'
          }));
          await supabase.from('professor_evidence').insert(evPayload);
        }
      }
      fetchProfiles(selectedFolderId);
    } catch (err: any) { alert(err.message); }
    setIsExtractingLink(false);
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
    <div className="p-6 max-w-[1500px] mx-auto font-sans aesthetic flex flex-col h-screen bg-gray-50/50">
      <div className="flex justify-between items-center border-b border-gray-300 pb-4 mb-6 shrink-0">
        <h1 className="text-3xl font-extrabold uppercase text-gray-900">University Discovery</h1>
        <button onClick={() => router.push("/workspace")} className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold uppercase tracking-wider shadow-sm">Back to Hub</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 pb-4">
        
        {/* COLUMN 1 */}
        <div className="md:col-span-3 border border-gray-300 p-6 rounded-2xl bg-white flex flex-col shadow-sm min-h-0 h-full">
          <h2 className="font-extrabold uppercase mb-6 tracking-wider shrink-0 text-gray-900">1. Folders</h2>
          <div className="flex gap-2 mb-4 shrink-0">
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="New Folder" className="border border-gray-300 p-3 flex-1 rounded-xl font-bold w-full bg-gray-50 focus:bg-white transition-colors" />
            <button onClick={createFolder} className="bg-gray-900 text-white px-4 py-3 rounded-xl font-bold shadow-sm">+</button>
          </div>
          <div className="space-y-3 overflow-y-auto pr-2 flex-1 min-h-0">
            {folders.map(f => (
              <div key={f.id} className={`p-4 border rounded-xl transition-all ${selectedFolderId === f.id ? 'bg-gray-200 border-gray-500' : 'bg-white border-gray-200 hover:border-gray-400'}`}>
                {editingFolderId === f.id ? (
                  <div className="flex gap-2">
                    <input value={editFolderName} onChange={e => setEditFolderName(e.target.value)} className="border border-gray-400 p-1 text-sm flex-1 font-bold rounded" />
                    <button onClick={() => updateFolder(f.id)} className="bg-gray-900 text-white px-2 rounded font-bold text-xs">OK</button>
                    <button onClick={() => setEditingFolderId("")} className="bg-gray-300 px-2 rounded font-bold text-xs">X</button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="font-bold cursor-pointer flex-1 text-gray-800" onClick={() => setSelectedFolderId(f.id)}>{f.name}</span>
                    <div className="flex gap-2">
                      <button onClick={() => {setEditingFolderId(f.id); setEditFolderName(f.name);}} className="text-[10px] uppercase font-bold text-gray-500 hover:text-gray-900 transition-colors">Mod</button>
                      <button onClick={() => deleteFolder(f.id)} className="text-[10px] uppercase font-bold text-gray-500 hover:text-red-600 transition-colors">Del</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2 */}
        <div className="md:col-span-5 border border-gray-300 p-6 rounded-2xl bg-white flex flex-col shadow-sm min-h-0 h-full">
          <h2 className="font-extrabold uppercase mb-6 tracking-wider shrink-0 text-gray-900">2. University Discovery</h2>
          {!selectedFolderId && <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl mb-6 font-bold text-sm text-yellow-800 shrink-0">Select a folder first.</div>}
          
          <div className="flex gap-2 relative shrink-0 mb-6">
            <div className="relative flex-1">
              <input 
                value={uniSearchQuery} 
                onChange={e => { setUniSearchQuery(e.target.value); setShowUniDropdown(true); }} 
                onFocus={() => setShowUniDropdown(true)}
                onBlur={() => setTimeout(() => setShowUniDropdown(false), 200)}
                placeholder="Search QS Ranked University..." 
                className="w-full border border-gray-300 bg-gray-50 focus:bg-white transition-colors p-4 rounded-xl font-bold text-sm" 
              />
              {showUniDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredQsUniversities.slice(0, 50).map(u => (
                      <div key={u.id} className="p-3 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-200 last:border-0 flex justify-between items-center" onMouseDown={() => { setUniSearchQuery(u.university_name); setShowUniDropdown(false); }}>
                        <span className="font-bold text-gray-800">{u.university_name}</span>
                        <span className="text-gray-500 font-bold text-[10px] uppercase bg-gray-200 px-2 py-1 rounded">Rank: {u.ranking || 'N/A'}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <button onClick={executeUniversityResearch} disabled={isResearchingUni || !uniSearchQuery.trim()} className="bg-blue-800 text-white px-6 py-4 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 shadow-sm text-sm shrink-0 transition-colors hover:bg-blue-900">Search</button>
          </div>
          
          {uniIntelligence && (
            <div className="shrink-0 max-h-[45%] overflow-y-auto border border-gray-200 p-6 rounded-2xl bg-gray-50 mb-6 shadow-inner">
              <div className="text-xs bg-green-100 text-green-800 p-2 rounded-lg font-bold uppercase text-center border border-green-200 mb-6">Institutional Intelligence Acquired</div>
              <ul className="space-y-5 list-none p-0 m-0">
                <li className="flex flex-col gap-1 border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                  <span className="font-extrabold uppercase text-gray-500 text-xs tracking-wider">PhD Admission Protocol</span>
                  <span className="font-bold text-gray-800 text-sm leading-relaxed">{uniIntelligence.phd_admission_process}</span>
                </li>
                <li className="flex flex-col gap-1 border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                  <span className="font-extrabold uppercase text-gray-500 text-xs tracking-wider">Funding Structure</span>
                  <span className="font-bold text-gray-800 text-sm leading-relaxed">{uniIntelligence.phd_funding}</span>
                </li>
                {uniIntelligence.direct_phd_possible && (
                  <li className="flex flex-col gap-1 border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <span className="font-extrabold uppercase text-gray-500 text-xs tracking-wider">Direct PhD Possibility</span>
                    <span className="font-bold text-gray-800 text-sm leading-relaxed">{uniIntelligence.direct_phd_possible}</span>
                  </li>
                )}
                {uniIntelligence.phd_criteria && (
                  <li className="flex flex-col gap-1 border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <span className="font-extrabold uppercase text-gray-500 text-xs tracking-wider">Admission Criteria</span>
                    <span className="font-bold text-gray-800 text-sm leading-relaxed">{uniIntelligence.phd_criteria}</span>
                  </li>
                )}
              </ul>
              
              <div className="mt-6 border-t border-gray-300 pt-6">
                <span className="font-extrabold uppercase text-gray-500 text-xs block mb-3 tracking-wider">Select Target Department</span>
                <div className="flex flex-col xl:flex-row gap-3">
                  <select onChange={e => setSelectedDepartment(e.target.value)} className="flex-1 border border-gray-300 p-3 rounded-xl font-bold bg-white text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-all shadow-sm">
                    <option value="">-- Choose Department --</option>
                    {uniIntelligence.departments?.map((dep: string) => <option key={dep} value={dep}>{dep}</option>)}
                  </select>
                  <button onClick={discoverProfessorsInDepartment} disabled={!selectedDepartment || !selectedFolderId || isExtractingLink} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 shadow-sm text-sm shrink-0 transition-colors hover:bg-gray-800">
                    {isExtractingLink ? "Researching..." : "Discover Targets"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-6 flex-1 flex flex-col min-h-0">
            <h3 className="font-extrabold uppercase mb-4 text-gray-500 tracking-wider text-xs shrink-0">Acquired Targets</h3>
            <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-2">
              {profiles.map(p => (
                <div key={p.id} onClick={() => setSelectedProfileId(p.id)} className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedProfileId === p.id ? 'bg-gray-200 border-gray-500' : 'bg-white border-gray-200 hover:border-gray-400'}`}>
                  <div className="font-extrabold text-gray-900">{p.professor_name}</div>
                  <div className="text-xs text-gray-600 font-bold mt-1">{p.department_name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUMN 3 */}
        <div className="md:col-span-4 border border-gray-300 p-6 rounded-2xl bg-white flex flex-col shadow-sm min-h-0 h-full">
          <h2 className="font-extrabold uppercase mb-6 tracking-wider shrink-0 text-gray-900">3. Verified Evidence Vault</h2>
          <div className="flex-1 flex flex-col min-h-0">
            {selectedProfileId ? (
              <div className="flex flex-col h-full">
                <div className="flex flex-col gap-3 border-b border-gray-200 pb-6 mb-6 shrink-0">
                  <textarea value={rawLiterature} onChange={e => setRawLiterature(e.target.value)} placeholder="Paste raw text or additional URLs for deep extraction..." className="w-full h-24 border border-gray-300 bg-gray-50 focus:bg-white transition-colors p-3 rounded-xl resize-none font-bold text-sm" />
                  <button onClick={handleExtraction} disabled={isExtracting} className="bg-gray-900 text-white px-4 py-3 rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 shadow-sm text-sm">
                    {isExtracting ? "Extracting..." : "Manual Deep Extract"}
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 pr-2 space-y-4 min-h-0">
                  {savedEvidence.length === 0 ? (
                    <p className="text-sm font-bold text-center mt-10 text-gray-500">Evidence will automatically appear here once extracted.</p>
                  ) : (
                    savedEvidence.map(ev => (
                      <div key={ev.id} className="bg-gray-50 p-4 border border-gray-200 rounded-xl relative group">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-extrabold uppercase text-xs text-gray-500 tracking-wider">{ev.field_name.replace(/_/g, ' ')}</span>
                          <div className="flex gap-2 items-center">
                            <button onClick={() => {setEditEvId(ev.id); setEditEvValue(ev.field_value);}} className="text-[10px] px-2 py-1 bg-white border border-gray-300 text-gray-700 font-bold uppercase rounded opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">Edit</button>
                            <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${ev.verification_status === 'VERIFIED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{ev.verification_status}</span>
                          </div>
                        </div>
                        {editEvId === ev.id ? (
                          <div className="mt-2">
                            <textarea value={editEvValue} onChange={e => setEditEvValue(e.target.value)} className="w-full border border-gray-400 p-2 rounded text-sm font-bold resize-none h-24" />
                            <div className="flex justify-end gap-2 mt-2">
                              <button onClick={() => setEditEvId("")} className="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded uppercase shadow-sm">Cancel</button>
                              <button onClick={() => saveEvidenceModification(ev.id)} className="px-3 py-1 bg-gray-900 text-white text-xs font-bold rounded uppercase shadow-sm">Save Override</button>
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
              <p className="text-sm font-bold text-center mt-20 text-gray-400">Select an acquired target to view their automatically enriched evidence.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}