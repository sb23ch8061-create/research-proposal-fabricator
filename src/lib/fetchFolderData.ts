import { supabase } from "./supabase";

export async function fetchCompleteFolderDataset(folderId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  try {
    // 1. Fetch Folder Info
    const { data: folder, error: folderError } = await supabase
      .from('research_folders')
      .select('*')
      .eq('id', folderId)
      .single();
    if (folderError) throw folderError;

    // 2. Fetch Incomplete Targets (Queued, Processing, Failed)
    // We explicitly exclude COMPLETED because they are now Verified Profiles.
    const { data: queueData } = await supabase
      .from('research_queue')
      .select(`
        id, 
        status, 
        error_log, 
        extracted_professors (name, title, department_url)
      `)
      .eq('target_folder_id', folderId)
      .neq('status', 'COMPLETED');

    // 3. Fetch Completed Verified Profiles
    const { data: profiles } = await supabase
      .from('verified_profiles')
      .select('*')
      .eq('folder_id', folderId);

    const profileIds = profiles?.map(p => p.id) || [];

    // 4. Fetch Immutable AI Evidence for those profiles
    let evidence: any[] = [];
    if (profileIds.length > 0) {
      const { data: evData } = await supabase
        .from('professor_evidence')
        .select('*')
        .in('profile_id', profileIds);
      evidence = evData || [];
    }

    // 5. Fetch Folder-Specific Custom Columns
    const { data: customColumns } = await supabase
      .from('folder_custom_columns')
      .select('*')
      .eq('folder_id', folderId)
      .order('display_order', { ascending: true });

    // 6. Fetch Manual Edits & AI Overrides
    let manualEdits: any[] = [];
    if (profileIds.length > 0) {
      const { data: editData } = await supabase
        .from('professor_manual_edits')
        .select('*')
        .in('profile_id', profileIds);
      manualEdits = editData || [];
    }

    // Return the perfectly structured dataset
    return {
      success: true,
      data: {
        folder,
        incompleteQueue: queueData || [],
        profiles: profiles || [],
        evidence,
        customColumns: customColumns || [],
        manualEdits
      }
    };

  } catch (error: any) {
    console.error("Failed to fetch folder dataset:", error);
    return { success: false, error: error.message };
  }
}