/**
 * Cible de redirection OAuth (popup). Ne charge pas Angular : on relaie
 * simplement le code d'autorisation à la fenêtre parente puis on se ferme.
 */
(function () {
  var params = new URLSearchParams(window.location.search);
  var message = {
    source: 'vit-oauth',
    code: params.get('code') || undefined,
    state: params.get('state') || undefined,
    error: params.get('error') || undefined,
  };

  if (!window.opener) {
    document.getElementById('status').textContent =
      "Cette page est le retour de connexion ViT. Vous pouvez la fermer.";
    return;
  }

  // Même origine que l'app : le parent vérifie l'origine et le state.
  window.opener.postMessage(message, window.location.origin);
  window.close();
})();
