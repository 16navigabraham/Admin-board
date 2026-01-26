import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

// Types for export data
interface OrderExportData {
  orderId: string
  requestId: string
  userWallet: string
  tokenAddress: string
  amount: string
  txnHash: string
  timestamp: string
  chainId?: number
  chainName?: string
}

interface MainPlatformOrderExportData {
  requestId: string
  chainName: string
  transactionHash: string
  serviceType: string
  serviceID: string
  customerIdentifier: string
  amountNaira: number
  cryptoUsed: number
  cryptoSymbol: string
  onChainStatus: string
  vtpassStatus: string
  createdAt: string
}

interface DashboardStatsExportData {
  date: string
  orderCount: number
  totalVolume: number
  successfulOrders: number
  failedOrders: number
  successRate: number
}

interface SummaryExportData {
  metric: string
  value: string | number
}

// Helper to get chain name from chain ID
const getChainNameFromId = (chainId: number): string => {
  if (chainId === 8453) return 'Base'
  if (chainId === 1135) return 'Lisk'
  if (chainId === 42220) return 'Celo'
  return `Chain ${chainId}`
}

// Format date for filename
const getFormattedDate = (): string => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Helper to style header row
const styleHeaderRow = (worksheet: ExcelJS.Worksheet) => {
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
}

// Helper to save workbook
const saveWorkbook = async (workbook: ExcelJS.Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, filename)
}

/**
 * Export order history data to Excel
 */
export async function exportOrdersToExcel(
  orders: OrderExportData[],
  filename?: string,
  sheetName: string = 'Orders'
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Paycrypt Admin Dashboard'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet(sheetName)

  // Define columns
  worksheet.columns = [
    { header: 'Order ID', key: 'orderId', width: 12 },
    { header: 'Request ID', key: 'requestId', width: 25 },
    { header: 'Chain', key: 'chain', width: 10 },
    { header: 'User Wallet', key: 'userWallet', width: 45 },
    { header: 'Token Address', key: 'tokenAddress', width: 45 },
    { header: 'Amount', key: 'amount', width: 20 },
    { header: 'Transaction Hash', key: 'txnHash', width: 70 },
    { header: 'Timestamp', key: 'timestamp', width: 22 }
  ]

  // Add data rows
  orders.forEach(order => {
    worksheet.addRow({
      orderId: order.orderId,
      requestId: order.requestId,
      chain: order.chainName || getChainNameFromId(order.chainId || 0),
      userWallet: order.userWallet,
      tokenAddress: order.tokenAddress,
      amount: order.amount,
      txnHash: order.txnHash,
      timestamp: order.timestamp
    })
  })

  styleHeaderRow(worksheet)

  const exportFilename = filename || `orders_export_${getFormattedDate()}.xlsx`
  await saveWorkbook(workbook, exportFilename)
}

/**
 * Export main platform orders to Excel
 */
export async function exportMainPlatformOrdersToExcel(
  orders: MainPlatformOrderExportData[],
  filename?: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Paycrypt Admin Dashboard'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('Main Platform Orders')

  worksheet.columns = [
    { header: 'Request ID', key: 'requestId', width: 25 },
    { header: 'Chain', key: 'chainName', width: 10 },
    { header: 'Transaction Hash', key: 'transactionHash', width: 70 },
    { header: 'Service Type', key: 'serviceType', width: 15 },
    { header: 'Service ID', key: 'serviceID', width: 15 },
    { header: 'Customer ID', key: 'customerIdentifier', width: 20 },
    { header: 'Amount (NGN)', key: 'amountNaira', width: 15 },
    { header: 'Crypto Used', key: 'cryptoUsed', width: 15 },
    { header: 'Crypto Symbol', key: 'cryptoSymbol', width: 12 },
    { header: 'On-Chain Status', key: 'onChainStatus', width: 15 },
    { header: 'VTPass Status', key: 'vtpassStatus', width: 15 },
    { header: 'Created At', key: 'createdAt', width: 22 }
  ]

  orders.forEach(order => {
    worksheet.addRow(order)
  })

  styleHeaderRow(worksheet)

  const exportFilename = filename || `main_platform_orders_${getFormattedDate()}.xlsx`
  await saveWorkbook(workbook, exportFilename)
}

/**
 * Export dashboard overview stats to Excel with multiple sheets
 */
export async function exportDashboardStatsToExcel(
  summaryData: SummaryExportData[],
  chartData: DashboardStatsExportData[],
  chainBreakdown?: { chainId: number; volumeUSD: number; volumeNGN: number; tokenCount: number }[],
  filename?: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Paycrypt Admin Dashboard'
  workbook.created = new Date()

  // Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 25 },
    { header: 'Value', key: 'value', width: 30 }
  ]
  summaryData.forEach(item => {
    summarySheet.addRow(item)
  })
  styleHeaderRow(summarySheet)

  // Historical Data Sheet
  if (chartData.length > 0) {
    const chartSheet = workbook.addWorksheet('Historical Data')
    chartSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Total Orders', key: 'orderCount', width: 15 },
      { header: 'Total Volume (USD)', key: 'totalVolume', width: 20 },
      { header: 'Successful Orders', key: 'successfulOrders', width: 18 },
      { header: 'Failed Orders', key: 'failedOrders', width: 15 },
      { header: 'Success Rate (%)', key: 'successRate', width: 18 }
    ]
    chartData.forEach(item => {
      chartSheet.addRow({
        date: item.date,
        orderCount: item.orderCount,
        totalVolume: item.totalVolume.toFixed(2),
        successfulOrders: item.successfulOrders,
        failedOrders: item.failedOrders,
        successRate: item.successRate.toFixed(2)
      })
    })
    styleHeaderRow(chartSheet)
  }

  // Chain Breakdown Sheet
  if (chainBreakdown && chainBreakdown.length > 0) {
    const chainSheet = workbook.addWorksheet('Chain Breakdown')
    chainSheet.columns = [
      { header: 'Chain', key: 'chain', width: 12 },
      { header: 'Volume (USD)', key: 'volumeUSD', width: 18 },
      { header: 'Volume (NGN)', key: 'volumeNGN', width: 18 },
      { header: 'Token Count', key: 'tokenCount', width: 15 }
    ]
    chainBreakdown.forEach(chain => {
      chainSheet.addRow({
        chain: getChainNameFromId(chain.chainId),
        volumeUSD: chain.volumeUSD.toFixed(2),
        volumeNGN: chain.volumeNGN.toFixed(2),
        tokenCount: chain.tokenCount
      })
    })
    styleHeaderRow(chainSheet)
  }

  const exportFilename = filename || `dashboard_report_${getFormattedDate()}.xlsx`
  await saveWorkbook(workbook, exportFilename)
}

