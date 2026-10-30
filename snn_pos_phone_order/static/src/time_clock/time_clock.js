/** @odoo-module */
/* global Sha1 */
import { Component, onMounted, onWillUnmount, useExternalListener, useState } from "@odoo/owl";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { _t } from "@web/core/l10n/translation";

const PIN_LENGTH = 4;

const ARMED_LABELS = {
    in: _t("clock in"),
    out: _t("clock out"),
    break_start: _t("start a break"),
    break_end: _t("end the break"),
};

const ACTION_LABELS = {
    in: _t("clocked in"),
    out: _t("clocked out"),
    break_start: _t("started a break"),
    break_end: _t("ended the break"),
};

function parseUtc(value) {
    return value ? new Date(value.replace(" ", "T")) : null;
}

export function snnTime(date) {
    return date ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
}

function hoursMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? `${h} h ${m} min` : `${m} min`;
}

/**
 * "Who's ringing?" employee login with a time clock (clock in / out, breaks).
 * Shown instead of the standard login when the register has "Time clock on login".
 */
export class SnnTimeClock extends Component {
    static template = "snn_pos_phone_order.SnnTimeClock";
    static props = { onLogin: Function, onBack: Function, backLabel: String };

    setup() {
        this.pos = usePos();
        this.state = useState({
            selectedId: null,
            pin: "",
            status: {},
            busy: false,
            message: "",
            error: "",
            armed: null,
            now: new Date(),
        });
        useExternalListener(window, "keydown", (ev) => this.onKeydown(ev));
        onMounted(() => {
            this.loadStatus();
            this.ticker = setInterval(() => {
                this.state.now = new Date();
            }, 20000);
            this.refresher = setInterval(() => this.loadStatus(), 120000);
        });
        onWillUnmount(() => {
            clearInterval(this.ticker);
            clearInterval(this.refresher);
        });
    }

