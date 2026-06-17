// src/lib/pdf-generator.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate, formatDateTime } from './utils'

const SHOP_NAME = process.env.NEXT_PUBLIC_SHOP_NAME || 'Shri Ram Hardware & Electricals'
const SHOP_ADDRESS = process.env.NEXT_PUBLIC_SHOP_ADDRESS || 'Shop No. 12, Main Market, Pune - 411001'
const SHOP_PHONE = process.env.NEXT_PUBLIC_SHOP_PHONE || '+91-9876543210'
const SHOP_GSTIN = process.env.NEXT_PUBLIC_SHOP_GSTIN || '27AABCS1234A1Z5'

function addShopHeader(doc: jsPDF, title: string) {
  // Background header
  doc.setFillColor(249, 115, 22)
  doc.rect(0, 0, 210, 38, 'F')

  // Shop name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(SHOP_NAME, 14, 14)

  // Address
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(SHOP_ADDRESS, 14, 21)
  doc.text(`Phone: ${SHOP_PHONE}  |  GSTIN: ${SHOP_GSTIN}`, 14, 27)

  // Document title (right side)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 196, 14, { align: 'right' })

  // Reset color
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'normal')
}

function addFooter(doc: jsPDF, pageCount: number) {
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text(
    `Generated on ${formatDateTime(new Date())} | Page ${pageCount}`,
    105,
    pageHeight - 8,
    { align: 'center' }
  )
  doc.text('Thank you for your business!', 105, pageHeight - 4, { align: 'center' })
}

// ─── Invoice PDF ─────────────────────────────────────────────────────────────

export function generateInvoicePDF(sale: any): jsPDF {
  const doc = new jsPDF()
  addShopHeader(doc, 'INVOICE')

  const startY = 45

  // Invoice details box
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(14, startY, 85, 30, 3, 3, 'F')
  doc.roundedRect(111, startY, 85, 30, 3, 3, 'F')

  // Left: Invoice info
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text('INVOICE NO', 18, startY + 7)
  doc.text('DATE', 18, startY + 14)
  doc.text('DUE DATE', 18, startY + 21)
  doc.text('STATUS', 18, startY + 28)

  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'normal')
  doc.text(sale.invoiceNumber, 60, startY + 7)
  doc.text(formatDate(sale.saleDate), 60, startY + 14)
  doc.text(sale.dueDate ? formatDate(sale.dueDate) : 'Immediate', 60, startY + 21)
  doc.text(sale.paymentStatus, 60, startY + 28)

  // Right: Customer info
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text('BILL TO', 115, startY + 7)
  doc.setTextColor(15, 23, 42)
  doc.setFont('helvetica', 'normal')

  if (sale.customer) {
    doc.setFont('helvetica', 'bold')
    doc.text(sale.customer.name, 115, startY + 14)
    doc.setFont('helvetica', 'normal')
    if (sale.customer.phone) doc.text(sale.customer.phone, 115, startY + 21)
    if (sale.customer.gstin) doc.text(`GSTIN: ${sale.customer.gstin}`, 115, startY + 28)
  } else {
    doc.text('Walk-in Customer', 115, startY + 14)
  }

  // Items table
  const tableData = sale.items.map((item: any, i: number) => [
    i + 1,
    item.product?.name || 'Unknown Product',
    item.product?.sku || '',
    `${item.quantity} ${item.product?.unit || 'pcs'}`,
    formatCurrency(item.unitPrice),
    `${item.taxRate}%`,
    formatCurrency(item.taxAmount),
    formatCurrency(item.totalPrice),
  ])

  autoTable(doc, {
    startY: startY + 36,
    head: [['#', 'Product', 'SKU', 'Qty', 'Unit Price', 'Tax%', 'Tax Amt', 'Total']],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
  })

  // Totals section
  const finalY = (doc as any).lastAutoTable.finalY + 5
  const totalsX = 120
  const valX = 196

  doc.setFontSize(9)
  const rows = [
    ['Subtotal:', formatCurrency(sale.subtotal)],
    ['Tax Amount:', formatCurrency(sale.taxAmount)],
    ['Discount:', `- ${formatCurrency(sale.discountAmount)}`],
  ]

  rows.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(label, totalsX, finalY + i * 7)
    doc.setTextColor(15, 23, 42)
    doc.text(value, valX, finalY + i * 7, { align: 'right' })
  })

  // Total box
  doc.setFillColor(249, 115, 22)
  doc.roundedRect(totalsX - 4, finalY + 18, valX - totalsX + 10, 10, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(255)
  doc.text('TOTAL:', totalsX, finalY + 25)
  doc.text(formatCurrency(sale.totalAmount), valX, finalY + 25, { align: 'right' })

  // Payment info
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(9)
  doc.text(`Paid: ${formatCurrency(sale.paidAmount)}`, totalsX, finalY + 35)
  doc.setTextColor(sale.dueAmount > 0 ? 239 : 34, sale.dueAmount > 0 ? 68 : 197, sale.dueAmount > 0 ? 68 : 94)
  doc.setFont('helvetica', 'bold')
  doc.text(`Balance Due: ${formatCurrency(sale.dueAmount)}`, totalsX, finalY + 42)

  // Payment method
  doc.setTextColor(100)
  doc.setFont('helvetica', 'normal')
  doc.text(`Payment Method: ${sale.paymentMethod}`, 14, finalY + 35)

  // Notes
  if (sale.notes) {
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text('Notes:', 14, finalY + 50)
    doc.setTextColor(15, 23, 42)
    doc.text(sale.notes, 14, finalY + 56)
  }

  // Terms
  const termsY = finalY + 70
  doc.setFontSize(8)
  doc.setTextColor(100)
  doc.text('Terms & Conditions:', 14, termsY)
  doc.text('1. Goods once sold will not be taken back or exchanged.', 14, termsY + 5)
  doc.text('2. Subject to local jurisdiction.', 14, termsY + 10)

  addFooter(doc, 1)
  return doc
}

