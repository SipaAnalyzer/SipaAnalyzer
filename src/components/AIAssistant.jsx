import { useMemo, useState } from 'react';
import { Bot, ChevronDown, Loader2, Send, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const MODEL = 'deepseek/deepseek-v4-flash';
const PUTER_SCRIPT_SRC = 'https://js.puter.com/v2/';

const SYSTEM_PROMPT = `Tu es l'assistant IA de SIPA Analyzer.
Tu aides un utilisateur a comprendre et utiliser l'application: biens immobiliers, analyses financieres, comparaison, presentation, alertes, favoris, exports PDF et administration.
Reponds en francais, de maniere courte, concrete et operationnelle.
Si la question concerne une decision financiere ou juridique, precise que tu aides a analyser mais que l'utilisateur doit verifier les donnees et consulter un professionnel si necessaire.`;

const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    content: "Bonjour, je suis l'assistant SIPA. Je peux aider a utiliser l'app, preparer une analyse ou expliquer un indicateur.",
  },
];

function buildPrompt(messages, input) {
  const history = messages
    .slice(-8)
    .map((message) => `${message.role === 'user' ? 'Utilisateur' : 'Assistant'}: ${message.content}`)
    .join('\n\n');

  return `${SYSTEM_PROMPT}\n\nHistorique:\n${history}\n\nUtilisateur: ${input}\n\nAssistant:`;
}

function readPuterContent(response) {
  return (
    response?.message?.content ||
    response?.text ||
    response?.content ||
    String(response || '')
  );
}

function loadPuter() {
  if (window.puter?.ai?.chat) {
    return Promise.resolve(window.puter);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${PUTER_SCRIPT_SRC}"]`);

    const waitForPuter = () => {
      const startedAt = Date.now();
      const interval = window.setInterval(() => {
        if (window.puter?.ai?.chat) {
          window.clearInterval(interval);
          resolve(window.puter);
          return;
        }

        if (Date.now() - startedAt > 10000) {
          window.clearInterval(interval);
          reject(new Error("Le service IA n'a pas pu se charger. Verifie la connexion puis reessaie."));
        }
      }, 100);
    };

    if (existingScript) {
      waitForPuter();
      return;
    }

    const script = document.createElement('script');
    script.src = PUTER_SCRIPT_SRC;
    script.async = true;
    script.onload = waitForPuter;
    script.onerror = () => reject(new Error("Impossible de charger le service IA Puter."));
    document.body.appendChild(script);
  });
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const sendMessage = async (event) => {
    event?.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setError('');
    setInput('');
    setLoading(true);

    const nextMessages = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);

    try {
      const puter = await loadPuter();

      const response = await puter.ai.chat(buildPrompt(messages, question), {
        model: MODEL,
      });

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: readPuterContent(response) },
      ]);
    } catch (err) {
      setError(err.message || "Impossible de contacter l'assistant IA.");
      setMessages((current) => current.filter((message) => message.content !== question || message.role !== 'user'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="fixed bottom-4 left-4 z-50 w-[min(calc(100vw-2rem),400px)] pointer-events-none">
      {open && (
        <div className="mb-3 overflow-hidden rounded-xl border border-border bg-card/95 text-card-foreground shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-card/90 pointer-events-auto">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold leading-none">Assistant IA</h2>
                <p className="mt-1 text-xs text-muted-foreground">DeepSeek via Puter</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Effacer la conversation"
                onClick={() => {
                  setMessages(INITIAL_MESSAGES);
                  setError('');
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Reduire"
                onClick={() => setOpen(false)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-[360px] space-y-3 overflow-y-auto p-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-lg px-3 py-2 text-sm leading-6 ${
                  message.role === 'user'
                    ? 'ml-8 bg-primary text-primary-foreground'
                    : 'mr-8 bg-background/80 text-foreground'
                }`}
              >
                {message.content}
              </div>
            ))}
            {loading && (
              <div className="mr-8 flex items-center gap-2 rounded-lg bg-background/80 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reflexion en cours...
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="border-t border-border p-3">
            {error && (
              <p className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(event);
                  }
                }}
                className="max-h-28 min-h-11 resize-none bg-background/70 text-sm"
                placeholder="Pose une question sur SIPA Analyzer..."
              />
              <Button type="submit" size="icon" className="h-11 w-11 shrink-0" disabled={!canSend}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 items-center gap-2 rounded-full border border-border bg-card/95 px-4 text-sm font-medium text-card-foreground shadow-xl backdrop-blur transition hover:border-primary/50 hover:text-primary pointer-events-auto"
        aria-expanded={open}
      >
        <Sparkles className="h-4 w-4" />
        <span>Assistant IA</span>
      </button>
    </section>
  );
}
