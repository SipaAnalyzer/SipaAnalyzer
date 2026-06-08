{
  "name": "UserPermission",
  "type": "object",
  "properties": {
    "user_id": {
      "type": "string",
      "title": "Utilisateur"
    },
    "can_view_properties": {
      "type": "boolean",
      "title": "Voir les biens",
      "default": true
    },
    "can_create_property": {
      "type": "boolean",
      "title": "Cr\u00e9er des biens",
      "default": false
    },
    "can_edit_property": {
      "type": "boolean",
      "title": "Modifier des biens",
      "default": false
    },
    "can_delete_property": {
      "type": "boolean",
      "title": "Supprimer des biens",
      "default": false
    },
    "can_create_analysis": {
      "type": "boolean",
      "title": "Cr\u00e9er des analyses",
      "default": false
    },
    "can_edit_analysis": {
      "type": "boolean",
      "title": "Modifier des analyses",
      "default": false
    },
    "can_delete_analysis": {
      "type": "boolean",
      "title": "Supprimer des analyses",
      "default": false
    },
    "can_view_comparator": {
      "type": "boolean",
      "title": "Acc\u00e9der au comparateur",
      "default": true
    },
    "can_view_presentation": {
      "type": "boolean",
      "title": "Acc\u00e9der \u00e0 la pr\u00e9sentation",
      "default": true
    },
    "can_comment": {
      "type": "boolean",
      "title": "Commenter",
      "default": true
    }
  },
  "required": [
    "user_id"
  ]
}