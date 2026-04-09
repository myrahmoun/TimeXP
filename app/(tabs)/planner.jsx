import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

function calculateTotalCredits(entries, rules) {
  const earnRules = rules.filter((r) => r.type === 'earn');
  let total = 0;
  for (const entry of entries) {
    const specific = earnRules.find(
      (r) => r.project_match?.toLowerCase() === entry.project?.toLowerCase()
    );
    const catchAll = earnRules.find((r) => !r.project_match);
    const rule = specific ?? catchAll;
    if (rule && rule.unit === 'per_hour') {
      total += (Number(entry.duration_minutes) / 60) * Number(rule.credits);
    }
  }
  return total;
}

function StepperRow({ rule, qty, onAdjust, isLast }) {
  const subtotal = qty * Number(rule.credits);

  return (
    <View
      className={`px-4 py-4 ${!isLast ? 'border-b border-slate-800' : ''}`}
    >
      <View className="flex-row items-center">
        {/* Label */}
        <View className="flex-1 mr-4">
          <Text className="text-white text-sm font-medium">{rule.name}</Text>
          <Text className="text-slate-500 text-xs mt-0.5">
            {rule.credits} cr{rule.unit === 'per_hour' ? '/hr' : ' flat'}
          </Text>
        </View>

        {/* Stepper */}
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            className={`w-8 h-8 rounded-lg items-center justify-center ${
              qty === 0 ? 'bg-slate-800' : 'bg-slate-700'
            }`}
            onPress={() => onAdjust(-1)}
            disabled={qty === 0}
            activeOpacity={0.7}
          >
            <Ionicons
              name="remove"
              size={16}
              color={qty === 0 ? '#334155' : '#e2e8f0'}
            />
          </TouchableOpacity>

          <Text className="text-white text-base font-semibold w-6 text-center">
            {qty}
          </Text>

          <TouchableOpacity
            className="w-8 h-8 rounded-lg bg-violet-700 items-center justify-center"
            onPress={() => onAdjust(1)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {qty > 0 && (
        <Text className="text-red-400 text-xs mt-2 text-right">
          {qty} × {rule.credits} = −{subtotal.toFixed(2)} ✦
        </Text>
      )}
    </View>
  );
}

export default function PlannerScreen() {
  const [entries, setEntries] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});

  const spendRules = rules.filter((r) => r.type === 'spend');
  const totalEarned = calculateTotalCredits(entries, rules);
  const totalSpending = spendRules.reduce(
    (sum, rule) => sum + (quantities[rule.id] ?? 0) * Number(rule.credits),
    0
  );
  const remaining = totalEarned - totalSpending;
  const hasSelection = spendRules.some((r) => (quantities[r.id] ?? 0) > 0);

  async function fetchData() {
    setLoading(true);
    const [entriesRes, rulesRes] = await Promise.all([
      supabase.from('time_entries').select('*'),
      supabase.from('credit_rules').select('*').order('created_at'),
    ]);
    if (entriesRes.data) setEntries(entriesRes.data);
    if (rulesRes.data) setRules(rulesRes.data);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      fetchData();
      setQuantities({});
    }, [])
  );

  function adjust(ruleId, delta) {
    setQuantities((prev) => ({
      ...prev,
      [ruleId]: Math.max(0, (prev[ruleId] ?? 0) + delta),
    }));
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 40,
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchData}
            tintColor="#8b5cf6"
          />
        }
      >
        <Text className="text-white text-2xl font-bold mb-1">Planner</Text>
        <Text className="text-slate-500 text-sm mb-8">
          Mix and match to see what you can afford.
        </Text>

        {/* Balance card */}
        <View className="bg-violet-950/80 rounded-2xl p-5 border border-violet-800/40 mb-8">
          <Text className="text-violet-400 text-xs uppercase tracking-widest mb-1">
            All-time credits
          </Text>
          <Text className="text-white font-bold" style={{ fontSize: 40 }}>
            {totalEarned.toFixed(2)}{' '}
            <Text className="text-violet-400 text-2xl">✦</Text>
          </Text>
        </View>

        {/* Spend options */}
        {!loading && spendRules.length === 0 && (
          <View className="items-center mt-10">
            <Text className="text-slate-600 text-base">No spend rules yet.</Text>
            <Text className="text-slate-700 text-sm mt-1">
              Add some in the Credits tab first.
            </Text>
          </View>
        )}

        {spendRules.length > 0 && (
          <View className="mb-8">
            <Text className="text-slate-500 text-xs uppercase tracking-widest mb-3">
              Spend options
            </Text>
            <View className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
              {spendRules.map((rule, idx) => (
                <StepperRow
                  key={rule.id}
                  rule={rule}
                  qty={quantities[rule.id] ?? 0}
                  onAdjust={(delta) => adjust(rule.id, delta)}
                  isLast={idx === spendRules.length - 1}
                />
              ))}
            </View>
          </View>
        )}

        {/* Running total — only shown once something is selected */}
        {hasSelection && (
          <>
            <View className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden mb-4">
              <View className="flex-row justify-between px-4 py-3 border-b border-slate-800">
                <Text className="text-slate-400 text-sm">Total earned</Text>
                <Text className="text-white text-sm font-medium">
                  {totalEarned.toFixed(2)} ✦
                </Text>
              </View>
              <View className="flex-row justify-between px-4 py-3 border-b border-slate-800">
                <Text className="text-slate-400 text-sm">Planning to spend</Text>
                <Text className="text-red-400 text-sm font-medium">
                  −{totalSpending.toFixed(2)} ✦
                </Text>
              </View>
              <View className="flex-row justify-between px-4 py-3">
                <Text className="text-white text-sm font-semibold">Remaining</Text>
                <Text
                  className={`text-sm font-bold ${
                    remaining >= 0 ? 'text-emerald-400' : 'text-red-500'
                  }`}
                >
                  {remaining.toFixed(2)} ✦{' '}
                  {remaining < 0 ? '— not enough' : '— you\'re good'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              className="items-center py-3"
              onPress={() => setQuantities({})}
            >
              <Text className="text-slate-500 text-sm">Reset</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}