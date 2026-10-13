import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { getErrorMessage, parseChallengeRpcError } from '../shared';

export async function POST(req: NextRequest) {
  try {
    const { challengeId } = await req.json();

    if (!challengeId) {
      return NextResponse.json({ error: 'challengeId is required' }, { status: 400 });
    }

    const auth = await requireUser(req);
    if (auth.error) {
      return auth.error;
    }
    const { supabase, user } = auth;

    const { data, error } = await supabase.rpc('end_goal_challenge', {
      p_challenge_id: challengeId,
    });

    if (error) {
      const parsed = parseChallengeRpcError(error.message);
      return NextResponse.json({ error: parsed.message, code: parsed.code }, { status: parsed.status });
    }

    let endedAt = new Date().toISOString();
    if (data && typeof data === 'object') {
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.ended_at) endedAt = row.ended_at;
    } else {
      const { data: room } = await supabase
        .from('challenge_rooms')
        .select('ended_at')
        .eq('id', challengeId)
        .maybeSingle();
      if (room?.ended_at) endedAt = room.ended_at;
    }

    return NextResponse.json({
      data: {
        challengeId,
        endedAt,
      },
    });
  } catch (error: unknown) {
    console.error('End challenge API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
