import { Check, Upload } from 'lucide-react';
import { useState } from 'react';

interface ShareButtonProps {
  beachName: string;
  beachId: string;
}

export function ShareButton({ beachName, beachId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/beach/${beachId}`;
    const text = `Check out ${beachName} conditions on Van Beaches!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: beachName, text, url });
      } catch {
        // User cancelled or error
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setCopyFailed(false);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopyFailed(true);
        window.prompt('Copy this beach link:', url);
        setTimeout(() => setCopyFailed(false), 3000);
      }
    }
  };

  return (
    <button type="button" onClick={handleShare} className="header-control min-w-[96px]">
      {copied ? (
        <>
          <Check
            className="h-[18px] w-[18px] text-emerald-300"
            strokeWidth={1.7}
            aria-hidden="true"
          />
          <span>Copied!</span>
        </>
      ) : copyFailed ? (
        <span>Copy link</span>
      ) : (
        <>
          <Upload className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden="true" />
          <span>Share</span>
        </>
      )}
    </button>
  );
}
