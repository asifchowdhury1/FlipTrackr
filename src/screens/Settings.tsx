import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useFlips } from '../state/FlipsContext';
import { formatCurrency } from '../utils/currency';
import { exportTaxReport, exportAllFlipsTaxReport, AllFlipsTaxData } from '../utils/taxExport';

const Settings: React.FC = () => {
  const navigation = useNavigation();
  const { flips, getLineItemsByFlip, computeTotals } = useFlips();

  const generateCSV = async (flipId?: number) => {
    try {
      let csvContent = '';

      if (flipId) {
        // Single flip export
        const flip = flips.find(f => f.id === flipId);
        if (!flip) throw new Error('Flip not found');

        const lineItems = await getLineItemsByFlip(flipId);
        const totals = await computeTotals(flipId);

        const displayName = [flip.year, flip.make, flip.model].filter(Boolean).join(' ') || 'Untitled Flip';
        
        csvContent = `AutoTrackr Export - ${displayName}\n`;
        csvContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;
        
        // Flip summary
        csvContent += 'Vehicle Information\n';
        csvContent += `Year,Make,Model,Miles,Buy Price,Sell Price,Sold Date\n`;
        csvContent += `${flip.year || ''},${flip.make || ''},${flip.model || ''},${flip.miles || ''},${flip.buy_price},${flip.sell_price || ''},${flip.sold_date || ''}\n\n`;
        
        // Line items
        csvContent += 'Expenses\n';
        csvContent += 'Title,Amount,Category,Date\n';
        lineItems.forEach(item => {
          csvContent += `"${item.title}",${item.amount},${item.category || ''},${item.date || ''}\n`;
        });
        
        // Totals
        csvContent += '\nTotals\n';
        csvContent += `Total Cost,${formatCurrency(flip.buy_price + totals.totalCost).replace('$', '')}\n`;
        csvContent += `Profit,${formatCurrency(totals.profit).replace('$', '')}\n`;
        csvContent += `ROI,${(totals.roi * 100).toFixed(1)}%\n`;
      } else {
        // All flips export
        csvContent = 'AutoTrackr - All Flips Export\n';
        csvContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;
        csvContent += 'Flip ID,Year,Make,Model,Miles,Buy Price,Sell Price,Sold Date,Total Cost,Profit,ROI\n';

        for (const flip of flips) {
          const totals = await computeTotals(flip.id);
          csvContent += `${flip.id},${flip.year || ''},${flip.make || ''},${flip.model || ''},${flip.miles || ''},${flip.buy_price},${flip.sell_price || ''},${flip.sold_date || ''},${flip.buy_price + totals.totalCost},${totals.profit},${(totals.roi * 100).toFixed(1)}%\n`;
        }

        csvContent += '\nDetailed Line Items\n';
        csvContent += 'Flip ID,Vehicle,Title,Amount,Category,Date\n';

        for (const flip of flips) {
          const displayName = [flip.year, flip.make, flip.model].filter(Boolean).join(' ') || 'Untitled Flip';
          const lineItems = await getLineItemsByFlip(flip.id);
          
          lineItems.forEach(item => {
            csvContent += `${flip.id},"${displayName}","${item.title}",${item.amount},${item.category || ''},${item.date || ''}\n`;
          });
        }
      }

      return csvContent;
    } catch (error) {
      console.error('Error generating CSV:', error);
      throw error;
    }
  };

  const exportCSV = async (flipId?: number, flipName?: string) => {
    try {
      const csvContent = await generateCSV(flipId);
      const fileName = flipId ? `${flipName || 'flip'}-export.csv` : 'all-flips-export.csv';
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export AutoTrackr Data',
        });
      } else {
        Alert.alert('Success', `CSV exported to ${fileUri}`);
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      Alert.alert('Error', 'Failed to export CSV file');
    }
  };

  const exportTaxReportForFlip = async (flipId: number, flipName: string) => {
    try {
      const flip = flips.find(f => f.id === flipId);
      if (!flip) throw new Error('Flip not found');

      const lineItems = await getLineItemsByFlip(flipId);
      const totals = await computeTotals(flipId);
      const currentYear = new Date().getFullYear();

      await exportTaxReport({
        flip,
        lineItems,
        totals,
        taxYear: currentYear,
      });

      Alert.alert('Success', 'Tax report exported successfully!');
    } catch (error) {
      console.error('Error exporting tax report:', error);
      Alert.alert('Error', 'Failed to export tax report');
    }
  };

  const exportCompleteTaxReport = async () => {
    if (flips.length === 0) {
      Alert.alert('No Data', 'No flips to export for taxes');
      return;
    }

    try {
      const currentYear = new Date().getFullYear();
      const flipsData = [];
      let totalSales = 0;
      let totalPurchases = 0;
      let totalExpenses = 0;
      let totalProfit = 0;
      let totalLoss = 0;

      // Collect data for all flips
      for (const flip of flips) {
        const lineItems = await getLineItemsByFlip(flip.id);
        const totals = await computeTotals(flip.id);
        
        flipsData.push({
          flip,
          lineItems,
          totals,
        });

        // Calculate summary totals
        totalSales += flip.sell_price || 0;
        totalPurchases += flip.buy_price;
        totalExpenses += totals.totalCost;
        
        if (totals.profit > 0) {
          totalProfit += totals.profit;
        } else {
          totalLoss += Math.abs(totals.profit);
        }
      }

      const taxData: AllFlipsTaxData = {
        flips: flipsData,
        taxYear: currentYear,
        summary: {
          totalFlips: flips.length,
          totalProfit,
          totalLoss,
          netGainLoss: totalProfit - totalLoss,
          totalExpenses,
          totalSales,
          totalPurchases,
        },
      };

      await exportAllFlipsTaxReport(taxData);
      Alert.alert('Success', 'Complete tax report exported successfully! This includes all your flips formatted for tax preparation.');
    } catch (error) {
      console.error('Error exporting complete tax report:', error);
      Alert.alert('Error', 'Failed to export complete tax report');
    }
  };


  const handleExportAllFlips = () => {
    if (flips.length === 0) {
      Alert.alert('No Data', 'No flips to export');
      return;
    }

    Alert.alert(
      'Export All Flips',
      `Export ${flips.length} flips to CSV?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => exportCSV() },
      ]
    );
  };

  const renderFlipExportItem = (flip: any) => {
    const displayName = [flip.year, flip.make, flip.model].filter(Boolean).join(' ') || 'Untitled Flip';
    
    return (
      <View key={flip.id} style={styles.flipItemContainer}>
        <View style={styles.flipInfo}>
          <Text style={styles.flipTitle}>{displayName}</Text>
          <Text style={styles.flipSubtitle}>{formatCurrency(flip.buy_price)}</Text>
        </View>
        
        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={[styles.exportButton, styles.csvButton]}
            onPress={() => exportCSV(flip.id, displayName)}
          >
            <Text style={styles.exportButtonText}>CSV</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.exportButton, styles.taxButton]}
            onPress={() => exportTaxReportForFlip(flip.id, displayName)}
          >
            <Text style={styles.exportButtonText}>Tax</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Export Data</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleExportAllFlips}>
            <Text style={styles.actionButtonText}>Export All Flips (CSV)</Text>
            <Text style={styles.actionButtonSubtext}>
              {flips.length} flips available
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.taxExportButton]} onPress={exportCompleteTaxReport}>
            <Text style={styles.actionButtonText}>Export Complete Tax Report</Text>
            <Text style={styles.actionButtonSubtext}>
              All expenses formatted for tax preparation
            </Text>
          </TouchableOpacity>
        </View>

        {flips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Export Individual Flips</Text>
            <Text style={styles.sectionSubtitle}>Tap any flip to export as CSV</Text>
            
            {flips.map(renderFlipExportItem)}
          </View>
        )}


        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Total Flips</Text>
            <Text style={styles.infoValue}>{flips.length}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Open Flips</Text>
            <Text style={styles.infoValue}>
              {flips.filter(f => !f.sold_date).length}
            </Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Sold Flips</Text>
            <Text style={styles.infoValue}>
              {flips.filter(f => !!f.sold_date).length}
            </Text>
          </View>
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 20,
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
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  taxExportButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionButtonSubtext: {
    color: '#E0E7FF',
    fontSize: 14,
  },
  flipItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  flipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
  },
  flipInfo: {
    flex: 1,
  },
  flipTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 2,
  },
  flipSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  exportArrow: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 50,
    alignItems: 'center',
  },
  csvButton: {
    backgroundColor: '#007AFF',
  },
  taxButton: {
    backgroundColor: '#4CAF50',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#333333',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
});

export default Settings;