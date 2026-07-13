import { useEffect, useMemo, useState } from 'react';
import { CheckSquare, ChevronDown, Eraser, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const STORAGE_KEY = 'sipa.quickNotes';

export default function QuickNotes() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setNotes(localStorage.getItem(STORAGE_KEY) || '');
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, notes);
  }, [notes]);

  const noteStats = useMemo(() => {
    const lines = notes
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      lines: lines.length,
      tasks: lines.filter((line) => /^(\[ \]|\[x\]|-|•)/i.test(line)).length,
    };
  }, [notes]);

  return (
    <section className="fixed bottom-4 right-4 z-50 w-[min(calc(100vw-2rem),360px)] pointer-events-none">
      {open && (
        <div className="mb-3 overflow-hidden rounded-xl border border-border bg-card/95 text-card-foreground shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-card/90 pointer-events-auto">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <StickyNote className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold leading-none">Notes rapides</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {noteStats.lines} ligne{noteStats.lines > 1 ? 's' : ''}
                  {noteStats.tasks ? ` • ${noteStats.tasks} tâche${noteStats.tasks > 1 ? 's' : ''}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Effacer les notes"
                onClick={() => setNotes('')}
                disabled={!notes}
              >
                <Eraser className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Réduire"
                onClick={() => setOpen(false)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-3">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="min-h-[210px] resize-none bg-background/70 text-sm leading-6"
              placeholder={'Ex :\n- Appeler le client\n- Vérifier le prix\n- Exporter le PDF'}
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Sauvegarde automatique sur cet appareil.
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="ml-auto flex h-11 items-center gap-2 rounded-full border border-border bg-card/95 px-4 text-sm font-medium text-card-foreground shadow-xl backdrop-blur transition hover:border-primary/50 hover:text-primary pointer-events-auto"
        aria-expanded={open}
      >
        <CheckSquare className="h-4 w-4" />
        <span>Notes</span>
        {noteStats.lines > 0 && (
          <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            {noteStats.lines}
          </span>
        )}
      </button>
    </section>
  );
}
