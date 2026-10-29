from odoo import fields, models


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
