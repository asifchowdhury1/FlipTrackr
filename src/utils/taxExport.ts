import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Flip, LineItem, FlipTotals } from '../types';
import { formatCurrency } from './currency';

export interface TaxExportData {
  flip: Flip;
  lineItems: LineItem[];
  totals: FlipTotals;
  taxYear: number;
}

export interface AllFlipsTaxData {
  flips: Array<{
    flip: Flip;
    lineItems: LineItem[];
    totals: FlipTotals;
  }>;
  taxYear: number;
  summary: {
    totalFlips: number;
    totalProfit: number;
    totalLoss: number;
    netGainLoss: number;
    totalExpenses: number;
    totalSales: number;
    totalPurchases: number;
  };
}

export const generateTaxExportPDF = async (data: TaxExportData): Promise<string> => {
  const { flip, lineItems, totals, taxYear } = data;
  
  const displayName = [flip.year, flip.make, flip.model].filter(Boolean).join(' ') || 'Vehicle Flip';
  
  // Generate detailed tax report content
  let content = `TAX REPORT - VEHICLE FLIP\n`;
  content += `Generated: ${new Date().toLocaleDateString()}\n`;
  content += `Tax Year: ${taxYear}\n`;
  content += `=================================\n\n`;
  
  // Vehicle Information
  content += `VEHICLE INFORMATION:\n`;
  content += `Vehicle: ${displayName}\n`;
  content += `VIN: ${flip.vin || 'Not provided'}\n`;
  content += `Miles: ${flip.miles ? flip.miles.toLocaleString() : 'Not provided'}\n`;
  content += `Purchase Date: ${new Date(flip.created_at).toLocaleDateString()}\n`;
  if (flip.sold_date) {
    content += `Sale Date: ${new Date(flip.sold_date).toLocaleDateString()}\n`;
  }
  content += `\n`;
  
  // Financial Summary
  content += `FINANCIAL SUMMARY:\n`;
  content += `Purchase Price: ${formatCurrency(flip.buy_price)}\n`;
  content += `Sale Price: ${formatCurrency(flip.sell_price || 0)}\n`;
  content += `Total Expenses: ${formatCurrency(totals.totalCost)}\n`;
  content += `Total Investment: ${formatCurrency(flip.buy_price + totals.totalCost)}\n`;
  content += `Gross Profit/Loss: ${formatCurrency(totals.profit)}\n`;
  content += `ROI: ${(totals.roi * 100).toFixed(2)}%\n`;
  content += `\n`;
  
  // Tax Calculations
  const shortTermGain = flip.sold_date ? totals.profit : 0; // Assuming held < 1 year for flips
  content += `TAX IMPLICATIONS:\n`;
  content += `Classification: Short-term Capital Gain/Loss (assuming held < 1 year)\n`;
  content += `Taxable Amount: ${formatCurrency(shortTermGain)}\n`;
  content += `Note: Consult your tax professional for proper treatment\n`;
  content += `\n`;
  
  // Detailed Expenses
  content += `DETAILED EXPENSES:\n`;
  content += `Category\t\tDescription\t\t\tAmount\t\tDate\n`;
  content += `${'='.repeat(80)}\n`;
  
  // Purchase cost
  content += `Purchase\t\tVehicle Purchase\t\t${formatCurrency(flip.buy_price)}\t${new Date(flip.created_at).toLocaleDateString()}\n`;
  
  // Line items grouped by category
  const categories = ['parts', 'labor', 'fees', 'misc'];
  for (const category of categories) {
    const categoryItems = lineItems.filter(item => item.category === category);
    if (categoryItems.length > 0) {
      for (const item of categoryItems) {
        const date = item.date ? new Date(item.date).toLocaleDateString() : 'Not specified';
        content += `${category || 'misc'}\t\t${item.title}\t\t${formatCurrency(item.amount)}\t\t${date}\n`;
      }
    }
  }
  
  // Items without category
  const uncategorizedItems = lineItems.filter(item => !item.category);
  for (const item of uncategorizedItems) {
    const date = item.date ? new Date(item.date).toLocaleDateString() : 'Not specified';
    content += `misc\t\t${item.title}\t\t${formatCurrency(item.amount)}\t\t${date}\n`;
  }
  
  content += `${'='.repeat(80)}\n`;
  content += `TOTAL EXPENSES: ${formatCurrency(totals.totalCost)}\n`;
  content += `\n`;
  
  // Category Totals
  content += `EXPENSE SUMMARY BY CATEGORY:\n`;
  for (const category of categories) {
    const categoryItems = lineItems.filter(item => item.category === category);
    if (categoryItems.length > 0) {
      const categoryTotal = categoryItems.reduce((sum, item) => sum + item.amount, 0);
      content += `${category.charAt(0).toUpperCase() + category.slice(1)}: ${formatCurrency(categoryTotal)}\n`;
    }
  }
  
  const uncategorizedTotal = uncategorizedItems.reduce((sum, item) => sum + item.amount, 0);
  if (uncategorizedTotal > 0) {
    content += `Miscellaneous: ${formatCurrency(uncategorizedTotal)}\n`;
  }
  
  content += `\n`;
  content += `IMPORTANT NOTES:\n`;
  content += `- This report is for tax preparation purposes\n`;
  content += `- Consult with a qualified tax professional\n`;
  content += `- Keep all receipts and supporting documentation\n`;
  content += `- Vehicle flipping may require business license in some jurisdictions\n`;
  content += `- Consider quarterly estimated tax payments for significant gains\n`;
  
  return content;
};

