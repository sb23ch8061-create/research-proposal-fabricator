"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

interface ResearchFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface QueuedTarget {
  id: string;
  status: string;
  extracted_professors: {
    id: string;
    name: string;
    title: string;
    department_url: string;
  };
}

function FolderWorkspace() {
  const [folders, setFolders] = useState<ResearchFolder[]>([]);
  const [targets, setTargets] = useState<QueuedTarget[]>([]);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // Batch Processing State
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);
  
  const router = useRouter();

  const fetchWorkspaceData = async (folderId: string | null) => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    let folderQuery = supabase.from('research_folders').select('*').eq('user_id', user.id);
    if (folderId === null) {
      folderQuery = folderQuery.is('parent_id', null);
    } else {
      folderQuery = folderQuery.eq('parent_id', folderId);
    }
    const { data: folderData } = await folderQuery.order('created_at', { ascending: true });
    if (folderData) setFolders(folderData);

    if (folderId !== null) {
      const { data: targetData } = await supabase
        .from('research_queue')
        .select(`
          id,
          status,
          extracted_professors ( id, name, title, department_url )
        `)
        .eq('target_folder_id', folderId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
        
      if (targetData) {
        setTargets(targetData as unknown as QueuedTarget[]);
      }
    } else {
      setTargets([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchWorkspaceData(currentParentId);
  }, [currentParentId, router]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('research_folders')
      .insert([{ user_id: user.id, name: newFolderName.trim(), parent_id: currentParentId }]);

    if (!error) {
      setNewFolderName("");
      fetchWorkspaceData(currentParentId);
    }
  };

  const handleStartBatchResearch = async () => {
    const pendingTargets = targets.filter(t => t.status === 'QUEUED' || t.status === 'FAILED');
    if (pendingTargets.length === 0) {
      alert("No pending targets to research.");
      return;
    }

    setIsProcessingBatch(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const target of pendingTargets) {
      setCurrentProcessingId(target.id);
      
      // Update UI and DB to RESEARCHING
      setTargets(prev => prev.map(t => t.id === target.id ? { ...t, status: 'RESEARCHING' } : t));
      await supabase.from('research_queue').update({ status: 'RESEARCHING' }).eq('id', target.id);

      try {
        const prof = target.extracted_professors;
        
        // 1. Trigger the Exhaustive API
        const response = await fetch("/api/exhaustive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: prof.name,
            title: prof.title,
            department_url: prof.department_url
          }),
        });

        const result = await response.json();

        if (result.success && result.data) {
          const evidenceData = result.data;

          // 2. Create the Root Profile in the Folder
          const { data: profileInsert, error: profileError } = await supabase
            .from('verified_profiles')
            .insert([{
              user_id: user.id,
              professor_name: prof.name,
              university_name: "Extracted from Anchor URL",
              department_name: prof.title,
              folder_id: currentParentId
            }])
            .select()
            .single();

          if (profileError || !profileInsert) throw new Error("Failed to create profile record.");

          // 3. Map the 32 JSON keys to exact database rows
          const evidenceRows = Object.entries(evidenceData).map(([key, data]: [string, any]) => ({
            user_id: user.id,
            profile_id: profileInsert.id,
            field_name: key,
            field_value: data.value || "Not Found",
            verification_status: data.status || "NOT FOUND",
            source_urls: data.sources || [],
            conflict_notes: data.conflict_notes || null
          }));

          // 4. Save the 32 strict evidence rows
          const { error: evidenceError } = await supabase.from('professor_evidence').insert(evidenceRows);
          if (evidenceError) throw new Error("Failed to save evidence.");

          // 5. Update Queue to COMPLETED
          setTargets(prev => prev.map(t => t.id === target.id ? { ...t, status: 'COMPLETED' } : t));
          await supabase.from('research_queue').update({ status: 'COMPLETED' }).eq('id', target.id);

        } else {
          throw new Error(result.error || "AI Engine Failed");
        }
      } catch (error: any) {
        console.error("Batch error for", target.extracted_professors.name, error);
        setTargets(prev => prev.map(t => t.id === target.id ? { ...t, status: 'FAILED' } : t));
        await supabase.from('research_queue').update({ status: 'FAILED', error_log: error.message }).eq('id', target.id);
      }

      // 6. Safe 3-second delay to prevent rate limits before next target
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    setIsProcessingBatch(false);
    setCurrentProcessingId(null);
    alert("Batch Processing Complete! The evidence has been securely stored in your database.");
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'QUEUED': return 'bg-yellow-200 text-yellow-900 border-yellow-400';
      case 'RESEARCHING': return 'bg-blue-200 text-blue-900 border-blue-400 animate-pulse';
      case 'COMPLETED': return 'bg-green-200 text-green-900 border-green-400';
      case 'FAILED': return 'bg-red-200 text-red-900 border-red-400';
      default: return 'bg-gray-200 text-gray-900';
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-gray-100/50 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300">
          <h1 className="text-3xl font-bold tracking-tight">Professor Research Workspace</h1>
          <button 
            onClick={() => router.push("/extraction")}
            disabled={isProcessingBatch}
            className="px-4 py-2 bg-gray-800 text-white rounded-md font-semibold shadow-sm hover:bg-gray-700 transition-all disabled:opacity-50"
          >
            + Extract New Targets
          </button>
        </div>

        <div className="bg-gray-100/50 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-gray-300 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {currentParentId === null ? "Root Workspace" : "Folder Contents"}
            </h2>
            {currentParentId !== null && (
              <button 
                onClick={() => setCurrentParentId(null)}
                disabled={isProcessingBatch}
                className="px-4 py-2 bg-gray-300 text-gray-900 rounded-md font-bold shadow-sm hover:bg-gray-400 transition-all disabled:opacity-50"
              >
                ← Back to Root
              </button>
            )}
          </div>
          
          <div className="flex gap-4">
            <input 
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              disabled={isProcessingBatch}
              placeholder="Create a new sub-folder..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-400 bg-white/80 focus:outline-none focus:ring-2 focus:ring-gray-800 transition-all font-medium"
            />
            <button 
              onClick={handleCreateFolder}
              disabled={isProcessingBatch}
              className="px-6 py-3 bg-gray-900 text-gray-100 rounded-xl font-bold shadow-md hover:bg-gray-800 transition-all disabled:opacity-50"
            >
              Create Folder
            </button>
          </div>

          {isLoading ? (
            <p className="font-bold">Loading workspace data...</p>
          ) : (
             <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder) => (
                  <div 
                    key={folder.id} 
                    onClick={() => !isProcessingBatch && setCurrentParentId(folder.id)}
                    className={`flex items-center gap-3 p-4 bg-white/80 border border-gray-300 rounded-xl shadow-sm transition-all ${isProcessingBatch ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'}`}
                  >
                    <span className="text-2xl">📁</span>
                    <span className="font-bold text-gray-900 truncate">{folder.name}</span>
                  </div>
                ))}
              </div>

              {currentParentId !== null && (
                <div className="mt-8 space-y-4 border-t border-gray-300 pt-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">Targets Pending Research ({targets.length})</h3>
                   <div className="flex gap-3">
                      <button 
                        onClick={() => router.push(`/workspace/${currentParentId}`)}
                        className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold shadow-md hover:bg-gray-800 transition-all"
                      >
                        OPEN DATASET SPREADSHEET
                      </button>
                      {targets.length > 0 && (
                        <button 
                          onClick={handleStartBatchResearch}
                          disabled={isProcessingBatch}
                          className="px-6 py-3 bg-blue-700 text-white rounded-xl font-bold shadow-md hover:bg-blue-600 transition-all disabled:opacity-50"
                        >
                          {isProcessingBatch ? "BATCH RUNNING..." : "START BATCH RESEARCH"}
                        </button>
                      )}
                    </div>
                  </div>

                  {targets.length === 0 ? (
                    <p className="text-gray-700 font-medium">No professors queued in this folder yet.</p>
                  ) : (
                    <div className="bg-white/80 border border-gray-300 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-200">
                      {targets.map((target) => {
                        const isCurrent = currentProcessingId === target.id;
                        return (
                          <div key={target.id} className={`p-4 flex justify-between items-center transition-all ${isCurrent ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                            <div>
                              <span className="font-bold text-gray-900 block text-lg">
                                {target.extracted_professors.name}
                              </span>
                              <span className="text-sm font-semibold text-gray-600 block">
                                {target.extracted_professors.title}
                              </span>
                            </div>
                            <div>
                              <span className={`px-3 py-1 text-xs font-bold rounded-md border ${getStatusColor(target.status)}`}>
                                {target.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default function Workspace() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-gray-900">Loading Workspace...</div>}>
      <FolderWorkspace />
    </Suspense>
  );
}