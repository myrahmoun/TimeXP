import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTimeOfDay(isoString) {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateHeader(isoString) {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function groupByDate(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = new Date(entry.started_at).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return Array.from(groups.entries());
}

function totalForGroup(entries) {
  const total = entries.reduce((sum, e) => sum + Number(e.duration_minutes), 0);
  return formatDuration(total);
}

export default function HistoryScreen() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchEntries() {
    setLoading(true);
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .order('started_at', { ascending: false });
    if (!error && data) setEntries(data);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      fetchEntries();
    }, [])
  );

  function confirmDelete(id) {
    Alert.alert('Delete entry?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('time_entries').delete().eq('id', id);
          setEntries((prev) => prev.filter((e) => e.id !== id));
        },
      },
    ]);
  }

  const grouped = groupByDate(entries);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchEntries} tintColor="#8b5cf6" />
        }
      >
        <Text className="text-white text-2xl font-bold mb-8">History</Text>

        {!loading && entries.length === 0 && (
          <View className="items-center mt-20">
            <Text className="text-slate-600 text-base">No sessions logged yet.</Text>
            <Text className="text-slate-700 text-sm mt-1">
              Start a timer to see your history.
            </Text>
          </View>
        )}

        {grouped.map(([dateKey, dayEntries]) => (
          <View key={dateKey} className="mb-8">
            {/* Date header */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-slate-400 text-sm font-semibold">
                {formatDateHeader(dayEntries[0].started_at)}
              </Text>
              <Text className="text-slate-600 text-xs">{totalForGroup(dayEntries)} total</Text>
            </View>

            {/* Day's entries */}
            <View className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
              {dayEntries.map((entry, idx) => (
                <TouchableOpacity
                  key={entry.id}
                  className={`flex-row items-center px-4 py-3.5 ${
                    idx < dayEntries.length - 1 ? 'border-b border-slate-800' : ''
                  }`}
                  onLongPress={() => confirmDelete(entry.id)}
                  activeOpacity={0.7}
                >
                  {/* Project badge */}
                  <View className="bg-violet-900/60 rounded-lg px-2.5 py-1 mr-3">
                    <Text className="text-violet-300 text-xs font-medium" numberOfLines={1}>
                      {entry.project}
                    </Text>
                  </View>

                  {/* Tag */}
                  <Text
                    className="text-slate-300 text-sm flex-1 mr-2"
                    numberOfLines={1}
                  >
                    {entry.tag}
                  </Text>

                  {/* Duration + time */}
                  <View className="items-end">
                    <Text className="text-white text-sm font-semibold">
                      {formatDuration(entry.duration_minutes)}
                    </Text>
                    <Text className="text-slate-600 text-xs mt-0.5">
                      {formatTimeOfDay(entry.started_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
