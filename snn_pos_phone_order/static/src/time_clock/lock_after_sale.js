/** @odoo-module */
import { ReceiptScreen } from "@point_of_sale/app/screens/receipt_screen/receipt_screen";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";

function shouldLock(pos) {
    return pos.config.module_pos_hr && pos.config.snn_lock_after_sale;
}

// After every finished sale, go back to "Who's ringing?".
patch(ReceiptScreen.prototype, {
    orderDone() {
        super.orderDone(...arguments);
        if (shouldLock(this.pos)) {
            this.pos.showLoginScreen();
        }
    },
});

// Same when the receipt screen is skipped (print automatically + skip preview).
patch(PaymentScreen.prototype, {
    async afterOrderValidation() {
        await super.afterOrderValidation(...arguments);
        if (shouldLock(this.pos) && this.pos.mainScreen.component?.name === "ProductScreen") {
            this.pos.showLoginScreen();
        }
    },
});
