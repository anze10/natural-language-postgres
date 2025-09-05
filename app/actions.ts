"use server";


import { Config, configSchema, explanationsSchema, Result } from "@/lib/types";
import { openai } from "@ai-sdk/openai";
import prisma from "@/lib/db.js";
import { generateObject } from "ai";
import { z } from "zod";
/**
 * Executes a SQL query and returns the result data
 * @param {string} query - The SQL query to execute
 * @returns {Promise<Result[]>} Array of query results
 * @throws {Error} If query is not a SELECT statement or table doesn't exist
 */


export const generateQuery = async (input: string) => {
  "use server";
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
  system: `You are an expert AI data analyst and master of PostgreSQL for Sensedge (Senzemo). You always return one efficient read-only SQL query plus a short actionable insight.

Business rules:
Sensors on stock are those in the ProductionList table where "orderId" IS NULL. Sensors with a customer are those where "orderId" IS NOT NULL. The SenzorStock table does not exist; do not use it in queries. Use only valid tables and columns from the schema below.
OrderItems = demand, ComponentStock = parts with thresholds.
Outputs: EUR for money, units for qty, yyyy-mm-dd for dates.


Important: When joining "ProductionList" and "Senzor", use "ProductionList"."DeviceType" with "Senzor"."sensorName" (both are text). Do NOT join "DeviceType" with "id". "Senzor"."id" is integer, "DeviceType" is text.

To find which customer has the most sensors, use "ProductionList" where "orderId" IS NOT NULL, join "Order" ON "ProductionList"."orderId" = "Order"."id", and group by "Order"."customerName". Do NOT use "OrderItem" for this purpose.

Example join for customer sensors:
FROM "ProductionList"
JOIN "Order" ON "ProductionList"."orderId" = "Order"."id"
WHERE "ProductionList"."orderId" IS NOT NULL
GROUP BY "Order"."customerName"

Response format:
business take (why the request matters)
sql (one query, performant, readable; use CTEs)
breakdown (each section 1-line purpose)
insight → action (clear recommendation)
assumptions & params (placeholders like [Start_Date])

Data contract:
every result must be plot-ready: ≥2 columns
if user asks for 1 col, return col + count/rate
percents as decimals
name cols clearly (e.g. sensor_name, week_start, fill_rate)

Constraints:
Postgres SELECT only, never modify
Only use the following tables and columns. Do not invent new ones. If a column is missing, state assumption and continue.
Never select *

Tables and columns:
User(id, googleId, email, name, picture, role, createdAt)
Mailing(id, userId, Date_of_monthly_report, isSubscribed, dayOfMonth, subject, includeReportUrl, lastSentAt)
Session(id, userId, expiresAt)
GoogleTokens(id, userId, accessToken, accessTokenExpiresAt, accessTokenExpiresInSeconds, idToken, refreshToken, scopes, tokenType, data, hasRefreshToken, hasScopes)
Senzor(id, sensorName, familyId, productId, pricePerItem, photograph, payloadDecoder, decoder, zpl, description)
Component(id, name, description, Component_price, treshold)
SenzorComponent(id, senzorId, componentId, requiredQuantity)
ComponentStock(id, componentId, quantity, location, lastUpdated, supplier, email, phone, category, required, invoiceFileKey, invoiceId)
Invoice(id, invoiceNumber, uploadDate, supplier, amount, filename, fileData)
InventoryLog(id, timestamp, itemType, itemName, change, reason, user, details, invoiceId, senzorStockId, componentStockId)
Sale(id, senzorId, quantity, saleDate, price, customerName)
Order(id, orderName, assemblier, customerName, street, city, postalCode, country, frequency, date, description, status, shippingCost, receiptUrl, priority, orderDate)
OrderItem(id, orderId, sensorId, quantity)
ProductionList(id, orderId, DeviceType, DevEUI, AppEUI, AppKey, FrequencyRegion, SubBands, HWVersion, FWVersion, CustomFWVersion, SendPeriod, ACK, MovementThreshold, DateCreated, Batch)
OrderStatus(Pending, Taken, Shipped, Arrived)

Patterns:
supply vs demand = count of sensors in ProductionList with orderId IS NULL minus count in OrderItem
with customer = ProductionList.orderId not null grouped by order/customer
traceability = ProductionList.DevEUI ↔ Senzor.DevEUI

Examples:
“sensors in stock vs with customers by type” → sensor_name, on_hand, with_customer, available_to_promise
“fill rate last 30 days by week” → week_start, orders, fulfilled, fill_rate
“components below threshold with stockout forecast” → component_name, qty, threshold, days_to_stockout
Style: concise, no fluff, no select *, columns ready for visualization.`,
      prompt: `Generate the query necessary to retrieve the data the user wants table name and column name should be always inside  "": ${input}`,
      schema: z.object({
        query: z.string(),
      }),
    });
    return result.object.query;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to generate query");
  }
};
export const runGenerateSQLQuery = async (query: string) => {
  "use server";
  // Allow any SQL queries using Prisma
  try {
    const query1 = 'Select * from "Senzor"';
    // Use Prisma's $queryRaw for raw SQL execution
    const data = await prisma.$queryRawUnsafe(query);
    return data;
  } catch (e: any) {
    throw e;
  }
};

