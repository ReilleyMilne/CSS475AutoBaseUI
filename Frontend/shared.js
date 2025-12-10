// =========================
// Configuration
// =========================
export const BACKEND_URL = "http://127.0.0.1:5000";

// =========================
// HTML Utilities
// =========================
export function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =========================
// Formatting Utilities
// =========================
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC' // This prevents timezone conversion
    };
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch {
    return dateString;
  }
}

export function formatLabel(key) {
  if (!key) return "";
  // Replaces underscores with spaces and capitalizes words
  // e.g., "first_name" -> "First Name"
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

export function formatNumber(num) {
  if (num === undefined || num === null) return "0";
  return new Intl.NumberFormat('en-US').format(num);
}

// =========================
// User / Auth Utilities
// =========================
export async function safeFetchCurrentUser() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/auth/current_user`, {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) {
      // If 401/403, just return null (not logged in) rather than throwing error
      if (response.status === 401 || response.status === 403) return null;
      throw new Error(`Failed to fetch current user: HTTP ${response.status}`);
    }

    const data = await response.json();
    // Return user object regardless of nesting
    return data.user || (data.username ? data : null);
  } catch (err) {
    console.error("safeFetchCurrentUser error:", err);
    return null;
  }
}

// =========================
// UI State Utilities
// =========================
export function showLoading(element) {
  if (element) element.style.display = "block";
}

export function hideLoading(element) {
  if (element) element.style.display = "none";
}