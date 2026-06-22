{
  "name": "Analysis",
  "type": "object",
  "properties": {
    "property_id": {
      "type": "string",
      "title": "Bien"
    },
    "prix_bien": {
      "type": "number",
      "title": "Prix du bien"
    },
    "versement_copropriete": {
      "type": "number",
      "title": "Versement copropri\u00e9t\u00e9",
      "default": 0
    },
    "amortization_years": {
      "type": "number",
      "title": "Ann\u00e9es d'amortissement",
      "default": 15
    },
    "honoraires_sipa": {
      "type": "number",
      "title": "Honoraires SIPA",
      "default": 0
    },
    "prix_total": {
      "type": "number",
      "title": "Prix total"
    },
    "fonds_propres": {
      "type": "number",
      "title": "Fonds propres"
    },
    "hypotheque": {
      "type": "number",
      "title": "Hypoth\u00e8que"
    },
    "revenus_locatifs": {
      "type": "number",
      "title": "Revenus locatifs"
    },
    "rendement_brut": {
      "type": "number",
      "title": "Rendement brut (%)"
    },
    "charges_operationnelles": {
      "type": "number",
      "title": "Charges op\u00e9rationnelles",
      "default": 0
    },
    "interets_hypothecaires": {
      "type": "number",
      "title": "Int\u00e9r\u00eats hypoth\u00e9caires",
      "default": 0
    },
    "gestion": {
      "type": "number",
      "title": "Gestion",
      "default": 0
    },
    "amortissements": {
      "type": "number",
      "title": "Amortissements",
      "default": 0
    },
    "autres_couts": {
      "type": "number",
      "title": "Autres co\u00fbts",
      "default": 0
    },
    "revenu_net": {
      "type": "number",
      "title": "Revenu net"
    },
    "rendement_net_fonds_propres": {
      "type": "number",
      "title": "Rendement net / FP (%)"
    },
    "impot": {
      "type": "number",
      "title": "Imp\u00f4t",
      "default": 0
    },
    "revenu_distribue": {
      "type": "number",
      "title": "Revenu distribu\u00e9"
    },
    "revenu_distribue_fonds_propres": {
      "type": "number",
      "title": "Revenu distribu\u00e9 / FP (%)"
    },
    "score_global": {
      "type": "number",
      "title": "Score global"
    },
    "etat_batiment": {
      "type": "string",
      "enum": ["Excellent", "Très bon", "Bon", "Moyen", "Mauvais"],
      "title": "État du bâtiment"
    },
    "emplacement_bien": {
      "type": "string",
      "enum": ["Excellent", "Très bon", "Bon", "Moyen", "Mauvais"],
      "title": "Emplacement du bien"
    },
    "note": {
      "type": "string",
      "enum": [
        "A",
        "B",
        "C",
        "D",
        "E"
      ],
      "title": "Note"
    },
    "statut": {
      "type": "string",
      "enum": [
        "brouillon",
        "en_cours",
        "valide",
        "abandonne"
      ],
      "default": "en_cours",
      "title": "Statut"
    }
  },
  "required": [
    "property_id",
    "prix_bien",
    "fonds_propres",
    "revenus_locatifs"
  ]
}