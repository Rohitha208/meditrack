import React from "react"
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer"

export interface InvoiceItem {
  name: string
  quantity: number
  unitPrice: number
  discount?: number
  total: number
}

export interface InvoicePdfProps {
  invoiceNumber: string
  clinicName: string
  clinicPhone?: string
  clinicAddress?: string
  clientName: string
  clientPhone?: string
  clientEmail?: string
  patientName: string
  dateString: string
  status: string
  visitId?: string
  items: InvoiceItem[]
  consultationFee: number
  consultationDiscountAmount: number
  consultationFeeAfterDiscount: number
  overallProductDiscount?: number
  itemsTotal: number
  grandTotal: number
  notes?: string
  paymentMethod: "cash" | "card" | "online" | "upi" | "cheque" | "bank_transfer"
}

const styles = StyleSheet.create({
  page: { flexDirection: "column", backgroundColor: "#ffffff", padding: 28, fontSize: 11 },
  header: { marginBottom: 16, borderBottom: '1 solid #ddd', paddingBottom: 8 },
  title: { fontSize: 18, fontWeight: 700 },
  subtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  section: { marginTop: 10 },
  row: { flexDirection: 'row', marginBottom: 4 },
  col: { width: '50%' },
  label: { fontWeight: 700 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 6, border: '1 solid #e5e7eb' },
  th: { fontWeight: 700, fontSize: 10 },
  cell: { padding: 6, borderLeft: '1 solid #e5e7eb', borderRight: '1 solid #e5e7eb' },
  tableRow: { flexDirection: 'row', borderBottom: '1 solid #e5e7eb' },
  totals: { marginTop: 10, alignSelf: 'flex-end', width: '60%' },
})

const InvoicePDF = (props: InvoicePdfProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Invoice #{props.invoiceNumber}</Text>
          <Text style={styles.subtitle}>{props.clinicName}</Text>
          {!!props.clinicPhone && <Text style={styles.subtitle}>Contact: {props.clinicPhone}</Text>}
          {!!props.clinicAddress && <Text style={styles.subtitle}>{props.clinicAddress}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Bill To</Text>
          <View style={{ marginTop: 4 }}>
            <Text>{props.clientName}</Text>
            {!!props.clientPhone && <Text>{props.clientPhone}</Text>}
            {!!props.clientEmail && <Text>{props.clientEmail}</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.col}><Text><Text style={styles.label}>Patient: </Text>{props.patientName || 'N/A'}</Text></View>
            <View style={styles.col}><Text><Text style={styles.label}>Date: </Text>{props.dateString}</Text></View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}><Text><Text style={styles.label}>Status: </Text>{props.status}</Text></View>
          </View>
          <View style={styles.row}>
            <View style={styles.col}><Text><Text style={styles.label}>Payment Method: </Text>{props.paymentMethod}</Text></View>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <View style={styles.tableHeader}>
            <View style={{ width: '30%' }}><Text style={styles.th}>Product</Text></View>
            <View style={{ width: '10%' }}><Text style={styles.th}>Qty</Text></View>
            <View style={{ width: '15%' }}><Text style={styles.th}>Unit Price</Text></View>
            <View style={{ width: '15%' }}><Text style={styles.th}>Discount</Text></View>
            <View style={{ width: '15%' }}><Text style={styles.th}>Total</Text></View>
          </View>
          {props.items.map((it, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={{ width: '30%' }}><Text style={styles.cell}>{it.name}</Text></View>
              <View style={{ width: '10%' }}><Text style={[styles.cell, { textAlign: 'right' }]}>{it.quantity}</Text></View>
              <View style={{ width: '15%' }}><Text style={[styles.cell, { textAlign: 'right' }]}>Rs.{it.unitPrice.toFixed(2)}</Text></View>
              <View style={{ width: '15%' }}><Text style={[styles.cell, { textAlign: 'right' }]}>{(it.discount || 0) > 0 ? `-Rs.${it.discount?.toFixed(2)}` : '-'}</Text></View>
              <View style={{ width: '15%' }}><Text style={[styles.cell, { textAlign: 'right' }]}>Rs.{it.total.toFixed(2)}</Text></View>
            </View>
          ))}
          <View style={styles.tableRow}>
            <View style={{ width: '30%' }}><Text style={styles.cell}>Consultation Fee</Text></View>
            <View style={{ width: '10%' }}><Text style={[styles.cell, { textAlign: 'right' }]}>-</Text></View>
            <View style={{ width: '15%' }}><Text style={[styles.cell, { textAlign: 'right' }]}>Rs.{props.consultationFee.toFixed(2)}</Text></View>
            <View style={{ width: '15%' }}><Text style={[styles.cell, { textAlign: 'right' }]}>-</Text></View>
            <View style={{ width: '15%' }}><Text style={[styles.cell, { textAlign: 'right' }]}>Rs.{props.consultationFee.toFixed(2)}</Text></View>
          </View>
          {props.consultationDiscountAmount > 0 && (
            <View style={styles.tableRow}>
              <View style={{ width: '30%' }}><Text style={styles.cell}>Consultation Discount</Text></View>
              <View style={{ width: '10%' }}><Text style={[styles.cell, { textAlign: 'right' }]}></Text></View>
              <View style={{ width: '15%' }}><Text style={[styles.cell, { textAlign: 'right' }]}></Text></View>
              <View style={{ width: '15%' }}><Text style={[styles.cell, { textAlign: 'right' }]}>-Rs.{props.consultationDiscountAmount.toFixed(2)}</Text></View>
              <View style={{ width: '15%' }}><Text style={[styles.cell, { textAlign: 'right' }]}>-Rs.{props.consultationDiscountAmount.toFixed(2)}</Text></View>
            </View>
          )}
        </View>

        <View style={styles.totals}>
          <View style={styles.row}>
            <View style={{ width: '60%' }}><Text>Items Subtotal:</Text></View>
            <View style={{ width: '40%' }}><Text>Rs.{props.itemsTotal.toFixed(2)}</Text></View>
          </View>
          {(props.overallProductDiscount ?? 0) > 0 && (
            <View style={styles.row}>
              <View style={{ width: '60%' }}><Text>Product Discount:</Text></View>
              <View style={{ width: '40%' }}><Text>-Rs.{(props.overallProductDiscount ?? 0).toFixed(2)}</Text></View>
            </View>
          )}
          <View style={styles.row}>
            <View style={{ width: '60%' }}><Text>Items Total:</Text></View>
            <View style={{ width: '40%' }}><Text>Rs.{(props.itemsTotal - (props.overallProductDiscount ?? 0)).toFixed(2)}</Text></View>
          </View>
          <View style={styles.row}>
            <View style={{ width: '60%' }}><Text>Consultation (after discount):</Text></View>
            <View style={{ width: '40%' }}><Text>Rs.{props.consultationFeeAfterDiscount.toFixed(2)}</Text></View>
          </View>
          <View style={[styles.row, { marginTop: 4, borderTop: '1px solid #e5e7eb', paddingTop: 4 }]}>
            <View style={{ width: '60%' }}><Text style={{ fontWeight: 700 }}>Grand Total:</Text></View>
            <View style={{ width: '40%' }}><Text style={{ fontWeight: 700 }}>Rs.{props.grandTotal.toFixed(2)}</Text></View>
          </View>
        </View>

        {!!props.notes && (
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <Text>{props.notes}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}

export const createInvoicePdfBlob = async (props: InvoicePdfProps): Promise<Blob> => {
  return pdf(<InvoicePDF {...props} />).toBlob()
}

export default InvoicePDF

