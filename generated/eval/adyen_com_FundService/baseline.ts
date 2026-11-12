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
  "post-accountHolderBalance",
  {
    title: "Get the balances of an account holder",
    description: "Get the balances of an account holder. Returns the account balances of an account holder. An account's balances are organized according by currencies. This mean that an account may have multiple balances: one for each currency.",
    inputSchema: { "body": z.object({ "accountHolderCode": z.string() }) },
  },
  async (args) => callApi({"method":"POST","path":"/accountHolderBalance","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "post-accountHolderTransactionList",
  {
    title: "Get a list of transactions",
    description: "Get a list of transactions. Returns a list of transactions for an account holder's accounts. You can specify the accounts and transaction statuses to be included on the list. The call returns a maximum of 50 transactions for each account. To retrieve all transactions, you must make another call with the 'page' value incremented. Transactions are listed in chronological order, with the most recent transaction first.",
    inputSchema: { "body": z.object({ "accountHolderCode": z.string(), "transactionListsPerAccount": z.array(z.object({ "accountCode": z.string(), "page": z.number().int() })).optional(), "transactionStatuses": z.array(z.enum(["BalanceNotPaidOutTransfer","BalancePlatformSweep","BalancePlatformSweepReturned","Chargeback","ChargebackCorrection","ChargebackCorrectionReceived","ChargebackReceived","ChargebackReversed","ChargebackReversedCorrection","ChargebackReversedCorrectionReceived","ChargebackReversedReceived","Converted","CreditClosed","CreditFailed","CreditReversed","CreditReversedReceived","CreditSuspended","Credited","DebitFailed","DebitReversedReceived","Debited","DebitedReversed","DepositCorrectionCredited","DepositCorrectionDebited","Fee","FundTransfer","FundTransferReversed","InvoiceDeductionCredited","InvoiceDeductionDebited","ManualCorrected","ManualCorrectionCredited","ManualCorrectionDebited","MerchantPayin","MerchantPayinReversed","Payout","PayoutReversed","PendingCredit","PendingDebit","PendingFundTransfer","ReCredited","ReCreditedReceived","SecondChargeback","SecondChargebackCorrection","SecondChargebackCorrectionReceived","SecondChargebackReceived"])).optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/accountHolderTransactionList","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "post-debitAccountHolder",
  {
    title: "Send a direct debit request",
    description: "Send a direct debit request. Sends a direct debit request to an account holder's bank account. If the direct debit is successful, the funds are settled in the accounts specified in the split instructions. Adyen sends the result of the direct debit in a [`DIRECT_DEBIT_INITIATED`](https://docs.adyen.com/api-explorer/#/NotificationService/latest/post/DIRECT_DEBIT_INITIATED) notification webhook.\n\n To learn more about direct debits, see [Top up accounts](https://docs.adyen.com/marketplaces-and-platforms/classic/top-up-accounts).",
    inputSchema: { "body": z.object({ "accountHolderCode": z.string(), "amount": z.object({ "currency": z.string(), "value": z.number().int() }), "bankAccountUUID": z.string(), "description": z.string().optional(), "merchantAccount": z.string(), "splits": z.array(z.object({ "account": z.string().optional(), "amount": z.object({ "currency": z.string().optional(), "value": z.number().int() }), "description": z.string().optional(), "reference": z.string().optional(), "type": z.enum(["BalanceAccount","Commission","Default","MarketPlace","PaymentFee","Remainder","Surcharge","Tip","VAT","Verification"]) })) }) },
  },
  async (args) => callApi({"method":"POST","path":"/debitAccountHolder","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "post-payoutAccountHolder",
  {
    title: "Pay out from an account to the account holder",
    description: "Pay out from an account to the account holder. Pays out a specified amount from an account to the bank account of account holder.",
    inputSchema: { "body": z.object({ "accountCode": z.string(), "accountHolderCode": z.string(), "amount": z.object({ "currency": z.string(), "value": z.number().int() }).optional(), "bankAccountUUID": z.string().optional(), "description": z.string().optional(), "merchantReference": z.string().optional(), "payoutMethodCode": z.string().optional(), "payoutSpeed": z.enum(["INSTANT","SAME_DAY","STANDARD"]).optional() }) },
  },
  async (args) => callApi({"method":"POST","path":"/payoutAccountHolder","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "post-refundFundsTransfer",
  {
    title: "Refund a funds transfer",
    description: "Refund a funds transfer. Refunds funds transferred from one account to another. Both accounts must be in the same platform, but can have different account holders. ",
    inputSchema: { "body": z.object({ "amount": z.object({ "currency": z.string(), "value": z.number().int() }), "merchantReference": z.string().optional(), "originalReference": z.string() }) },
  },
  async (args) => callApi({"method":"POST","path":"/refundFundsTransfer","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "post-refundNotPaidOutTransfers",
  {
    title: "Refund all transactions of an account since the most recent payout",
    description: "Refund all transactions of an account since the most recent payout. Refunds all the transactions of an account that have taken place since the most recent payout. This request is on a account basis (as opposed to a payment basis), so only the portion of the payment that was made to the specified account is refunded. The commissions, fees, and payments to other accounts remain in the accounts to which they were sent as designated by the original payment's split details.",
    inputSchema: { "body": z.object({ "accountCode": z.string(), "accountHolderCode": z.string() }) },
  },
  async (args) => callApi({"method":"POST","path":"/refundNotPaidOutTransfers","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "post-setupBeneficiary",
  {
    title: "Designate a beneficiary account and transfer the benefactor's current balance",
    description: "Designate a beneficiary account and transfer the benefactor's current balance. Defines a benefactor and a beneficiary relationship between two accounts. At the time of benefactor/beneficiary setup, the funds in the benefactor account are transferred to the beneficiary account, and any further payments to the benefactor account are automatically sent to the beneficiary account. A series of benefactor/beneficiaries may not exceed four beneficiaries and may not have a cycle in it.",
    inputSchema: { "body": z.object({ "destinationAccountCode": z.string(), "merchantReference": z.string().optional(), "sourceAccountCode": z.string() }) },
  },
  async (args) => callApi({"method":"POST","path":"/setupBeneficiary","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

server.registerTool(
  "post-transferFunds",
  {
    title: "Transfer funds between platform accounts",
    description: "Transfer funds between platform accounts. Transfers funds from one account to another account. Both accounts must be in the same platform, but can have different account holders. The transfer must include a transfer code, which should be determined by the platform, in compliance with local regulations.",
    inputSchema: { "body": z.object({ "amount": z.object({ "currency": z.string(), "value": z.number().int() }), "destinationAccountCode": z.string(), "merchantReference": z.string().optional(), "sourceAccountCode": z.string(), "transferCode": z.string() }) },
  },
  async (args) => callApi({"method":"POST","path":"/transferFunds","params":[],"hasBody":true,"contentType":"application/json"}, args as Record<string, unknown>)
);

await server.connect(new StdioServerTransport());
