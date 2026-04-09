import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

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

export default function TimerScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tag, setTag] = useState('');
  const [project, setProject] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);

  const startTimeRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchRecent();
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  async function fetchRecent() {
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(3);
    if (data) setRecentEntries(data);
  }

  function handleStart() {
    if (!tag.trim() || !project.trim()) {
      Alert.alert('Missing info', 'Enter a tag and project before starting.');
      return;
    }
    startTimeRef.current = new Date();
    setElapsed(0);
    setIsRunning(true);
  }

  async function handleStop() {
    setIsRunning(false);
    setSaveError(null);
    const endedAt = new Date();
    const startedAt = startTimeRef.current;
    const durationMinutes = elapsed / 60;

    if (elapsed < 5) {
      setElapsed(0);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('time_entries').insert({
        tag: tag.trim(),
        project: project.trim(),
        started_at: startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
        duration_minutes: parseFloat(durationMinutes.toFixed(4)),
      });

      if (error) {
        console.error('Supabase insert error:', error);
        setSaveError(error.message);
      } else {
        setTag('');
        setProject('');
        fetchRecent();
      }
    } catch (e) {
      console.error('Save exception:', e);
      setSaveError('Network error — check your connection.');
    } finally {
      setSaving(false);
      setElapsed(0);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-white text-2xl font-bold mb-10">Timer</Text>

          {/* Timer display */}
          <View className="items-center mb-10">
            <Text
              style={{ fontSize: 72, letterSpacing: 2, fontVariant: ['tabular-nums'] }}
              className="text-white font-bold"
            >
              {formatElapsed(elapsed)}
            </Text>

            {isRunning && (
              <View className="flex-row items-center gap-2 mt-3">
                <View className="w-2 h-2 rounded-full bg-emerald-400" />
                <Text className="text-emerald-400 text-sm">
                  {tag} · {project}
                </Text>
              </View>
            )}
            {!isRunning && elapsed === 0 && (
              <Text className="text-slate-600 text-sm mt-3">Ready to track</Text>
            )}
          </View>

          {/* Tag + Project inputs */}
          <View className="flex-row gap-3 mb-5">
            <View className="flex-1">
              <Text className="text-slate-500 text-xs mb-1.5 uppercase tracking-widest">
                Tag
              </Text>
              <TextInput
                className="bg-slate-900 text-white rounded-xl px-4 py-3.5 border border-slate-800"
                placeholder="e.g. deep-work"
                placeholderTextColor="#475569"
                value={tag}
                onChangeText={setTag}
                editable={!isRunning}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View className="flex-1">
              <Text className="text-slate-500 text-xs mb-1.5 uppercase tracking-widest">
                Project
              </Text>
              <TextInput
                className="bg-slate-900 text-white rounded-xl px-4 py-3.5 border border-slate-800"
                placeholder="e.g. CS101"
                placeholderTextColor="#475569"
                value={project}
                onChangeText={setProject}
                editable={!isRunning}
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Error banner */}
          {saveError && (
            <View className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 mb-3">
              <Text className="text-red-400 text-sm">{saveError}</Text>
            </View>
          )}

          {/* Start / Stop button */}
          <TouchableOpacity
            className={`rounded-2xl py-5 items-center ${
              saving ? 'bg-slate-700' : isRunning ? 'bg-red-600' : 'bg-violet-600'
            }`}
            onPress={isRunning ? handleStop : handleStart}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-lg tracking-wide">
              {saving ? 'Saving…' : isRunning ? 'Stop & Save' : 'Start'}
            </Text>
          </TouchableOpacity>

          {/* Recent entries */}
          {recentEntries.length > 0 && (
            <View className="mt-10">
              <Text className="text-slate-500 text-xs uppercase tracking-widest mb-3">
                Recent
              </Text>
              {recentEntries.map((entry) => (
                <View
                  key={entry.id}
                  className="flex-row items-center justify-between py-3 border-b border-slate-900"
                >
                  <View className="flex-row items-center gap-2 flex-1 mr-3">
                    <View className="bg-violet-900/50 rounded-md px-2 py-0.5">
                      <Text className="text-violet-300 text-xs">{entry.project}</Text>
                    </View>
                    <Text className="text-slate-400 text-sm" numberOfLines={1}>
                      {entry.tag}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-white text-sm font-medium">
                      {formatDuration(entry.duration_minutes)}
                    </Text>
                    <Text className="text-slate-600 text-xs">
                      {formatTimeOfDay(entry.started_at)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