    get employees() {
        return this.pos.models["hr.employee"]
            .getAll()
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    get selected() {
        return this.state.selectedId ? this.pos.models["hr.employee"].get(this.state.selectedId) : null;
    }

    get selectedStatus() {
        return (this.selected && this.state.status[this.selected.id]) || null;
    }

    get registerLabel() {
        return `Simply Nova · ${this.pos.config.name}`;
    }

    get clockText() {
        return snnTime(this.state.now);
    }

    get dateText() {
        return this.state.now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
    }

    get lastSale() {
        const orders = this.pos.models["pos.order"]
            .getAll()
            .filter((o) => o.finalized && o.config_id?.id === this.pos.config.id && o.date_order);
        if (!orders.length) {
            return null;
        }
        const last = orders.sort((a, b) => (String(a.date_order) < String(b.date_order) ? 1 : -1))[0];
        return {
            name: (last.pos_reference || last.name || "").split(" ").pop(),
            total: this.env.utils.formatCurrency(last.get_total_with_tax()),
            by: last.employee_id?.name || "",
            at: snnTime(
                last.date_order.toJSDate
                    ? last.date_order.toJSDate()
                    : parseUtc(String(last.date_order).replace(/Z?$/, "Z"))
            ),
        };
    }

    statusLine(employee) {
        const s = this.state.status[employee.id];
        if (!s) {
            return "";
        }
        if (s.state === "on") {
            return _t("On shift · since %s", snnTime(parseUtc(s.since)));
        }
        if (s.state === "break") {
            const mins = Math.max(0, Math.round((this.state.now - parseUtc(s.break_since)) / 60000));
            return _t("On break · %s min", mins);
        }
        return _t("Off");
    }

    get detailLine() {
        if (this.state.armed) {
            return _t("Enter your PIN to %s", ARMED_LABELS[this.state.armed]);
        }
        const s = this.selectedStatus;
        if (!s) {
            return _t("Enter your PIN to open the register");
        }
        if (s.state === "off") {
            return s.minutes_today
                ? _t("Off · %s today", hoursMinutes(s.minutes_today))
                : _t("Not clocked in");
        }
        const breaks = s.breaks_today === 1 ? _t("1 break") : _t("%s breaks", s.breaks_today);
        return _t("Clocked in %s · %s today · %s", snnTime(parseUtc(s.since)), hoursMinutes(s.minutes_today), breaks);
    }

    can(action) {
        if (this.state.busy) {
            return false;
        }
        const s = this.selectedStatus;
        if (!this.selected || !s) {
            // No name tapped: any action can be armed, then the PIN says who it is.
            return true;
        }
        return {
            in: s.state === "off",
            out: s.state !== "off",
            break_start: s.state === "on",
            break_end: s.state === "break",
        }[action];
    }

    get pinDots() {
        return Array.from({ length: Math.max(4, this.state.pin.length) }, (_, i) => i < this.state.pin.length);
    }

    async loadStatus() {
        const ids = this.employees.map((e) => e.id);
        if (!ids.length) {
            return;
        }
        try {
            const result = await this.pos.data.call("hr.employee", "snn_pos_clock_status", [ids]);
            const map = {};
            for (const s of result) {
                map[s.id] = s;
            }
            this.state.status = map;
        } catch {
            // Offline: the tiles just show no status.
        }
    }

    select(employee) {
        this.state.selectedId = this.state.selectedId === employee.id ? null : employee.id;
        this.state.armed = null;
        this.state.pin = "";
        this.state.error = "";
        this.state.message = "";
    }

    press(key) {
        this.state.error = "";
        if (key === "clear") {
            this.state.pin = "";
        } else if (key === "back") {
            this.state.pin = this.state.pin.slice(0, -1);
        } else if (this.state.pin.length < PIN_LENGTH) {
            this.state.pin += key;
            if (this.state.pin.length === PIN_LENGTH) {
                this.complete();
            }
        }
    }

    // The employee whose PIN was typed (limited to the tapped name, if any).
    employeeForPin() {
        if (!this.state.pin) {
            return null;
        }
        const hash = Sha1.hash(this.state.pin);
        const pool = this.selected ? [this.selected] : this.employees;
        const matches = pool.filter((e) => e._pin === hash);
        return matches.length === 1 ? matches[0] : null;
    }

    // Full PIN typed: open the register, or do the clock action that was tapped first.
    complete() {
        const employee = this.employeeForPin();
        if (!employee) {
            this.state.pin = "";
            this.state.error = _t("Wrong PIN. Try again.");
            return;
        }
        if (this.state.armed) {
            this.clock(this.state.armed, employee);
        } else {
            this.login(employee);
        }
    }

    onKeydown(ev) {
        if (ev.target?.tagName === "INPUT" || ev.target?.tagName === "TEXTAREA") {
            return;
        }
        if (/^[0-9]$/.test(ev.key)) {
            this.press(ev.key);
        } else if (ev.key === "Backspace") {
            this.press("back");
        } else if (ev.key === "Enter") {
            this.openRegister();
        } else if (ev.key === "Escape") {
            this.state.armed = null;
            this.state.pin = "";
        }
    }

    openRegister() {
        this.state.armed = null;
        const selected = this.selected;
        if (selected && !selected._pin) {
            this.login(selected);
            return;
        }
        const employee = this.employeeForPin();
        if (!employee) {
            this.state.pin = "";
            this.state.error = selected || this.state.pin ? _t("Wrong PIN. Try again.") : _t("Enter your PIN.");
            return;
        }
        this.login(employee);
    }

    login(employee) {
        this.state.pin = "";
        this.state.armed = null;
        this.props.onLogin(employee);
    }

    // Tapping a clock button: do it now if we know who (name + PIN typed),
    // otherwise remember it and do it when the PIN is entered.
    onClockButton(action) {
        if (!this.can(action)) {
            return;
        }
        this.state.error = "";
        this.state.message = "";
        const selected = this.selected;
        const employee = selected && !selected._pin ? selected : this.employeeForPin();
        if (employee) {
            this.clock(action, employee);
        } else {
            this.state.pin = "";
            this.state.armed = this.state.armed === action ? null : action;
        }
    }

    async clock(action, employee) {
        this.state.armed = null;
        this.state.busy = true;
        this.state.error = "";
        try {
            const s = await this.pos.data.call("hr.employee", "snn_pos_clock_action", [
                employee.id,
                this.state.pin,
                action,
            ]);
            this.state.status = { ...this.state.status, [s.id]: s };
            this.state.message = `${employee.name} ${ACTION_LABELS[action]} at ${snnTime(new Date())}`;
            this.state.pin = "";
            this.state.selectedId = null;
        } catch (e) {
            this.state.pin = "";
            this.state.error =
                e?.data?.message || e?.message || _t("Could not reach Odoo. Check the internet and try again.");
        } finally {
            this.state.busy = false;
        }
    }
}
