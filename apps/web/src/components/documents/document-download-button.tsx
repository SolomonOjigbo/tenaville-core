'use client';

import { useState } from 'react';

import { Button } from '../ui';

/** Exchange a document reference for a short-lived link (DOC-6, DOC-7). */
export const DocumentDownloadButton = ({
  bucket,
  path,
  entityType,
  entityId,
  label = 'Download',
}: {
  readonly bucket: string;
  readonly path: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly label?: string;
}) => {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const download = async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/documents/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket, path, entityType, entityId }),
      });
      if (!response.ok) {
        setError('That file is not available.');
        return;
      }
      const body = (await response.json()) as { url?: unknown };
      if (typeof body.url !== 'string') {
        setError('That file is not available.');
        return;
      }
      window.open(body.url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Could not reach the document service.');
    } finally {
      setPending(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          void download();
        }}
        disabled={pending}
      >
        {pending ? 'Preparing…' : label}
      </Button>
      {error !== null && <span className="text-xs text-danger-text">{error}</span>}
    </span>
  );
};
