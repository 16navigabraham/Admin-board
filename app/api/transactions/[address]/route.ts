import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: { address: string } }) {
  const { address } = params

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 })
  }

  try {
    // In a real application, you would fetch this from your actual backend API.
    // For demonstration, we'll simulate a response.
    // Replace this with your actual backend API call:
    // const response = await fetch(`YOUR_BACKEND_API_URL/transactions/${address}`);
    // const data = await response.json();

    // Simulated data for demonstration purposes
    const simulatedData = [
      {
        hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        from: address,
        to: "0x0574A0941Ca659D01CF7370E37492bd2DF43128d", // Your contract address
        value: "100000000000000000", // 0.1 ETH
        timestamp: Math.floor(Date.now() / 1000) - 3600,
        input: "0x1234567890abcdef...", // Placeholder for actual contract input data
      },
      {
        hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        from: "0xAnotherUserAddress",
        to: "0x0574A0941Ca659D01CF7370E37492bd2DF43128d",
        value: "50000000000000000", // 0.05 ETH
        timestamp: Math.floor(Date.now() / 1000) - 7200,
        input: "0xabcdef1234567890...", // Placeholder for actual contract input data
      },
    ]

    // To make the decoding work, you'd need actual transaction input data.
    // For example, if a transaction called `markOrderSuccessful(123n)`:
    // const markOrderSuccessfulInput = encodeFunctionData({
    //   abi: CONTRACT_ABI,
    //   functionName: 'markOrderSuccessful',
    //   args: [123n],
    // });
    // simulatedData[0].input = markOrderSuccessfulInput;

    return NextResponse.json(simulatedData)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
  }
}
