import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';

interface ShareButtonProps {
  beachName: string;
  beachId: string;
}

export function ShareButton({ beachName, beachId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

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
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-2 px-3 py-2 bg-sand-100 dark:bg-sand-700 hover:bg-sand-200 dark:hover:bg-sand-600 rounded-lg text-sm text-sand-700 dark:text-sand-300 transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-green-500" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </>
      )}
    </button>
  );
}
