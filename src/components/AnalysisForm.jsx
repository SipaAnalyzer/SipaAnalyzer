import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { calculateAnalysis, formatCHF, formatPercent, WORKFLOW_STATUSES } from '../utils/calculations';
import { extractAnalysisFieldsFromExcel, formatSipaLabel, formatSipaValue, getSipaDisplayGroups, getSipaDisplayValues } from '../utils/excelImport';
import {
  FINANCIAL_CUSTOM_FIELD_ANCHORS,
  getFinancialCustomFieldsTotal,
  normalizeFinancialCustomFields,
  toPersistedFinancialCustomFields,
} from '../utils/financialCustomFields';
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

const hasFinancialValue = (value) => value !== null && value !== undefined && value !== '';
const toNumber = (value) => Number(value || 0);
const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

function getPurchasePrice(data) {
  return hasFinancialValue(data.prix_achat) ? toNumber(data.prix_achat) : toNumber(data.prix_bien);
}

function getPurchaseSubtotal(data) {
  return round2(
    getPurchasePrice(data) +
    toNumber(data.honoraires_sipa) +
    toNumber(data.construction)
  );
}

function getPurchaseEquity(data) {
  if (hasFinancialValue(data.fonds_propres_achat)) return toNumber(data.fonds_propres_achat);
  return round2(getPurchaseSubtotal(data) - toNumber(data.hypotheque));
}

function getInvestorPrice(data) {
  if (!hasFinancialValue(data.prix_achat)) return toNumber(data.prix_bien);
  return round2(getPurchaseSubtotal(data) + toNumber(data.target_benefice_sipa_fonds_propres));
}

function getAcquisitionTotal(data, customFields = []) {
  return round2(
    getInvestorPrice(data) +
    toNumber(data.versement_initial) +
    toNumber(data.amortissement_5_ans) +
    toNumber(data.honoraires_transaction_sipa_group) +
    toNumber(data.frais_dossier_bancaire) +
    getFinancialCustomFieldsTotal(customFields, data)
  );
}

function applyCustomFinancialTotals(data, customFields, financingDriver = 'hypotheque') {
  const next = { ...data, financial_custom_fields: toPersistedFinancialCustomFields(customFields) };
  const prixTotal = getAcquisitionTotal(next, customFields);
  if (financingDriver === 'fonds_propres' && hasFinancialValue(next.fonds_propres_pct)) {
    next.fonds_propres = amountFromPct(prixTotal, next.fonds_propres_pct);
    next.hypotheque = round2(prixTotal - toNumber(next.fonds_propres));
  } else {
    next.fonds_propres = round2(prixTotal - toNumber(next.hypotheque));
    next.fonds_propres_pct = pctFromAmount(prixTotal, next.fonds_propres);
  }
  next.prix_total = prixTotal;
  return next;
}

function getRevenuNet(data) {
  return round2(
    toNumber(data.revenus_locatifs) -
    toNumber(data.charges_operationnelles) -
    toNumber(data.interets_hypothecaires) -
    toNumber(data.gestion)
  );
}

function amountFromPct(base, pct) {
  if (!base || !hasFinancialValue(pct)) return null;
  return round2(base * Number(pct) / 100);
}

function pctFromAmount(base, amount) {
  if (!base || !hasFinancialValue(amount)) return null;
  return round2((Number(amount) / base) * 100);
}

function shouldRecalculateFromPct(fieldKey, sourceKey, sourceType, preferAmounts = false) {
  if (preferAmounts) return false;
  return sourceKey !== fieldKey || sourceType === 'pct';
}

