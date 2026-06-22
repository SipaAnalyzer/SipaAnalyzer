import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function UserNotRegisteredError() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card rounded-xl border border-border p-8 text-center shadow-xl">
        <div className="inline-flex items-center justify-center w-14 h-14 mb-6 rounded-lg bg-primary/15 text-primary">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h1 className="font-heading text-2xl font-bold mb-3">
          Accès en attente
        </h1>

        <p className="text-sm text-muted-foreground mb-6">
          Compte créé avec succès. Veuillez contacter votre administrateur afin qu'il vous attribue un rôle, puis rechargez la page.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1 gap-2" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Recharger
          </Button>

          <Button
            className="flex-1 gap-2"
            variant="outline"
            onClick={() => base44.auth.logout('/login')}
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </div>
    </div>
  );
}
