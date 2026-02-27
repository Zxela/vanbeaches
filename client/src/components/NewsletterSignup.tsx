import { Mail } from 'lucide-react';
import { useState } from 'react';
import { Icon } from './ui';

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-sand-100 dark:bg-sand-800 p-8 md:p-10 border border-sand-200 dark:border-sand-700">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-ocean-100/50 dark:bg-ocean-900/20" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-shore-100/50 dark:bg-shore-900/20" />

      <div className="relative z-10 max-w-lg mx-auto text-center">
        <div className="w-12 h-12 rounded-xl bg-ocean-100 dark:bg-ocean-900/30 flex items-center justify-center mx-auto mb-4">
          <Icon icon={Mail} size="xl" className="text-ocean-500" />
        </div>
        <h3 className="text-xl font-bold text-sand-900 dark:text-sand-100">
          Never miss a perfect beach day
        </h3>
        <p className="text-sand-500 dark:text-sand-400 mt-2 text-sm">
          Get weekly beach conditions and seasonal tips delivered to your inbox.
        </p>

        {submitted ? (
          <p className="mt-6 text-emerald-600 dark:text-emerald-400 font-medium">
            Thanks! We'll be in touch.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex gap-2 max-w-sm mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-4 py-2.5 bg-white dark:bg-sand-700 border border-sand-200 dark:border-sand-600 rounded-xl text-sand-900 dark:text-sand-100 placeholder-sand-400 dark:placeholder-sand-500 focus:outline-none focus:ring-2 focus:ring-ocean-500 text-sm"
            />
            <button
              type="submit"
              className="bg-ocean-500 hover:bg-ocean-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
