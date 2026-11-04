# Soléa Live — iPhone

Widget Scriptable pour les prochains passages du réseau Soléa Mulhouse. Projet indépendant et non officiel.

## Installation
Les fichiers du programme sont installés dans ce dépôt. **Reste à déposer le fichier GTFS statique** sous le chemin exact `data/solea.gtfs.zip`. Il s'agit du fichier `SITRAM.GTFS.zip` fourni par l'utilisateur.

1. Sur GitHub, **Add file → Upload files** et déposer le ZIP dans le dossier `data`, sous le nom `solea.gtfs.zip`.
2. Dans **Settings → Actions → General → Workflow permissions**, sélectionner **Read and write permissions**.
3. Dans **Actions → Update Solea departures**, lancer **Run workflow**. Vérifier que `public/departures.json` apparaît.
4. Sur iPhone, installer Scriptable, créer un script et coller le contenu de `SoleaLive.js`. Ajouter un widget Scriptable sur l'écran d'accueil.

Le flux GTFS-RT est : https://proxy.transport.data.gouv.fr/resource/solea-mulhouse-gtfs-rt

Les horaires théoriques sont affichés lorsque le flux temps réel est absent ou qu'une mise à jour ne correspond pas au GTFS statique. Le lancement toutes les 15 minutes et l'actualisation iOS ne sont pas garantis à la minute.
