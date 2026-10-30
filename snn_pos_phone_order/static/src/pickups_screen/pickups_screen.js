/** @odoo-module */
import { Component, onMounted, onWillStart, onWillUnmount, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { formatCurrency } from "@point_of_sale/app/models/utils/currency";

const STATUS_LABEL = {
    queued: "Queued",
    making: "Making",
    ready: "Ready",
    picked_up: "Picked up",
};

// Local date as "YYYY-MM-DD", offset by whole days.
export function isoDay(offsetDays = 0) {
    const d = new Date(Date.now() + offsetDays * 86400000);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// "12:30 PM" or "ASAP (11:42 AM)" -> minutes after midnight, or null.
export function pickupMinutes(text) {
    const match = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(text || "");
    if (!match) {
        return null;
    }
    let hours = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") {
        hours += 12;
    }
    return hours * 60 + Number(match[2]);
}

function hourLabel(minutes) {
    const fmt = (h) => `${h % 12 || 12}:00`;
    const h = Math.floor(minutes / 60);
    return `${fmt(h)} – ${fmt(h + 1)}`;
}

function dayLabel(iso) {
    if (iso === isoDay(0)) {
        return "Today";
    }
    if (iso === isoDay(1)) {
        return "Tomorrow";
    }
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

export class PickupsScreen extends Component {
    static template = "snn_pos_phone_order.PickupsScreen";
    static storeOnOrder = false;

    setup() {
        this.pos = usePos();
        this.state = useState({
            tab: "today",
            search: "",
            selectedUuid: null,
            loading: false,
            tick: 0,
        });
        onWillStart(() => this.refresh());
        onMounted(() => {
            // Re-check late orders every minute.
            this.timer = setInterval(() => this.state.tick++, 60000);
        });
        onWillUnmount(() => clearInterval(this.timer));
    }

    async refresh() {
        this.state.loading = true;
        try {
            await this.pos.syncAllOrders();
            const ids = await this.pos.data.call("pos.order", "snn_pickup_order_ids", [], {
                config_id: this.pos.config.id,
                date_from: isoDay(-1),
                date_to: isoDay(7),
            });
            const missing = ids.filter((id) => !this.pos.models["pos.order"].get(id));
            if (missing.length) {
                // Loads the orders with their lines into the register's data.
                await this.pos.data.read("pos.order", missing);
            }
        } catch (error) {
            console.warn("snn_pos_phone_order: could not refresh pickups", error);
        } finally {
            this.state.loading = false;
        }
    }

    // ---- data -------------------------------------------------------------

    statusOf(order) {
        return order.snn_pickup_status || "queued";
    }

    isPaid(order) {
        return order.finalized;
    }

    isLate(order) {
        this.state.tick; // re-evaluate every minute
        if (this.statusOf(order) === "picked_up" || order.snn_pickup_date !== isoDay(0)) {
            return order.snn_pickup_date < isoDay(0) && this.statusOf(order) !== "picked_up";
        }
        const minutes = pickupMinutes(order.snn_pickup_time);
        if (minutes === null) {
            return false;
        }
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes() > minutes;
    }

    minutesLate(order) {
        const minutes = pickupMinutes(order.snn_pickup_time);
        if (minutes === null || order.snn_pickup_date !== isoDay(0)) {
            return null;
        }
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes() - minutes;
    }

    get allPickups() {
        return this.pos.models["pos.order"]
            .getAll()
            .filter((o) => o.snn_pickup_date && o.state !== "cancel" && o.lines.length);
    }

    inTab(order, tab) {
        const status = this.statusOf(order);
        const today = isoDay(0);
        if (tab === "picked") {
            return status === "picked_up" && order.snn_pickup_date >= isoDay(-1);
        }
        if (status === "picked_up") {
            return false;
        }
        if (tab === "today") {
            return order.snn_pickup_date <= today;
        }
        if (tab === "tomorrow") {
            return order.snn_pickup_date === isoDay(1);
        }
        return order.snn_pickup_date >= today && order.snn_pickup_date <= isoDay(7);
    }

    count(tab) {
        return this.allPickups.filter((o) => this.inTab(o, tab)).length;
    }

    get visibleOrders() {
        const term = this.state.search.trim().toLowerCase();
        const digits = term.replace(/\D/g, "");
        return this.allPickups
            .filter((o) => this.inTab(o, this.state.tab))
            .filter((o) => {
                if (!term) {
                    return true;
                }
                const name = (o.snn_pickup_name || o.partner_id?.name || "").toLowerCase();
                const phone = (o.snn_pickup_phone || "").replace(/\D/g, "");
                return name.includes(term) || (digits && phone.includes(digits));
            })
            .sort((a, b) => {
                if (a.snn_pickup_date !== b.snn_pickup_date) {
                    return a.snn_pickup_date < b.snn_pickup_date ? -1 : 1;
                }
                return (pickupMinutes(a.snn_pickup_time) ?? 0) - (pickupMinutes(b.snn_pickup_time) ?? 0);
            });
    }

    get groups() {
        const groups = [];
        const showDay = this.state.tab !== "today" && this.state.tab !== "tomorrow";
        for (const order of this.visibleOrders) {
            const minutes = pickupMinutes(order.snn_pickup_time);
            const hour = minutes === null ? "No time set" : hourLabel(minutes);
            const label = showDay ? `${dayLabel(order.snn_pickup_date)} · ${hour}` : hour;
            let group = groups.at(-1);
            if (!group || group.label !== label) {
                group = { label, orders: [] };
                groups.push(group);
            }
            group.orders.push(order);
        }
        return groups;
    }

    get summary() {
        const today = this.allPickups.filter((o) => this.inTab(o, "today"));
        const due = today
            .filter((o) => !this.isPaid(o))
            .reduce((sum, o) => sum + o.get_total_with_tax(), 0);
        return {
            late: today.filter((o) => this.isLate(o)).length,
            ready: today.filter((o) => this.statusOf(o) === "ready").length,
            toMake: today.filter((o) => ["queued", "making"].includes(this.statusOf(o))).length,
            due: formatCurrency(due, this.pos.currency),
        };
    }

    row(order) {
        const status = this.statusOf(order);
        const late = this.isLate(order);
        const minutesLate = this.minutesLate(order);
        return {
            uuid: order.uuid,
            time: order.snn_pickup_time || "—",
            name: order.snn_pickup_name || order.partner_id?.name || "No name",
            phone: order.snn_pickup_phone || "",
            items: order.lines
                .map((l) => {
                    const name = l.product_id.snn_pos_short_name || l.product_id.display_name;
                    const qty = l.get_quantity();
                    return qty === 1 ? name : `${name} ×${l.get_quantity_str()}`;
                })
                .join(" · "),
            total: formatCurrency(order.get_total_with_tax(), this.pos.currency),
            payment: this.isPaid(order)
                ? "Paid"
                : order.snn_payment_mode === "phone"
                ? "Card over phone · not charged"
                : "Pay at pickup",
            unpaid: !this.isPaid(order),
            status,
            statusLabel: late && minutesLate > 0 ? `Late ${minutesLate} min` : late ? "Late" : STATUS_LABEL[status],
            late,
            selected: order.uuid === this.state.selectedUuid,
        };
    }

    get selected() {
        return this.allPickups.find((o) => o.uuid === this.state.selectedUuid) || null;
    }

    detail(order) {
        const note = (order.general_note || "")
            .split("\n")
            .filter((line) => line && !line.startsWith("PHONE ORDER"))
            .join(" · ");
        return {
            ...this.row(order),
            ticket: order.tracking_number || order.pos_reference || "",
            day: dayLabel(order.snn_pickup_date),
            note,
            lines: order.getSortedOrderlines().map((l) => {
                const data = l.getDisplayData();
                const qty = l.get_quantity();
                const byWeight = data.unit && data.unit !== "Units";
                return {
                    key: l.uuid,
                    name: data.productName,
                    qtyLabel: byWeight ? `${data.qty} ${data.unit}` : qty === 1 ? "" : `×${qty}`,
                    price: data.price,
                    options: (data.snnOptions || []).map((o) => o.name).join(" · "),
                };
            }),
            nextAction: this.nextAction(order),
            editable: !this.isPaid(order),
        };
    }

    nextAction(order) {
        const status = this.statusOf(order);
        if (status === "queued") {
            return { label: "Start making", status: "making" };
        }
        if (status === "making") {
            return { label: "Mark ready", status: "ready" };
        }
        if (status === "ready" && !this.isPaid(order)) {
            return { label: "Take payment", pay: true };
        }
        if (status === "ready") {
            return { label: "Picked up", status: "picked_up" };
        }
        return null;
    }

    // ---- actions ----------------------------------------------------------

    select(uuid) {
        this.state.selectedUuid = this.state.selectedUuid === uuid ? null : uuid;
    }

    setTab(tab) {
        this.state.tab = tab;
        this.state.selectedUuid = null;
    }

    async setStatus(order, status) {
        order.snn_pickup_status = status;
        if (typeof order.id === "number") {
            try {
                await this.pos.data.call("pos.order", "snn_set_pickup_status", [[order.id], status]);
            } catch (error) {
                console.warn("snn_pos_phone_order: could not save pickup status", error);
            }
        }
    }

    async runNext(order) {
        const action = this.nextAction(order);
        if (!action) {
            return;
        }
        if (action.pay) {
            this.takePayment(order);
            return;
        }
        await this.setStatus(order, action.status);
    }

    takePayment(order) {
        this.pos.set_order(order);
        this.pos.showScreen("PaymentScreen", { orderUuid: order.uuid });
    }

    editOrder(order) {
        this.pos.set_order(order);
        this.pos.showScreen("ProductScreen");
    }

    back() {
        this.pos.showScreen("ProductScreen");
    }
}

registry.category("pos_screens").add("PickupsScreen", PickupsScreen);
