import { NextRequest, NextResponse } from 'next/server';
import { stat, open } from 'fs/promises';
import path from 'path';
import { verifySignedAttachmentDownloadToken, isAppAuthDisabled } from '@/lib/auth';
import { getAccessScope } from '@/lib/access';
import { ATTACHMENT_DIR } from '@/lib/mail';

// Reject `.`, `..`, and anything containing slashes or null bytes
function isSafeSegment(segment: string): boolean {
  if (segment === '.' || segment === '..') return false;
  if (segment.length === 0 || segment.length > 255) return false;
  if (/[/\\\x00]/.test(segment)) return false;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ downloadId: string; filename: string }> },
) {
  const scope = await getAccessScope();
  if (!scope) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { downloadId, filename } = await params;
  const token = request.nextUrl.searchParams.get('token');

  if (!isSafeSegment(downloadId) || !isSafeSegment(filename)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const downloadToken = await verifySignedAttachmentDownloadToken(token, process.env);
  if (
    !downloadToken ||
    downloadToken.downloadId !== downloadId ||
    downloadToken.filename !== filename ||
    (downloadToken.ownerUserId !== null && downloadToken.ownerUserId !== scope.userId) ||
    (downloadToken.ownerUserId === null && !isAppAuthDisabled(process.env))
  ) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const filePath = path.join(ATTACHMENT_DIR, downloadId, filename);

  // Verify resolved path is strictly within ATTACHMENT_DIR
  const base = path.resolve(ATTACHMENT_DIR);
  const resolved = path.resolve(filePath);
  const relative = path.relative(base, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
    const info = await stat(resolved);
    if (!info.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Stream the file instead of loading entirely into memory
    const fileHandle = await open(resolved, 'r');
    const stream = fileHandle.createReadStream();

    // Convert Node ReadableStream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => controller.enqueue(chunk));
        stream.on('end', () => {
          void fileHandle.close().catch(() => {});
          controller.close();
        });
        stream.on('error', (err) => {
          void fileHandle.close().catch(() => {});
          controller.error(err);
        });
      },
      cancel() {
        stream.destroy();
        void fileHandle.close().catch(() => {});
      },
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '\\"')}"`,
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(info.size),
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
