/** @odoo-module */
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { patch } from "@web/core/utils/patch";
import { PhoneOrderPanel } from "../phone_order_panel/phone_order_panel";

ProductScreen.components = { ...ProductScreen.components, PhoneOrderPanel };

// Product buttons use the short "Button name" when one is set (e.g. "Norwegian SW").
patch(ProductScreen.prototype, {
    getProductName(product) {
        return product.snn_pos_short_name || super.getProductName(...arguments);
    },
});
