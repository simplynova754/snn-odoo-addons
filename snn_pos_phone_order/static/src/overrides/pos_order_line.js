/** @odoo-module */
import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";
import { patch } from "@web/core/utils/patch";
import { formatCurrency } from "@point_of_sale/app/models/utils/currency";

// Break a sandwich into its base price and each chosen option, so the ticket
// and receipt read "Belly Lox & Egg Sandwich / Base $13.00 / Gluten-Free Bagel +$1.50".
// Any problem here falls back to Odoo's normal line, so it can never block the register.
patch(PosOrderline.prototype, {
    getDisplayData() {
        const data = super.getDisplayData(...arguments);
        try {
            const raw = this.attribute_value_ids;
            const values = Array.isArray(raw) ? raw.filter((v) => v && typeof v.name === "string") : [];
            if (!values.length) {
                return data;
            }
            const extrasTotal = values.reduce((sum, v) => sum + (Number(v.price_extra) || 0), 0);
            const base = this.get_unit_display_price() - extrasTotal;
            return {
                ...data,
                productName: this.product_id?.display_name || data.productName,
                snnBasePrice: formatCurrency(base, this.currency),
                snnOptions: values.map((v) => ({
                    name: v.name,
                    extra: v.price_extra ? `+${formatCurrency(v.price_extra, this.currency)}` : "",
                    missing: v.name.startsWith("Choose"),
                })),
            };
        } catch (error) {
            console.warn("snn_pos_phone_order: add-on breakdown skipped", error);
            return data;
        }
    },
});
