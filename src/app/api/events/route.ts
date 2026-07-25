import { getAuthUser } from '@/lib/auth';
import { realtimeEmitter } from '@/lib/event-emitter';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const listener = (data: { resource: string; event: string; userId?: string | null }) => {
        if (!data.userId || data.userId === user.id) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (e) {
            // Stream closed
          }
        }
      };

      realtimeEmitter.on('change', listener);

      // Send initial keep-alive ping
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch (e) {
          clearInterval(interval);
        }
      }, 25000);

      return () => {
        realtimeEmitter.off('change', listener);
        clearInterval(interval);
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
