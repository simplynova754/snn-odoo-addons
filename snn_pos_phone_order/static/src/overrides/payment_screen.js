/** @odoo-module */
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";

// An order charged to Customer Account always becomes an invoice,
// so the customer's tab has a real document with a due date.
patch(PaymentScreen.prototype, {
    async validateOrder(isForceValidate) {
        const order = this.currentOrder;
        const onAccount = order.payment_ids.some(
            (p) => p.payment_method_id?.type === "pay_later"
        );
        if (onAccount && order.get_partner() && !order.is_to_invoice()) {
            order.set_to_invoice(true);
        }
        return await super.validateOrder(...arguments);
    },
});
