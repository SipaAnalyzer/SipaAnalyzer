import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { calculateAnalysis, formatCHF, formatPercent, WORKFLOW_STATUSES } from '../utils/calculations';
import { extractAnalysisFieldsFromExcel, formatSipaValue } from '../utils/excelImport';
import { fetchSaronRate } from '../utils/saronRate';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ScoreGauge from './ScoreGauge';
import ScoreBadge from './ScoreBadge';
import ExcelProjectionTables, { createEmptyExcelProjections } from './ExcelProjectionTables';
import { Calculator, FileSpreadsheet, FileText, Landmark, MapPin, Plus, Save, Table, X } from 'lucide-react';

function InputField({ value, onChange, prefix, className }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
        className={`bg-background border-border ${prefix ? 'pl-10' : ''} ${className || ''}`}
      />
    </div>
  );
}

function PctRow({ label, amount, onAmount, pct, onPct }) {
  return (
    <tr>
      <td className="py-2 pr-4 text-sm">{label}</td>
      <td className="py-2 pl-4">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CHF</span>
            <Input
              type="number"
              value={amount ?? ''}
              onChange={(e) => onAmount?.(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
              className="bg-background border-border pl-10"
            />
          </div>
          <div className="relative w-24 shrink-0">
            <Input
              type="number"
              value={pct ?? ''}
              onChange={(e) => onPct?.(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
              className="bg-background border-border pr-8 text-right"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function AnalysisForm({ initialData, initialPropertyId, onSubmit, isSubmitting }) {
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 100),
  });

  const [form, setForm] = useState({
    property_id: initialPropertyId || '',
    statut: 'en_cours',
    prix_bien: null,
    versement_initial: null,
    amortissement_5_ans: null,
    honoraires_sipa: null,
    honoraires_sipa_pct: null,
    frais_dossier_bancaire: null,
    fonds_propres: null,
    hypotheque: null,
    hypotheque_pct: null,
    revenus_locatifs: null,
    charges_operationnelles: null,
    interets_hypothecaires: null,
    interets_hypothecaires_pct: null,
    gestion: null,
    gestion_pct: null,
    impot: null,
    impot_pct: null,
    notes: '',
    sipa_data: null,
    banque_a_taux_hypothecaire: null,
    banque_a_type_taux: 'fixe',
    banque_a_marge_saron: 0.5,
    banque_a_amortissement_annuel: null,
    banque_a_evaluation: '',
    banque_b_taux_hypothecaire: null,
    banque_b_type_taux: 'fixe',
    banque_b_marge_saron: 0.5,
    banque_b_amortissement_annuel: null,
    banque_b_evaluation: '',
    etat_batiment: '',
    emplacement_bien: '',
    operating_projection: createEmptyExcelProjections().operating_projection,
    capital_projection: createEmptyExcelProjections().capital_projection,
  });

  useEffect(() => {
    if (!initialData) return;
    setForm((prev) => {
      const data = { ...prev, ...initialData };
      const prixTotal = Number(data.prix_bien || 0) + Number(data.versement_initial || 0) + Number(data.amortissement_5_ans || 0) + Number(data.honoraires_sipa || 0) + Number(data.frais_dossier_bancaire || 0);
      const revenuNet = Number(data.revenus_locatifs || 0) - Number(data.charges_operationnelles || 0) - Number(data.interets_hypothecaires || 0) - Number(data.gestion || 0);
      if (Number(data.prix_bien) > 0 && data.honoraires_sipa != null) data.honoraires_sipa_pct = Math.round((data.honoraires_sipa / data.prix_bien) * 10000) / 100;
      if (prixTotal > 0 && data.hypotheque != null) data.hypotheque_pct = Math.round((data.hypotheque / prixTotal) * 10000) / 100;
      if (Number(data.hypotheque) > 0 && data.interets_hypothecaires != null) data.interets_hypothecaires_pct = Math.round((data.interets_hypothecaires / data.hypotheque) * 10000) / 100;
      if (Number(data.revenus_locatifs) > 0 && data.gestion != null) data.gestion_pct = Math.round((data.gestion / data.revenus_locatifs) * 10000) / 100;
      if (revenuNet > 0 && data.impot != null) data.impot_pct = Math.round((data.impot / revenuNet) * 10000) / 100;
      return data;
    });
  }, [initialData]);

  useEffect(() => {
    if (!initialData?.sipa_data) return;
    const custom = initialData.sipa_data.filter((e) => e._custom);
    if (custom.length > 0) {
      setCustomFinancialFields(
        custom.map((e) => {
          const amountVal = e.values?.find((v) => v.type === 'amount');
          const pctVal = e.values?.find((v) => v.type === 'pct');
          return {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: e.label,
            amount: amountVal?.value || 0,
            pct: pctVal?.value ?? null,
          };
        })
      );
    }
  }, [initialData]);

  const makeAmountHandler = useCallback((key, pctKey, getBase) => (value) => {
    setForm((prev) => {
      const base = getBase(prev);
      if (base && value !== null) {
        const pct = Math.round((value / base) * 10000) / 100;
        return { ...prev, [key]: value, [pctKey]: pct };
      }
      return { ...prev, [key]: value, [pctKey]: null };
    });
  }, []);

  const makePctHandler = useCallback((key, pctKey, getBase) => (value) => {
    setForm((prev) => {
      const base = getBase(prev);
      if (base && value !== null) {
        const amount = Math.round(base * value / 100);
        return { ...prev, [key]: amount, [pctKey]: value };
      }
      return { ...prev, [key]: null, [pctKey]: value };
    });
  }, []);

  const handlers = useMemo(() => {
    const honoraires = {
      amount: makeAmountHandler('honoraires_sipa', 'honoraires_sipa_pct', (s) => Number(s.prix_bien || 0)),
      pct: makePctHandler('honoraires_sipa', 'honoraires_sipa_pct', (s) => Number(s.prix_bien || 0)),
    };
    const hypotheque = {
      amount: makeAmountHandler('hypotheque', 'hypotheque_pct', (s) =>
        Number(s.prix_bien || 0) + Number(s.versement_initial || 0) + Number(s.amortissement_5_ans || 0) + Number(s.honoraires_sipa || 0) + Number(s.frais_dossier_bancaire || 0)
      ),
      pct: makePctHandler('hypotheque', 'hypotheque_pct', (s) =>
        Number(s.prix_bien || 0) + Number(s.versement_initial || 0) + Number(s.amortissement_5_ans || 0) + Number(s.honoraires_sipa || 0) + Number(s.frais_dossier_bancaire || 0)
      ),
    };
    const interets = {
      amount: makeAmountHandler('interets_hypothecaires', 'interets_hypothecaires_pct', (s) => Number(s.hypotheque || 0)),
      pct: makePctHandler('interets_hypothecaires', 'interets_hypothecaires_pct', (s) => Number(s.hypotheque || 0)),
    };
    const gestion = {
      amount: makeAmountHandler('gestion', 'gestion_pct', (s) => Number(s.revenus_locatifs || 0)),
      pct: makePctHandler('gestion', 'gestion_pct', (s) => Number(s.revenus_locatifs || 0)),
    };
    const impot = {
      amount: makeAmountHandler('impot', 'impot_pct', (s) => {
        const rev = Number(s.revenus_locatifs || 0);
        const ch = Number(s.charges_operationnelles || 0);
        const int = Number(s.interets_hypothecaires || 0);
        const ges = Number(s.gestion || 0);
        return rev - ch - int - ges;
      }),
      pct: makePctHandler('impot', 'impot_pct', (s) => {
        const rev = Number(s.revenus_locatifs || 0);
        const ch = Number(s.charges_operationnelles || 0);
        const int = Number(s.interets_hypothecaires || 0);
        const ges = Number(s.gestion || 0);
        return rev - ch - int - ges;
      }),
    };
    return { honoraires, hypotheque, interets, gestion, impot };
  }, [makeAmountHandler, makePctHandler]);

  const set = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectedProperty = properties.find((p) => p.id === form.property_id);

  const [activeTab, setActiveTab] = useState('financial');
  const [excelImportState, setExcelImportState] = useState({
    loading: false,
    message: '',
    error: '',
  });
  const [saronRate, setSaronRate] = useState(null);
  const [customLabels, setCustomLabels] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const [customFinancialFields, setCustomFinancialFields] = useState([]);
  const [newCustomFieldName, setNewCustomFieldName] = useState('');
  const [newCustomFieldAmount, setNewCustomFieldAmount] = useState('');
  const [newCustomFieldPct, setNewCustomFieldPct] = useState('');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchSaronRate().then((rate) => {
      if (!cancelled) setSaronRate(rate);
    });
    return () => { cancelled = true; };
  }, []);

  const calc = useMemo(() => calculateAnalysis({
    ...form,
    ville: selectedProperty?.ville,
    annee_construction: selectedProperty?.annee_construction,
  }), [form, selectedProperty]);

  const prixTotal = useMemo(() =>
    Math.round(
      Number(form.prix_bien || 0) +
      Number(form.versement_initial || 0) +
      Number(form.amortissement_5_ans || 0) +
      Number(form.honoraires_sipa || 0) +
      Number(form.frais_dossier_bancaire || 0)
    ),
  [form]);

  const handleSubmit = async () => {
    setSubmitError('');

    if (!form.property_id) {
      setSubmitError('Selectionne un bien avant d’enregistrer l’analyse.');
      return;
    }

    const customSipaData = customFinancialFields.length > 0
      ? customFinancialFields.map((cf) => ({
          label: cf.name,
          values: [{ type: 'amount', value: cf.amount }, ...(cf.pct != null ? [{ type: 'pct', value: cf.pct }] : [])],
          _custom: true,
        }))
      : [];

    const mergedSipaData = form.sipa_data
      ? [...form.sipa_data, ...customSipaData]
      : customSipaData.length > 0 ? customSipaData : null;

    const payload = {
      property_id: form.property_id,
      statut: form.statut,
      sipa_data: mergedSipaData,
      prix_bien: form.prix_bien,
      versement_initial: form.versement_initial,
      amortissement_5_ans: form.amortissement_5_ans,
      honoraires_sipa: form.honoraires_sipa,
      frais_dossier_bancaire: form.frais_dossier_bancaire,
      fonds_propres: form.fonds_propres,
      hypotheque: form.hypotheque,
      revenus_locatifs: form.revenus_locatifs,
      charges_operationnelles: form.charges_operationnelles,
      interets_hypothecaires: form.interets_hypothecaires,
      gestion: form.gestion,
      impot: form.impot,
      notes: form.notes || null,
      banque_a_taux_hypothecaire: form.banque_a_taux_hypothecaire,
      banque_a_type_taux: form.banque_a_type_taux,
      banque_a_marge_saron: form.banque_a_marge_saron,
      banque_a_amortissement_annuel: form.banque_a_amortissement_annuel,
      banque_a_evaluation: form.banque_a_evaluation,
      banque_b_taux_hypothecaire: form.banque_b_taux_hypothecaire,
      banque_b_type_taux: form.banque_b_type_taux,
      banque_b_marge_saron: form.banque_b_marge_saron,
      banque_b_amortissement_annuel: form.banque_b_amortissement_annuel,
      banque_b_evaluation: form.banque_b_evaluation,
      operating_projection: form.operating_projection,
      capital_projection: form.capital_projection,
      ...(form.etat_batiment ? { etat_batiment: form.etat_batiment } : {}),
      ...(form.emplacement_bien ? { emplacement_bien: form.emplacement_bien } : {}),
      prix_total: prixTotal,
      rendement_brut: calc.rendement_brut,
      revenu_net: calc.revenu_net,
      rendement_net_fonds_propres: calc.rendement_net_fonds_propres,
      revenu_distribue: calc.revenu_distribue,
      revenu_distribue_fonds_propres: calc.revenu_distribue_fonds_propres,
      score_global: calc.score_global,
      note: calc.note,
    };

    try {
      await Promise.resolve(onSubmit(payload));
    } catch (error) {
      console.error('[AnalysisForm] submit failed:', error);
      setSubmitError(error?.message || "Impossible d'enregistrer l'analyse.");
    }
  };

  const handleExcelImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setExcelImportState({ loading: true, message: '', error: '' });

    try {
      const result = await extractAnalysisFieldsFromExcel(file, customLabels, [
        selectedProperty?.nom_bien,
        selectedProperty?.adresse,
        selectedProperty?.ville,
      ]);

      if (!result.importedCount && !result.customFinancialFields?.length) {
        setExcelImportState({
          loading: false,
          message: '',
          error: "Aucune donnée financière reconnue dans ce fichier Excel.",
        });
        return;
      }

      setForm((prev) => ({ ...prev, ...result.fields }));
      if (result.customFinancialFields?.length > 0) {
        setCustomFinancialFields((prev) => {
          const existing = new Set(prev.map((f) => f.name));
          const merged = [...prev];
          for (const cf of result.customFinancialFields) {
            if (!existing.has(cf.name)) {
              merged.push({ ...cf, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) });
              existing.add(cf.name);
            }
          }
          return merged;
        });
      }
      setExcelImportState({
        loading: false,
        message: `${result.importedCount} champ${result.importedCount > 1 ? 's' : ''} importe${result.importedCount > 1 ? 's' : ''} depuis ${result.sheetName || file.name}.`,
        error: '',
      });
      setActiveTab('financial');
    } catch (error) {
      setExcelImportState({
        loading: false,
        message: '',
        error: error?.message || "Impossible de lire ce fichier Excel.",
      });
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-8">
      <section className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-4">Sélection du bien</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Bien immobilier</Label>
            <Select value={form.property_id} onValueChange={set('property_id')}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Sélectionner un bien" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nom_bien} - {p.ville}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Statut</Label>
            <Select value={form.statut} onValueChange={set('statut')}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WORKFLOW_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">État du bâtiment</Label>
            <Select value={form.etat_batiment} onValueChange={set('etat_batiment')}>
              <SelectTrigger className="bg-background border-border"><SelectValue placeholder="..." /></SelectTrigger>
              <SelectContent>
                {['Excellent', 'Très bon', 'Bon', 'Moyen', 'Mauvais'].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Emplacement (ville)</Label>
            <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-border bg-muted/30 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{selectedProperty?.ville || '—'}</span>
              {selectedProperty?.ville && (
                <span className="ml-auto text-xs font-mono text-muted-foreground">
                  {calc.score_emplacement}/15
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start gap-1 bg-background border border-border rounded-xl p-1">
          <TabsTrigger value="financial" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Table className="h-4 w-4" />
            Tableau financier
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel
          </TabsTrigger>
          <TabsTrigger value="simulation" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Landmark className="h-4 w-4" />
            Simulation via taux bancaire
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="h-4 w-4" />
            Informations complémentaires
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="mt-4">
          <section className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-heading font-semibold mb-5">TABLEAU FINANCIER</h3>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Rubrique</th>
                <th className="text-right py-2 pl-4 font-medium text-muted-foreground w-72">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <tr>
                <td className="py-2.5 pr-4">Prix du bien</td>
                <td className="py-2.5 pl-4">
                  <InputField value={form.prix_bien} onChange={set('prix_bien')} prefix="CHF" />
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">Versement initial sur le compte de la copropriété</td>
                <td className="py-2.5 pl-4">
                  <InputField value={form.versement_initial} onChange={set('versement_initial')} prefix="CHF" />
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">Amortissement sur 5 ans</td>
                <td className="py-2.5 pl-4">
                  <InputField value={form.amortissement_5_ans} onChange={set('amortissement_5_ans')} prefix="CHF" />
                </td>
              </tr>
              <PctRow
                label="Honoraires transaction Sipa Immobilier SA"
                amount={form.honoraires_sipa}
                onAmount={handlers.honoraires.amount}
                pct={form.honoraires_sipa_pct}
                onPct={handlers.honoraires.pct}
              />
              <tr>
                <td className="py-2.5 pr-4">Frais de dossier bancaire</td>
                <td className="py-2.5 pl-4">
                  <InputField value={form.frais_dossier_bancaire} onChange={set('frais_dossier_bancaire')} prefix="CHF" />
                </td>
              </tr>
              <tr className="bg-primary/5 border-primary/20">
                <td className="py-2.5 pr-4 font-semibold text-primary">Prix total</td>
                <td className="py-2.5 pl-4 font-mono font-bold text-primary text-right">
                  {formatCHF(prixTotal)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">Fonds propres</td>
                <td className="py-2.5 pl-4">
                  <InputField value={form.fonds_propres} onChange={set('fonds_propres')} prefix="CHF" />
                </td>
              </tr>
              <PctRow
                label="Hypothèque"
                amount={form.hypotheque}
                onAmount={handlers.hypotheque.amount}
                pct={form.hypotheque_pct}
                onPct={handlers.hypotheque.pct}
              />
              <tr className="border-t-2 border-border">
                <td className="py-2.5 pr-4">Revenus locatifs (hors charges)</td>
                <td className="py-2.5 pl-4">
                  <InputField value={form.revenus_locatifs} onChange={set('revenus_locatifs')} prefix="CHF" />
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">
                  <span className="text-muted-foreground">Taux de rendement brut</span>
                </td>
                <td className="py-2.5 pl-4 font-mono text-right">
                  {formatPercent(calc.rendement_brut)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">Charges opérationnelles</td>
                <td className="py-2.5 pl-4">
                  <InputField value={form.charges_operationnelles} onChange={set('charges_operationnelles')} prefix="CHF" />
                </td>
              </tr>
              <PctRow
                label="Intérêt hypothécaire (Estimé en moyenne sur 5 ans)"
                amount={form.interets_hypothecaires}
                onAmount={handlers.interets.amount}
                pct={form.interets_hypothecaires_pct}
                onPct={handlers.interets.pct}
              />
              <PctRow
                label="Honoraires de gestion"
                amount={form.gestion}
                onAmount={handlers.gestion.amount}
                pct={form.gestion_pct}
                onPct={handlers.gestion.pct}
              />
              <tr className="bg-primary/5 border-primary/20">
                <td className="py-2.5 pr-4 font-semibold text-primary">Revenu net</td>
                <td className="py-2.5 pl-4 font-mono font-bold text-primary text-right">
                  {formatCHF(calc.revenu_net)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">
                  <span className="text-muted-foreground">Rendement net sur fonds propres</span>
                </td>
                <td className="py-2.5 pl-4 font-mono text-right">
                  {formatPercent(calc.rendement_net_fonds_propres)}
                </td>
              </tr>
              <PctRow
                label="Impôt"
                amount={form.impot}
                onAmount={handlers.impot.amount}
                pct={form.impot_pct}
                onPct={handlers.impot.pct}
              />
              <tr className="bg-primary/5 border-primary/20">
                <td className="py-2.5 pr-4 font-semibold text-primary">Revenu distribué</td>
                <td className="py-2.5 pl-4 font-mono font-bold text-primary text-right">
                  {formatCHF(calc.revenu_distribue)}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">
                  <span className="text-muted-foreground">Revenu distribué sur fonds propres *</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Rendement estimatif basé sur un scénario projeté sur 5 ans</p>
                </td>
                <td className="py-2.5 pl-4 font-mono text-right">
                  {formatPercent(calc.revenu_distribue_fonds_propres)}
                </td>
              </tr>
              {customFinancialFields.map((cf, i) => (
                <tr key={cf.id} className="border-dashed border-border/40">
                  <td className="py-2 pr-4">
                    <input
                      type="text"
                      value={cf.name}
                      onChange={(e) =>
                        setCustomFinancialFields((prev) =>
                          prev.map((f, j) => (j === i ? { ...f, name: e.target.value } : f))
                        )
                      }
                      placeholder="Nom du frais"
                      className="w-full bg-transparent border-0 border-b border-dashed border-border/40 px-0 py-1 text-sm focus:outline-none focus:border-primary"
                    />
                  </td>
                  <td className="py-2 pl-4">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="relative w-28">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">CHF</span>
                        <input
                          type="number"
                          value={cf.amount}
                          onChange={(e) =>
                            setCustomFinancialFields((prev) =>
                              prev.map((f, j) => (j === i ? { ...f, amount: Number(e.target.value) || 0 } : f))
                            )
                          }
                          placeholder="0"
                          className="w-full bg-transparent border-0 border-b border-dashed border-border/40 pl-8 pr-1 py-1 text-sm text-right font-mono focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div className="relative w-20">
                        <input
                          type="number"
                          value={cf.pct ?? ''}
                          onChange={(e) =>
                            setCustomFinancialFields((prev) =>
                              prev.map((f, j) => (j === i ? { ...f, pct: e.target.value === '' ? null : parseFloat(e.target.value) || 0 } : f))
                            )
                          }
                          placeholder="0"
                          className="w-full bg-transparent border-0 border-b border-dashed border-border/40 pr-5 py-1 text-sm text-right font-mono focus:outline-none focus:border-primary"
                        />
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomFinancialFields((prev) => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-red-500 p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="border-t border-dashed border-border/30">
                <td className="py-2 pr-4">
                  <input
                    type="text"
                    value={newCustomFieldName}
                    onChange={(e) => setNewCustomFieldName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCustomFieldName.trim() && Number(newCustomFieldAmount)) {
                        setCustomFinancialFields((prev) => [
                          ...prev,
                          { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: newCustomFieldName.trim(), amount: Number(newCustomFieldAmount), pct: newCustomFieldPct !== '' ? parseFloat(newCustomFieldPct) : null },
                        ]);
                        setNewCustomFieldName('');
                        setNewCustomFieldAmount('');
                        setNewCustomFieldPct('');
                      }
                    }}
                    placeholder="Nouvelle ligne personnalisée..."
                    className="w-full bg-transparent border-0 px-0 py-1 text-sm text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                </td>
                <td className="py-2 pl-4">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="relative w-24">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">CHF</span>
                      <input
                        type="number"
                        value={newCustomFieldAmount}
                        onChange={(e) => setNewCustomFieldAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newCustomFieldName.trim() && Number(newCustomFieldAmount)) {
                            setCustomFinancialFields((prev) => [
                              ...prev,
                              { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: newCustomFieldName.trim(), amount: Number(newCustomFieldAmount), pct: newCustomFieldPct !== '' ? parseFloat(newCustomFieldPct) : null },
                            ]);
                            setNewCustomFieldName('');
                            setNewCustomFieldAmount('');
                            setNewCustomFieldPct('');
                          }
                        }}
                        placeholder="0"
                        className="w-full bg-transparent border-0 px-0 py-1 text-sm text-right font-mono text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                      />
                    </div>
                    <div className="relative w-16">
                      <input
                        type="number"
                        value={newCustomFieldPct}
                        onChange={(e) => setNewCustomFieldPct(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newCustomFieldName.trim() && Number(newCustomFieldAmount)) {
                            setCustomFinancialFields((prev) => [
                              ...prev,
                              { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: newCustomFieldName.trim(), amount: Number(newCustomFieldAmount), pct: newCustomFieldPct !== '' ? parseFloat(newCustomFieldPct) : null },
                            ]);
                            setNewCustomFieldName('');
                            setNewCustomFieldAmount('');
                            setNewCustomFieldPct('');
                          }
                        }}
                        placeholder="%"
                        className="w-full bg-transparent border-0 px-0 py-1 text-sm text-right font-mono text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (newCustomFieldName.trim() && Number(newCustomFieldAmount)) {
                          setCustomFinancialFields((prev) => [
                            ...prev,
                            { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: newCustomFieldName.trim(), amount: Number(newCustomFieldAmount), pct: newCustomFieldPct !== '' ? parseFloat(newCustomFieldPct) : null },
                          ]);
                          setNewCustomFieldName('');
                          setNewCustomFieldAmount('');
                          setNewCustomFieldPct('');
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

            <div className="mt-6">
              <ExcelProjectionTables
                operatingProjection={form.operating_projection}
                capitalProjection={form.capital_projection}
                onOperatingChange={set('operating_projection')}
                onCapitalChange={set('capital_projection')}
                editable
              />
            </div>
          </section>

          {form.sipa_data && form.sipa_data.filter((e) => !e._custom).length > 0 && (
            <section className="bg-card rounded-xl border border-border p-6 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Landmark className="h-4 w-4 text-primary" />
                <h3 className="font-heading font-semibold">Investissement SIPA</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Rubrique</th>
                      <th className="text-left py-2 pl-4 font-medium text-muted-foreground">Valeurs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {form.sipa_data.filter((e) => !e._custom).map((entry, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-4 text-sm font-medium whitespace-nowrap">{entry.label}</td>
                        <td className="py-2 pl-4 text-sm">
                          <div className="flex flex-wrap gap-2">
                            {entry.values.map((v, j) => (
                              <span key={j} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-muted/30">{formatSipaValue(v)}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <section className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-heading font-semibold">Informations complémentaires</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Banque, CECB, chauffage, courtier, type de vente, rénovations, etc.
            </p>
            <textarea
              value={form.notes || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-background border border-border rounded-lg p-3 text-sm min-h-[150px] font-mono"
              placeholder="Exemple :
Banque : Migros
CECB enveloppe : F
Construction : 1961
Courtier : UBS, Valérie Zuber"
            />

          </section>
        </TabsContent>

        <TabsContent value="import" className="mt-4">
          <section className="bg-card rounded-xl border border-border p-6">
            <div className="flex flex-col items-center justify-center text-center">
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="font-heading font-semibold mb-2">Import Excel</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Importez le tableau financier SIPA au format Excel pour remplir automatiquement les champs de l'analyse.
              </p>
              <input
                type="file"
                accept=".xlsx,.xlsm"
                className="mt-6 block w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
                onChange={handleExcelImport}
                disabled={excelImportState.loading}
              />
              {excelImportState.loading && (
                <p className="mt-4 text-sm text-muted-foreground">Import en cours...</p>
              )}
              {excelImportState.message && (
                <p className="mt-4 text-sm text-emerald-500">{excelImportState.message}</p>
              )}
              {excelImportState.error && (
                <p className="mt-4 text-sm text-red-500">{excelImportState.error}</p>
              )}
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <h4 className="font-heading font-semibold text-sm mb-1">Champs personnalisés</h4>
              <p className="text-xs text-muted-foreground mb-4">
                Ajoutez des lignes à extraire du fichier Excel pour les inscrire dans le TABLEAU FINANCIER (ex: "Frais de notaire"). Les valeurs trouvées apparaîtront comme lignes personnalisées.
              </p>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newLabel.trim()) {
                      setCustomLabels((prev) => [...prev, newLabel.trim()]);
                      setNewLabel('');
                    }
                  }}
                  placeholder="Ex: Frais de courtage"
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newLabel.trim()) {
                      setCustomLabels((prev) => [...prev, newLabel.trim()]);
                      setNewLabel('');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" /> Ajouter
                </button>
              </div>

              {customLabels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customLabels.map((label, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => setCustomLabels((prev) => prev.filter((_, j) => j !== i))}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="simulation" className="mt-4">
          <section className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-heading font-semibold mb-4">Scénarios bancaires</h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <BankScenario title="Banque A" form={form} set={set} prefix="banque_a" saronRate={saronRate} />
              <BankScenario title="Banque B" form={form} set={set} prefix="banque_b" saronRate={saronRate} />
            </div>
          </section>
        </TabsContent>
      </Tabs>

      <section className="bg-card rounded-xl border border-primary/30 p-6">
        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Résumé
        </h3>
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          <div className="flex items-center gap-4">
            <ScoreGauge score={calc.score_global} size={100} />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">Note</span>
                <ScoreBadge note={calc.note} />
              </div>
              <p className="text-xs text-muted-foreground">Score global</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 flex-1 min-w-0">
            <Metric label="Revenu net" value={formatCHF(calc.revenu_net)} />
            <Metric label="Rdt. net / FP" value={formatPercent(calc.rendement_net_fonds_propres)} highlight />
            <Metric label="Revenu distribué" value={formatCHF(calc.revenu_distribue)} />
            <Metric label="Rdt. distribué / FP" value={formatPercent(calc.revenu_distribue_fonds_propres)} highlight />
            <Metric label="Rendement brut" value={formatPercent(calc.rendement_brut)} />
            <Metric label="Score" value={`${calc.score_global}/100`} />
          </div>
        </div>
      </section>

      <div className="flex flex-col items-end gap-2">
        {submitError && (
          <p className="w-full text-right text-sm text-red-500">{submitError}</p>
        )}
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
          <Save className="h-4 w-4" />
          {isSubmitting ? "Enregistrement..." : "Enregistrer l'analyse"}
        </Button>
      </div>
    </div>
  );
}

function BankScenario({ title, form, set, prefix, saronRate }) {
  const typeTaux = form[`${prefix}_type_taux`] || 'fixe';
  const tauxBase = Number(form[`${prefix}_taux_hypothecaire`] || 0);
  const margeSaron = Number(form[`${prefix}_marge_saron`] ?? 0.5);
  const effectiveRate = getEffectiveMortgageRate({ typeTaux, tauxBase, margeSaron, saronRate });

  return (
    <div className="bg-background/40 rounded-xl border border-border p-5 space-y-4">
      <h4 className="font-heading font-semibold text-sm">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Type de taux</Label>
          <Select value={typeTaux} onValueChange={set(`${prefix}_type_taux`)}>
            <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixe">Fixe</SelectItem>
              <SelectItem value="saron">Variable full SARON</SelectItem>
              <SelectItem value="mixte">Variable base fixe + SARON</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Taux hypothécaire</Label>
          <InputField value={form[`${prefix}_taux_hypothecaire`]} onChange={set(`${prefix}_taux_hypothecaire`)} />
        </div>
        {typeTaux === 'saron' && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Marge SARON</Label>
            <InputField value={form[`${prefix}_marge_saron`]} onChange={set(`${prefix}_marge_saron`)} />
          </div>
        )}
        {(typeTaux === 'saron' || typeTaux === 'mixte') && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Taux effectif automatique</Label>
            <div className="rounded-lg border border-border bg-background px-3 py-2 text-right font-mono text-sm font-semibold text-primary">
              {effectiveRate == null ? 'SARON...' : `${effectiveRate.toFixed(3)}%`}
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              SARON actuel {saronRate == null ? 'en chargement' : `${saronRate.toFixed(3)}%`}
            </p>
          </div>
        )}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Amortissement annuel</Label>
          <InputField value={form[`${prefix}_amortissement_annuel`]} onChange={set(`${prefix}_amortissement_annuel`)} prefix="CHF" />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1.5 block">Évaluation</Label>
        <textarea
          value={form[`${prefix}_evaluation`] || ''}
          onChange={(e) => set(`${prefix}_evaluation`)(e.target.value)}
          className="w-full bg-background border border-border rounded-lg p-3 text-sm min-h-[80px]"
          placeholder="Exemple : conditions favorables, risque de taux..."
        />
      </div>
    </div>
  );
}

function getEffectiveMortgageRate({ typeTaux, tauxBase, margeSaron, saronRate }) {
  if (typeTaux === 'fixe') return tauxBase;
  if (saronRate == null) return null;
  if (typeTaux === 'saron') return saronRate + margeSaron;
  if (typeTaux === 'mixte') return tauxBase + saronRate;
  return tauxBase;
}

function Metric({ label, value, highlight }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className={`text-sm font-bold font-mono break-all ${highlight ? 'text-primary' : ''}`}>{value}</p>
    </div>
  );
}
