/** @odoo-module */
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { PhoneOrderPanel } from "../phone_order_panel/phone_order_panel";

ProductScreen.components = { ...ProductScreen.components, PhoneOrderPanel };