// ─── Sales Report PDF ─────────────────────────────────────────────────────────

export function generateSalesReportPDF(data: {
  sales: any[]
  from: string
  to: string
  totalSales: number
  totalTax: number
  totalDiscount: number
  grandTotal: number
}): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape' })
  addShopHeader(doc, 'SALES REPORT')

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Period: ${formatDate(data.from)} to ${formatDate(data.to)}`, 14, 44)
  doc.text(`Generated: ${formatDateTime(new Date())}`, 200, 44, { align: 'right' })

  // Summary row
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(14, 48, 275, 16, 3, 3, 'F')
  const summaries = [
    { label: 'Total Invoices', value: data.sales.length.toString() },
    { label: 'Total Sales', value: formatCurrency(data.totalSales) },
    { label: 'Total Tax', value: formatCurrency(data.totalTax) },
    { label: 'Total Discount', value: formatCurrency(data.totalDiscount) },
    { label: 'Grand Total', value: formatCurrency(data.grandTotal) },
  ]

  summaries.forEach((s, i) => {
    const x = 14 + i * 56
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(100)
    doc.text(s.label.toUpperCase(), x + 2, 54)
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(s.value, x + 2, 61)
  })

  autoTable(doc, {
    startY: 68,
    head: [['Invoice No', 'Date', 'Customer', 'Items', 'Subtotal', 'Tax', 'Discount', 'Total', 'Paid', 'Due', 'Status']],
    body: data.sales.map(s => [
      s.invoiceNumber,
      formatDate(s.saleDate),
      s.customer?.name || 'Walk-in',
      s.items?.length || 0,
      formatCurrency(s.subtotal),
      formatCurrency(s.taxAmount),
      formatCurrency(s.discountAmount),
      formatCurrency(s.totalAmount),
      formatCurrency(s.paidAmount),
      formatCurrency(s.dueAmount),
      s.paymentStatus,
    ]),
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
      8: { halign: 'right' },
      9: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.column.index === 10) {
        const status = data.cell.text[0]
        if (status === 'OVERDUE') data.cell.styles.textColor = [239, 68, 68]
        else if (status === 'PAID') data.cell.styles.textColor = [34, 197, 94]
        else if (status === 'PENDING') data.cell.styles.textColor = [249, 115, 22]
      }
    },
  })

  addFooter(doc, 1)
  return doc
}

// ─── Inventory Report PDF ─────────────────────────────────────────────────────

export function generateInventoryReportPDF(products: any[]): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape' })
  addShopHeader(doc, 'INVENTORY REPORT')

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`As of: ${formatDateTime(new Date())}`, 14, 44)

  const totalValue = products.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0)
  const totalItems = products.length
  const lowStock = products.filter(p => p.currentStock <= p.minStockLevel).length
  const outOfStock = products.filter(p => p.currentStock === 0).length

  // Summary
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(14, 48, 275, 16, 3, 3, 'F')
  const summaries = [
    { label: 'Total Products', value: totalItems.toString() },
    { label: 'Low Stock Items', value: lowStock.toString() },
    { label: 'Out of Stock', value: outOfStock.toString() },
    { label: 'Inventory Value', value: formatCurrency(totalValue) },
  ]
  summaries.forEach((s, i) => {
    const x = 14 + i * 70
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(100)
    doc.text(s.label.toUpperCase(), x + 2, 54)
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(s.value, x + 2, 61)
  })

  autoTable(doc, {
    startY: 68,
    head: [['SKU', 'Product Name', 'Category', 'Unit', 'Cost Price', 'Sell Price', 'Stock', 'Min Stock', 'Stock Value', 'Status']],
    body: products.map(p => {
      const status = p.currentStock === 0 ? 'Out of Stock' : p.currentStock <= p.minStockLevel ? 'Low Stock' : 'OK'
      return [
        p.sku,
        p.name,
        p.category?.name || '',
        p.unit,
        formatCurrency(p.costPrice),
        formatCurrency(p.sellingPrice),
        p.currentStock,
        p.minStockLevel,
        formatCurrency(p.currentStock * p.costPrice),
        status,
      ]
    }),
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'center' },
      7: { halign: 'center' },
      8: { halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.column.index === 9) {
        const status = data.cell.text[0]
        if (status === 'Out of Stock') data.cell.styles.textColor = [239, 68, 68]
        else if (status === 'Low Stock') data.cell.styles.textColor = [234, 179, 8]
        else data.cell.styles.textColor = [34, 197, 94]
      }
    },
  })

  addFooter(doc, 1)
  return doc
}

// ─── Profit & Loss Report PDF ──────────────────────────────────────────────────

export function generatePLReportPDF(data: {
  from: string
  to: string
  totalRevenue: number
  totalCOGS: number
  grossProfit: number
  totalExpenses: number
  netProfit: number
  expenseBreakdown: { category: string; amount: number }[]
  salesByCategory: { category: string; sales: number; profit: number }[]
}): jsPDF {
  const doc = new jsPDF()
  addShopHeader(doc, 'P&L REPORT')

  let y = 44
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Period: ${formatDate(data.from)} to ${formatDate(data.to)}`, 14, y)
  y += 10

  const addRow = (label: string, value: number, bold = false, color?: [number, number, number]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(10)
    doc.setTextColor(color ? color[0] : 15, color ? color[1] : 23, color ? color[2] : 42)
    doc.text(label, 20, y)
    doc.text(formatCurrency(value), 190, y, { align: 'right' })
    if (bold) {
      doc.setDrawColor(200)
      doc.line(14, y + 2, 196, y + 2)
    }
    y += bold ? 10 : 7
  }

  const addSection = (title: string) => {
    doc.setFillColor(249, 115, 22)
    doc.rect(14, y - 4, 182, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255)
    doc.text(title, 18, y + 1)
    y += 10
    doc.setTextColor(15, 23, 42)
  }

  addSection('REVENUE')
  addRow('Total Sales Revenue', data.totalRevenue)
  addRow('Cost of Goods Sold (COGS)', data.totalCOGS)
  addRow('GROSS PROFIT', data.grossProfit, true,
    data.grossProfit >= 0 ? [34, 197, 94] : [239, 68, 68])

  y += 5
  addSection('OPERATING EXPENSES')
  data.expenseBreakdown.forEach(e => addRow(e.category, e.amount))
  addRow('TOTAL EXPENSES', data.totalExpenses, true, [239, 68, 68])

  y += 5
  doc.setFillColor(data.netProfit >= 0 ? 34 : 239, data.netProfit >= 0 ? 197 : 68, data.netProfit >= 0 ? 94 : 68)
  doc.roundedRect(14, y - 4, 182, 14, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(255)
  doc.text('NET PROFIT / LOSS', 18, y + 5)
  doc.text(formatCurrency(data.netProfit), 190, y + 5, { align: 'right' })
  y += 20

  // Margin
  const margin = data.totalRevenue > 0 ? (data.netProfit / data.totalRevenue * 100).toFixed(1) : 0
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text(`Net Profit Margin: ${margin}%`, 14, y)

  // Category breakdown table
  if (data.salesByCategory.length > 0) {
    y += 10
    autoTable(doc, {
      startY: y,
      head: [['Category', 'Sales', 'Profit', 'Margin %']],
      body: data.salesByCategory.map(c => [
        c.category,
        formatCurrency(c.sales),
        formatCurrency(c.profit),
        c.sales > 0 ? `${((c.profit / c.sales) * 100).toFixed(1)}%` : '0%',
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [249, 115, 22], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    })
  }

  addFooter(doc, 1)
  return doc
}