function recalculateFinancialState(data, { financingDriver = 'hypotheque', sourceKey = null, sourceType = null, preferAmounts = false } = {}) {
  const next = { ...data };
  const purchasePrice = getPurchasePrice(next);

  if (hasFinancialValue(next.honoraires_sipa_pct) && shouldRecalculateFromPct('honoraires_sipa', sourceKey, sourceType, preferAmounts)) {
    next.honoraires_sipa = amountFromPct(purchasePrice, next.honoraires_sipa_pct);
  }

  if (hasFinancialValue(next.construction_pct) && shouldRecalculateFromPct('construction', sourceKey, sourceType, preferAmounts)) {
    next.construction = amountFromPct(purchasePrice, next.construction_pct);
  }

  const purchaseSubtotal = getPurchaseSubtotal(next);

  if (preferAmounts && hasFinancialValue(next.hypotheque)) {
    // Keep imported Excel amount and percentage as entered in the workbook.
  } else if (financingDriver === 'fonds_propres' && hasFinancialValue(next.fonds_propres_pct) && shouldRecalculateFromPct('fonds_propres', sourceKey, sourceType, preferAmounts)) {
    next.fonds_propres = amountFromPct(purchaseSubtotal, next.fonds_propres_pct);
    next.hypotheque = round2(purchaseSubtotal - toNumber(next.fonds_propres));
    next.hypotheque_pct = pctFromAmount(purchaseSubtotal, next.hypotheque);
  } else if (financingDriver === 'fonds_propres' && hasFinancialValue(next.fonds_propres)) {
    next.fonds_propres_pct = pctFromAmount(purchaseSubtotal, next.fonds_propres);
    next.hypotheque = round2(purchaseSubtotal - toNumber(next.fonds_propres));
    next.hypotheque_pct = pctFromAmount(purchaseSubtotal, next.hypotheque);
  } else if (hasFinancialValue(next.hypotheque_pct) && shouldRecalculateFromPct('hypotheque', sourceKey, sourceType, preferAmounts)) {
    next.hypotheque = amountFromPct(purchaseSubtotal, next.hypotheque_pct);
    next.fonds_propres = round2(purchaseSubtotal - toNumber(next.hypotheque));
    next.fonds_propres_pct = pctFromAmount(purchaseSubtotal, next.fonds_propres);
  } else if (hasFinancialValue(next.fonds_propres)) {
    next.fonds_propres_pct = pctFromAmount(purchaseSubtotal, next.fonds_propres);
    next.hypotheque = round2(purchaseSubtotal - toNumber(next.fonds_propres));
    next.hypotheque_pct = pctFromAmount(purchaseSubtotal, next.hypotheque);
  } else if (hasFinancialValue(next.hypotheque)) {
    next.hypotheque_pct = pctFromAmount(purchaseSubtotal, next.hypotheque);
    next.fonds_propres = round2(purchaseSubtotal - toNumber(next.hypotheque));
    next.fonds_propres_pct = pctFromAmount(purchaseSubtotal, next.fonds_propres);
  } else if (purchaseSubtotal) {
    next.fonds_propres = purchaseSubtotal;
    next.fonds_propres_pct = 100;
  }

  next.fonds_propres_achat = round2(purchaseSubtotal - toNumber(next.hypotheque));

  if (
    hasFinancialValue(next.target_benefice_sipa_fonds_propres_pct) &&
    shouldRecalculateFromPct('target_benefice_sipa_fonds_propres', sourceKey, sourceType, preferAmounts)
  ) {
    next.target_benefice_sipa_fonds_propres = amountFromPct(
      getPurchaseEquity(next),
      next.target_benefice_sipa_fonds_propres_pct
    );
  } else if (!preferAmounts && hasFinancialValue(next.target_benefice_sipa_fonds_propres)) {
    next.target_benefice_sipa_fonds_propres_pct = pctFromAmount(
      getPurchaseEquity(next),
      next.target_benefice_sipa_fonds_propres
    );
  }

  if (hasFinancialValue(next.prix_achat)) {
    next.prix_bien = getInvestorPrice(next);
  }

  if (hasFinancialValue(next.versement_initial_pct) && shouldRecalculateFromPct('versement_initial', sourceKey, sourceType, preferAmounts)) {
    next.versement_initial = amountFromPct(getInvestorPrice(next), next.versement_initial_pct);
  }

  if (hasFinancialValue(next.honoraires_transaction_sipa_group_pct) && shouldRecalculateFromPct('honoraires_transaction_sipa_group', sourceKey, sourceType, preferAmounts)) {
    next.honoraires_transaction_sipa_group = amountFromPct(getInvestorPrice(next), next.honoraires_transaction_sipa_group_pct);
  }

  const prixTotal = getAcquisitionTotal(next);
  if (prixTotal) {
    next.fonds_propres = round2(prixTotal - toNumber(next.hypotheque));
    next.fonds_propres_pct = pctFromAmount(prixTotal, next.fonds_propres);
  }

  if (hasFinancialValue(next.interets_hypothecaires_pct) && shouldRecalculateFromPct('interets_hypothecaires', sourceKey, sourceType, preferAmounts)) {
    next.interets_hypothecaires = amountFromPct(toNumber(next.hypotheque), next.interets_hypothecaires_pct);
  }

  if (hasFinancialValue(next.gestion_pct) && shouldRecalculateFromPct('gestion', sourceKey, sourceType, preferAmounts)) {
    next.gestion = amountFromPct(toNumber(next.revenus_locatifs), next.gestion_pct);
  }

  if (hasFinancialValue(next.impot_pct) && shouldRecalculateFromPct('impot', sourceKey, sourceType, preferAmounts)) {
    next.impot = amountFromPct(getRevenuNet(next), next.impot_pct);
  }

  return next;
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

export default function AnalysisForm({ initialData, initialPropertyId, onSubmit, isSubmitting, initialTab = 'financial' }) {
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 100),
  });

  const [form, setForm] = useState({
    property_id: initialPropertyId || '',
    statut: 'en_cours',
    prix_bien: null,
    prix_achat: null,
    versement_initial: null,
    versement_initial_pct: null,
    amortissement_5_ans: null,
    honoraires_sipa: null,
    honoraires_sipa_pct: null,
    construction: null,
    construction_pct: 0,
    honoraires_transaction_sipa_group: null,
    honoraires_transaction_sipa_group_pct: 5,
    frais_dossier_bancaire: null,
    fonds_propres: null,
    fonds_propres_achat: null,
    fonds_propres_pct: null,
    target_benefice_sipa_fonds_propres: null,
    target_benefice_sipa_fonds_propres_pct: 15,
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
    financial_custom_fields: [],
    _preferImportedAmounts: false,
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
      const isImportedAnalysis = Array.isArray(initialData.sipa_data) && initialData.sipa_data.length > 0;
      if (isImportedAnalysis) {
        data._preferImportedAmounts = true;
        return data;
      }
      const purchasePrice = getPurchasePrice(data);
      const purchaseSubtotal = getPurchaseSubtotal(data);
      const revenuNet = Number(data.revenus_locatifs || 0) - Number(data.charges_operationnelles || 0) - Number(data.interets_hypothecaires || 0) - Number(data.gestion || 0);
      if (Number(data.prix_bien) > 0 && data.versement_initial != null) data.versement_initial_pct = Math.round((data.versement_initial / data.prix_bien) * 10000) / 100;
      if (purchasePrice > 0 && data.honoraires_sipa != null) data.honoraires_sipa_pct = Math.round((data.honoraires_sipa / purchasePrice) * 10000) / 100;
      if (purchasePrice > 0 && data.construction != null) data.construction_pct = Math.round((data.construction / purchasePrice) * 10000) / 100;
      if (Number(data.prix_bien) > 0 && data.honoraires_transaction_sipa_group != null) data.honoraires_transaction_sipa_group_pct = Math.round((data.honoraires_transaction_sipa_group / data.prix_bien) * 10000) / 100;
      if (purchaseSubtotal > 0 && data.fonds_propres != null) data.fonds_propres_pct = Math.round((data.fonds_propres / purchaseSubtotal) * 10000) / 100;
      if (getPurchaseEquity(data) > 0 && data.target_benefice_sipa_fonds_propres != null && data.target_benefice_sipa_fonds_propres_pct == null) data.target_benefice_sipa_fonds_propres_pct = Math.round((data.target_benefice_sipa_fonds_propres / getPurchaseEquity(data)) * 10000) / 100;
      if (purchaseSubtotal > 0 && data.hypotheque != null) data.hypotheque_pct = Math.round((data.hypotheque / purchaseSubtotal) * 10000) / 100;
      if (Number(data.hypotheque) > 0 && data.interets_hypothecaires != null) data.interets_hypothecaires_pct = Math.round((data.interets_hypothecaires / data.hypotheque) * 10000) / 100;
      if (Number(data.revenus_locatifs) > 0 && data.gestion != null) data.gestion_pct = Math.round((data.gestion / data.revenus_locatifs) * 10000) / 100;
      if (revenuNet > 0 && data.impot != null) data.impot_pct = Math.round((data.impot / revenuNet) * 10000) / 100;
      return data;
    });
  }, [initialData]);

  useEffect(() => {
    if (!initialData) return;
    setCustomFinancialFields(normalizeFinancialCustomFields(initialData.financial_custom_fields, initialData.sipa_data));
  }, [initialData]);

  const [financingDriver, setFinancingDriver] = useState('hypotheque');

  const makeAmountHandler = useCallback((key, pctKey, getBase, driver) => (value) => {
    if (driver) setFinancingDriver(driver);
    setForm((prev) => {
      const base = getBase(prev);
      const next = { ...prev, [key]: value, _preferImportedAmounts: false };
      if (base && value !== null) {
        const pct = Math.round((value / base) * 10000) / 100;
        next[pctKey] = pct;
      } else {
        next[pctKey] = null;
      }
      return recalculateFinancialState(next, { financingDriver: driver || financingDriver, sourceKey: key, sourceType: 'amount' });
    });
  }, [financingDriver]);

  const makePctHandler = useCallback((key, pctKey, getBase, driver) => (value) => {
    if (driver) setFinancingDriver(driver);
    setForm((prev) => {
      const base = getBase(prev);
      const next = { ...prev, [pctKey]: value, _preferImportedAmounts: false };
      if (base && value !== null) {
        const amount = round2(base * value / 100);
        next[key] = amount;
      } else {
        next[key] = null;
      }
      return recalculateFinancialState(next, { financingDriver: driver || financingDriver, sourceKey: key, sourceType: 'pct' });
    });
  }, [financingDriver]);

  const handlers = useMemo(() => {
    const versementInitial = {
      amount: makeAmountHandler('versement_initial', 'versement_initial_pct', getInvestorPrice),
      pct: makePctHandler('versement_initial', 'versement_initial_pct', getInvestorPrice),
    };
    const honoraires = {
      amount: makeAmountHandler('honoraires_sipa', 'honoraires_sipa_pct', getPurchasePrice),
      pct: makePctHandler('honoraires_sipa', 'honoraires_sipa_pct', getPurchasePrice),
    };
    const construction = {
      amount: makeAmountHandler('construction', 'construction_pct', getPurchasePrice),
      pct: makePctHandler('construction', 'construction_pct', getPurchasePrice),
    };
    const honorairesTransactionSipaGroup = {
      amount: makeAmountHandler('honoraires_transaction_sipa_group', 'honoraires_transaction_sipa_group_pct', getInvestorPrice),
      pct: makePctHandler('honoraires_transaction_sipa_group', 'honoraires_transaction_sipa_group_pct', getInvestorPrice),
    };
    const hypotheque = {
      amount: makeAmountHandler('hypotheque', 'hypotheque_pct', getPurchaseSubtotal, 'hypotheque'),
      pct: makePctHandler('hypotheque', 'hypotheque_pct', getPurchaseSubtotal, 'hypotheque'),
    };
    const fondsPropres = {
      amount: makeAmountHandler('fonds_propres', 'fonds_propres_pct', getPurchaseSubtotal, 'fonds_propres'),
      pct: makePctHandler('fonds_propres', 'fonds_propres_pct', getPurchaseSubtotal, 'fonds_propres'),
    };
    const targetBeneficeSipa = {
      amount: makeAmountHandler('target_benefice_sipa_fonds_propres', 'target_benefice_sipa_fonds_propres_pct', getPurchaseEquity),
      pct: makePctHandler('target_benefice_sipa_fonds_propres', 'target_benefice_sipa_fonds_propres_pct', getPurchaseEquity),
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
    return { versementInitial, honoraires, construction, honorairesTransactionSipaGroup, hypotheque, fondsPropres, targetBeneficeSipa, interets, gestion, impot };
  }, [makeAmountHandler, makePctHandler]);

  const set = (key) => (value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value, _preferImportedAmounts: false };
      if ([
        'prix_bien',
        'prix_achat',
        'versement_initial',
        'amortissement_5_ans',
        'honoraires_sipa',
        'construction',
        'honoraires_transaction_sipa_group',
        'frais_dossier_bancaire',
        'hypotheque',
        'fonds_propres',
        'target_benefice_sipa_fonds_propres',
        'revenus_locatifs',
        'charges_operationnelles',
        'interets_hypothecaires',
        'gestion',
      ].includes(key)) {
        return recalculateFinancialState(next, { financingDriver, sourceKey: key, sourceType: 'amount' });
      }
      return next;
    });
  };

  const selectedProperty = properties.find((p) => p.id === form.property_id);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [analysisViewMode, setAnalysisViewMode] = useState('simplified');
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
  const [newCustomFieldInsertAfter, setNewCustomFieldInsertAfter] = useState('frais_dossier_bancaire');
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchSaronRate().then((rate) => {
      if (!cancelled) setSaronRate(rate);
    });
    return () => { cancelled = true; };
  }, []);

  const calculatedDisplayForm = useMemo(
    () => applyCustomFinancialTotals(form, customFinancialFields, financingDriver),
    [form, customFinancialFields, financingDriver]
  );

  const calc = useMemo(() => calculateAnalysis({
    ...calculatedDisplayForm,
    ville: selectedProperty?.ville,
    canton: selectedProperty?.canton,
    surface: selectedProperty?.surface,
    annee_construction: selectedProperty?.annee_construction,
  }), [calculatedDisplayForm, selectedProperty]);

  const prixTotal = calculatedDisplayForm.prix_total;

  const handleSubmit = async () => {
    setSubmitError('');

    if (!form.property_id) {
      setSubmitError('Selectionne un bien avant d’enregistrer l’analyse.');
      return;
    }

    const calculatedForm = applyCustomFinancialTotals(
      recalculateFinancialState(form, { financingDriver, preferAmounts: form._preferImportedAmounts }),
      customFinancialFields,
      financingDriver
    );

    const baseSipaData = Array.isArray(form.sipa_data)
      ? form.sipa_data.filter((entry) => !entry._custom)
      : [];
    const financialCustomFields = toPersistedFinancialCustomFields(customFinancialFields);

    const calculatedCalc = calculateAnalysis({
      ...calculatedForm,
      ville: selectedProperty?.ville,
      canton: selectedProperty?.canton,
      surface: selectedProperty?.surface,
      annee_construction: selectedProperty?.annee_construction,
    });

    const payload = {
      property_id: calculatedForm.property_id,
      statut: calculatedForm.statut,
      sipa_data: baseSipaData.length > 0 ? baseSipaData : null,
      financial_custom_fields: financialCustomFields,
      prix_bien: calculatedForm.prix_bien,
      prix_achat: calculatedForm.prix_achat,
      versement_initial: calculatedForm.versement_initial,
      amortissement_5_ans: calculatedForm.amortissement_5_ans,
      honoraires_sipa: calculatedForm.honoraires_sipa,
      construction: calculatedForm.construction,
      honoraires_transaction_sipa_group: calculatedForm.honoraires_transaction_sipa_group,
      frais_dossier_bancaire: calculatedForm.frais_dossier_bancaire,
      fonds_propres: calculatedForm.fonds_propres,
      fonds_propres_achat: calculatedForm.fonds_propres_achat,
      target_benefice_sipa_fonds_propres: calculatedForm.target_benefice_sipa_fonds_propres,
      target_benefice_sipa_fonds_propres_pct: calculatedForm.target_benefice_sipa_fonds_propres_pct,
      hypotheque: calculatedForm.hypotheque,
      revenus_locatifs: calculatedForm.revenus_locatifs,
      charges_operationnelles: calculatedForm.charges_operationnelles,
      interets_hypothecaires: calculatedForm.interets_hypothecaires,
      gestion: calculatedForm.gestion,
      impot: calculatedForm.impot,
      notes: calculatedForm.notes || null,
      banque_a_taux_hypothecaire: calculatedForm.banque_a_taux_hypothecaire,
      banque_a_type_taux: calculatedForm.banque_a_type_taux,
      banque_a_marge_saron: calculatedForm.banque_a_marge_saron,
      banque_a_amortissement_annuel: calculatedForm.banque_a_amortissement_annuel,
      banque_a_evaluation: calculatedForm.banque_a_evaluation,
      banque_b_taux_hypothecaire: calculatedForm.banque_b_taux_hypothecaire,
      banque_b_type_taux: calculatedForm.banque_b_type_taux,
      banque_b_marge_saron: calculatedForm.banque_b_marge_saron,
      banque_b_amortissement_annuel: calculatedForm.banque_b_amortissement_annuel,
      banque_b_evaluation: calculatedForm.banque_b_evaluation,
      operating_projection: calculatedForm.operating_projection,
      capital_projection: calculatedForm.capital_projection,
      ...(calculatedForm.etat_batiment ? { etat_batiment: calculatedForm.etat_batiment } : {}),
      ...(calculatedForm.emplacement_bien ? { emplacement_bien: calculatedForm.emplacement_bien } : {}),
      prix_total: calculatedForm.prix_total,
      rendement_brut: calculatedCalc.rendement_brut,
      revenu_net: calculatedCalc.revenu_net,
      rendement_net_fonds_propres: calculatedCalc.rendement_net_fonds_propres,
      revenu_distribue: calculatedCalc.revenu_distribue,
      revenu_distribue_fonds_propres: calculatedCalc.revenu_distribue_fonds_propres,
      score_global: calculatedCalc.score_global,
      note: calculatedCalc.note,
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

      setForm((prev) => recalculateFinancialState({ ...prev, ...result.fields, _preferImportedAmounts: true }, { financingDriver, preferAmounts: true }));
      if (result.customFinancialFields?.length > 0) {
        setCustomFinancialFields((prev) => {
          const existing = new Set(prev.map((f) => f.name));
          const merged = [...prev];
          for (const cf of result.customFinancialFields) {
            if (!existing.has(cf.name)) {
              merged.push({
                ...cf,
                id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                insertAfter: cf.insertAfter || 'prix_total',
                position: merged.length,
              });
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

  const addCustomFinancialField = () => {
    const hasAmount = newCustomFieldAmount !== '' && newCustomFieldAmount !== null && newCustomFieldAmount !== undefined;
    const hasPct = newCustomFieldPct !== '' && newCustomFieldPct !== null && newCustomFieldPct !== undefined;
    if (!newCustomFieldName.trim() || (!hasAmount && !hasPct)) return;

    setCustomFinancialFields((prev) => [
      ...prev,
      {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name: newCustomFieldName.trim(),
        amount: hasAmount ? Number(newCustomFieldAmount) : null,
        pct: hasPct ? parseFloat(newCustomFieldPct) : null,
        insertAfter: newCustomFieldInsertAfter,
        position: prev.length,
      },
    ]);
    setNewCustomFieldName('');
    setNewCustomFieldAmount('');
    setNewCustomFieldPct('');
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

      <section className="bg-card rounded-xl border border-border p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-heading font-semibold text-sm">Vue d'analyse</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Basculez entre la vue actuelle et une grille technique modifiable.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setAnalysisViewMode('simplified')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                analysisViewMode === 'simplified'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Simplifie
            </button>
            <button
              type="button"
              onClick={() => setAnalysisViewMode('technical')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                analysisViewMode === 'technical'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Technique
            </button>
          </div>
        </div>
      </section>

      {analysisViewMode === 'simplified' ? (
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
                <td className="py-2.5 pr-4">Prix d'achat</td>
                <td className="py-2.5 pl-4">
                  <InputField value={form.prix_achat} onChange={set('prix_achat')} prefix="CHF" />
                </td>
              </tr>
              <PctRow
                label="Construction"
                amount={form.construction}
                onAmount={handlers.construction.amount}
                pct={form.construction_pct}
                onPct={handlers.construction.pct}
              />
              <tr className="bg-muted/20">
                <td className="py-2.5 pr-4 font-medium">Fonds propres achat</td>
                <td className="py-2.5 pl-4 font-mono text-right">
                  {formatCHF(getPurchaseEquity(form))}
                </td>
              </tr>
              <PctRow
                label="Versement initial sur le compte de la copropriété"
                amount={form.versement_initial}
                onAmount={handlers.versementInitial.amount}
                pct={form.versement_initial_pct}
                onPct={handlers.versementInitial.pct}
              />
              <tr>
                <td className="py-2.5 pr-4">Amortissement sur 5 ans</td>
                <td className="py-2.5 pl-4">
                  <InputField value={form.amortissement_5_ans} onChange={set('amortissement_5_ans')} prefix="CHF" />
                </td>
              </tr>
              <PctRow
                label="Honoraires de transaction SIPA"
                amount={form.honoraires_transaction_sipa_group}
                onAmount={handlers.honorairesTransactionSipaGroup.amount}
                pct={form.honoraires_transaction_sipa_group_pct}
                onPct={handlers.honorairesTransactionSipaGroup.pct}
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
              <PctRow
                label="Fonds propres"
                amount={calculatedDisplayForm.fonds_propres}
                onAmount={handlers.fondsPropres.amount}
                pct={calculatedDisplayForm.fonds_propres_pct}
                onPct={handlers.fondsPropres.pct}
              />
              <PctRow
                label="Target bénéfice SIPA fonds propres"
                amount={form.target_benefice_sipa_fonds_propres}
                onAmount={handlers.targetBeneficeSipa.amount}
                pct={form.target_benefice_sipa_fonds_propres_pct}
                onPct={handlers.targetBeneficeSipa.pct}
              />
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
                              prev.map((f, j) => (j === i ? { ...f, amount: e.target.value === '' ? null : Number(e.target.value) || 0 } : f))
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
                      <Select
                        value={cf.insertAfter || 'prix_total'}
                        onValueChange={(value) =>
                          setCustomFinancialFields((prev) =>
                            prev.map((f, j) => (j === i ? { ...f, insertAfter: value } : f))
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-44 bg-background text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FINANCIAL_CUSTOM_FIELD_ANCHORS.map((anchor) => (
                            <SelectItem key={anchor.key} value={anchor.key}>Apres {anchor.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      if (e.key === 'Enter') addCustomFinancialField();
                    }}
                    placeholder="Nouvelle ligne personnalisée..."
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </td>
                <td className="py-2 pl-4">
                  <div className="flex items-center gap-2 justify-end">
                    <div className="relative w-32">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CHF</span>
                      <input
                        type="number"
                        value={newCustomFieldAmount}
                        onChange={(e) => setNewCustomFieldAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addCustomFinancialField();
                        }}
                        placeholder="0"
                        className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-3 text-right text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <div className="relative w-24">
                      <input
                        type="number"
                        value={newCustomFieldPct}
                        onChange={(e) => setNewCustomFieldPct(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addCustomFinancialField();
                        }}
                        placeholder="%"
                        className="w-full rounded-md border border-border bg-background py-2 pl-3 pr-8 text-right text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <Select value={newCustomFieldInsertAfter} onValueChange={setNewCustomFieldInsertAfter}>
                      <SelectTrigger className="h-10 w-48 bg-background text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FINANCIAL_CUSTOM_FIELD_ANCHORS.map((anchor) => (
                          <SelectItem key={anchor.key} value={anchor.key}>Apres {anchor.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() => {
                        addCustomFinancialField();
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
              <div className="space-y-5">
                {getSipaDisplayGroups(form.sipa_data).map((group) => (
                  <div key={group.section} className="overflow-x-auto">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</h4>
                    <table className="w-full min-w-[720px] text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Rubrique</th>
                          <th className="text-left py-2 pl-4 font-medium text-muted-foreground">Valeurs</th>
                          <th className="text-right py-2 pl-4 font-medium text-muted-foreground w-32">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {group.rows.map(({ entry, index, entries }) => {
                          const display = getSipaDisplayValues(entry, entries, index);
                          return (
                            <tr key={index}>
                              <td className="py-2 pr-4 text-sm font-medium whitespace-nowrap">{formatSipaLabel(entry, entries, index)}</td>
                              <td className="py-2 pl-4 text-sm">
                                <div className="flex flex-wrap gap-2">
                                  {display.values.map((v, j) => (
                                    <span key={j} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-muted/30">{formatSipaValue(v)}</span>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2 pl-4 text-sm text-right">
                                <div className="flex flex-wrap justify-end gap-2">
                                  {display.percentages.map((v, j) => (
                                    <span key={j} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-muted/30">{formatSipaValue(v)}</span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
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
      ) : (
        <TechnicalAnalysisView
          form={form}
          set={set}
          setForm={setForm}
          handlers={handlers}
          calc={calc}
          prixTotal={prixTotal}
          saronRate={saronRate}
          customFinancialFields={customFinancialFields}
          setCustomFinancialFields={setCustomFinancialFields}
          newCustomFieldName={newCustomFieldName}
          setNewCustomFieldName={setNewCustomFieldName}
          newCustomFieldAmount={newCustomFieldAmount}
          setNewCustomFieldAmount={setNewCustomFieldAmount}
          newCustomFieldPct={newCustomFieldPct}
          setNewCustomFieldPct={setNewCustomFieldPct}
          newCustomFieldInsertAfter={newCustomFieldInsertAfter}
          setNewCustomFieldInsertAfter={setNewCustomFieldInsertAfter}
          addCustomFinancialField={addCustomFinancialField}
        />
      )}

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
            <Metric label="Prix / m²" value={calc.prix_m2_bien ? formatCHF(calc.prix_m2_bien) : 'Surface manquante'} />
            <Metric label="Marché zone" value={calc.prix_m2_marche ? formatCHF(calc.prix_m2_marche) : 'Référence indisponible'} />
            <Metric
              label="Écart marché"
              value={calc.ecart_prix_m2_marche != null ? `${calc.ecart_prix_m2_marche > 0 ? '+' : ''}${calc.ecart_prix_m2_marche}%` : 'N/A'}
              highlight={calc.ecart_prix_m2_marche != null && calc.ecart_prix_m2_marche <= 0}
            />
            <Metric
              label="Impact zone"
              value={`${calc.impact_score_prix_m2 > 0 ? '+' : ''}${calc.impact_score_prix_m2 || 0} pt`}
              highlight={calc.impact_score_prix_m2 > 0}
            />
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

function TechnicalAnalysisView({
  form,
  set,
  setForm,
  handlers,
  calc,
  prixTotal,
  saronRate,
  customFinancialFields,
  setCustomFinancialFields,
  newCustomFieldName,
  setNewCustomFieldName,
  newCustomFieldAmount,
  setNewCustomFieldAmount,
  newCustomFieldPct,
  setNewCustomFieldPct,
  newCustomFieldInsertAfter,
  setNewCustomFieldInsertAfter,
  addCustomFinancialField,
}) {
  const addOnEnter = (event) => {
    if (event.key === 'Enter') {
      addCustomFinancialField();
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h3 className="font-heading font-semibold">Vue technique</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Grille modifiable type Excel. Les cellules calculées se mettent à jour automatiquement.
            </p>
          </div>
          <span className="rounded-md border border-border bg-background px-3 py-1 text-xs font-mono text-muted-foreground">
            Mode édition directe
          </span>
        </div>

        <div className="overflow-auto rounded-md border border-[#d9d9d9] bg-white shadow-inner">
          <table className="w-full min-w-[1040px] border-collapse font-[Calibri,Arial,sans-serif] text-[11px] text-black">
            <thead>
              <tr>
                <ExcelCorner />
                {['A', 'B', 'C', 'D', 'E'].map((letter) => (
                  <ExcelColumnHeader key={letter}>{letter}</ExcelColumnHeader>
                ))}
              </tr>
              <tr>
                <ExcelRowNumber>1</ExcelRowNumber>
                <ExcelHeaderCell>Bloc</ExcelHeaderCell>
                <ExcelHeaderCell>Rubrique</ExcelHeaderCell>
                <ExcelHeaderCell align="right">Montant CHF</ExcelHeaderCell>
                <ExcelHeaderCell align="right">%</ExcelHeaderCell>
                <ExcelHeaderCell align="right">Calcul</ExcelHeaderCell>
              </tr>
            </thead>
            <tbody>
              <ExcelAmountRow row={2} section="Acquisition" label="Prix du bien" value={form.prix_bien} onChange={set('prix_bien')} />
              <ExcelAmountRow row={3} section="Acquisition" label="Prix d'achat" value={form.prix_achat} onChange={set('prix_achat')} />
              <ExcelPctRow
                row={5}
                section="Acquisition"
                label="Construction"
                amount={form.construction}
                onAmount={handlers.construction.amount}
                pct={form.construction_pct}
                onPct={handlers.construction.pct}
              />
              <ExcelComputedRow row={6} section="Financement" label="Fonds propres achat" value={formatCHF(getPurchaseEquity(form))} />
              <ExcelPctRow
                row={7}
                section="Acquisition"
                label="Versement initial copropriete"
                amount={form.versement_initial}
                onAmount={handlers.versementInitial.amount}
                pct={form.versement_initial_pct}
                onPct={handlers.versementInitial.pct}
              />
              <ExcelAmountRow row={8} section="Acquisition" label="Amortissement sur 5 ans" value={form.amortissement_5_ans} onChange={set('amortissement_5_ans')} />
              <ExcelPctRow
                row={9}
                section="Acquisition"
                label="Honoraires de transaction SIPA"
                amount={form.honoraires_transaction_sipa_group}
                onAmount={handlers.honorairesTransactionSipaGroup.amount}
                pct={form.honoraires_transaction_sipa_group_pct}
                onPct={handlers.honorairesTransactionSipaGroup.pct}
              />
              <ExcelAmountRow row={10} section="Acquisition" label="Frais de dossier bancaire" value={form.frais_dossier_bancaire} onChange={set('frais_dossier_bancaire')} />
              <ExcelComputedRow row={11} section="Acquisition" label="Prix total" value={formatCHF(prixTotal)} strong />

              <ExcelPctRow
                row={12}
                section="Financement"
                label="Fonds propres"
                amount={calculatedDisplayForm.fonds_propres}
                onAmount={handlers.fondsPropres.amount}
                pct={calculatedDisplayForm.fonds_propres_pct}
                onPct={handlers.fondsPropres.pct}
              />
              <ExcelPctRow
                row={13}
                section="Financement"
                label="Objectif bénéfice SIPA sur fonds propres"
                amount={form.target_benefice_sipa_fonds_propres}
                onAmount={handlers.targetBeneficeSipa.amount}
                pct={form.target_benefice_sipa_fonds_propres_pct}
                onPct={handlers.targetBeneficeSipa.pct}
              />
              <ExcelPctRow
                row={14}
                section="Financement"
                label="Hypotheque"
                amount={form.hypotheque}
                onAmount={handlers.hypotheque.amount}
                pct={form.hypotheque_pct}
                onPct={handlers.hypotheque.pct}
              />

              <ExcelAmountRow row={15} section="Exploitation" label="Revenus locatifs hors charges" value={form.revenus_locatifs} onChange={set('revenus_locatifs')} />
              <ExcelComputedRow row={16} section="Exploitation" label="Taux de rendement brut" value={formatPercent(calc.rendement_brut)} />
              <ExcelAmountRow row={17} section="Exploitation" label="Charges operationnelles" value={form.charges_operationnelles} onChange={set('charges_operationnelles')} />
              <ExcelPctRow
                row={18}
                section="Exploitation"
                label="Interet hypothecaire moyen 5 ans"
                amount={form.interets_hypothecaires}
                onAmount={handlers.interets.amount}
                pct={form.interets_hypothecaires_pct}
                onPct={handlers.interets.pct}
              />
              <ExcelPctRow
                row={19}
                section="Exploitation"
                label="Honoraires de gestion"
                amount={form.gestion}
                onAmount={handlers.gestion.amount}
                pct={form.gestion_pct}
                onPct={handlers.gestion.pct}
              />
              <ExcelComputedRow row={20} section="Exploitation" label="Revenu net" value={formatCHF(calc.revenu_net)} strong />
              <ExcelComputedRow row={21} section="Exploitation" label="Rendement net sur fonds propres" value={formatPercent(calc.rendement_net_fonds_propres)} />
              <ExcelPctRow
                row={22}
                section="Fiscalite"
                label="Impot"
                amount={form.impot}
                onAmount={handlers.impot.amount}
                pct={form.impot_pct}
                onPct={handlers.impot.pct}
              />
              <ExcelComputedRow row={23} section="Distribution" label="Revenu distribue" value={formatCHF(calc.revenu_distribue)} strong />
              <ExcelComputedRow row={24} section="Distribution" label="Revenu distribue / fonds propres" value={formatPercent(calc.revenu_distribue_fonds_propres)} />

              {customFinancialFields.map((cf, index) => (
                <tr key={cf.id}>
                  <ExcelRowNumber>{25 + index}</ExcelRowNumber>
                  <ExcelCell className={EXCEL_LOCKED_CELL_CLASS}>Personnalisé</ExcelCell>
                  <ExcelCell className={EXCEL_EDITABLE_CELL_CLASS}>
                    <input
                      type="text"
                      value={cf.name}
                      onChange={(event) =>
                        setCustomFinancialFields((prev) =>
                          prev.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item))
                        )
                      }
                      className={EXCEL_TEXT_INPUT_CLASS}
                    />
                  </ExcelCell>
                  <ExcelCell className={EXCEL_EDITABLE_CELL_CLASS}>
                    <ExcelNumberInput
                      value={cf.amount}
                      onChange={(value) =>
                        setCustomFinancialFields((prev) =>
                          prev.map((item, itemIndex) => (itemIndex === index ? { ...item, amount: value } : item))
                        )
                      }
                    />
                  </ExcelCell>
                  <ExcelCell className={EXCEL_EDITABLE_CELL_CLASS}>
                    <ExcelNumberInput
                      value={cf.pct}
                      onChange={(value) =>
                        setCustomFinancialFields((prev) =>
                          prev.map((item, itemIndex) => (itemIndex === index ? { ...item, pct: value } : item))
                        )
                      }
                    />
                  </ExcelCell>
                  <ExcelCell align="right" className={EXCEL_EDITABLE_CELL_CLASS}>
                    <select
                      value={cf.insertAfter || 'prix_total'}
                      onChange={(event) =>
                        setCustomFinancialFields((prev) =>
                          prev.map((item, itemIndex) => (itemIndex === index ? { ...item, insertAfter: event.target.value } : item))
                        )
                      }
                      className="h-6 w-full bg-transparent px-1 text-[11px] text-black outline-none focus:bg-[#fff2cc]"
                    >
                      {FINANCIAL_CUSTOM_FIELD_ANCHORS.map((anchor) => (
                        <option key={anchor.key} value={anchor.key}>Apres {anchor.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setCustomFinancialFields((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                      className="text-[11px] text-[#666] hover:text-red-600"
                    >
                      Supprimer
                    </button>
                  </ExcelCell>
                </tr>
              ))}

              <tr className="hover:bg-[#fff2cc]">
                <ExcelRowNumber>{21 + customFinancialFields.length}</ExcelRowNumber>
                <ExcelCell className={EXCEL_LOCKED_CELL_CLASS}>Nouvelle ligne</ExcelCell>
                <ExcelCell className={EXCEL_EDITABLE_CELL_CLASS}>
                  <input
                    type="text"
                    value={newCustomFieldName}
                    onChange={(event) => setNewCustomFieldName(event.target.value)}
                    onKeyDown={addOnEnter}
                    placeholder="Nom de la ligne"
                    className={EXCEL_TEXT_INPUT_CLASS}
                  />
                </ExcelCell>
                <ExcelCell className={EXCEL_EDITABLE_CELL_CLASS}>
                  <ExcelNumberInput value={newCustomFieldAmount} onChange={setNewCustomFieldAmount} onKeyDown={addOnEnter} />
                </ExcelCell>
                <ExcelCell className={EXCEL_EDITABLE_CELL_CLASS}>
                  <ExcelNumberInput value={newCustomFieldPct} onChange={setNewCustomFieldPct} onKeyDown={addOnEnter} />
                </ExcelCell>
                <ExcelCell align="right" className={EXCEL_EDITABLE_CELL_CLASS}>
                  <select
                    value={newCustomFieldInsertAfter}
                    onChange={(event) => setNewCustomFieldInsertAfter(event.target.value)}
                    className="mr-2 h-6 max-w-44 bg-transparent px-1 text-[11px] text-black outline-none focus:bg-[#fff2cc]"
                  >
                    {FINANCIAL_CUSTOM_FIELD_ANCHORS.map((anchor) => (
                      <option key={anchor.key} value={anchor.key}>Apres {anchor.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addCustomFinancialField}
                    className="rounded-sm border border-[#a6a6a6] bg-white px-2 py-0.5 text-[11px] text-black hover:bg-[#f3f3f3]"
                  >
                    Ajouter
                  </button>
                </ExcelCell>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-5">Hypothèses bancaires techniques</h3>
        <div className="overflow-x-auto rounded-md border border-[#d9d9d9] bg-white shadow-inner">
          <table className="w-full min-w-[980px] border-collapse font-[Calibri,Arial,sans-serif] text-[11px] text-black">
            <thead>
              <tr>
                <ExcelCorner />
                {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((letter) => (
                  <ExcelColumnHeader key={letter}>{letter}</ExcelColumnHeader>
                ))}
              </tr>
              <tr>
                <ExcelRowNumber>1</ExcelRowNumber>
                <ExcelHeaderCell>Banque</ExcelHeaderCell>
                <ExcelHeaderCell>Type de taux</ExcelHeaderCell>
                <ExcelHeaderCell align="right">Taux base %</ExcelHeaderCell>
                <ExcelHeaderCell align="right">Marge SARON %</ExcelHeaderCell>
                <ExcelHeaderCell align="right">Taux effectif</ExcelHeaderCell>
                <ExcelHeaderCell align="right">Amortissement CHF</ExcelHeaderCell>
                <ExcelHeaderCell>Évaluation</ExcelHeaderCell>
              </tr>
            </thead>
            <tbody>
              <ExcelBankRow row={2} title="Banque A" form={form} set={set} prefix="banque_a" saronRate={saronRate} />
              <ExcelBankRow row={3} title="Banque B" form={form} set={set} prefix="banque_b" saronRate={saronRate} />
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <div className="space-y-6">
          <ExcelProjectionSheet
            title="Projection exploitation"
            projection={normalizeProjectionDraft(form.operating_projection, createEmptyExcelProjections().operating_projection)}
            editable
            onCellChange={(rowIndex, colIndex, value) => updateProjectionCell(form.operating_projection, rowIndex, colIndex, value, set('operating_projection'), createEmptyExcelProjections().operating_projection)}
          />
          <ExcelProjectionSheet
            title="Dette, valeur et rendement"
            projection={normalizeProjectionDraft(form.capital_projection, createEmptyExcelProjections().capital_projection)}
            editable
            onCellChange={(rowIndex, colIndex, value) => updateProjectionCell(form.capital_projection, rowIndex, colIndex, value, set('capital_projection'), createEmptyExcelProjections().capital_projection)}
            onAssumptionChange={(key, value) => updateProjectionAssumption(form.capital_projection, key, value, set('capital_projection'), createEmptyExcelProjections().capital_projection)}
          />
        </div>
      </section>

      {form.sipa_data && form.sipa_data.filter((entry) => !entry._custom).length > 0 && (
        <ExcelSipaInvestmentSheet
          sipaData={form.sipa_data}
          onChange={(sipaData) => setForm((prev) => ({ ...prev, sipa_data: sipaData }))}
        />
      )}

      <section className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-4">Informations complementaires</h3>
        <textarea
          value={form.notes || ''}
          onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          className="w-full min-h-[140px] rounded-lg border border-border bg-background p-3 font-mono text-sm"
          placeholder="Notes techniques, banque, CECB, chauffage, courtier..."
        />
      </section>
    </div>
  );
}

const EXCEL_EDITABLE_CELL_CLASS = 'p-0 bg-primary/10';
const EXCEL_LOCKED_CELL_CLASS = 'bg-[#f3f4f6] text-[#6b7280]';
const EXCEL_TEXT_INPUT_CLASS = 'h-6 w-full bg-primary/10 px-2 text-black outline-none ring-1 ring-inset ring-primary/25 transition focus:bg-primary/20 focus:ring-primary/70';
const EXCEL_SELECT_CLASS = 'h-6 w-full bg-primary/10 px-2 text-black outline-none ring-1 ring-inset ring-primary/25 transition focus:bg-primary/20 focus:ring-primary/70';

function ExcelCorner() {
  return <th className="sticky left-0 z-10 h-6 w-10 border-b border-r border-[#cfd5dc] bg-[#e9edf1] text-center text-[10px] font-normal text-[#5f6b76]">#</th>;
}

function ExcelColumnHeader({ children }) {
  return <th className="h-6 border-b border-r border-[#cfd5dc] bg-[#e9edf1] px-3 text-center text-[10px] font-semibold text-[#5f6b76] last:border-r-0">{children}</th>;
}

function ExcelRowNumber({ children }) {
  return <td className="sticky left-0 z-10 h-6 w-10 border-b border-r border-[#cfd5dc] bg-[#e9edf1] text-center text-[10px] text-[#5f6b76]">{children}</td>;
}

function ExcelHeaderCell({ children, align = 'left' }) {
  return (
    <th className={`h-6 border-b border-r border-[#cfd5dc] bg-white px-2 ${align === 'right' ? 'text-right' : 'text-left'} text-[11px] font-bold text-black last:border-r-0`}>
      {children}
    </th>
  );
}

function ExcelCell({ children, align = 'left', className = '' }) {
  return (
    <td className={`h-6 border-b border-r border-[#d9d9d9] bg-white px-2 ${align === 'right' ? 'text-right' : 'text-left'} last:border-r-0 ${className}`}>
      {children}
    </td>
  );
}

function ExcelNumberInput({ value, onChange, onKeyDown }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(event) => onChange?.(event.target.value === '' ? null : parseFloat(event.target.value) || 0)}
      onKeyDown={onKeyDown}
      className="h-6 w-full bg-primary/10 px-2 text-right text-black outline-none ring-1 ring-inset ring-primary/25 transition focus:bg-primary/20 focus:ring-primary/70"
    />
  );
}

function ExcelAmountRow({ row, section, label, value, onChange }) {
  return (
    <tr className="hover:bg-[#fff2cc]">
      <ExcelRowNumber>{row}</ExcelRowNumber>
      <ExcelCell className={EXCEL_LOCKED_CELL_CLASS}>{section}</ExcelCell>
      <ExcelCell className={EXCEL_LOCKED_CELL_CLASS}>{label}</ExcelCell>
      <ExcelCell align="right" className={EXCEL_EDITABLE_CELL_CLASS}><ExcelNumberInput value={value} onChange={onChange} /></ExcelCell>
      <ExcelCell className={EXCEL_LOCKED_CELL_CLASS} />
      <ExcelCell className={EXCEL_LOCKED_CELL_CLASS} />
    </tr>
  );
}

function ExcelPctRow({ row, section, label, amount, onAmount, pct, onPct }) {
  return (
    <tr className="hover:bg-[#fff2cc]">
      <ExcelRowNumber>{row}</ExcelRowNumber>
      <ExcelCell className={EXCEL_LOCKED_CELL_CLASS}>{section}</ExcelCell>
      <ExcelCell className={EXCEL_LOCKED_CELL_CLASS}>{label}</ExcelCell>
      <ExcelCell align="right" className={EXCEL_EDITABLE_CELL_CLASS}><ExcelNumberInput value={amount} onChange={onAmount} /></ExcelCell>
      <ExcelCell align="right" className={EXCEL_EDITABLE_CELL_CLASS}><ExcelNumberInput value={pct} onChange={onPct} /></ExcelCell>
      <ExcelCell className={EXCEL_LOCKED_CELL_CLASS} />
    </tr>
  );
}

function ExcelComputedRow({ row, section, label, value, strong = false }) {
  return (
    <tr className="hover:bg-[#fff2cc]">
      <ExcelRowNumber>{row}</ExcelRowNumber>
      <ExcelCell className={EXCEL_LOCKED_CELL_CLASS}>{section}</ExcelCell>
      <ExcelCell className={`${EXCEL_LOCKED_CELL_CLASS} ${strong ? 'font-bold text-black' : ''}`}>{label}</ExcelCell>
      <ExcelCell className={EXCEL_LOCKED_CELL_CLASS} />
      <ExcelCell className={EXCEL_LOCKED_CELL_CLASS} />
      <ExcelCell align="right" className={`${EXCEL_LOCKED_CELL_CLASS} ${strong ? 'font-bold text-black' : ''}`}>{value}</ExcelCell>
    </tr>
  );
}

function ExcelBankRow({ row, title, form, set, prefix, saronRate }) {
  const typeTaux = form[`${prefix}_type_taux`] || 'fixe';
  const tauxBase = Number(form[`${prefix}_taux_hypothecaire`] || 0);
  const margeSaron = Number(form[`${prefix}_marge_saron`] ?? 0.5);
  const effectiveRate = getEffectiveMortgageRate({ typeTaux, tauxBase, margeSaron, saronRate });

  return (
    <tr className="hover:bg-[#fff2cc]">
      <ExcelRowNumber>{row}</ExcelRowNumber>
      <ExcelCell className={EXCEL_LOCKED_CELL_CLASS}>{title}</ExcelCell>
      <ExcelCell className={EXCEL_EDITABLE_CELL_CLASS}>
        <select
          value={typeTaux}
          onChange={(event) => set(`${prefix}_type_taux`)(event.target.value)}
          className={EXCEL_SELECT_CLASS}
        >
          <option value="fixe">Fixe</option>
          <option value="saron">Variable full SARON</option>
          <option value="mixte">Variable base fixe + SARON</option>
        </select>
      </ExcelCell>
      <ExcelCell align="right" className={EXCEL_EDITABLE_CELL_CLASS}><ExcelNumberInput value={form[`${prefix}_taux_hypothecaire`]} onChange={set(`${prefix}_taux_hypothecaire`)} /></ExcelCell>
      <ExcelCell align="right" className={EXCEL_EDITABLE_CELL_CLASS}><ExcelNumberInput value={form[`${prefix}_marge_saron`]} onChange={set(`${prefix}_marge_saron`)} /></ExcelCell>
      <ExcelCell align="right" className={EXCEL_LOCKED_CELL_CLASS}>
        {effectiveRate == null ? 'SARON...' : `${effectiveRate.toFixed(3)}%`}
      </ExcelCell>
      <ExcelCell align="right" className={EXCEL_EDITABLE_CELL_CLASS}><ExcelNumberInput value={form[`${prefix}_amortissement_annuel`]} onChange={set(`${prefix}_amortissement_annuel`)} /></ExcelCell>
      <ExcelCell className={EXCEL_EDITABLE_CELL_CLASS}>
        <input
          type="text"
          value={form[`${prefix}_evaluation`] || ''}
          onChange={(event) => set(`${prefix}_evaluation`)(event.target.value)}
          className={EXCEL_TEXT_INPUT_CLASS}
        />
      </ExcelCell>
    </tr>
  );
}

function ExcelSipaInvestmentSheet({ sipaData, onChange }) {
  const rows = sipaData.filter((entry) => !entry._custom);
  const maxValues = Math.max(1, ...rows.map((entry) => entry.values?.length || 0));
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].slice(0, maxValues + 1);
  const updateCell = (entryIndex, valueIndex, field, value) => {
    const importedCursor = { current: -1 };
    onChange(
      sipaData.map((entry) => {
        if (entry._custom) return entry;
        importedCursor.current += 1;
        if (importedCursor.current !== entryIndex) return entry;
        if (field === 'label') return { ...entry, label: value };
        return {
          ...entry,
          values: (entry.values || []).map((item, index) =>
            index === valueIndex ? { ...item, value } : item
          ),
        };
      })
    );
  };

  return (
    <section className="bg-card rounded-xl border border-border p-4">
      <h3 className="font-heading font-semibold mb-5">Investissement SIPA</h3>
      <div className="overflow-auto rounded-md border border-[#d9d9d9] bg-white shadow-inner">
        <table className="w-full min-w-[760px] border-collapse font-[Calibri,Arial,sans-serif] text-[11px] text-black">
          <thead>
            <tr>
              <ExcelCorner />
              {letters.map((letter) => <ExcelColumnHeader key={letter}>{letter}</ExcelColumnHeader>)}
            </tr>
            <tr>
              <ExcelRowNumber>1</ExcelRowNumber>
              <ExcelHeaderCell>Rubrique</ExcelHeaderCell>
              {Array.from({ length: maxValues }, (_, index) => (
                <ExcelHeaderCell key={index} align="right">Valeur {index + 1}</ExcelHeaderCell>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((entry, rowIndex) => (
              <tr key={`${entry.label}-${rowIndex}`} className="hover:bg-[#fff2cc]">
                <ExcelRowNumber>{rowIndex + 2}</ExcelRowNumber>
                <ExcelCell className={EXCEL_EDITABLE_CELL_CLASS}>
                  <input
                    type="text"
                    value={formatSipaLabel(entry, rows, rowIndex)}
                    onChange={(event) => updateCell(rowIndex, null, 'label', event.target.value)}
                    className={EXCEL_TEXT_INPUT_CLASS}
                  />
                </ExcelCell>
                {Array.from({ length: maxValues }, (_, valueIndex) => {
                  const value = entry.values?.[valueIndex];
                  const isNumeric = value?.type === 'amount' || value?.type === 'pct' || typeof value?.value === 'number';
                  return (
                    <ExcelCell
                      key={valueIndex}
                      align={isNumeric ? 'right' : 'left'}
                      className={value ? EXCEL_EDITABLE_CELL_CLASS : EXCEL_LOCKED_CELL_CLASS}
                    >
                      {value ? (
                        isNumeric ? (
                          <ExcelNumberInput value={value.value} onChange={(next) => updateCell(rowIndex, valueIndex, 'value', next)} />
                        ) : (
                          <input
                            type="text"
                            value={value.value ?? ''}
                            onChange={(event) => updateCell(rowIndex, valueIndex, 'value', event.target.value)}
                            className={EXCEL_TEXT_INPUT_CLASS}
                          />
                        )
                      ) : ''}
                    </ExcelCell>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ExcelProjectionSheet({ title, projection, editable, onCellChange, onAssumptionChange }) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].slice(0, projection.columns.length + 1);
  const hasAssumptions = projection.assumptions && Object.keys(projection.assumptions).length > 0;

  return (
    <section className="bg-card rounded-xl border border-border p-4">
      <h3 className="font-heading font-semibold mb-5">{title}</h3>
      <div className="overflow-auto rounded-md border border-[#d9d9d9] bg-white shadow-inner">
        <table className="w-full min-w-[860px] border-collapse font-[Calibri,Arial,sans-serif] text-[11px] text-black">
          <thead>
            <tr>
              <ExcelCorner />
              {letters.map((letter) => <ExcelColumnHeader key={letter}>{letter}</ExcelColumnHeader>)}
            </tr>
            <tr>
              <ExcelRowNumber>1</ExcelRowNumber>
              <ExcelHeaderCell>Rubrique</ExcelHeaderCell>
              {projection.columns.map((column) => (
                <ExcelHeaderCell key={column} align="right">{column}</ExcelHeaderCell>
              ))}
            </tr>
          </thead>
          <tbody>
            {projection.rows.map((row, rowIndex) => (
              <tr key={row.key || row.label} className="hover:bg-[#fff2cc]">
                <ExcelRowNumber>{rowIndex + 2}</ExcelRowNumber>
                <ExcelCell className={EXCEL_LOCKED_CELL_CLASS}>{row.label}</ExcelCell>
                {projection.columns.map((column, colIndex) => (
                  <ExcelCell key={`${row.key}-${column}`} align="right" className={editable ? EXCEL_EDITABLE_CELL_CLASS : EXCEL_LOCKED_CELL_CLASS}>
                    {editable ? (
                      <ExcelNumberInput value={row.values?.[colIndex]} onChange={(value) => onCellChange(rowIndex, colIndex, value)} />
                    ) : (
                      formatProjectionValue(row.values?.[colIndex], row.type)
                    )}
                  </ExcelCell>
                ))}
              </tr>
            ))}
            {hasAssumptions && (
              <>
                <tr>
                  <ExcelRowNumber>{projection.rows.length + 2}</ExcelRowNumber>
                  <ExcelCell className={`${EXCEL_LOCKED_CELL_CLASS} font-bold text-black`}>Hypothèses</ExcelCell>
                  {projection.columns.map((column) => <ExcelCell key={column} className={EXCEL_LOCKED_CELL_CLASS} />)}
                </tr>
                {Object.entries(projection.assumptions).map(([key, value], index) => (
                  <tr key={key} className="hover:bg-[#fff2cc]">
                    <ExcelRowNumber>{projection.rows.length + 3 + index}</ExcelRowNumber>
                    <ExcelCell className={EXCEL_LOCKED_CELL_CLASS}>{formatAssumptionLabel(key)}</ExcelCell>
                    <ExcelCell align="right" className={editable ? EXCEL_EDITABLE_CELL_CLASS : EXCEL_LOCKED_CELL_CLASS}>
                      {editable ? (
                        <ExcelNumberInput value={value} onChange={(next) => onAssumptionChange?.(key, next)} />
                      ) : (
                        formatProjectionValue(value, key.includes('yield') || key.includes('irr') || key.includes('increase') ? 'percent' : 'amount')
                      )}
                    </ExcelCell>
                    {projection.columns.slice(1).map((column) => <ExcelCell key={column} className={EXCEL_LOCKED_CELL_CLASS} />)}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function normalizeProjectionDraft(projection, fallback) {
  const source = projection && typeof projection === 'object' ? projection : fallback;
  const sourceRows = Array.isArray(source.rows) ? source.rows : [];
  return {
    ...fallback,
    ...source,
    columns: Array.isArray(source.columns) && source.columns.length ? source.columns : fallback.columns,
    rows: fallback.rows.map((fallbackRow) => {
      const existing = sourceRows.find((row) => row.key === fallbackRow.key || row.label === fallbackRow.label);
      const values = Array.isArray(existing?.values) ? existing.values : [];
      return {
        ...fallbackRow,
        ...existing,
        values: Array.from({ length: fallback.columns.length }, (_, index) => values[index] ?? null),
      };
    }),
    assumptions: {
      ...(fallback.assumptions || {}),
      ...(source.assumptions || {}),
    },
  };
}

function updateProjectionCell(projection, rowIndex, colIndex, value, onChange, fallback) {
  const normalized = normalizeProjectionDraft(projection, fallback);
  onChange({
    ...normalized,
    rows: normalized.rows.map((row, index) =>
      index === rowIndex
        ? { ...row, values: row.values.map((cell, cellIndex) => (cellIndex === colIndex ? value : cell)) }
        : row
    ),
  });
}

function updateProjectionAssumption(projection, key, value, onChange, fallback) {
  const normalized = normalizeProjectionDraft(projection, fallback);
  onChange({
    ...normalized,
    assumptions: { ...(normalized.assumptions || {}), [key]: value },
  });
}

function formatProjectionValue(value, type) {
  if (value === null || value === undefined || value === '') return '';
  if (type === 'percent') return formatPercent(value);
  return formatCHF(value);
}

function formatAssumptionLabel(key) {
  const labels = {
    price_increase: 'Hausse du prix',
    sales_price: 'Prix de vente',
    exit_debt: 'Dette à la sortie',
    net: 'Net',
    irr: 'TRI',
    average_dividend_yield: 'Rendement distribué moyen',
  };
  return labels[key] || key;
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
