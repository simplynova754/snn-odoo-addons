from odoo import api, fields, models


class PosOrder(models.Model):
    _inherit = "pos.order"

    snn_pickup_name = fields.Char(string="Pickup name")
    snn_pickup_phone = fields.Char(string="Pickup phone")
    snn_pickup_date = fields.Char(string="Pickup date", help="ISO date, e.g. 2026-10-30")
    snn_pickup_time = fields.Char(string="Pickup time", help="Time the customer was promised, e.g. 12:30")
    snn_payment_mode = fields.Selection(
        [("pickup", "Pay at pickup"), ("phone", "Card over phone")],
        string="Phone payment",
    )
    snn_pickup_status = fields.Selection(
        [("queued", "Scheduled"), ("making", "Active"), ("ready", "Ready"), ("picked_up", "Completed")],
        string="Pickup status",
    )

    @api.model
    def snn_pickup_order_ids(self, config_id, date_from, date_to):
        """Ids of phone orders with a pickup date in [date_from, date_to] (ISO strings)."""
        return self.search([
            ("config_id", "=", config_id),
            ("snn_pickup_date", ">=", date_from),
            ("snn_pickup_date", "<=", date_to),
            ("state", "!=", "cancel"),
        ]).ids

    def snn_set_pickup_status(self, status):
        self.write({"snn_pickup_status": status})
        return True

    def _prepare_invoice_vals(self):
        """Orders charged to a customer account use the customer's payment terms
        (e.g. 30 days). Orders paid on the spot stay due immediately."""
        vals = super()._prepare_invoice_vals()
        term = self.partner_id.commercial_partner_id.property_payment_term_id
        if term and any(p.payment_method_id.type == "pay_later" for p in self.payment_ids):
            vals["invoice_payment_term_id"] = term.id
        return vals
