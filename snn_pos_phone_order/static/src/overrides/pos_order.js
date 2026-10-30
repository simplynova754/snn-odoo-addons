/** @odoo-module */
import { PosOrder } from "@point_of_sale/app/models/pos_order";
import { patch } from "@web/core/utils/patch";
import { syncPhoneOrderNote } from "../phone_order_panel/phone_order_note";

// Picking a customer with the Customer button fills the phone order name and phone.
patch(PosOrder.prototype, {
    set_partner(partner) {
        const result = super.set_partner(...arguments);
        if (partner && this.config_id?.snn_phone_order_mode) {
            this.snn_pickup_name = partner.name || this.snn_pickup_name || false;
            this.snn_pickup_phone = partner.mobile || partner.phone || this.snn_pickup_phone || false;
            syncPhoneOrderNote(this);
        }
        return result;
    },
});
