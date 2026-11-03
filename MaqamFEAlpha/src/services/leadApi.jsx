import { getApiBaseUrl } from "../configs/api.js";

const BASE_URL = getApiBaseUrl();

const API_URL = `${BASE_URL}/api/v1/ops-crm/leads`;

export async function createLead(leadData) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(leadData),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message || "Failed to create lead"
    );
  }

  return data;
}