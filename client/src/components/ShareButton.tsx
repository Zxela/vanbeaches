import { Check, Share2 } from 'lucide-react';
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
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-white transition-colors hover:bg-white/15"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-500" />
          <span>Copied!</span>
        </>
      ) : copyFailed ? (
        <span>Copy link</span>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </>
      )}
    </button>
  );
}
