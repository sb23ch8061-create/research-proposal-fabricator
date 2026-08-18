import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('qs_file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Parse the Excel file
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    
    // Convert to an array of arrays to easily bypass the QS metadata row
    const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    // The QS file has metadata on row 0, real headers on row 1, data starts on row 2
    const dataRows = rawData.slice(2);

    const universitiesPayload = [];

    for (const row of dataRows) {
      // Index 1 is Rank, Index 3 is Name, Index 4 is Country
      const rank = row[1];
      const name = row[3];
      const country = row[4];

      if (name) {
        universitiesPayload.push({
          ranking: rank ? String(rank) : "N/A",
          university_name: String(name).trim(),
          country: country ? String(country).trim() : "Unknown",
          city: "N/A" // QS Excel does not specify city, so we default it
        });
      }
    }

    if (universitiesPayload.length === 0) {
      return NextResponse.json({ success: false, error: "No valid university data found." }, { status: 400 });
    }

    // Supabase allows a max of 1000 rows per insert, so we batch it
    const batchSize = 900;
    for (let i = 0; i < universitiesPayload.length; i += batchSize) {
      const batch = universitiesPayload.slice(i, i + batchSize);
      const { error } = await supabase.from('qs_universities').insert(batch);
      if (error) throw error;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully seeded ${universitiesPayload.length} QS Ranked Universities into the database.` 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}