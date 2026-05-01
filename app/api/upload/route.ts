import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseFile } from '@/lib/parsers';
import { extractRequirements } from '@/lib/llm';
import { ExtractionOptions } from '@/lib/types';
import { getOrgMember } from '@/lib/auth/permissions';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = req.headers.get('x-org-id');
  if (!orgId) return NextResponse.json({ error: 'x-org-id header required' }, { status: 400 });

  const membership = await getOrgMember(supabase, user.id, orgId);
  if (!membership?.can_upload) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const pastedText = formData.get('text') as string | null;
  const optionsRaw = formData.get('options') as string;

  let options: ExtractionOptions;
  try { options = JSON.parse(optionsRaw); }
  catch { return NextResponse.json({ error: 'Invalid options JSON' }, { status: 400 }); }

  let rawText = '';
  let pdfBuffer: Buffer | undefined;
  let documentName = 'Pasted text';
  let sourceType = 'paste';
  let storagePath: string | null = null;

  if (file) {
    documentName = file.name;
    sourceType = file.name.split('.').pop()?.toLowerCase() ?? 'txt';
    const buffer = Buffer.from(await file.arrayBuffer());
    try { rawText = await parseFile(buffer, sourceType); }
    catch (err) { return NextResponse.json({ error: `Failed to parse file: ${err instanceof Error ? err.message : String(err)}` }, { status: 422 }); }

    if (!rawText.trim() && sourceType === 'pdf') pdfBuffer = buffer;

    const uploadPath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: se } = await supabase.storage.from('documents').upload(uploadPath, buffer);
    if (!se) storagePath = uploadPath;
  } else if (pastedText) {
    rawText = pastedText;
  } else {
    return NextResponse.json({ error: 'No content provided' }, { status: 400 });
  }

  if (!rawText.trim() && !pdfBuffer) {
    return NextResponse.json({ error: 'Document appears to be empty' }, { status: 422 });
  }

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({ user_id: user.id, org_id: orgId, name: documentName, source_type: sourceType, storage_path: storagePath, raw_text: rawText || null, status: 'processing' })
    .select().single();

  if (docError) return NextResponse.json({ error: docError.message }, { status: 500 });

  try {
    const result = await extractRequirements(rawText, options, documentName, pdfBuffer);
    const rows = result.requirements.map(r => ({
      document_id: doc.id, user_id: user.id, org_id: orgId,
      text: r.text, source_quote: r.source_quote, source_page: r.source_page,
      type: r.type, category: r.category, priority: r.priority,
      confidence: r.confidence, is_ambiguous: r.is_ambiguous,
    }));
    if (rows.length > 0) await supabase.from('requirements').insert(rows);
    await supabase.from('documents').update({ status: 'done', req_count: rows.length }).eq('id', doc.id);
    return NextResponse.json({ documentId: doc.id, count: rows.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase.from('documents').update({ status: 'error', error_msg: msg }).eq('id', doc.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
