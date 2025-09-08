import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFlips } from '../state/FlipsContext';
import { formatCurrency, formatPercentage } from '../utils/currency';
import { Flip } from '../types';

type RootStackParamList = {
  Home: undefined;
  FlipSheet: { flipId?: number };
  Settings: undefined;
};

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const Home: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { flips, loading, computeTotals, refreshFlips, deleteFlip } = useFlips();
  const [selectedTab, setSelectedTab] = useState<'open' | 'sold'>('open');
  const [flipTotals, setFlipTotals] = useState<Record<number, any>>({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFlips, setSelectedFlips] = useState<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      refreshFlips();
      loadFlipTotals();
    }, [])
  );

  const loadFlipTotals = async () => {
    const totals: Record<number, any> = {};
    for (const flip of flips) {
      try {
        const totalsData = await computeTotals(flip.id);
        totals[flip.id] = totalsData;
      } catch (error) {
        console.error(`Error computing totals for flip ${flip.id}:`, error);
      }
    }
    setFlipTotals(totals);
  };

  const filteredFlips = flips.filter(flip => 
    selectedTab === 'sold' ? !!flip.sold_date : !flip.sold_date
  );

  const renderFlipItem = ({ item }: { item: Flip }) => {
    const totals = flipTotals[item.id];
    const displayName = [item.year, item.make, item.model].filter(Boolean).join(' ') || 'Untitled Flip';
    const isSelected = selectedFlips.has(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.flipCard,
          isSelectionMode && styles.flipCardSelectionMode,
          isSelected && styles.flipCardSelected
        ]}
        onPress={() => {
          if (isSelectionMode) {
            toggleFlipSelection(item.id);
          } else {
            navigation.navigate('FlipSheet', { flipId: item.id });
          }
        }}
        onLongPress={() => {
          if (!isSelectionMode) {
            setIsSelectionMode(true);
            toggleFlipSelection(item.id);
          }
        }}
      >
        {isSelectionMode && (
          <View style={styles.selectionCheckbox}>
            <Text style={styles.checkboxText}>{isSelected ? '✓' : '○'}</Text>
          </View>
        )}
        
        <View style={[styles.flipContent, isSelectionMode && styles.flipContentWithCheckbox]}>
          <View style={styles.flipHeader}>
            <Text style={styles.flipTitle}>{displayName}</Text>
            <Text style={styles.flipPrice}>{formatCurrency(item.buy_price)}</Text>
          </View>
          
          {item.sell_price && (
            <View style={styles.flipSubHeader}>
              <Text style={styles.sellPrice}>Sold: {formatCurrency(item.sell_price)}</Text>
            </View>
          )}
          
          {totals && (
            <View style={styles.flipStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Profit</Text>
                <Text style={[styles.statValue, { color: totals.profit >= 0 ? '#4CAF50' : '#F44336' }]}>
                  {formatCurrency(totals.profit)}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>ROI</Text>
                <Text style={[styles.statValue, { color: totals.roi >= 0 ? '#4CAF50' : '#F44336' }]}>
                  {formatPercentage(totals.roi)}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Cost</Text>
                <Text style={styles.statValue}>
                  {formatCurrency(item.buy_price + totals.totalCost)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleCreateFlip = () => {
    navigation.navigate('FlipSheet', {});
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedFlips(new Set());
  };

  const toggleFlipSelection = (flipId: number) => {
    const newSelected = new Set(selectedFlips);
    if (newSelected.has(flipId)) {
      newSelected.delete(flipId);
    } else {
      newSelected.add(flipId);
    }
    setSelectedFlips(newSelected);
  };

  const selectAllFlips = () => {
    const allVisibleFlips = filteredFlips.map(flip => flip.id);
    setSelectedFlips(new Set(allVisibleFlips));
  };

  const deselectAllFlips = () => {
    setSelectedFlips(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedFlips.size === 0) {
      Alert.alert('No Selection', 'Please select flips to delete');
      return;
    }

    Alert.alert(
      'Delete Selected Flips',
      `Are you sure you want to delete ${selectedFlips.size} flip(s)? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const flipId of selectedFlips) {
                await deleteFlip(flipId);
              }
              setSelectedFlips(new Set());
              setIsSelectionMode(false);
              Alert.alert('Success', `${selectedFlips.size} flip(s) deleted successfully`);
            } catch (error) {
              console.error('Error deleting flips:', error);
              Alert.alert('Error', 'Failed to delete some flips');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {isSelectionMode ? (
          <>
            <TouchableOpacity style={styles.headerButton} onPress={toggleSelectionMode}>
              <Text style={styles.headerButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selectedFlips.size} Selected
            </Text>
            <TouchableOpacity style={styles.headerButton} onPress={handleBulkDelete}>
              <Text style={[styles.headerButtonText, styles.deleteButtonText]}>Delete</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.headerButton} onPress={toggleSelectionMode}>
              <Text style={styles.headerButtonText}>Select</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>AutoTrackr</Text>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.headerButtonText}>Settings</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'open' && styles.activeTab]}
          onPress={() => setSelectedTab('open')}
        >
          <Text style={[styles.tabText, selectedTab === 'open' && styles.activeTabText]}>
            Open ({flips.filter(f => !f.sold_date).length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'sold' && styles.activeTab]}
          onPress={() => setSelectedTab('sold')}
        >
          <Text style={[styles.tabText, selectedTab === 'sold' && styles.activeTabText]}>
            Sold ({flips.filter(f => !!f.sold_date).length})
          </Text>
        </TouchableOpacity>
      </View>

      {isSelectionMode && filteredFlips.length > 0 && (
        <View style={styles.selectionControls}>
          <TouchableOpacity style={styles.selectionButton} onPress={selectAllFlips}>
            <Text style={styles.selectionButtonText}>Select All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.selectionButton} onPress={deselectAllFlips}>
            <Text style={styles.selectionButtonText}>Deselect All</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredFlips}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderFlipItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity style={styles.fab} onPress={handleCreateFlip}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#007AFF',
    textAlign: 'center',
  },
  deleteButtonText: {
    color: '#F44336',
  },
  selectionControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  selectionButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
  },
  selectionButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
  },
  flipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flipCardSelectionMode: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flipCardSelected: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  flipContent: {
    flex: 1,
  },
  flipContentWithCheckbox: {
    marginLeft: 15,
  },
  selectionCheckbox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
  },
  checkboxText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  flipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  flipTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  flipPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  flipSubHeader: {
    marginBottom: 12,
  },
  sellPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  flipStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});

export default Home;