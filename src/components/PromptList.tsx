import { useEffect, useState } from 'react';
import { PromptListResponse, getPrompts, getTags } from '../services/api';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Tag as TagIcon, Clock, Hash } from 'lucide-react';

export default function PromptList() {
  const [searchParams] = useSearchParams();
  const selectedTag = searchParams.get('tag') || undefined;

  const [prompts, setPrompts] = useState<PromptListResponse[]>([]);
  const [tags, setTags] = useState<{ id: string, name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        const [promptsData, tagsData] = await Promise.all([
          getPrompts(selectedTag),
          getTags()
        ]);
        setPrompts(promptsData);
        setTags(tagsData);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedTag]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--color-accent-gold)] w-8 h-8" /></div>;
  if (error) return <div className="p-4 bg-red-950/30 text-red-400 border border-red-900/50 rounded-md m-4">{error}</div>;

  return (
    <div className="flex-1 flex flex-col w-full max-w-full">
      <header className="flex justify-between items-end mb-10 w-full">
        <div className="flex flex-col">
          <h1 className="font-serif text-[32px] font-normal mb-1">Curated Library</h1>
          <p className="text-[var(--color-text-muted)] text-sm">Manage and optimize your generative image prompts.</p>
        </div>
        <Link
          to="/add"
          className="bg-[var(--color-accent-gold)] text-black px-5 py-2.5 rounded text-[13px] font-semibold uppercase tracking-[0.5px] border-none transition-opacity hover:opacity-90 active:scale-95"
        >
          + New Prompt
        </Link>
      </header>

      {/* Tag Filter Bar */}
      <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <TagIcon size={14} className="text-[var(--color-text-muted)] shrink-0" />
        <Link
          to="/prompts"
          className={`px-3 py-1 rounded-full text-[11px] uppercase tracking-wider font-bold transition-all border ${!selectedTag ? 'bg-[var(--color-accent-gold)] text-black border-[var(--color-accent-gold)]' : 'border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-text-primary)]'}`}
        >
          All
        </Link>
        {tags.map(t => (
          <Link
            key={t.id}
            to={`/prompts?tag=${t.name}`}
            className={`px-3 py-1 rounded-full text-[11px] uppercase tracking-wider font-bold transition-all border whitespace-nowrap ${selectedTag === t.name ? 'bg-[var(--color-accent-gold)] text-black border-[var(--color-accent-gold)]' : 'border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-text-primary)]'}`}
          >
            {t.name}
          </Link>
        ))}
      </div>

      {prompts.length === 0 ? (
        <div className="text-center py-20 bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-subtle)]">
          <Hash className="w-12 h-12 text-[var(--color-border-subtle)] mx-auto mb-4" />
          <p className="text-[var(--color-text-muted)] mb-4">No prompts found for this category.</p>
          <Link to="/add" className="text-[var(--color-accent-gold)] hover:underline text-sm font-bold uppercase tracking-wider">Create a prompt</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {prompts.map((prompt) => (
            <Link
              key={prompt.id}
              to={`/prompts/${prompt.id}`}
              className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] p-6 rounded-lg relative hover:border-[var(--color-accent-gold)] transition-all group block active:scale-[0.98]"
            >
              <div className="absolute top-6 right-6 flex items-center gap-1.5 text-[10px] text-[#4CAF50] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-[#4CAF50] rounded-full animate-pulse"></span> Live
              </div>
              <div className="flex justify-between mb-4 text-[10px] uppercase tracking-[1.5px] text-[var(--color-text-muted)] font-bold">
                <span className="flex items-center gap-1"><Clock size={10} /> {new Date(prompt.created_at).toLocaleDateString()}</span>
              </div>
              <h3 className="font-serif text-[20px] mb-3 font-normal text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-gold)] transition-colors">{prompt.title}</h3>

              <div className="flex flex-wrap gap-1.5 mb-5 h-6">
                {prompt.tags?.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[rgba(255,255,255,0.05)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                    {tag}
                  </span>
                ))}
                {(prompt.tags?.length || 0) > 3 && <span className="text-[9px] text-[var(--color-text-muted)]">+{prompt.tags!.length - 3}</span>}
              </div>

              <div className="flex gap-4 pt-4 border-t border-[var(--color-border-subtle)] items-center">
                <div className="text-[10px] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 rounded-[100px] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] font-bold uppercase tracking-wider">
                  Comp: <span className="text-[var(--color-accent-gold)]">{prompt.complexity}</span>
                </div>
                <div className="flex-1">
                  <div className="h-1 bg-[#222] w-full rounded-full relative">
                    <div className="h-full bg-[var(--color-accent-gold)] rounded-full transition-all duration-500" style={{ width: `${(prompt.complexity / 10) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <footer className="mt-auto pt-5 border-t border-[var(--color-border-subtle)] flex justify-between items-center w-full">
        <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold">
          PostgreSQL <span className="text-green-500">Connected</span> &nbsp; Redis <span className="text-green-500">Active</span>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-bold">
          {prompts.length} Prompts Managed
        </div>
      </footer>
    </div>
  );
}
