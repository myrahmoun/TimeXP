import { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';

// Returns the Sunday–Saturday bounds for the week containing `date`
function getWeekBounds(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  sunday.setHours(0, 0, 0, 0);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);
  return { start: sunday, end: saturday };
}

function formatWeekLabel(start, end) {
  const fmt = (d) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * For each time entry, find the best matching earn rule:
 *   1. A rule whose project_match equals the entry's project (case-insensitive)
 *   2. A rule with no project_match (catch-all)
 * Returns total credits earned.
 */
function calculateCredits(entries, rules) {
  const earnRules = rules.filter((r) => r.type === 'earn');
  let total = 0;

  for (const entry of entries) {
    const specific = earnRules.find(
      (r) =>
        r.project_match &&
        r.project_match.toLowerCase() === entry.project.toLowerCase()
    );
    const catchAll = earnRules.find((r) => !r.project_match);
    const rule = specific ?? catchAll;

    if (rule && rule.unit === 'per_hour') {
      total += (Number(entry.duration_minutes) / 60) * Number(rule.credits);
    }
  }

  return total;
}

export default function SummaryScreen() {
  const [entries, setEntries] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  const { start, end } = getWeekBounds();

  async function fetchData() {
    setLoading(true);
    const [entriesRes, rulesRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select('*')
        .gte('started_at', start.toISOString())
        .lte('started_at', end.toISOString())
        .order('started_at', { ascending: false }),
      supabase.from('credit_rules').select('*').order('created_at'),
    ]);
    if (entriesRes.data) setEntries(entriesRes.data);
    if (rulesRes.data) setRules(rulesRes.data);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // Aggregate by project
  const byProject = entries.reduce((acc, e) => {
    const key = e.project || 'Untagged';
    acc[key] = (acc[key] ?? 0) + Number(e.duration_minutes);
    return acc;
  }, {});

  const totalMinutes = Object.values(byProject).reduce((s, m) => s + m, 0);
  const totalCredits = calculateCredits(entries, rules);
  const earnRules = rules.filter((r) => r.type === 'earn');
  const spendRules = rules.filter((r) => r.type === 'spend');

  const isSaturday = new Date().getDay() === 6;

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#8b5cf6" />
        }
      >
        {/* Header */}
        <View className="mb-2">
          <Text className="text-white text-2xl font-bold">This Week</Text>
          <Text className="text-slate-500 text-sm mt-1">{formatWeekLabel(start, end)}</Text>
          {isSaturday && (
            <View className="flex-row items-center gap-1.5 mt-2">
              <View className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <Text className="text-amber-400 text-xs">Weekly summary day</Text>
            </View>
          )}
        </View>

        {/* Totals */}
        <View className="flex-row gap-3 mt-6 mb-8">
          <View className="flex-1 bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <Text className="text-slate-500 text-xs uppercase tracking-widest mb-1">
              Time logged
            </Text>
            <Text className="text-white text-2xl font-bold">
              {formatDuration(totalMinutes)}
            </Text>
          </View>
          <View className="flex-1 bg-violet-950/80 rounded-2xl p-4 border border-violet-800/40">
            <Text className="text-violet-400 text-xs uppercase tracking-widest mb-1">
              Credits earned
            </Text>
            <Text className="text-white text-2xl font-bold">
              {totalCredits.toFixed(2)}
              <Text className="text-violet-400 text-base"> ✦</Text>
            </Text>
          </View>
        </View>

        {entries.length === 0 && !loading && (
          <View className="items-center py-10">
            <Text className="text-slate-600 text-base">No sessions this week yet.</Text>
          </View>
        )}

        {/* Breakdown by project */}
        {Object.keys(byProject).length > 0 && (
          <View className="mb-8">
            <Text className="text-slate-500 text-xs uppercase tracking-widest mb-3">
              By project
            </Text>
            <View className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
              {Object.entries(byProject)
                .sort(([, a], [, b]) => b - a)
                .map(([project, minutes], idx, arr) => {
                  const projectCredits = calculateCredits(
                    entries.filter((e) => (e.project || 'Untagged') === project),
                    rules
                  );
                  const pct = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;
                  return (
                    <View
                      key={project}
                      className={`px-4 py-3.5 ${idx < arr.length - 1 ? 'border-b border-slate-800' : ''}`}
                    >
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text className="text-white text-sm font-medium flex-1 mr-2" numberOfLines={1}>
                          {project}
                        </Text>
                        <View className="flex-row items-center gap-3">
                          <Text className="text-slate-400 text-sm">
                            {formatDuration(minutes)}
                          </Text>
                          <Text className="text-violet-400 text-sm font-medium">
                            {projectCredits.toFixed(1)} ✦
                          </Text>
                        </View>
                      </View>
                      {/* Progress bar */}
                      <View className="h-1 bg-slate-800 rounded-full">
                        <View
                          className="h-1 bg-violet-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        )}

        {/* Active earn rules */}
        {earnRules.length > 0 && (
          <View className="mb-6">
            <Text className="text-slate-500 text-xs uppercase tracking-widest mb-3">
              Earn rules applied
            </Text>
            <View className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
              {earnRules.map((rule, idx) => (
                <View
                  key={rule.id}
                  className={`flex-row items-center justify-between px-4 py-3 ${
                    idx < earnRules.length - 1 ? 'border-b border-slate-800' : ''
                  }`}
                >
                  <Text className="text-slate-300 text-sm">{rule.name}</Text>
                  <Text className="text-emerald-400 text-sm">
                    +{rule.credits} cr/{rule.unit === 'per_hour' ? 'hr' : 'flat'}
                    {rule.project_match ? ` · ${rule.project_match}` : ' · all'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Spend options reference */}
        {spendRules.length > 0 && (
          <View>
            <Text className="text-slate-500 text-xs uppercase tracking-widest mb-3">
              Spend options
            </Text>
            <View className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
              {spendRules.map((rule, idx) => (
                <View
                  key={rule.id}
                  className={`flex-row items-center justify-between px-4 py-3 ${
                    idx < spendRules.length - 1 ? 'border-b border-slate-800' : ''
                  }`}
                >
                  <Text className="text-slate-300 text-sm">{rule.name}</Text>
                  <Text className="text-red-400 text-sm">
                    {rule.credits} cr{rule.unit === 'per_hour' ? '/hr' : ' flat'}
                  </Text>
                </View>
              ))}
            </View>
            <Text className="text-slate-700 text-xs mt-2 text-center">
              You have {totalCredits.toFixed(2)} credits this week
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
