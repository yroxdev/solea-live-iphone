import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:home_widget/home_widget.dart';

const feedUrl = 'https://raw.githubusercontent.com/yroxdev/solea-live-iphone/main/public/departures.json';
const widgetName = 'SoleaWidgetProvider';

void main() => runApp(const SoleaApp());

class SoleaApp extends StatelessWidget {
  const SoleaApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Soléa Live',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xffdf3454), brightness: Brightness.dark), useMaterial3: true),
    home: const HomePage(),
  );
}

class Departure {
  final String line, destination;
  final DateTime time;
  final bool realtime;
  Departure(Map<String,dynamic> data)
    : line = (data['line'] ?? '?').toString(),
      destination = (data['destination'] ?? '').toString(),
      time = DateTime.parse(data['departure'] as String),
      realtime = data['realtime'] == true;
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  Map<String,dynamic>? feed;
  String selected = 'Porte Jeune';
  String? error;
  bool loading = true;
  List<String> favorites = ['Porte Jeune'];
  @override
  void initState() { super.initState(); init(); }

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    selected = prefs.getString('stop') ?? selected;
    favorites = prefs.getStringList('favorites') ?? favorites;
    await refresh();
  }

  List<String> get stops {
    final s = feed?['stops'];
    if (s is! Map) return [];
    return s.values.map((e) => e.toString()).toSet().toList()..sort((a,b)=>a.toLowerCase().compareTo(b.toLowerCase()));
  }

  List<Departure> get departures {
    if (feed == null) return [];
    final names = feed!['stops'] as Map<String,dynamic>;
    final all = feed!['departures'] as Map<String,dynamic>;
    final ids = names.keys.where((id) => names[id].toString().toLowerCase() == selected.toLowerCase());
    final result = <Departure>[];
    for (final id in ids) {
      for (final item in (all[id] as List<dynamic>? ?? [])) {
        try {
          final dep = Departure(item as Map<String,dynamic>);
          if (dep.time.isAfter(DateTime.now().subtract(const Duration(minutes: 1)))) result.add(dep);
        } catch (_) {}
      }
    }
    result.sort((a,b)=>a.time.compareTo(b.time));
    return result;
  }

  Future<void> refresh() async {
    if (mounted) setState(() { loading = true; error = null; });
    try {
      final response = await http.get(Uri.parse(feedUrl)).timeout(const Duration(seconds: 20));
      if (response.statusCode != 200) throw Exception('HTTP ${response.statusCode}');
      final data = jsonDecode(utf8.decode(response.bodyBytes)) as Map<String,dynamic>;
      if (mounted) setState(() => feed = data);
      await updateWidget();
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> choose(String stop) async {
    final prefs = await SharedPreferences.getInstance();
    selected = stop;
    favorites = [stop, ...favorites.where((e) => e != stop)].take(10).toList();
    await prefs.setString('stop', selected);
    await prefs.setStringList('favorites', favorites);
    if (mounted) setState(() {});
    await updateWidget();
  }

  Future<void> updateWidget() async {
    final rows = departures.take(3).map((d) {
      final minutes = (d.time.difference(DateTime.now()).inSeconds / 60).ceil();
      return '${d.line}  ${d.destination}  ${minutes < 0 ? 0 : minutes} min${d.realtime ? " • réel" : ""}';
    }).join('\n');
    await HomeWidget.saveWidgetData<String>('stop', selected);
    await HomeWidget.saveWidgetData<String>('departures', rows.isEmpty ? 'Aucun départ à venir' : rows);
    await HomeWidget.saveWidgetData<String>('updated', DateTime.now().toIso8601String());
    try { await HomeWidget.updateWidget(androidName: widgetName); } catch (_) {}
  }

  void openPicker() {
    var query = '';
    showModalBottomSheet<void>(context: context, isScrollControlled: true, builder: (ctx) =>
      StatefulBuilder(builder: (ctx, update) {
        final filtered = stops.where((s)=>s.toLowerCase().contains(query.toLowerCase())).take(70).toList();
        return SafeArea(child: Padding(
          padding: EdgeInsets.fromLTRB(16,16,16,MediaQuery.of(ctx).viewInsets.bottom + 16),
          child: SizedBox(height: MediaQuery.of(ctx).size.height * .65, child: Column(children: [
            TextField(autofocus: true, decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Rechercher un arrêt'), onChanged: (s)=>update(()=>query=s)),
            const SizedBox(height: 12),
            Expanded(child: ListView.builder(itemCount: filtered.length, itemBuilder: (ctx,i)=>ListTile(
              title: Text(filtered[i]), trailing: favorites.contains(filtered[i]) ? const Icon(Icons.star) : null,
              onTap: () { Navigator.pop(ctx); choose(filtered[i]); },
            )))
          ])),
        ));
      })
    );
  }

  @override
  Widget build(BuildContext context) {
    final list = departures;
    final updated = DateTime.tryParse(feed?['updated']?.toString() ?? '');
    final stale = updated == null || DateTime.now().difference(updated).inMinutes > 30;
    return Scaffold(
      appBar: AppBar(title: const Text('Soléa Live'), actions: [
        IconButton(onPressed: refresh, icon: const Icon(Icons.refresh), tooltip: 'Actualiser')
      ]),
      body: RefreshIndicator(onRefresh: refresh, child: ListView(padding: const EdgeInsets.all(16), children: [
        const Text('Mulhouse et agglomération • Projet non officiel', style: TextStyle(color: Colors.white70)),
        const SizedBox(height: 20),
        Card(child: ListTile(leading: const Icon(Icons.location_on), title: Text(selected), subtitle: const Text('Appuyer pour changer d’arrêt'), trailing: const Icon(Icons.keyboard_arrow_down), onTap: feed == null ? null : openPicker)),
        if (loading) const LinearProgressIndicator(),
        if (error != null) Padding(padding: const EdgeInsets.all(12), child: Text('Connexion : $error', style: const TextStyle(color: Colors.orangeAccent))),
        if (stale) const Padding(padding: EdgeInsets.all(12), child: Text('Attention : données anciennes ou indisponibles', style: TextStyle(color: Colors.orangeAccent))),
        const SizedBox(height: 12),
        Text('Prochains passages', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        if (list.isEmpty) const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('Aucun départ à venir pour cet arrêt.'))),
        ...list.take(30).map((d) {
          final mins = (d.time.difference(DateTime.now()).inSeconds / 60).ceil();
          return Card(child: ListTile(
            leading: CircleAvatar(backgroundColor: const Color(0xffd8344b), child: Text(d.line, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
            title: Text(d.destination.isEmpty ? 'Destination inconnue' : d.destination),
            subtitle: Text('${d.time.hour.toString().padLeft(2,"0")}:${d.time.minute.toString().padLeft(2,"0")} • ${d.realtime ? "Temps réel" : "Horaire théorique"}'),
            trailing: Text('${mins < 0 ? 0 : mins} min', style: const TextStyle(fontWeight: FontWeight.bold)),
          ));
        }),
        if (updated != null) Padding(padding: const EdgeInsets.all(12), child: Text('Données publiées : ${updated.toLocal()}')),
      ])),
    );
  }
}
