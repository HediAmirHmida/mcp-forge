import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

interface Route {
  method: string;
  path: string;
  params: { name: string; in: string }[];
  hasBody: boolean;
  contentType?: string;
}

async function callApi(route: Route, args: Record<string, unknown>) {
  let path = route.path;
  const query = new URLSearchParams();
  const headers: Record<string, string> = { Accept: "application/json" };

  for (const p of route.params) {
    const value = args[p.name];
    if (value === undefined) continue;
    if (p.in === "path") {
      path = path.replace("{" + p.name + "}", encodeURIComponent(String(value)));
    } else if (p.in === "query") {
      if (Array.isArray(value)) value.forEach((v) => query.append(p.name, String(v)));
      else query.append(p.name, String(value));
    } else if (p.in === "header") {
      headers[p.name] = String(value);
    }
  }

  const qs = query.toString();
  const url = BASE_URL + path + (qs ? "?" + qs : "");
  const init: RequestInit = { method: route.method, headers };
  if (route.hasBody && args.body !== undefined) {
    const ct = route.contentType ?? "application/json";
    headers["Content-Type"] = ct;
    init.body = ct.includes("json") ? JSON.stringify(args.body) : String(args.body);
  }

  try {
    const res = await fetch(url, init);
    const text = await res.text();
    if (!res.ok) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: "HTTP " + res.status + ": " + text.slice(0, 2000) }],
      };
    }
    return { content: [{ type: "text" as const, text: text.slice(0, 20000) }] };
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: "Network error: " + String(err) }],
    };
  }
}

const BASE_URL = process.env.API_BASE_URL ?? "https://cal-test.adyen.com/cal/services/Fund/v6";
const server = new McpServer({ name: "fund-api", version: "1.0.0" });

server.registerTool(
  "get_account_balance",
  {
    title: "Get the balances of an account holder",
    description: "Get the balances of an account holder. Use this tool when you need to check the current available or pending funds for a specific account holder.",
    inputSchema: { "body": z.object({ "accountHolderCode": z.string() }) },
  },
  async (args) => callApi({"method":"POST","path":"/accountHolderBalance","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "list_account_transactions",
  {
    title: "Get a list of transactions",
    description: "Get a list of transactions for an account holder. Use this tool when reviewing transaction history or auditing past account movements.",
    inputSchema: { "body": z.object({ "accountHolderCode": z.string(), "transactionListsPerAccount": z.array(z.object({ "accountCode": z.string(), "page": z.number().int() })).optional(), "transactionStatuses": z.array(z.enum(["BalanceNotPaidOutTransfer","BalancePlatformSweep","BalancePlatformSweepReturned","Chargeback","ChargebackCorrection","ChargebackCorrectionReceived","ChargebackReceived","ChargebackReversed","ChargebackReversedCorrection","ChargebackReversedCorrectionReceived","ChargebackReversedReceived","Converted","CreditClosed","CreditFailed","CreditReversed","CreditReversedReceived","CreditSuspended","Credited","DebitFailed","DebitReversedReceived","Debited","DebitedReversed","DepositCorrectionCredited","DepositCorrectionDebited","Fee","FundTransfer","FundTransferReversed","InvoiceDeductionCredited","InvoiceDeductionDebited","ManualCorrected","ManualCorrectionCredited","ManualCorrectionDebited","MerchantPayin","MerchantPayinReversed","Payout","PayoutReversed","PendingCredit","PendingDebit","PendingFundTransfer","ReCredited","ReCreditedReceived","SecondChargeback","SecondChargebackCorrection","SecondChargebackCorrectionReceived","SecondChargebackReceived"])).optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/accountHolderTransactionList","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "debit_account_holder",
  {
    title: "Send a direct debit request",
    description: "Send a direct debit request to draw funds from an account holder. Use this when initiating a collection of funds.",
    inputSchema: { "body": z.object({ "accountHolderCode": z.string(), "amount": z.object({ "currency": z.string(), "value": z.number().int() }), "bankAccountUUID": z.string(), "description": z.string().optional(), "merchantAccount": z.string(), "splits": z.array(z.object({ "account": z.string().optional(), "amount": z.object({ "currency": z.string().optional(), "value": z.number().int() }), "description": z.string().optional(), "reference": z.string().optional(), "type": z.enum(["BalanceAccount","Commission","Default","MarketPlace","PaymentFee","Remainder","Surcharge","Tip","VAT","Verification"]) })) }) },
  },
  async (args) => callApi({"method":"POST","path":"/debitAccountHolder","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "payout_account_holder",
  {
    title: "Pay out from an account to the account holder",
    description: "Pay out from an account to the account holder. Use this when transferring funds out of the platform to the user's external destination.",
    inputSchema: { "body": z.object({ "accountCode": z.string(), "accountHolderCode": z.string(), "amount": z.object({ "currency": z.string(), "value": z.number().int() }).optional(), "bankAccountUUID": z.string().optional(), "description": z.string().optional(), "merchantReference": z.string().optional(), "payoutMethodCode": z.string().optional(), "payoutSpeed": z.enum(["INSTANT","SAME_DAY","STANDARD"]).optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/payoutAccountHolder","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "refund_funds_transfer",
  {
    title: "Refund a funds transfer",
    description: "Refund a specific funds transfer. Use this tool when reversing a previous transfer that was made between accounts.",
    inputSchema: { "body": z.object({ "amount": z.object({ "currency": z.string(), "value": z.number().int() }), "merchantReference": z.string().optional(), "originalReference": z.string() }) },
  },
  async (args) => callApi({"method":"POST","path":"/refundFundsTransfer","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "refund_unpaid_transfers",
  {
    title: "Refund all transactions of an account since the most recent payout",
    description: "Refund all transactions of an account since the most recent payout. Use this for bulk reversals of unpaid funds, not for individual transfers.",
    inputSchema: { "body": z.object({ "accountCode": z.string(), "accountHolderCode": z.string() }) },
  },
  async (args) => callApi({"method":"POST","path":"/refundNotPaidOutTransfers","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "setup_beneficiary",
  {
    title: "Designate a beneficiary account and transfer the benefactor's current balance",
    description: "Designate a beneficiary account and transfer the benefactor's current balance. Use this when establishing a linked beneficiary and sweeping existing funds.",
    inputSchema: { "body": z.object({ "destinationAccountCode": z.string(), "merchantReference": z.string().optional(), "sourceAccountCode": z.string() }) },
  },
  async (args) => callApi({"method":"POST","path":"/setupBeneficiary","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "transfer_funds",
  {
    title: "Transfer funds between platform accounts",
    description: "Transfer funds between platform accounts. Use this tool for internal movements of money between accounts within the platform.",
    inputSchema: { "body": z.object({ "amount": z.object({ "currency": z.string(), "value": z.number().int() }), "destinationAccountCode": z.string(), "merchantReference": z.string().optional(), "sourceAccountCode": z.string(), "transferCode": z.string() }) },
  },
  async (args) => callApi({"method":"POST","path":"/transferFunds","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

await server.connect(new StdioServerTransport());
