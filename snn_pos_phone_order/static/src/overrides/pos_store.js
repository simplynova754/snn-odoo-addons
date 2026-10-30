/** @odoo-module */
import { PosStore } from "@point_of_sale/app/store/pos_store";
import { patch } from "@web/core/utils/patch";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";
import { isoDay } from "../pickups_screen/pickups_screen";

patch(PosStore.prototype, {
    // Open phone-order pickups for today (and overdue ones), for the top-bar badge.
    snnOpenPickupsToday() {
        const today = isoDay(0);
        return this.models["pos.order"]
            .getAll()
            .filter(
                (o) =>
                    o.snn_pickup_date &&
                    o.snn_pickup_date <= today &&
                    o.state !== "cancel" &&
                    o.lines.length &&
                    (o.snn_pickup_status || "queued") !== "picked_up"
            ).length;
    },

    async pay() {
        const order = this.get_order();
        if (
            this.config.snn_phone_order_mode &&
            order &&
            (!order.snn_pickup_name || !order.snn_pickup_time)
        ) {
            this.dialog.add(AlertDialog, {
                title: _t("Phone order details missing"),
                body: _t("Add the customer's name and a pickup time before taking payment."),
            });
            return;
        }
        return await super.pay(...arguments);
    },
});