export const generateAllFlipsTaxReport = async (data: AllFlipsTaxData): Promise<string> => {
  const { flips, taxYear, summary } = data;
  
  let content = `COMPLETE TAX REPORT - ALL VEHICLE FLIPS\n`;
  content += `Generated: ${new Date().toLocaleDateString()}\n`;
  content += `Tax Year: ${taxYear}\n`;
  content += `=================================================================\n\n`;
  
  // EXECUTIVE SUMMARY
  content += `EXECUTIVE SUMMARY:\n`;
  content += `Total Vehicles Flipped: ${summary.totalFlips}\n`;
  content += `Total Sales Revenue: ${formatCurrency(summary.totalSales)}\n`;
  content += `Total Purchase Cost: ${formatCurrency(summary.totalPurchases)}\n`;
  content += `Total Operating Expenses: ${formatCurrency(summary.totalExpenses)}\n`;
  content += `Net Gain/Loss: ${formatCurrency(summary.netGainLoss)}\n`;
  content += `\n`;
  
  // TAX CLASSIFICATION
  content += `TAX TREATMENT:\n`;
  content += `Business Activity: Vehicle Flipping/Resale\n`;
  content += `Classification: Short-term Capital Gains (vehicles typically held < 1 year)\n`;
  content += `Schedule: Report on Schedule D (Capital Gains and Losses)\n`;
  content += `Self-Employment: May require Schedule C if this is a business activity\n`;
  content += `\n`;
  
  // DETAILED BREAKDOWN BY VEHICLE
  content += `DETAILED VEHICLE-BY-VEHICLE BREAKDOWN:\n`;
  content += `${'='.repeat(80)}\n`;
  
  flips.forEach((flipData, index) => {
    const { flip, lineItems, totals } = flipData;
    const displayName = [flip.year, flip.make, flip.model].filter(Boolean).join(' ') || `Vehicle ${index + 1}`;
    
    content += `\nVEHICLE ${index + 1}: ${displayName}\n`;
    content += `-`.repeat(50) + '\n';
    content += `Purchase Date: ${new Date(flip.created_at).toLocaleDateString()}\n`;
    content += `Sale Date: ${flip.sold_date ? new Date(flip.sold_date).toLocaleDateString() : 'Not sold'}\n`;
    content += `VIN: ${flip.vin || 'Not provided'}\n`;
    content += `Miles: ${flip.miles ? flip.miles.toLocaleString() : 'Not provided'}\n`;
    
    content += `\nFINANCIALS:\n`;
    content += `Purchase Price: ${formatCurrency(flip.buy_price)}\n`;
    content += `Sale Price: ${formatCurrency(flip.sell_price || 0)}\n`;
    content += `Operating Expenses: ${formatCurrency(totals.totalCost)}\n`;
    content += `Total Investment: ${formatCurrency(flip.buy_price + totals.totalCost)}\n`;
    content += `Profit/Loss: ${formatCurrency(totals.profit)}\n`;
    content += `ROI: ${(totals.roi * 100).toFixed(2)}%\n`;
    
    if (lineItems.length > 0) {
      content += `\nEXPENSE BREAKDOWN:\n`;
      
      // Group expenses by category
      const categories = ['parts', 'labor', 'fees', 'misc'];
      categories.forEach(category => {
        const categoryItems = lineItems.filter(item => item.category === category);
        if (categoryItems.length > 0) {
          const categoryTotal = categoryItems.reduce((sum, item) => sum + item.amount, 0);
          content += `\n${category.toUpperCase()}: ${formatCurrency(categoryTotal)}\n`;
          categoryItems.forEach(item => {
            const date = item.date ? new Date(item.date).toLocaleDateString() : new Date(item.created_at).toLocaleDateString();
            content += `  • ${item.title}: ${formatCurrency(item.amount)} (${date})\n`;
          });
        }
      });
      
      // Uncategorized items
      const uncategorized = lineItems.filter(item => !item.category);
      if (uncategorized.length > 0) {
        const uncategorizedTotal = uncategorized.reduce((sum, item) => sum + item.amount, 0);
        content += `\nMISCELLANEOUS: ${formatCurrency(uncategorizedTotal)}\n`;
        uncategorized.forEach(item => {
          const date = item.date ? new Date(item.date).toLocaleDateString() : new Date(item.created_at).toLocaleDateString();
          content += `  • ${item.title}: ${formatCurrency(item.amount)} (${date})\n`;
        });
      }
    }
    
    content += `\n${'='.repeat(80)}\n`;
  });
  
  // SUMMARY BY CATEGORY (ALL VEHICLES)
  content += `\nCOMBINED EXPENSE SUMMARY BY CATEGORY:\n`;
  const allExpenses: Record<string, number> = {};
  
  flips.forEach(({ lineItems }) => {
    lineItems.forEach(item => {
      const category = item.category || 'misc';
      allExpenses[category] = (allExpenses[category] || 0) + item.amount;
    });
  });
  
  Object.entries(allExpenses).forEach(([category, total]) => {
    content += `${category.charAt(0).toUpperCase() + category.slice(1)}: ${formatCurrency(total)}\n`;
  });
  
  // TAX PREPARATION CHECKLIST
  content += `\nTAX PREPARATION CHECKLIST:\n`;
  content += `□ Keep all purchase receipts and contracts\n`;
  content += `□ Keep all sale receipts and contracts\n`;
  content += `□ Keep all receipts for parts, labor, and fees\n`;
  content += `□ Document any business mileage related to vehicle viewing/transport\n`;
  content += `□ Consider if this activity requires a business license\n`;
  content += `□ Determine if you need to make quarterly estimated tax payments\n`;
  content += `□ Consult with a tax professional for proper classification\n`;
  content += `□ Consider Schedule C filing if this is a regular business activity\n`;
  
  // IMPORTANT NOTES
  content += `\nIMPORTANT TAX NOTES:\n`;
  content += `• This report is for tax preparation purposes only\n`;
  content += `• Vehicle flipping may be considered business income vs. capital gains\n`;
  content += `• Consult with a qualified tax professional\n`;
  content += `• Keep detailed records and receipts for all transactions\n`;
  content += `• Consider sales tax obligations in your state\n`;
  content += `• Some states require dealer licenses for multiple vehicle sales\n`;
  content += `• Report all gains - the IRS may have records of vehicle sales\n`;
  
  return content;
};

export const exportAllFlipsTaxReport = async (data: AllFlipsTaxData) => {
  try {
    const content = await generateAllFlipsTaxReport(data);
    const fileName = `AutoTrackr_Complete_Tax_Report_${data.taxYear}.txt`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Export Complete Tax Report',
      });
    }
    
    return fileUri;
  } catch (error) {
    console.error('Error exporting complete tax report:', error);
    throw error;
  }
};

export const exportTaxReport = async (data: TaxExportData) => {
  try {
    const content = await generateTaxExportPDF(data);
    const displayName = [data.flip.year, data.flip.make, data.flip.model].filter(Boolean).join(' ') || 'Vehicle';
    const fileName = `${displayName.replace(/\s+/g, '_')}_Tax_Report_${data.taxYear}.txt`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Export Tax Report',
      });
    }
    
    return fileUri;
  } catch (error) {
    console.error('Error exporting tax report:', error);
    throw error;
  }
};