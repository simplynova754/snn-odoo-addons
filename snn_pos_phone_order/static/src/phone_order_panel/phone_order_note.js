/** @odoo-module */

// First line of the order's general note. It prints on the receipt and the kitchen ticket.
export const NOTE_PREFIX = "PHONE ORDER";

// "2026-10-30" -> "Fri 10/30"
export function formatDateShort(iso) {
    const [y, m, d] = iso.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return `${date.toLocaleDateString("en-US", { weekday: "short" })} ${m}/${d}`;
}

// Rewrite the PHONE ORDER line of the general note from the order's phone fields,
// keeping any other note lines staff typed.
export function syncPhoneOrderNote(order) {
    const payment = {
        pickup: "Pay at pickup",
        phone: "Paid by card over phone",
    }[order.snn_payment_mode];
    const pickup = [
        order.snn_pickup_date && formatDateShort(order.snn_pickup_date),
        order.snn_pickup_time,
    ]
        .filter(Boolean)
        .join(" ");
    const parts = [
        order.snn_pickup_name,
        order.snn_pickup_phone,
        pickup && `Pickup ${pickup}`,
        payment,
    ].filter(Boolean);
    const otherLines = (order.general_note || "")
        .split("\n")
        .filter((line) => line && !line.startsWith(NOTE_PREFIX));
    if (parts.length) {
        otherLines.unshift(`${NOTE_PREFIX} · ${parts.join(" · ")}`);
    }
    order.general_note = otherLines.join("\n");
}
