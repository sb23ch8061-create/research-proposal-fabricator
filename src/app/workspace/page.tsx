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
  
  const router = useRouter();

  const fetchWorkspaceData = async (folderId: string | null) => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // 1. Fetch Folders
    let folderQuery = supabase.from('research_folders').select('*').eq('user_id', user.id);
    if (folderId === null) {
      folderQuery = folderQuery.is('parent_id', null);
    } else {
      folderQuery = folderQuery.eq('parent_id', folderId);
    }
    const { data: folderData } = await folderQuery.order('created_at', { ascending: true });
    if (folderData) setFolders(folderData);

    // 2. Fetch Queued Targets (Only if we are inside a folder)
    if (folderId !== null) {
      const { data: targetData, error } = await supabase
        .from('research_queue')
        .select(`
          id,
          status,
          extracted_professors ( name, title, department_url )
        `)
        .eq('target_folder_id', folderId)
        .eq('user_id', user.id);
        
      if (targetData) {
        // Cast the data to our interface structure
        setTargets(targetData as unknown as QueuedTarget[]);
      }
    } else {
      setTargets([]); // No targets in the root workspace
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

  const handleStartBatchResearch = () => {
    alert("Batch Engine is currently disconnected. We will build the queue processing logic next!");
  };

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-gray-200 to-gray-400 text-gray-900">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center bg-gray-100/50 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-300">
          <h1 className="text-3xl font-bold tracking-tight">Professor Research Workspace</h1>
          <button 
            onClick={() => router.push("/extraction")}
            className="px-4 py-2 bg-gray-800 text-white rounded-md font-semibold shadow-sm hover:bg-gray-700 transition-all"
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
                className="px-4 py-2 bg-gray-300 text-gray-900 rounded-md font-bold shadow-sm hover:bg-gray-400 transition-all"
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
              placeholder="Create a new sub-folder..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-400 bg-white/80 focus:outline-none focus:ring-2 focus:ring-gray-800 transition-all font-medium"
            />
            <button 
              onClick={handleCreateFolder}
              className="px-6 py-3 bg-gray-900 text-gray-100 rounded-xl font-bold shadow-md hover:bg-gray-800 transition-all"
            >
              Create Folder
            </button>
          </div>

          {isLoading ? (
            <p className="font-bold">Loading workspace data...</p>
          ) : (
            <>
              {/* Folders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder) => (
                  <div 
                    key={folder.id} 
                    onClick={() => setCurrentParentId(folder.id)}
                    className="flex items-center gap-3 p-4 bg-white/80 border border-gray-300 rounded-xl shadow-sm cursor-pointer hover:bg-gray-100 transition-all"
                  >
                    <span className="text-2xl">📁</span>
                    <span className="font-bold text-gray-900 truncate">{folder.name}</span>
                  </div>
                ))}
              </div>

              {/* Queued Targets List (Only visible inside a folder) */}
              {currentParentId !== null && (
                <div className="mt-8 space-y-4 border-t border-gray-300 pt-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800">Targets Pending Research ({targets.length})</h3>
                    {targets.length > 0 && (
                      <button 
                        onClick={handleStartBatchResearch}
                        className="px-6 py-3 bg-blue-700 text-white rounded-xl font-bold shadow-md hover:bg-blue-600 transition-all"
                      >
                        START BATCH RESEARCH
                      </button>
                    )}
                  </div>

                  {targets.length === 0 ? (
                    <p className="text-gray-700 font-medium">No professors queued in this folder yet.</p>
                  ) : (
                    <div className="bg-white/80 border border-gray-300 rounded-xl shadow-sm overflow-hidden divide-y divide-gray-200">
                      {targets.map((target) => (
                        <div key={target.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-all">
                          <div>
                            <span className="font-bold text-gray-900 block text-lg">
                              {target.extracted_professors.name}
                            </span>
                            <span className="text-sm font-semibold text-gray-600 block">
                              {target.extracted_professors.title}
                            </span>
                          </div>
                          <div>
                            <span className="px-3 py-1 text-xs font-bold rounded-md bg-yellow-200 text-yellow-900 border border-yellow-400">
                              {target.status}
                            </span>
                          </div>
                        </div>
                      ))}
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