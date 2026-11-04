# Soléa Live — Flutter (Android / iOS)

**État : prototype source non compilé.** Le backend existant (`build.py`, `data/solea.gtfs.zip`, `public/departures.json`, GitHub Actions) reste inchangé.

## Sur Windows

1. Installer Flutter SDK et Android Studio.
2. Dans un nouveau dossier, lancer `flutter create --org com.yroxdev solea_live`.
3. Remplacer le `pubspec.yaml` et `lib/main.dart` générés par ceux de ce dossier.
4. Exécuter `flutter pub get`.
5. Pour le widget Android, copier :
   - `android_widget/SoleaWidgetProvider.kt` dans `android/app/src/main/kotlin/com/yroxdev/solealive/`
   - `android_widget/solea_widget.xml` dans `android/app/src/main/res/layout/`
   - `android_widget/solea_widget_info.xml` dans `android/app/src/main/res/xml/`
6. Dans `android/app/src/main/AndroidManifest.xml`, à l'intérieur de `<application>`, ajouter :
```xml
<receiver android:name=".SoleaWidgetProvider" android:exported="true">
  <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE"/></intent-filter>
  <meta-data android:name="android.appwidget.provider" android:resource="@xml/solea_widget_info"/>
</receiver>
```
7. Ajouter la permission `<uses-permission android:name="android.permission.INTERNET"/>` dans le manifeste Android si absente.
8. Lancer `flutter run` sur un Android connecté.

Le widget Android lit les dernières données enregistrées par l'application. **Ce prototype n'actualise pas encore le widget en arrière-plan indépendamment de l'application.** Pour cela, ajouter un mécanisme Android WorkManager adapté aux limites d'exécution du système.

## iPhone

L'interface Flutter pourra fonctionner sur iOS après génération et compilation sur macOS. **Le widget WidgetKit iOS n'est pas encore implémenté.** La distribution publique nécessite une méthode de signature/distribution Apple autorisée.

Les corrections GTFS-RT ne sont pas garanties pour tous les départs ; l'interface distingue les horaires théoriques des horaires réellement corrigés.
