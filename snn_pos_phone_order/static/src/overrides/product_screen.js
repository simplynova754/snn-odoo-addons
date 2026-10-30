/** @odoo-module */
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { patch } from "@web/core/utils/patch";
import { PhoneOrderPanel } from "../phone_order_panel/phone_order_panel";

ProductScreen.components = { ...ProductScreen.components, PhoneOrderPanel };

// Product buttons use the short "Button name" when one is set (e.g. "Norwegian SW").
patch(ProductScreen.prototype, {
    // Products in the one-tap top sellers row, ordered by their slot (1-6).
    get snnTopSellers() {
        return this.pos.models["product.product"]
            .filter((p) => p.snn_pos_top_seller > 0 && p.available_in_pos && p.active !== false)
            .sort((a, b) => a.snn_pos_top_seller - b.snn_pos_top_seller)
            .slice(0, 6);
    },

    // Counter layout: one-tap payment buttons (Card · Square, Cash, then On account).
    get snnQuickPayMethods() {
        const rank = (m) => (m.type === "pay_later" ? 2 : m.is_cash_count ? 1 : 0);
        return this.pos.config.payment_method_ids
            .slice()
            .sort((a, b) => rank(a) - rank(b) || a.sequence - b.sequence);
    },

    async snnQuickPay(method) {
        const order = this.currentOrder;
        if (!order || order.is_empty()) {
            return;
        }
        await this.pos.pay();
        if (this.pos.mainScreen.component?.name !== "PaymentScreen") {
            return;
        }
        if (method.type === "pay_later" && !order.get_partner()) {
            // On account needs a customer: the payment screen will ask for one.
            return;
        }
        if (!order.payment_ids.length && order.get_due() > 0) {
            order.add_paymentline(method);
        }
    },

    getProductName(product) {
        return product.snn_pos_short_name || super.getProductName(...arguments);
    },
});