/**
 * Export comprehensive analytics report with all available data
 */
export async function exportComprehensiveReport(
  options: {
    orders?: OrderExportData[]
    summaryStats?: SummaryExportData[]
    chartData?: DashboardStatsExportData[]
    chainBreakdown?: { chainId: number; volumeUSD: number; volumeNGN: number; tokenCount: number }[]
    reportTitle?: string
    timeframe?: string
  },
  filename?: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Paycrypt Admin Dashboard'
  workbook.created = new Date()

  // Report Info Sheet
  const infoSheet = workbook.addWorksheet('Report Info')
  infoSheet.columns = [
    { header: 'Field', key: 'field', width: 20 },
    { header: 'Value', key: 'value', width: 40 }
  ]
  infoSheet.addRow({ field: 'Report Title', value: options.reportTitle || 'Paycrypt Admin Dashboard Report' })
  infoSheet.addRow({ field: 'Generated On', value: new Date().toLocaleString() })
  infoSheet.addRow({ field: 'Timeframe', value: options.timeframe || 'N/A' })
  infoSheet.addRow({ field: 'Total Orders', value: options.orders?.length || 0 })
  styleHeaderRow(infoSheet)

  // Summary Stats Sheet
  if (options.summaryStats && options.summaryStats.length > 0) {
    const summarySheet = workbook.addWorksheet('Summary')
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 30 }
    ]
    options.summaryStats.forEach(item => {
      summarySheet.addRow(item)
    })
    styleHeaderRow(summarySheet)
  }

  // Chain Breakdown Sheet
  if (options.chainBreakdown && options.chainBreakdown.length > 0) {
    const chainSheet = workbook.addWorksheet('Chain Breakdown')
    chainSheet.columns = [
      { header: 'Chain', key: 'chain', width: 12 },
      { header: 'Volume (USD)', key: 'volumeUSD', width: 20 },
      { header: 'Volume (NGN)', key: 'volumeNGN', width: 22 },
      { header: 'Token Count', key: 'tokenCount', width: 15 }
    ]
    options.chainBreakdown.forEach(chain => {
      chainSheet.addRow({
        chain: getChainNameFromId(chain.chainId),
        volumeUSD: `$${chain.volumeUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        volumeNGN: `₦${chain.volumeNGN.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        tokenCount: chain.tokenCount
      })
    })
    styleHeaderRow(chainSheet)
  }

  // Historical Data Sheet
  if (options.chartData && options.chartData.length > 0) {
    const chartSheet = workbook.addWorksheet('Historical Data')
    chartSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Total Orders', key: 'orderCount', width: 15 },
      { header: 'Total Volume (USD)', key: 'totalVolume', width: 22 },
      { header: 'Successful Orders', key: 'successfulOrders', width: 18 },
      { header: 'Failed Orders', key: 'failedOrders', width: 15 },
      { header: 'Success Rate (%)', key: 'successRate', width: 18 }
    ]
    options.chartData.forEach(item => {
      chartSheet.addRow({
        date: item.date,
        orderCount: item.orderCount,
        totalVolume: `$${item.totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        successfulOrders: item.successfulOrders,
        failedOrders: item.failedOrders,
        successRate: `${item.successRate.toFixed(2)}%`
      })
    })
    styleHeaderRow(chartSheet)
  }

  // Orders Sheet
  if (options.orders && options.orders.length > 0) {
    const ordersSheet = workbook.addWorksheet('Orders')
    ordersSheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 12 },
      { header: 'Request ID', key: 'requestId', width: 25 },
      { header: 'Chain', key: 'chain', width: 10 },
      { header: 'User Wallet', key: 'userWallet', width: 45 },
      { header: 'Token Address', key: 'tokenAddress', width: 45 },
      { header: 'Amount', key: 'amount', width: 20 },
      { header: 'Transaction Hash', key: 'txnHash', width: 70 },
      { header: 'Timestamp', key: 'timestamp', width: 22 }
    ]
    options.orders.forEach(order => {
      ordersSheet.addRow({
        orderId: order.orderId,
        requestId: order.requestId,
        chain: order.chainName || getChainNameFromId(order.chainId || 0),
        userWallet: order.userWallet,
        tokenAddress: order.tokenAddress,
        amount: order.amount,
        txnHash: order.txnHash,
        timestamp: order.timestamp
      })
    })
    styleHeaderRow(ordersSheet)
  }

  const exportFilename = filename || `paycrypt_comprehensive_report_${getFormattedDate()}.xlsx`
  await saveWorkbook(workbook, exportFilename)
}
