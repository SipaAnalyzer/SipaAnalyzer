import { Activity, Clock, FileText, MessageSquare, Pencil } from 'lucide-react';
import moment from 'moment';

const AUDIT_PREFIX = '__audit__';

function formatDate(value) {
  if (!value) return 'N/A';
  return moment(value).format('DD MMM YYYY, HH:mm');
}

function formatValue(value) {
  if (value === undefined || value === null || value === '') return 'vide';
  if (typeof value === 'number') return value.toLocaleString('fr-CH');
  return String(value);
}

function parseAuditComment(comment) {
  if (!comment?.commentaire?.startsWith(AUDIT_PREFIX)) return null;

  try {
    return JSON.parse(comment.commentaire.slice(AUDIT_PREFIX.length));
  } catch (error) {
    console.warn('[Traceability] invalid audit comment:', error);
    return null;
  }
}

function summarizeChanges(changes = []) {
  return changes
    .slice(0, 4)
    .map((change) => `${change.label}: ${formatValue(change.before)} → ${formatValue(change.after)}`)
    .join(' · ');
}

function ActivityIcon({ type }) {
  const icons = {
    property: FileText,
    update: Pencil,
    analysis: Activity,
    comment: MessageSquare,
  };
  const Icon = icons[type] || Clock;
  return <Icon className="h-3.5 w-3.5" />;
}

function TraceRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-1">{value || 'N/A'}</p>
    </div>
  );
}

export default function TraceabilityPanel({ property, analyses = [], comments = [], userName = 'Utilisateur inconnu' }) {
  const createdAt = property?.created_at || property?.created_date;
  const updatedAt = property?.updated_at || property?.updated_date;
  const auditEvents = comments
    .map((comment) => {
      const audit = parseAuditComment(comment);
      if (!audit) return null;

      return {
        type: 'update',
        date: comment.created_at || comment.created_date,
        title: audit.type === 'analysis_update' ? 'Analyse modifiée' : 'Bien modifié',
        detail: summarizeChanges(audit.changes),
        actor: audit.actor_name,
      };
    })
    .filter(Boolean);

  const userComments = comments.filter((comment) => !comment.commentaire?.startsWith(AUDIT_PREFIX));

  const events = [
    createdAt && {
      type: 'property',
      date: createdAt,
      title: 'Bien créé',
      detail: property?.nom_bien,
    },
    ...auditEvents,
    ...analyses.map((analysis) => ({
      type: 'analysis',
      date: analysis.created_at || analysis.created_date,
      title: 'Analyse ajoutée',
      detail: `Score ${Math.round(analysis.score_global || 0)}/100 - Note ${analysis.note || 'N/A'}`,
    })),
    ...userComments.map((comment) => ({
      type: 'comment',
      date: comment.created_at || comment.created_date,
      title: 'Commentaire ajouté',
      detail: comment.author_name || 'Auteur inconnu',
    })),
  ]
    .filter(Boolean)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 8);

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <h3 className="font-heading font-semibold text-sm">Traçabilité</h3>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TraceRow label="Créé le" value={formatDate(createdAt)} />
          <TraceRow label="Dernière modification" value={formatDate(updatedAt)} />
          <TraceRow label="Utilisateur courant" value={userName} />
        </div>

        <div>
          <p className="text-xs font-medium mb-3">Historique récent</p>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité enregistrée.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event, index) => (
                <div key={`${event.type}-${event.date}-${index}`} className="flex gap-3">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ActivityIcon type={event.type} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{event.title}</p>
                      <span className="text-xs text-muted-foreground">{formatDate(event.date)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{event.detail}</p>
                    {event.actor && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">Par {event.actor}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
