import { DocumentProps, StyleSheet } from '@react-pdf/renderer';

// Common PDF Styles for all certificates
export const certificateStyles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    textAlign: 'center',
    marginBottom: 30,
  },
  clinicName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 5,
  },
  clinicTagline: {
    fontSize: 12,
    color: '#6b7280',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 30,
    textDecoration: 'underline',
  },
  content: {
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 20,
    color: '#374151',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
  },
  petDescription: {
    fontSize: 14,
    marginBottom: 20,
    color: '#374151',
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  detailsColumn: {
    width: '48%',
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    width: '40%',
    color: '#111827',
  },
  detailValue: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  inputValue: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  vetSection: {
    alignItems: 'flex-end',
    width: '48%',
  },
  vetStamp: {
    height: 80,
    marginBottom: 10,
  },
  vetStampText: {
    fontSize: 10,
    color: '#6b7280',
  },
  signatureLine: {
    borderBottom: '2px solid #9ca3af',
    width: 120,
    marginBottom: 5,
  },
  vetName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2563eb',
    textAlign: 'center',
  },
  vetDetails: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'center',
  },
  datePlace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  datePlaceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  datePlaceLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 5,
    color: '#111827',
  },
  datePlaceValue: {
    fontSize: 12,
    color: '#374151',
  },
  footer: {
    borderTop: '2px solid #e5e7eb',
    paddingTop: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 5,
  },
  footerText: {
    fontSize: 10,
    color: '#2563eb',
  },
});

// Helper function to download PDF
export const downloadPDF = async (
  pdfComponent: React.ReactElement<DocumentProps>,
  filename: string,
  onSuccess?: () => void,
  onError?: (error: any) => void
) => {
  try {
    const { pdf } = await import('@react-pdf/renderer');
    const blob = await pdf(pdfComponent).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    
    if (onSuccess) onSuccess();
  } catch (error) {
    if (onError) onError(error);
    throw error;
  }
};

// Helper function to print PDF
export const printPDF = async (
  pdfComponent: React.ReactElement<DocumentProps>,
  onSuccess?: () => void,
  onError?: (error: any) => void
) => {
  try {
    const { pdf } = await import('@react-pdf/renderer');
    const blob = await pdf(pdfComponent).toBlob();
    const url = URL.createObjectURL(blob);
    
    // Open in new window and print
    const printWindow = window.open(url);
    if (printWindow) {
      const onLoad = () => {
        printWindow.focus();
        printWindow.print();
        URL.revokeObjectURL(url);
      };
      
      // If already loaded, try printing immediately; otherwise, wait for load
      try {
        if (printWindow.document?.readyState === 'complete') {
          onLoad();
        } else {
          printWindow.addEventListener('load', onLoad, { once: true });
        }
      } catch (_) {
        // Cross-origin or timing issue; user can print manually
        URL.revokeObjectURL(url);
      }
    }
    
    if (onSuccess) onSuccess();
  } catch (error) {
    if (onError) onError(error);
    throw error;
  }
}; 