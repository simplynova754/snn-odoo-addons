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

    getProductName(product) {
        return product.snn_pos_short_name || super.getProductName(...arguments);
    },
});
