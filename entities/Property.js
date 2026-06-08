{
  "name": "Property",
  "type": "object",
  "properties": {
    "nom_bien": {
      "type": "string",
      "title": "Nom du bien"
    },
    "adresse": {
      "type": "string",
      "title": "Adresse"
    },
    "ville": {
      "type": "string",
      "title": "Ville"
    },
    "canton": {
      "type": "string",
      "title": "Canton"
    },
    "pays": {
      "type": "string",
      "title": "Pays",
      "default": "Suisse"
    },
    "annee_construction": {
      "type": "number",
      "title": "Ann\u00e9e de construction"
    },
    "surface": {
      "type": "number",
      "title": "Surface (m\u00b2)"
    },
    "nombre_logements": {
      "type": "number",
      "title": "Nombre de logements"
    },
    "image_url": {
      "type": "string",
      "title": "Image"
    },
    "lien_annonce": {
      "type": "string",
      "title": "Lien de l'annonce"
    },
    "latitude": {
      "type": "number",
      "title": "Latitude"
    },
    "longitude": {
      "type": "number",
      "title": "Longitude"
    },
    "statut": {
      "type": "string",
      "enum": [
        "brouillon",
        "en_cours",
        "valide",
        "abandonne"
      ],
      "default": "brouillon",
      "title": "Statut"
    }
  },
  "required": [
    "nom_bien",
    "ville"
  ]
}