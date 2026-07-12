# ViTpay

PWA wallet ViT (Safe Account + passkey + xCHF).

## Dépannage passkeys (Android / Chrome)

Si la création du compte affiche un écran Google du type **« Vos données chiffrées ne sont pas encore déverrouillées »** :

Ce n’est en général **pas** l’empreinte du téléphone qui est en cause, mais le coffre **Google Password Manager (GPM)** utilisé par Chrome pour les passkeys web.

### Comment le savoir

1. **Paramètres Android → Google → Mot de passe, clés d’accès et remplissage automatique → Clés d’accès**  
   (ou Chrome → Paramètres → Google Password Manager → Clés d’accès)
2. Liste vide / quasi vide → l’utilisateur n’avait probablement **jamais** créé de passkey web avant ViT.
3. Test hors ViT : ouvrir [webauthn.io](https://webauthn.io) dans Chrome → Register.  
   - Même message GPM → problème **compte Google / appareil**, pas ViT.  
   - OK ailleurs, KO uniquement sur ViT → remonter origine / PWA.

### Déblocage

1. Suivre le bouton **Réinitialiser les clés d’accès** si proposé (impacte les passkeys GPM de ce compte sur cet appareil).
2. Sinon : [chrome.google.com/sync](https://chrome.google.com/sync) → Clear data, puis réactiver Sync sur le téléphone.
3. Contournement : créer le compte sur un autre appareil où les passkeys fonctionnent.

Les apps qui utilisent seulement l’empreinte locale (sans passkey GPM) continuent en général de fonctionner après un reset des clés d’accès.
