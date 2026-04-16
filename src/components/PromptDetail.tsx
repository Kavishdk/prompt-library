import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Prompt, getPrompt } from '../services/api';
import { Loader2, ArrowLeft, Eye, Clock, Tag as TagIcon, Copy } from 'lucide-react';

export default function PromptDetail() {
  const { id } = useParams<{ id: string }>();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPrompt(id)
      .then(setPrompt)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const copyToClipboard = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-accent-gold)] w-8 h-8" /></div>;
  if (error || !prompt) return <div className="p-4 bg-red-950/30 text-red-400 border border-red-900/50 rounded-md m-4">{error || 'Prompt not found'}</div>;

  return (
    <div className="flex-1 flex flex-col w-full max-w-full animate-in fade-in duration-500">
      <header className="flex justify-between items-start mb-8 w-full">
        <div className="flex flex-col">
          <Link to="/prompts" className="inline-flex items-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Library
          </Link>
          <h1 className="font-serif text-[40px] leading-tight font-normal mb-1">{prompt.title}</h1>
          <div className="flex items-center gap-4 text-[10px] uppercase tracking-[2px] text-[var(--color-text-muted)] font-bold">
            <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(prompt.created_at).toLocaleString()}</span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5"><TagIcon size={12} /> {prompt.tags?.length || 0} Tags</span>
          </div>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap text-[13px] font-bold uppercase tracking-[1px] text-black bg-[var(--color-accent-gold)] px-6 py-3 rounded shadow-lg shadow-yellow-900/20 active:scale-95 transition-transform">
          <Eye className="w-4 h-4" />
          <span>{prompt.view_count} Visualizations</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-subtle)] overflow-hidden">
            <div className="p-4 bg-[rgba(255,255,255,0.02)] border-b border-[var(--color-border-subtle)] flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-text-muted)]">Source Content</span>
              <button
                onClick={copyToClipboard}
                className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-accent-gold)] hover:text-white transition-colors flex items-center gap-2"
              >
                {copied ? 'Copied!' : <><Copy size={12} /> Copy to Clipboard</>}
              </button>
            </div>
            <div className="p-8">
              <div className="bg-black/20 rounded p-6 text-[var(--color-text-primary)] font-mono text-sm leading-relaxed whitespace-pre-wrap border border-[var(--color-border-subtle)]">
                {prompt.content}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-subtle)] p-6">
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-[var(--color-text-muted)] mb-4">Metadata Analysis</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[11px] mb-2 font-bold uppercase tracking-wider text-[var(--color-text-primary)]">
                  <span>Complexity</span>
                  <span className="text-[var(--color-accent-gold)]">{prompt.complexity}/10</span>
                </div>
                <div className="h-1.5 bg-[#222] w-full rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--color-accent-gold)] transition-all duration-1000" style={{ width: `${(prompt.complexity / 10) * 100}%` }}></div>
                </div>
              </div>
              <div className="pt-4 border-t border-[var(--color-border-subtle)]">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Classification</div>
                <div className="flex flex-wrap gap-2">
                  {prompt.tags?.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded bg-[rgba(255,255,255,0.03)] border border-[var(--color-border-subtle)] text-[10px] text-[var(--color-text-primary)]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[rgba(76,175,80,0.05)] border border-[#4CAF50]/30 rounded-lg p-6">
            <div className="flex items-center gap-3 text-[#4CAF50] mb-2">
              <span className="w-2 h-2 bg-[#4CAF50] rounded-full animate-ping"></span>
              <span className="text-[10px] uppercase tracking-[2px] font-bold">Redis Live Feed</span>
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
              This prompt is currently being tracked in the high-speed Redis cache layer. View counts are updated in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
