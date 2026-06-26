import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download } from 'lucide-react';

const SECTIONS = [
  { key: 'property', label: 'Informations du bien' },
  { key: 'financial', label: 'Synthèse financière' },
  { key: 'banks', label: 'Scénarios bancaires' },
];

export default function PdfExportDialog({ onExport, children, ...triggerProps }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState({
    property: true,
    financial: true,
    banks: true,
  });

  const toggle = (key) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = () => {
    onExport(selected);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild {...triggerProps}>
        {children || (
          <Button size="sm" variant="outline" className="gap-2">
            <Download className="h-3.5 w-3.5" />
            PDF analyse
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Exporter en PDF</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {SECTIONS.map((section) => (
            <label key={section.key} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={selected[section.key]}
                onCheckedChange={() => toggle(section.key)}
              />
              <span className="text-sm">{section.label}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button size="sm" onClick={handleExport}>
            Exporter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