export const explainQuery = async (input: string, sqlQuery: string) => {
  "use server";
  try {
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: z.object({
        explanations: explanationsSchema,
      }),
      system: `you are an expert ai data analyst and master of postgresql for sensedge (senzemo). you always return one efficient read-only sql query plus short actionable insight.

business rules:

productionlist: order_id is null → in stock, not null → with customer.

orderitems = demand, senzorstock = supply, componentstock = parts with thresholds.

outputs: eur for money, units for qty, yyyy-mm-dd for dates.

response format:

business take (why the request matters)

sql (one query, performant, readable; use ctes)

breakdown (each section 1-line purpose)

insight → action (clear recommendation)

assumptions & params (placeholders like [Start_Date])

data contract:

every result must be plot-ready: ≥2 columns

if user asks for 1 col, return col + count/rate

percents as decimals

name cols clearly (e.g. sensor_name, week_start, fill_rate)

constraints:

postgres select only, never modify

only use schema below. if missing: state assumption, continue

never select *

schema (tables + key relations):

Senzor ↔ SenzorComponent ↔ Component

Senzor ↔ SenzorStock ↔ ProductionList

Senzor ↔ OrderItem ↔ Order

Component ↔ ComponentStock ↔ Invoice

InventoryLog ↔ (SenzorStock | ComponentStock)

ProductionList ↔ Order

patterns:

supply vs demand = senzorstock − orderitems

with customer = productionlist.orderid not null grouped by order/customer

traceability = productionlist.deveui ↔ senzorstock.productionlistdeveui

examples:

“sensors in stock vs with customers by type” → sensor_name, on_hand, with_customer, available_to_promise

“fill rate last 30 days by week” → week_start, orders, fulfilled, fill_rate

“components below threshold with stockout forecast” → component_name, qty, threshold, days_to_stockout

style: concise, no fluff, no select *, columns ready for visualization `,
      prompt: `Explain the SQL query you generated to retrieve the data the user wanted. Assume the user is not an expert in SQL. Break down the query into steps. Be concise.

      User Query:
      ${input}

      Generated SQL Query:
      ${sqlQuery}`,
    });
    return result.object;
  } catch (e) {
    console.error(e);
    throw new Error("Failed to generate query");
  }
};

export const generateChartConfig = async (
  results: Result[],
  userQuery: string,
) => {
  "use server";
  const system = `You are a data visualization expert. `;

  try {
    const { object: config } = await generateObject({
      model: openai("gpt-4o"),
      system,
      prompt: `Given the following data from a SQL query result, generate the chart config that best visualises the data and answers the users query.
      For multiple groups use multi-lines.

      Here is an example complete config:
      export const chartConfig = {
        type: "pie",
        xKey: "month",
        yKeys: ["sales", "profit", "expenses"],
        colors: {
          sales: "#4CAF50",    // Green for sales
          profit: "#2196F3",   // Blue for profit
          expenses: "#F44336"  // Red for expenses
        },
        legend: true
      }

      User Query:
      ${userQuery}

      Data:
      ${JSON.stringify(results, null, 2)}`,
      schema: configSchema,
    });

    const colors: Record<string, string> = {};
    config.yKeys.forEach((key, index) => {
      colors[key] = `hsl(var(--chart-${index + 1}))`;
    });

    const updatedConfig: Config = { ...config, colors };
    return { config: updatedConfig };
  } catch (e) {
    // @ts-expect-errore
    console.error(e.message);
    throw new Error("Failed to generate chart suggestion");
  }
};