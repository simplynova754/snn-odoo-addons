/** @odoo-module */
import { LoginScreen } from "@point_of_sale/app/screens/login_screen/login_screen";
import { patch } from "@web/core/utils/patch";
import { SnnTimeClock } from "./time_clock";

LoginScreen.components = { ...(LoginScreen.components || {}), SnnTimeClock };

patch(LoginScreen.prototype, {
    // Our login replaces the standard one on registers that use employee login
    // together with "Time clock on login" or "Lock after every sale".
    get snnUseClock() {
        const config = this.pos.config;
        return Boolean(config.module_pos_hr && (config.snn_time_clock || config.snn_lock_after_sale));
    },
    snnLogin(employee) {
        // Never return to a screen that needs props we no longer have.
        if (!["ProductScreen", "PickupsScreen", "TicketScreen"].includes(this.pos.previousScreen)) {
            this.pos.previousScreen = "ProductScreen";
        }
        this.selectOneCashier(employee);
    },
});
