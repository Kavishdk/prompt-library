import { useState } from 'react';
import { login, register as registerApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus } from 'lucide-react';

export default function Auth({ mode }: { mode: 'login' | 'register' }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (mode === 'login') {
                await login(username, password);
                navigate('/prompts');
                window.location.reload(); // Refresh to update Sidebar state
            } else {
                await registerApi(username, password);
                navigate('/login');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-md bg-[var(--color-bg-card)] p-8 rounded-lg border border-[var(--color-border-subtle)]">
                <h1 className="font-serif text-2xl mb-6 text-center">
                    {mode === 'login' ? 'Welcome Back' : 'Join the Library'}
                </h1>

                {error && <div className="mb-4 p-3 bg-red-950/30 text-red-400 border border-red-900/50 rounded text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--color-border-subtle)] rounded px-4 py-2 text-sm outline-none focus:border-[var(--color-accent-gold)]"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-[rgba(255,255,255,0.03)] border border-[var(--color-border-subtle)] rounded px-4 py-2 text-sm outline-none focus:border-[var(--color-accent-gold)]"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[var(--color-accent-gold)] text-black py-2.5 rounded font-semibold uppercase tracking-wider text-xs hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Processing...' : (
                            mode === 'login' ? <><LogIn size={16} /> Login</> : <><UserPlus size={16} /> Register</>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <button
                        onClick={() => navigate(mode === 'login' ? '/register' : '/login')}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-accent-gold)]"
                    >
                        {mode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
                    </button>
                </div>
            </div>
        </div>
    );
}
