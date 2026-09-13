import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { requireAiQuota } from '@/lib/ai-quota';

const MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
]);

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth.error) return auth.error;

    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json({ error: 'Audio file must be at most 10MB' }, { status: 413 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio');

    if (!(audioFile instanceof File)) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }
    if (!ALLOWED_AUDIO_MIME_TYPES.has(audioFile.type)) {
      return NextResponse.json({ error: 'Unsupported audio format' }, { status: 415 });
    }
    if (audioFile.size <= 0 || audioFile.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json({ error: 'Audio file must be greater than 0 and at most 10MB' }, { status: 413 });
    }

    const mistralApiKey = process.env.MISTRAL_API_KEY;
    
    if (!mistralApiKey) {
      console.warn('MISTRAL_API_KEY not found, using fallback transcription');
      return NextResponse.json({ 
        text: '',
        fallback: true,
        message: 'Mistral API key not configured. Please use browser speech recognition.'
      }, { status: 200 });
    }

    const language = formData.get('language') === 'en' ? 'en' : 'ar';
    const quotaResponse = await requireAiQuota(auth.supabase, 'mistral', 'transcribe');
    if (quotaResponse) return quotaResponse;

    // Convert audio file to bytes (Uint8Array works on Node and Workers alike)
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = new Uint8Array(arrayBuffer);

    // Call Mistral Voxtral API for transcription
    const mistralFormData = new FormData();
    const fileName = audioFile.name || 'recording.webm';
    mistralFormData.append('file', new Blob([audioBuffer], { type: audioFile.type }), fileName);
    mistralFormData.append('model', 'voxtral-mini-latest');
    mistralFormData.append('language', language);

    const mistralResponse = await fetch('https://api.mistral.ai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mistralApiKey}`,
      },
      body: mistralFormData,
    });

    if (!mistralResponse.ok) {
      console.error('Mistral API error:', { status: mistralResponse.status });
      return NextResponse.json({
        error: mistralResponse.status === 429 ? 'provider_rate_limited' : 'transcription_failed',
        fallback: true
      }, { status: mistralResponse.status === 429 ? 429 : 502 });
    }

    const result = await mistralResponse.json();
    
    return NextResponse.json({
      text: result.text || '',
      language: result.language || 'ar',
      duration: result.duration,
      fallback: false
    });

  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      fallback: true
    }, { status: 500 });
  }
}
