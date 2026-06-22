import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Trash2, Pencil } from 'lucide-react';
import moment from 'moment';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const AUDIT_PREFIX = '__audit__';

export default function CommentSection({ propertyId, initialComments }) {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', propertyId],
    queryFn: () => base44.entities.Comment.filter({ property_id: propertyId }, '-created_date', 50),
    initialData: initialComments,
    enabled: !!propertyId,
  });
  const visibleComments = comments.filter((comment) => !comment.commentaire?.startsWith(AUDIT_PREFIX));

  const addComment = useMutation({
    mutationFn: (data) => base44.entities.Comment.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['comments', propertyId] }); setText(''); },
  });

  const updateComment = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Comment.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['comments', propertyId] }); setEditId(null); },
  });

  const deleteComment = useMutation({
    mutationFn: (id) => base44.entities.Comment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', propertyId] }),
  });

  const handleSubmit = () => {
    if (!text.trim()) return;
    const authorName =
      user?.full_name ||
      user?.user_metadata?.full_name ||
      user?.email ||
      'Anonyme';

    addComment.mutate({ property_id: propertyId, commentaire: text, author_name: authorName });
  };

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="font-heading font-semibold text-sm">Commentaires ({visibleComments.length})</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex gap-3">
          <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Ajouter un commentaire..."
            className="bg-background border-border resize-none min-h-[60px]" />
          <Button onClick={handleSubmit} disabled={!text.trim()} size="icon" className="shrink-0 self-end">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {visibleComments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun commentaire pour le moment</p>
        )}
        <div className="space-y-3">
          {visibleComments.map(c => (
            <div key={c.id} className="bg-background rounded-lg p-4 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                    {(c.author_name || 'A')[0]}
                  </div>
                  <span className="text-xs font-medium">{c.author_name || 'Anonyme'}</span>
                  <span className="text-xs text-muted-foreground">{moment(c.created_date).fromNow()}</span>
                </div>
                {(c.created_by_id === user?.id || isAdmin) && (
                  <div className="flex items-center gap-1">
                    {c.created_by_id === user?.id && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditId(c.id); setEditText(c.commentaire); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce commentaire ?</AlertDialogTitle>
                          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteComment.mutate(c.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
              {editId === c.id ? (
                <div className="flex gap-2">
                  <Textarea value={editText} onChange={e => setEditText(e.target.value)} className="bg-card border-border resize-none min-h-[40px] text-sm" />
                  <div className="flex flex-col gap-1">
                    <Button size="sm" onClick={() => updateComment.mutate({ id: c.id, data: { commentaire: editText } })}>OK</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>✕</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-foreground/80">{c.commentaire}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
