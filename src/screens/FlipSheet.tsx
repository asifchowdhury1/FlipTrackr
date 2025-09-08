import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useFlips } from '../state/FlipsContext';
import { formatCurrency, formatPercentage } from '../utils/currency';
import { getCurrentISOString, getDaysToSell } from '../utils/dates';
import { Flip, LineItem, FlipTotals } from '../types';

type RootStackParamList = {
  Home: undefined;
  FlipSheet: { flipId?: number };
  Settings: undefined;
};

type FlipSheetNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FlipSheet'>;
type FlipSheetRouteProp = RouteProp<RootStackParamList, 'FlipSheet'>;

const FlipSheet: React.FC = () => {
  const navigation = useNavigation<FlipSheetNavigationProp>();
  const route = useRoute<FlipSheetRouteProp>();
  const { flipId } = route.params;
  
  const {
    createFlip,
    getFlipById,
    updateFlip,
    deleteFlip,
    duplicateFlip,
    addLineItem,
    getLineItemsByFlip,
    updateLineItem,
    deleteLineItem,
    computeTotals,
  } = useFlips();

  const [flip, setFlip] = useState<Flip | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [totals, setTotals] = useState<FlipTotals>({ totalCost: 0, profit: 0, roi: 0 });
  const [isLoading, setIsLoading] = useState(!!flipId);
  const [isEditing, setIsEditing] = useState(!flipId);

  // Form state
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [miles, setMiles] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');

  // What-if mode
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [whatIfSellPrice, setWhatIfSellPrice] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (flipId) {
        loadFlip();
      } else {
        setIsEditing(true);
      }
    }, [flipId])
  );

  const loadFlip = async () => {
    if (!flipId) return;

    try {
      setIsLoading(true);
      const flipData = await getFlipById(flipId);
      const itemsData = await getLineItemsByFlip(flipId);
      const totalsData = await computeTotals(flipId);

      if (flipData) {
        setFlip(flipData);
        setYear(flipData.year?.toString() || '');
        setMake(flipData.make || '');
        setModel(flipData.model || '');
        setMiles(flipData.miles?.toString() || '');
        setBuyPrice(flipData.buy_price.toString());
        setSellPrice(flipData.sell_price?.toString() || '');
        setWhatIfSellPrice(flipData.sell_price?.toString() || '');
      }

      setLineItems(itemsData);
      setTotals(totalsData);
    } catch (error) {
      console.error('Error loading flip:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFlip = async () => {
    const buyPriceNum = parseFloat(buyPrice);
    const sellPriceNum = sellPrice ? parseFloat(sellPrice) : undefined;
    const yearNum = year ? parseInt(year) : undefined;
    const milesNum = miles ? parseInt(miles) : undefined;

    if (!buyPriceNum || buyPriceNum <= 0) {
      Alert.alert('Error', 'Please enter a valid buy price');
      return;
    }

    try {
      if (flipId && flip) {
        // Update existing flip
        await updateFlip(flipId, {
          year: yearNum,
          make: make || undefined,
          model: model || undefined,
          miles: milesNum,
          buy_price: buyPriceNum,
          sell_price: sellPriceNum,
        });
      } else {
        // Create new flip
        const newFlipId = await createFlip({
          year: yearNum,
          make: make || undefined,
          model: model || undefined,
          miles: milesNum,
          buy_price: buyPriceNum,
          sell_price: sellPriceNum,
        });
        
        navigation.setParams({ flipId: newFlipId });
      }
      
      setIsEditing(false);
      await loadFlip();
    } catch (error) {
      console.error('Error saving flip:', error);
      Alert.alert('Error', 'Failed to save flip');
    }
  };

  const handleAddLineItem = async () => {
    if (!newItemAmount.trim() || !newItemDescription.trim()) {
      Alert.alert('Error', 'Please enter both amount and description');
      return;
    }
    if (!flipId) {
      Alert.alert('Error', 'Please save the flip first');
      return;
    }

    const amount = parseFloat(newItemAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      await addLineItem({
        flip_id: flipId,
        title: newItemDescription.trim(),
        amount: amount,
      });
      
      setNewItemAmount('');
      setNewItemDescription('');
      await loadFlip();
    } catch (error) {
      console.error('Error adding line item:', error);
      Alert.alert('Error', 'Failed to add line item');
    }
  };

  const handleDeleteLineItem = async (itemId: number, title: string) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLineItem(itemId);
              await loadFlip();
            } catch (error) {
              console.error('Error deleting line item:', error);
            }
          },
        },
      ]
    );
  };

  const handleMarkSold = async () => {
    if (!flipId || !flip) return;

    const soldDate = getCurrentISOString();
    try {
      await updateFlip(flipId, { sold_date: soldDate });
      await loadFlip();
    } catch (error) {
      console.error('Error marking as sold:', error);
    }
  };

  const handleDuplicate = async () => {
    if (!flipId) return;

    try {
      const newFlipId = await duplicateFlip(flipId);
      navigation.navigate('FlipSheet', { flipId: newFlipId });
    } catch (error) {
      console.error('Error duplicating flip:', error);
    }
  };

  const handleDelete = async () => {
    if (!flipId) return;

    Alert.alert(
      'Delete Flip',
      'Are you sure you want to delete this flip? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFlip(flipId);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting flip:', error);
            }
          },
        },
      ]
    );
  };

  const computeWhatIfTotals = () => {
    const whatIfSellPriceNum = whatIfSellPrice ? parseFloat(whatIfSellPrice) : (flip?.sell_price || 0);
    const buyPriceNum = flip?.buy_price || parseFloat(buyPrice) || 0;
    const totalCost = totals.totalCost;
    const profit = whatIfSellPriceNum - (buyPriceNum + totalCost);
    const investedAmount = buyPriceNum + totalCost;
    const roi = investedAmount > 0 ? profit / investedAmount : 0;

    return { totalCost, profit, roi };
  };


  const displayName = [year, make, model].filter(Boolean).join(' ') || 'New Flip';
  const whatIfTotals = whatIfMode ? computeWhatIfTotals() : null;
  const daysToSell = flip && flip.sold_date ? getDaysToSell(flip.created_at, flip.sold_date) : null;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>{displayName}</Text>
          
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Text style={styles.editButton}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* KPI Chips */}
          <View style={styles.kpiContainer}>
            <View style={styles.kpiChip}>
              <Text style={styles.kpiLabel}>Total Cost</Text>
              <Text style={styles.kpiValue}>
                {formatCurrency((flip?.buy_price || parseFloat(buyPrice) || 0) + totals.totalCost)}
              </Text>
            </View>
            
            <View style={[styles.kpiChip, { backgroundColor: totals.profit >= 0 ? '#E8F5E8' : '#FFE8E8' }]}>
              <Text style={styles.kpiLabel}>Profit</Text>
              <Text style={[styles.kpiValue, { color: totals.profit >= 0 ? '#4CAF50' : '#F44336' }]}>
                {formatCurrency(totals.profit)}
              </Text>
            </View>
            
            <View style={styles.kpiChip}>
              <Text style={styles.kpiLabel}>ROI</Text>
              <Text style={styles.kpiValue}>{formatPercentage(totals.roi)}</Text>
            </View>
          </View>

          {/* Vehicle Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
            
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.yearInput]}
                placeholder="Year"
                value={year}
                onChangeText={setYear}
                keyboardType="numeric"
                editable={isEditing}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 10 }]}
                placeholder="Make"
                value={make}
                onChangeText={setMake}
                editable={isEditing}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 10 }]}
                placeholder="Model"
                value={model}
                onChangeText={setModel}
                editable={isEditing}
              />
            </View>
            
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Miles"
                value={miles}
                onChangeText={setMiles}
                keyboardType="numeric"
                editable={isEditing}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 10 }]}
                placeholder="Buy Price"
                value={buyPrice}
                onChangeText={setBuyPrice}
                keyboardType="numeric"
                editable={isEditing}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 10 }]}
                placeholder="Sell Price"
                value={sellPrice}
                onChangeText={setSellPrice}
                keyboardType="numeric"
                editable={isEditing}
              />
            </View>
          </View>

          {isEditing && (
            <TouchableOpacity style={styles.saveButton} onPress={saveFlip}>
              <Text style={styles.saveButtonText}>Save Flip</Text>
            </TouchableOpacity>
          )}

          {/* Line Items */}
          {flipId && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Expenses</Text>
              
              <View style={styles.addItemContainer}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="Amount"
                  value={newItemAmount}
                  onChangeText={setNewItemAmount}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Description"
                  value={newItemDescription}
                  onChangeText={setNewItemDescription}
                  onSubmitEditing={handleAddLineItem}
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.addButton} onPress={handleAddLineItem}>
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>

              {lineItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.lineItem}
                  onLongPress={() => handleDeleteLineItem(item.id, item.title)}
                >
                  <View style={styles.lineItemContent}>
                    <Text style={styles.lineItemTitle}>{item.title}</Text>
                    <Text style={styles.lineItemAmount}>{formatCurrency(item.amount)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* What-if Mode */}
          {flipId && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.whatIfToggle}
                onPress={() => setWhatIfMode(!whatIfMode)}
              >
                <Text style={styles.whatIfToggleText}>
                  What-if Mode {whatIfMode ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>

              {whatIfMode && (
                <View style={styles.whatIfPanel}>
                  <Text style={styles.whatIfDescription}>
                    Try different sell prices to see how it affects your profit and ROI
                  </Text>
                  
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="What-if sell price"
                      value={whatIfSellPrice}
                      onChangeText={setWhatIfSellPrice}
                      keyboardType="numeric"
                    />
                  </View>

                  {whatIfTotals && whatIfSellPrice && (
                    <View style={styles.whatIfComparison}>
                      <View style={styles.comparisonRow}>
                        <Text style={styles.comparisonLabel}>Profit:</Text>
                        <Text style={[styles.comparisonValue, { 
                          color: whatIfTotals.profit > totals.profit ? '#4CAF50' : whatIfTotals.profit < totals.profit ? '#F44336' : '#333333' 
                        }]}>
                          {formatCurrency(totals.profit)} → {formatCurrency(whatIfTotals.profit)}
                        </Text>
                      </View>
                      
                      <View style={styles.comparisonRow}>
                        <Text style={styles.comparisonLabel}>ROI:</Text>
                        <Text style={[styles.comparisonValue, { 
                          color: whatIfTotals.roi > totals.roi ? '#4CAF50' : whatIfTotals.roi < totals.roi ? '#F44336' : '#333333' 
                        }]}>
                          {formatPercentage(totals.roi)} → {formatPercentage(whatIfTotals.roi)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Actions */}
          {flipId && flip && (
            <View style={styles.actionsSection}>
              {!flip.sold_date && (
                <TouchableOpacity style={styles.actionButton} onPress={handleMarkSold}>
                  <Text style={styles.actionButtonText}>Mark as Sold</Text>
                </TouchableOpacity>
              )}

              {flip.sold_date && daysToSell && (
                <View style={styles.soldInfo}>
                  <Text style={styles.soldText}>
                    Sold after {daysToSell} days
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.actionButton} onPress={handleDuplicate}>
                <Text style={styles.actionButtonText}>Duplicate Flip</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete Flip</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  editButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  kpiChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  yearInput: {
    width: 80,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addItemContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  amountInput: {
    width: 100,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
  descriptionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  lineItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  lineItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineItemTitle: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  lineItemAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  whatIfToggle: {
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    marginBottom: 15,
  },
  whatIfToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  whatIfPanel: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 15,
  },
  whatIfDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 15,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  whatIfComparison: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  whatIfTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#666666',
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  actionsSection: {
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  deleteButtonText: {
    color: '#FFFFFF',
  },
  soldInfo: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  soldText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4CAF50',
  },
});

export default FlipSheet;