/** @odoo-module */
import { Component } from "@odoo/owl";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { syncPhoneOrderNote } from "./phone_order_note";


export class PhoneOrderPanel extends Component {
    static template = "snn_pos_phone_order.PhoneOrderPanel";
    static props = {};

    setup() {
        this.pos = usePos();
        this.quickTimes = [
            { label: "ASAP", minutes: 0 },
            { label: "+15", minutes: 15 },
            { label: "+30", minutes: 30 },
            { label: "+45", minutes: 45 },
        ];
    }

    isoDate(date) {
        const pad = (n) => String(n).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    get todayIso() {
        return this.isoDate(new Date());
    }

    get tomorrowIso() {
        return this.isoDate(new Date(Date.now() + 86400000));
    }

    // "Today", "Tomorrow" or "Fri Oct 30"
    formatDate(iso) {
        if (!iso) {
            return "";
        }
        if (iso === this.todayIso) {
            return "Today";
        }
        if (iso === this.tomorrowIso) {
            return "Tomorrow";
        }
        const [y, m, d] = iso.split("-").map(Number);
        return new Date(y, m - 1, d).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    }

    get pickupLabel() {
        const order = this.order;
        return [this.formatDate(order.snn_pickup_date), order.snn_pickup_time]
            .filter(Boolean)
            .join(" · ");
    }

    setDate(iso) {
        if (iso) {
            this.setField("snn_pickup_date", iso);
        }
    }

    onCustomDate(ev) {
        this.setDate(ev.target.value);
    }

    get order() {
        return this.pos.get_order();
    }

    formatTime(hours, minutes) {
        const suffix = hours >= 12 ? "PM" : "AM";
        return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
    }

    setField(field, value) {
        const order = this.order;
        if (!order) {
            return;
        }
        order[field] = value || false;
        // A pickup time with no date means today.
        if (field === "snn_pickup_time" && value && !order.snn_pickup_date) {
            order.snn_pickup_date = this.todayIso;
        }
        this.syncNote();
    }

    onQuickTime(minutes) {
        const at = new Date(Date.now() + minutes * 60000);
        const time = this.formatTime(at.getHours(), at.getMinutes());
        // ASAP and +minutes are always today.
        this.order.snn_pickup_date = this.isoDate(at);
        this.setField("snn_pickup_time", minutes === 0 ? `ASAP (${time})` : time);
    }

    onCustomTime(ev) {
        const value = ev.target.value;
        if (!value) {
            return;
        }
        const [hours, minutes] = value.split(":").map(Number);
        this.setField("snn_pickup_time", this.formatTime(hours, minutes));
        ev.target.value = "";
    }

    syncNote() {
        syncPhoneOrderNote(this.order);
    }
}
