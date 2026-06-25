import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Loader2, Bot, User, X } from 'lucide-react';

export default function ChatBot({ property, analysis, properties, floating = true }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const context = properties ? buildChatContext({ properties }) : buildChatContext({ property, analysis });
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `${context}\n\nQuestion de l'utilisateur :\n${userMsg}`,
        provider: 'groq',
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.analysis_text },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Erreur : ${err?.message || 'Impossible de contacter l\'IA.'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (floating && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        title="Ouvrir le chat IA"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    );
  }

  if (floating) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-primary/5">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Assistant IA (Groq)</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px] min-h-[200px]">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {properties?.length > 0 ? 'Posez une question sur ces biens comparés.' : property ? 'Posez une question sur ce bien ou son analyse.' : 'Posez votre question sur les biens immobiliers.'}
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role !== 'user' && (
              <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5" />
              </div>
            )}
            <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-foreground'}`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-lg px-3 py-2 text-sm bg-secondary/50">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Posez votre question..."
          className="bg-background border-border text-sm h-10"
          disabled={loading}
        />
        <Button size="icon" onClick={send} disabled={!input.trim() || loading} className="h-10 w-10 shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold text-sm">Assistant IA</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-2"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Ouvrir le chat
        </Button>
      </div>
      {open && (
        <div className="border-t border-border">
          <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto min-h-[200px]">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
            {properties?.length > 0 ? 'Posez une question sur ces biens comparés.' : property ? 'Posez une question sur ce bien ou son analyse.' : 'Posez votre question sur les biens immobiliers.'}
              </p>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role !== 'user' && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-foreground'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                  <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="rounded-lg px-3 py-2 text-sm bg-secondary/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-border p-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Posez votre question..."
              className="bg-background border-border text-sm h-10"
              disabled={loading}
            />
            <Button size="icon" onClick={send} disabled={!input.trim() || loading} className="h-10 w-10 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildChatContext({ property, analysis, properties }) {
  if (properties && properties.length > 0) {
    const lines = ['Contexte des biens immobiliers comparés :'];
    properties.forEach((p, i) => {
      const a = p.analysis;
      lines.push(`\nBien ${i + 1} : ${p.nom_bien || 'N/A'} à ${p.ville || 'N/A'}${p.canton ? `, ${p.canton}` : ''}`);
      if (a) {
        lines.push(`  - Prix total : ${a.prix_total || 0} CHF · Rdt brut : ${a.rendement_brut || 0}% · Rdt net/FP : ${a.rendement_net_fonds_propres || 0}% · Score : ${a.score_global || 0}/100`);
      }
    });
    return lines.join('\n');
  }

  if (!property && !analysis) return '';
  return [
    'Contexte du bien immobilier analysé :',
    property ? `- Bien : ${property.nom_bien || 'N/A'} à ${property.ville || 'N/A'}${property.canton ? `, ${property.canton}` : ''}` : '',
    property?.annee_construction ? `- Année de construction : ${property.annee_construction}` : '',
    property?.surface ? `- Surface : ${property.surface} m²` : '',
    property?.nombre_logements ? `- Logements : ${property.nombre_logements}` : '',
    analysis ? 'Données financières de l\'analyse :' : '',
    analysis ? `- Prix total : ${analysis.prix_total || 0} CHF` : '',
    analysis ? `- Fonds propres : ${analysis.fonds_propres || 0} CHF` : '',
    analysis ? `- Hypothèque : ${analysis.hypotheque || 0} CHF` : '',
    analysis ? `- Rendement brut : ${analysis.rendement_brut || 0}%` : '',
    analysis ? `- Rendement net/FP : ${analysis.rendement_net_fonds_propres || 0}%` : '',
    analysis ? `- Score global : ${analysis.score_global || 0}/100` : '',
  ].filter(Boolean).join('\n');
}
