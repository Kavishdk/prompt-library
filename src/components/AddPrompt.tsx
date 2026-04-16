import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { createPrompt, getTags } from '../services/api';
import { ArrowLeft, Send, Tag as TagIcon } from 'lucide-react';
import { cn } from '../lib/utils';

type FormData = {
  title: string;
  content: string;
  complexity: number;
  tags: string[];
};

export default function AddPrompt() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username');

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      complexity: 5,
      tags: []
    }
  });

  const complexityValue = watch('complexity');
  const [apiError, setApiError] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<{ id: string, name: string }[]>([]);

  useEffect(() => {
    if (!username) {
      navigate('/login');
      return;
    }
    getTags().then(setAvailableTags).catch(console.error);
  }, [username, navigate]);

  const onSubmit = async (data: FormData) => {
    try {
      setApiError(null);
      const res = await createPrompt({
        title: data.title,
        content: data.content,
        complexity: Number(data.complexity),
        tags: data.tags
      });
      navigate(`/prompts/${res.id}`);
    } catch (e: any) {
      setApiError(e.message);
    }
  };

  if (!username) return null;

  return (
    <div className="flex-1 flex flex-col w-full max-w-full">
      <header className="flex justify-between items-end mb-10 w-full">
        <div className="flex flex-col">
          <Link to="/prompts" className="inline-flex items-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Library
          </Link>
          <h1 className="font-serif text-[32px] font-normal mb-1">Create New</h1>
          <p className="text-[var(--color-text-muted)] text-sm">Add a new prompt to your managed library.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-subtle)] p-6 sm:p-8">
          {apiError && (
            <div className="p-4 bg-red-950/30 text-red-400 rounded-md mb-8 text-sm border border-red-900/50">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-xs uppercase tracking-wider font-medium text-[var(--color-text-muted)] mb-2">
                Title <span className="text-[var(--color-accent-gold)]">*</span>
              </label>
              <input
                id="title"
                type="text"
                {...register('title', {
                  required: 'Title is required',
                  minLength: { value: 3, message: 'Title must be at least 3 characters' }
                })}
                className={cn(
                  "block w-full bg-[rgba(255,255,255,0.03)] rounded border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-gold)] focus:ring-1 focus:ring-[var(--color-accent-gold)] sm:text-sm px-4 py-3 text-[var(--color-text-primary)] outline-none transition-colors",
                  errors.title && "border-red-500 focus:border-red-500 focus:ring-red-500"
                )}
                placeholder="e.g., Cyberpunk Cityscape"
              />
              {errors.title && <p className="mt-2 text-xs text-red-500">{errors.title.message}</p>}
            </div>

            <div>
              <label htmlFor="content" className="block text-xs uppercase tracking-wider font-medium text-[var(--color-text-muted)] mb-2">
                Prompt Content <span className="text-[var(--color-accent-gold)]">*</span>
              </label>
              <textarea
                id="content"
                rows={5}
                {...register('content', {
                  required: 'Content is required',
                  minLength: { value: 20, message: 'Content must be at least 20 characters' }
                })}
                className={cn(
                  "block w-full bg-[rgba(255,255,255,0.03)] rounded border border-[var(--color-border-subtle)] focus:border-[var(--color-accent-gold)] focus:ring-1 focus:ring-[var(--color-accent-gold)] sm:text-sm px-4 py-3 text-[var(--color-text-primary)] font-mono outline-none transition-colors",
                  errors.content && "border-red-500 focus:border-red-500 focus:ring-red-500"
                )}
                placeholder="A highly detailed illustration of a futuristic city..."
              />
              {errors.content && <p className="mt-2 text-xs text-red-500">{errors.content.message}</p>}
            </div>

            <div className="pt-4 border-t border-[var(--color-border-subtle)]">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex justify-center items-center py-2.5 px-6 border border-transparent rounded text-[13px] uppercase tracking-[0.5px] font-semibold text-black bg-[var(--color-accent-gold)] hover:opacity-90 transition-opacity focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : <><Send className="w-4 h-4 mr-2" /> Save Prompt</>}
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-subtle)] p-6">
            <label className="block text-xs uppercase tracking-wider font-medium text-[var(--color-text-muted)] mb-4 flex items-center gap-2">
              <TagIcon size={14} /> Tagging System
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <label key={tag.id} className="cursor-pointer">
                  <input
                    type="checkbox"
                    value={tag.name}
                    {...register('tags')}
                    className="hidden peer"
                  />
                  <span className="px-3 py-1.5 rounded-full border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)] peer-checked:bg-[var(--color-accent-gold)] peer-checked:text-black peer-checked:border-[var(--color-accent-gold)] transition-all block">
                    {tag.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-lg border border-[var(--color-border-subtle)] p-6">
            <label htmlFor="complexity" className="block text-xs uppercase tracking-wider font-medium text-[var(--color-text-muted)] mb-4">
              Complexity Level
            </label>
            <input
              id="complexity"
              type="range"
              min="1"
              max="10"
              {...register('complexity')}
              className="w-full accent-[var(--color-accent-gold)]"
            />
            <div className="flex justify-between mt-2 text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest font-bold">
              <span>Simple</span>
              <span className="text-[var(--color-accent-gold)] text-sm">Value: {complexityValue}</span>
              <span>Advanced</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
