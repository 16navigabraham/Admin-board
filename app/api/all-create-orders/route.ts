import { NextResponse } from "next/server"
import { CONTRACT_ABI } from "@/config/contract"
import { encodeFunctionData, keccak256, toBytes } from "viem"

export async function GET(request: Request) {
  // This route simulates fetching ALL createOrder transactions from the contract.
  // In a real application, this data would come from a blockchain indexer (e.g., The Graph)
  // that has indexed all OrderCreated events or createOrder function calls.

  // For demonstration, we'll generate a simulated list of createOrder transactions.
  // The 'orderId' here is a simulated on-chain ID, and 'requestId' is a simulated input.
  const simulatedAllCreateOrders = [
    {
      hash: "0x1111111111111111111111111111111111111111111111111111111111111111",
      from: "0xUserAAddress",
      to: "0x0574A0941Ca659D01CF7370E37492bd2DF43128d",
      value: "100000000000000000", // 0.1 ETH
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 5, // 5 days ago
      input: encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: "createOrder",
        args: [keccak256(toBytes("1754295986817-AGQUEO")), "0xSomeTokenAddress", 1000000000000000000n],
      }),
      actualOrderId: "1", // Simulated actual on-chain order ID
      requestId: "1754295986817-AGQUEO",
    },
    {
      hash: "0x2222222222222222222222222222222222222222222222222222222222222222",
      from: "0xUserBAddress",
      to: "0x0574A0941Ca659D01CF7370E37492bd2DF43128d",
      value: "50000000000000000", // 0.05 ETH
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 4, // 4 days ago
      input: encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: "createOrder",
        args: [keccak256(toBytes("1754295986818-BGHFJK")), "0xAnotherTokenAddress", 500000000000000000n],
      }),
      actualOrderId: "2",
      requestId: "1754295986818-BGHFJK",
    },
    {
      hash: "0x3333333333333333333333333333333333333333333333333333333333333333",
      from: "0xUserAAddress",
      to: "0x0574A0941Ca659D01CF7370E37492bd2DF43128d",
      value: "200000000000000000", // 0.2 ETH
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 3, // 3 days ago
      input: encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: "createOrder",
        args: [keccak256(toBytes("1754295986819-CDEILM")), "0xSomeTokenAddress", 2000000000000000000n],
      }),
      actualOrderId: "3",
      requestId: "1754295986819-CDEILM",
    },
    {
      hash: "0x4444444444444444444444444444444444444444444444444444444444444444",
      from: "0xUserCAddress",
      to: "0x0574A0941Ca659D01CF7370E37492bd2DF43128d",
      value: "75000000000000000", // 0.075 ETH
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 2, // 2 days ago
      input: encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: "createOrder",
        args: [keccak256(toBytes("1754295986820-FGHIJN")), "0xYetAnotherTokenAddress", 750000000000000000n],
      }),
      actualOrderId: "4",
      requestId: "1754295986820-FGHIJN",
    },
    {
      hash: "0x5555555555555555555555555555555555555555555555555555555555555555",
      from: "0xUserBAddress",
      to: "0x0574A0941Ca659D01CF7370E37492bd2DF43128d",
      value: "120000000000000000", // 0.12 ETH
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 1, // 1 day ago
      input: encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: "createOrder",
        args: [keccak256(toBytes("1754295986821-KLMNOP")), "0xFinalTokenAddress", 1200000000000000000n],
      }),
      actualOrderId: "5",
      requestId: "1754295986821-KLMNOP",
    },
    {
      hash: "0x6666666666666666666666666666666666666666666666666666666666666666",
      from: "0xUserAAddress",
      to: "0x0574A0941Ca659D01CF7370E37492bd2DF43128d",
      value: "90000000000000000", // 0.09 ETH
      timestamp: Math.floor(Date.now() / 1000) - 86400 * 0.5, // 12 hours ago
      input: encodeFunctionData({
        abi: CONTRACT_ABI,
        functionName: "createOrder",
        args: [keccak256(toBytes("1754295986822-QRSTUV")), "0xSomeTokenAddress", 900000000000000000n],
      }),
      actualOrderId: "6",
      requestId: "1754295986822-QRSTUV",
    },
  ].sort((a, b) => b.timestamp - a.timestamp) // Sort by most recent first

  return NextResponse.json(simulatedAllCreateOrders)
}
