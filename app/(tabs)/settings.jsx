import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const EMPTY_FORM = {
  name: '',
  type: 'earn',
  credits: '',
  unit: 'per_hour',
  project_match: '',
};

function RuleRow({ rule, onEdit, onDelete, isLast }) {
  return (
    <View
      className={`flex-row items-center px-4 py-3.5 ${!isLast ? 'border-b border-slate-800' : ''}`}
    >
      <View className="flex-1 mr-3">
        <Text className="text-white text-sm font-medium">{rule.name}</Text>
        <Text className="text-slate-500 text-xs mt-0.5">
          {rule.unit === 'per_hour'
            ? `${rule.credits} cr / hr`
            : `${rule.credits} cr flat`}
          {rule.project_match ? ` · matches "${rule.project_match}"` : ' · all projects'}
        </Text>
      </View>

      <View
        className={`rounded-md px-2 py-0.5 mr-3 ${
          rule.type === 'earn' ? 'bg-emerald-900/50' : 'bg-red-900/50'
        }`}
      >
        <Text
          className={`text-xs font-medium ${
            rule.type === 'earn' ? 'text-emerald-400' : 'text-red-400'
          }`}
        >
          {rule.type === 'earn' ? 'earn' : 'spend'}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onEdit}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="mr-3"
      >
        <Ionicons name="pencil-outline" size={17} color="#8b5cf6" />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={17} color="#475569" />
      </TouchableOpacity>
    </View>
  );
}

function ToggleButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      className={`flex-1 py-2.5 rounded-xl items-center ${
        active ? 'bg-violet-600' : 'bg-slate-800'
      }`}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-slate-400'}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function fetchRules() {
    setLoading(true);
    const { data } = await supabase
      .from('credit_rules')
      .select('*')
      .order('created_at');
    if (data) setRules(data);
    setLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      fetchRules();
    }, [])
  );

  function openModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  }

  function openEdit(rule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      type: rule.type,
      credits: String(rule.credits),
      unit: rule.unit,
      project_match: rule.project_match ?? '',
    });
    setModalVisible(true);
  }

  async function handleSave() {
    const name = form.name.trim();
    const credits = parseFloat(form.credits);

    if (!name) {
      Alert.alert('Missing name', 'Enter a name for this rule.');
      return;
    }
    if (!form.credits || isNaN(credits) || credits <= 0) {
      Alert.alert('Invalid credits', 'Enter a positive number for credits.');
      return;
    }

    const payload = {
      name,
      type: form.type,
      credits,
      unit: form.unit,
      project_match: form.project_match.trim() || null,
    };

    setSaving(true);
    const { error } = editingId
      ? await supabase.from('credit_rules').update(payload).eq('id', editingId)
      : await supabase.from('credit_rules').insert(payload);
    setSaving(false);

    if (error) {
      Alert.alert('Error', 'Could not save rule.');
    } else {
      setModalVisible(false);
      setEditingId(null);
      fetchRules();
    }
  }

  function confirmDelete(rule) {
    Alert.alert(`Delete "${rule.name}"?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('credit_rules').delete().eq('id', rule.id);
          setRules((prev) => prev.filter((r) => r.id !== rule.id));
        },
      },
    ]);
  }

  const earnRules = rules.filter((r) => r.type === 'earn');
  const spendRules = rules.filter((r) => r.type === 'spend');

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchRules} tintColor="#8b5cf6" />
        }
      >
        <View className="flex-row items-center justify-between mb-8">
          <Text className="text-white text-2xl font-bold">Credit Rules</Text>
          <TouchableOpacity
            className="bg-violet-600 rounded-xl px-4 py-2 flex-row items-center gap-1.5"
            onPress={openModal}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-white text-sm font-medium">Add Rule</Text>
          </TouchableOpacity>
        </View>

        {/* Earn rules */}
        <View className="mb-6">
          <Text className="text-slate-500 text-xs uppercase tracking-widest mb-3">
            Earn
          </Text>
          {earnRules.length === 0 ? (
            <Text className="text-slate-700 text-sm">No earn rules yet.</Text>
          ) : (
            <View className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
              {earnRules.map((rule, idx) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  onEdit={() => openEdit(rule)}
                  onDelete={() => confirmDelete(rule)}
                  isLast={idx === earnRules.length - 1}
                />
              ))}
            </View>
          )}
        </View>

        {/* Spend rules */}
        <View className="mb-8">
          <Text className="text-slate-500 text-xs uppercase tracking-widest mb-3">
            Spend
          </Text>
          {spendRules.length === 0 ? (
            <Text className="text-slate-700 text-sm">No spend rules yet.</Text>
          ) : (
            <View className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800">
              {spendRules.map((rule, idx) => (
                <RuleRow
                  key={rule.id}
                  rule={rule}
                  onEdit={() => openEdit(rule)}
                  onDelete={() => confirmDelete(rule)}
                  isLast={idx === spendRules.length - 1}
                />
              ))}
            </View>
          )}
        </View>

        {/* Help text */}
        <View className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
          <Text className="text-slate-500 text-xs leading-relaxed">
            <Text className="text-slate-400 font-medium">Earn rules</Text> convert logged
            time into credits. Set a project match to apply a rule only to a specific
            project, or leave blank to apply to all time.{'\n\n'}
            <Text className="text-slate-400 font-medium">Spend rules</Text> are reference
            rates shown on the Summary screen so you know what your credits are worth.
          </Text>
        </View>
      </ScrollView>

      {/* Add Rule Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          className="flex-1 bg-slate-950"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={{ padding: 24, paddingTop: 32 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Modal header */}
            <View className="flex-row items-center justify-between mb-8">
              <Text className="text-white text-xl font-bold">{editingId ? 'Edit Rule' : 'New Rule'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Name */}
            <View className="mb-5">
              <Text className="text-slate-500 text-xs uppercase tracking-widest mb-1.5">
                Name
              </Text>
              <TextInput
                className="bg-slate-900 text-white rounded-xl px-4 py-3.5 border border-slate-800"
                placeholder="e.g. Study, Gym, Movie Night"
                placeholderTextColor="#475569"
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                autoFocus
              />
            </View>

            {/* Type toggle */}
            <View className="mb-5">
              <Text className="text-slate-500 text-xs uppercase tracking-widest mb-1.5">
                Type
              </Text>
              <View className="flex-row gap-2 bg-slate-900 rounded-xl p-1 border border-slate-800">
                <ToggleButton
                  label="Earn (from time)"
                  active={form.type === 'earn'}
                  onPress={() => setForm((f) => ({ ...f, type: 'earn' }))}
                />
                <ToggleButton
                  label="Spend (activity cost)"
                  active={form.type === 'spend'}
                  onPress={() => setForm((f) => ({ ...f, type: 'spend' }))}
                />
              </View>
            </View>

            {/* Credits */}
            <View className="mb-5">
              <Text className="text-slate-500 text-xs uppercase tracking-widest mb-1.5">
                Credits
              </Text>
              <TextInput
                className="bg-slate-900 text-white rounded-xl px-4 py-3.5 border border-slate-800"
                placeholder="e.g. 0.5"
                placeholderTextColor="#475569"
                value={form.credits}
                onChangeText={(v) => setForm((f) => ({ ...f, credits: v }))}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Unit toggle */}
            <View className="mb-5">
              <Text className="text-slate-500 text-xs uppercase tracking-widest mb-1.5">
                Unit
              </Text>
              <View className="flex-row gap-2 bg-slate-900 rounded-xl p-1 border border-slate-800">
                <ToggleButton
                  label="Per hour"
                  active={form.unit === 'per_hour'}
                  onPress={() => setForm((f) => ({ ...f, unit: 'per_hour' }))}
                />
                <ToggleButton
                  label="Flat (one-time)"
                  active={form.unit === 'flat'}
                  onPress={() => setForm((f) => ({ ...f, unit: 'flat' }))}
                />
              </View>
            </View>

            {/* Project match (earn only) */}
            {form.type === 'earn' && (
              <View className="mb-8">
                <Text className="text-slate-500 text-xs uppercase tracking-widest mb-1.5">
                  Project match{' '}
                  <Text className="text-slate-700 normal-case tracking-normal">
                    (optional — leave blank to apply to all)
                  </Text>
                </Text>
                <TextInput
                  className="bg-slate-900 text-white rounded-xl px-4 py-3.5 border border-slate-800"
                  placeholder="e.g. CS101"
                  placeholderTextColor="#475569"
                  value={form.project_match}
                  onChangeText={(v) => setForm((f) => ({ ...f, project_match: v }))}
                  autoCorrect={false}
                />
              </View>
            )}

            {form.type === 'spend' && <View className="mb-8" />}

            {/* Save button */}
            <TouchableOpacity
              className={`rounded-2xl py-5 items-center ${saving ? 'bg-slate-700' : 'bg-violet-600'}`}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text className="text-white font-semibold text-lg">
                {saving ? 'Saving…' : 'Save Rule'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
