# GUIDE DE MISE EN LIGNE — KuniKribi, pas à pas

Feuille de route complète : **tester → déployer → installer → partager → tester avec 12 éleveurs → publier sur Google Play**. Chaque étape prend entre 10 minutes et 1 heure. Cochez au fur et à mesure.

---

## ÉTAPE 0 — Tester l'application sur votre ordinateur (10 min)

1. Ouvrez le dossier `kunikribi` et double-cliquez sur `index.html` : l'application s'ouvre dans votre navigateur.
2. Testez : ajoutez 2-3 lapins, une saillie, une vente. Basculez en anglais avec le bouton 🌍.
3. Fermez et rouvrez la page : vos données doivent toujours être là (elles sont sauvegardées dans le navigateur).

> Note : en double-cliquant sur le fichier, le mode hors ligne (service worker) n'est pas actif — c'est normal, il ne fonctionne qu'une fois le site en ligne (https). Tout le reste fonctionne.

## ÉTAPE 1 — Créer un compte GitHub et y déposer le projet (30 min)

GitHub hébergera votre code gratuitement et permettra les mises à jour faciles.

1. Allez sur **github.com** → « Sign up » → créez un compte (gratuit).
2. Cliquez sur **« + » → « New repository »** :
   - Nom : `kunikribi`
   - Visibilité : Public (ou Private, les deux fonctionnent avec Vercel)
   - Cliquez « Create repository ».
3. Sur la page du dépôt vide, cliquez **« uploading an existing file »**.
4. Glissez-déposez TOUT le contenu du dossier `kunikribi` :
   `index.html`, `manifest.json`, `service-worker.js`, `confidentialite.html`, `fiche-play-store.md` et le dossier `icons/` (glissez les deux fichiers PNG ; GitHub recrée le dossier si vous glissez le dossier entier depuis l'explorateur).
5. Cliquez **« Commit changes »**.

## ÉTAPE 2 — Déployer gratuitement sur Vercel (20 min)

1. Allez sur **vercel.com** → « Sign Up » → choisissez **« Continue with GitHub »** (cela lie les deux comptes).
2. Cliquez **« Add New… » → « Project »** → importez le dépôt `kunikribi`.
3. Ne changez aucun réglage (c'est un site statique, aucune configuration nécessaire) → cliquez **« Deploy »**.
4. Après ~1 minute, Vercel vous donne une adresse du type :
   `https://kunikribi.vercel.app`
5. Ouvrez cette adresse sur votre téléphone : l'application fonctionne, et cette fois le **mode hors ligne est actif** (chargez la page une fois avec Internet, puis coupez les données : elle marche toujours).

> Chaque fois que vous modifierez un fichier sur GitHub, Vercel redéploiera automatiquement le site en ~1 minute.

## ÉTAPE 3 — Personnaliser les 3 éléments entre crochets (15 min)

Sur GitHub, ouvrez `confidentialite.html` → icône crayon (Edit) → remplacez :
1. `[VOTRE NOM OU STRUCTURE]` et `[YOUR NAME OR ORGANISATION]` → votre nom ou celui de votre ferme/structure ;
2. `[VOTRE-EMAIL]` et `[YOUR-EMAIL]` → votre adresse e-mail de contact ;
3. `[DATE]` → la date du jour.
Cliquez « Commit changes ». Vérifiez ensuite que la page s'affiche bien à :
`https://kunikribi.vercel.app/confidentialite.html` ← **gardez ce lien, il servira pour la Play Console.**

## ÉTAPE 4 — Installer l'application sur un téléphone Android (5 min)

1. Ouvrez `https://kunikribi.vercel.app` dans **Chrome** sur le téléphone.
2. Menu ⋮ → **« Ajouter à l'écran d'accueil »** (ou « Installer l'application » si Chrome le propose).
3. L'icône K verte apparaît sur l'écran d'accueil : l'application s'ouvre en plein écran, comme une vraie app, et fonctionne sans Internet.

## ÉTAPE 5 — Partager aux premiers éleveurs via WhatsApp (1 jour)

Message type à envoyer (adaptez-le) :

> 🐇 *Bonjour ! Je lance KuniKribi, une application gratuite pour gérer son élevage de lapins (saillies, mises bas, ventes). Elle marche SANS Internet et en français/anglais. Pour l'essayer : ouvrez ce lien dans Chrome puis « Ajouter à l'écran d'accueil » : https://kunikribi.vercel.app — Dites-moi ce que vous en pensez !*

Recueillez les retours pendant 1 à 2 semaines : qu'est-ce qui manque ? qu'est-ce qui n'est pas clair ? Notez tout.

## ÉTAPE 6 — Publier sur Google Play (1 à 3 semaines)

### 6a. Créer le compte développeur
1. Allez sur **play.google.com/console** → créez un compte développeur (frais uniques de 25 $ US, payables par carte bancaire).
2. Vérifiez votre identité (pièce d'identité demandée par Google, délai de quelques jours).

### 6b. Transformer la PWA en application Android (.aab)
1. Allez sur **pwabuilder.com** → collez `https://kunikribi.vercel.app` → « Start ».
2. PWABuilder analyse le site (le manifeste et le service worker sont déjà prêts dans le projet) → cliquez **« Package for stores » → Android**.
3. Renseignez : Package ID `com.kunikribi.app`, nom `KuniKribi`, puis téléchargez le fichier **`.aab`** généré (et conservez précieusement le fichier de clé de signature fourni avec : sans lui, plus de mises à jour possibles !).

### 6c. Remplir la fiche et publier
1. Dans la Play Console : « Créer une application » → langue par défaut **Français**.
2. Copiez-collez les textes de `fiche-play-store.md` (fiche FR, puis ajoutez la traduction EN via « Gérer les traductions »).
3. Remplissez le questionnaire **Sécurité des données** avec les réponses du fichier (aucune donnée collectée).
4. Ajoutez l'URL de confidentialité : `https://kunikribi.vercel.app/confidentialite.html`.
5. Téléversez le `.aab` d'abord en **« Test fermé »** : ajoutez les adresses e-mail de vos ~12 éleveurs testeurs.
   ⚠️ Pour les comptes développeur individuels créés récemment, Google exige un test fermé avec **au moins 12 testeurs pendant 14 jours** avant d'autoriser la publication en production. Vos éleveurs WhatsApp sont parfaits pour ça !
6. Après les 14 jours, demandez l'accès production → soumettez → validation Google (quelques jours) → **KuniKribi est sur le Play Store** 🎉

## ÉTAPE 7 — Et après ?

- **Synchronisation cloud** : sauvegarder les données en ligne pour ne rien perdre en cas de changement de téléphone.
- **Paiement Mobile Money** : version premium (statistiques avancées, multi-fermes) payable par Orange Money / MTN MoMo.
- **Autres langues** : la structure bilingue de l'app permet d'ajouter facilement une langue (il suffit de compléter le dictionnaire I18N dans `index.html`).

Bonne chance pour le lancement ! 🐇🌍
